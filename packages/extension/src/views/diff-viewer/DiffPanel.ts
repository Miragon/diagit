import type { DiagramDiff } from '../../notations/Notation'
import type { DiffLoaders } from '../../git-hosts/DiffSource'
import type { DiagramDiffer, DiffableViewer } from '../../notations/Notation'
import type { PanelHandle } from '../../platform/page/HostPage'
import type { ReportContext } from '../../platform/DiagitRepository'
import { h } from '../../platform/utils/dom'
import { enableFocusZoom } from '../../platform/utils/focusZoom'
import { filePathLabel } from '../../platform/utils/fileLabel'
import { detectHostTheme } from '../../platform/utils/hostTheme'
import { ZoomControls, type Zoomable } from '../../platform/ui/ZoomControls'
import { ChangeControls } from './ChangeControls'
import { ChangeNavigator } from './ChangeNavigator'
import { DiffNotices } from './DiffNotices'
import { DiffPane } from './DiffPane'
import { ViewerCanvas } from './ViewerCanvas'

export interface DiffPanelOptions extends DiffLoaders {
  differ: DiagramDiffer
  label: string
  filePath: string
  reportContext: ReportContext
  onRendered?: () => void
}

type ModelView = 'plain' | 'diff'
type LoadedModel = PromiseSettledResult<string | null>

const NO_CHANGES: DiagramDiff = { added: [], removed: [], changed: [], moved: [] }
const ONE_SCREEN_AROUND_THE_VIEWPORT = '100% 0px'

export class DiffPanel implements PanelHandle, Zoomable {
  private readonly oldPane = new DiffPane('old')
  private readonly newPane = new DiffPane('new')
  private readonly plainCanvas = new ViewerCanvas<DiffableViewer>()
  private readonly plainButton = this.viewButton('Plain')
  private readonly diffButton = this.viewButton('Diff')
  private readonly changeControls = new ChangeControls()
  private readonly zoomControls = new ZoomControls(this)
  private readonly diffGrid = h('div', { class: 'diagit-diff-grid' }, [
    this.oldPane.element,
    this.newPane.element,
  ])
  private readonly plainGrid = h('div', { class: 'diagit-diff-grid' }, [
    h('div', { class: 'diagit-diff-pane diagit-diff-single' }, [this.plainCanvas.element]),
  ])
  private readonly diagramArea = h('div', { class: 'diagit-diff-area' }, [
    this.diffGrid,
    this.plainGrid,
    this.zoomControls.element,
  ])
  private readonly root = h('div', { class: 'diagit-wrap diagit-diff-root' }, [
    h('div', { class: 'diagit-toolbar' }, [
      h('div', { class: 'diagit-segmented', role: 'group', 'aria-label': 'View' }, [
        this.plainButton,
        this.diffButton,
      ]),
      this.changeControls.element,
    ]),
    this.diagramArea,
  ])
  private modelView: ModelView = 'plain'
  private viewPickedByUser = false
  private base: LoadedModel | null = null
  private head: LoadedModel | null = null
  private plainRendered = false
  private diffRendered = false
  private interactive = false
  private destroyed = false
  private resizeObserver: ResizeObserver | null = null
  private viewportObserver: IntersectionObserver | null = null
  private detachFocusZoom: (() => void) | null = null
  private stopTrackingZoom: (() => void) | null = null

  private readonly notices: DiffNotices

  constructor(private readonly options: DiffPanelOptions) {
    this.notices = new DiffNotices(options.label, options.reportContext)
    this.changeControls.element.before(filePathLabel(options.filePath))
    this.zoomControls.allowFullScreen(this.root)
  }

  mount(container: HTMLElement): this {
    container.append(this.root)
    this.root.dataset.cdTheme = detectHostTheme(this.root)
    this.plainButton.addEventListener('click', () => this.pick('plain'))
    this.diffButton.addEventListener('click', () => this.pick('diff'))
    this.show('plain')
    this.resizeObserver = new ResizeObserver(() => this.fit())
    this.resizeObserver.observe(this.diagramArea)
    this.detachFocusZoom = enableFocusZoom(this.diagramArea, (active) => {
      this.interactive = active
      this.applyInteractive()
    })
    this.loadWhenNearViewport()
    return this
  }

  refit(): void {
    this.fit()
  }

  fit(): void {
    for (const viewer of this.visibleViewers()) {
      viewer?.fit()
    }
  }

  zoomBy(factor: number): void {
    for (const viewer of this.visibleViewers()) {
      viewer?.zoomBy(factor)
    }
  }

  resetZoom(): void {
    for (const viewer of this.visibleViewers()) {
      ZoomControls.resetZoomOf(viewer)
    }
  }

  destroy(): void {
    this.destroyed = true
    this.stopTrackingZoom?.()
    this.stopTrackingZoom = null
    this.detachFocusZoom?.()
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.viewportObserver?.disconnect()
    this.viewportObserver = null
    this.destroyViewers()
    this.root.remove()
  }

  private pick(view: ModelView): void {
    this.viewPickedByUser = true
    this.show(view)
  }

  private show(view: ModelView): void {
    this.modelView = view
    const isDiff = view === 'diff'
    this.diffGrid.style.display = isDiff ? '' : 'none'
    this.plainGrid.style.display = isDiff ? 'none' : ''
    this.changeControls.element.style.display = isDiff ? '' : 'none'
    this.diffButton.setAttribute('aria-pressed', String(isDiff))
    this.plainButton.setAttribute('aria-pressed', String(!isDiff))
    if (isDiff) {
      void this.ensureDiffRendered()
    } else {
      void this.ensurePlainRendered()
    }
    this.fit()
    this.trackZoomLevel()
  }

  private trackZoomLevel(): void {
    this.stopTrackingZoom?.()
    const viewer =
      this.modelView === 'diff'
        ? (this.newPane.viewer ?? this.oldPane.viewer)
        : this.plainCanvas.viewer
    if (!viewer) {
      this.stopTrackingZoom = null
      this.zoomControls.showLevel(null)
      return
    }
    const showLevel = () => this.zoomControls.showLevel(viewer.zoomLevel())
    this.stopTrackingZoom = viewer.onViewChange(showLevel)
    showLevel()
  }

  private visibleViewers(): (DiffableViewer | null)[] {
    return this.modelView === 'diff'
      ? [this.oldPane.viewer, this.newPane.viewer]
      : [this.plainCanvas.viewer]
  }

  private applyInteractive(): void {
    for (const viewer of [this.oldPane.viewer, this.newPane.viewer, this.plainCanvas.viewer]) {
      viewer?.setInteractive(this.interactive)
    }
  }

  private loadWhenNearViewport(): void {
    this.viewportObserver = new IntersectionObserver(
      (entries, observer) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return
        }
        observer.disconnect()
        void this.load()
      },
      { rootMargin: ONE_SCREEN_AROUND_THE_VIEWPORT },
    )
    this.viewportObserver.observe(this.root)
  }

  private async load(): Promise<void> {
    const { loadOld, loadNew } = this.options
    const [oldModel, newModel] = await Promise.allSettled([
      Promise.resolve().then(loadOld),
      Promise.resolve().then(loadNew),
    ])
    if (this.destroyed) {
      return
    }
    this.base = oldModel
    this.head = newModel
    const opensOnDiff = !this.viewPickedByUser && this.bothVersionsLoaded(oldModel, newModel)
    this.show(opensOnDiff ? 'diff' : this.modelView)
  }

  private async ensureDiffRendered(): Promise<void> {
    if (this.diffRendered || this.destroyed || !this.base || !this.head) {
      return
    }
    this.diffRendered = true
    const { base, head } = this
    await this.renderPane(this.oldPane, base, 'not in source')
    await this.renderPane(this.newPane, head, 'deleted')
    if (this.destroyed) {
      this.destroyViewers()
      return
    }
    this.applyInteractive()
    if (this.oldPane.viewer || this.newPane.viewer) {
      this.options.onRendered?.()
    }
    if (this.modelView === 'diff') {
      this.trackZoomLevel()
    }

    const diff = await this.computeDiff(base, head)
    if (this.destroyed) {
      return
    }
    if (!diff) {
      this.changeControls.showDiffUnavailable()
    } else if (this.bothVersionsLoaded(base, head)) {
      this.showDiff(diff)
    }
    if (this.modelView === 'diff') {
      this.fit()
    }
  }

  private showDiff(diff: DiagramDiff): void {
    this.oldPane.showDiff(diff)
    this.newPane.showDiff(diff)
    const viewers = [this.oldPane.viewer, this.newPane.viewer]
    this.changeControls.showDiff(diff, ChangeNavigator.forDiff(diff, viewers))
  }

  private bothVersionsLoaded(oldModel: LoadedModel, newModel: LoadedModel): boolean {
    return [oldModel, newModel].every((model) => model.status === 'fulfilled' && !!model.value)
  }

  private async renderPane(pane: DiffPane, model: LoadedModel, emptyLabel: string): Promise<void> {
    if (model.status === 'rejected') {
      pane.showFailure(this.notices.notLoaded(pane.side, model.reason))
    } else {
      await pane.render(this.options.differ, model.value, emptyLabel, this.notices)
    }
  }

  private async ensurePlainRendered(): Promise<void> {
    if (this.plainRendered || this.destroyed || !this.head) {
      return
    }
    this.plainRendered = true
    if (this.head.status === 'rejected') {
      this.plainCanvas.showFailure(this.notices.notLoaded('new', this.head.reason))
      return
    }
    const { differ } = this.options
    const viewer = await this.plainCanvas.render(
      (canvas, xml) => differ.createViewer(canvas, xml),
      this.head.value,
      'No current model (file deleted).',
      (err) => this.notices.notRendered('new', err),
    )
    if (this.destroyed) {
      this.plainCanvas.destroy()
      return
    }
    this.applyInteractive()
    if (viewer) {
      this.options.onRendered?.()
    }
    if (this.modelView === 'plain') {
      viewer?.fit()
      this.trackZoomLevel()
    }
  }

  private async computeDiff(
    oldModel: LoadedModel,
    newModel: LoadedModel,
  ): Promise<DiagramDiff | null> {
    if (oldModel.status === 'rejected' || newModel.status === 'rejected') {
      return null
    }
    if (!oldModel.value || !newModel.value) {
      return NO_CHANGES
    }
    try {
      return await this.options.differ.diff(oldModel.value, newModel.value)
    } catch {
      return null
    }
  }

  private destroyViewers(): void {
    this.oldPane.destroy()
    this.newPane.destroy()
    this.plainCanvas.destroy()
  }

  private viewButton(text: string): HTMLButtonElement {
    return h('button', { type: 'button', text })
  }
}
