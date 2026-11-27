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
import { AutoFit } from '../../platform/ui/AutoFit'
import type { CodeToggle } from '../../platform/ui/CodeToggle'
import { ChangeControls } from './ChangeControls'
import { ChangeNavigator } from './ChangeNavigator'
import { DiffNotices } from './DiffNotices'
import type { DiffPane } from './DiffPane'
import { DiffSides } from './DiffSides'
import { ViewerCanvas } from './ViewerCanvas'

export interface DiffPanelOptions extends DiffLoaders {
  differ: DiagramDiffer
  label: string
  filePath: string
  reportContext: ReportContext
  codeToggle?: CodeToggle
  onRendered?: () => void
  onOwnPage?: boolean
}

type ModelView = 'plain' | 'diff'
type LoadedModel = PromiseSettledResult<string | null>

const NO_CHANGES: DiagramDiff = { added: [], removed: [], changed: [], moved: [] }
const ONE_SCREEN_AROUND_THE_VIEWPORT = '100% 0px'

export class DiffPanel implements PanelHandle, Zoomable {
  private readonly sides = new DiffSides(() => this.sidesChanged())
  private readonly oldPane = this.sides.oldPane
  private readonly newPane = this.sides.newPane
  private readonly plainCanvas = new ViewerCanvas<DiffableViewer>()
  private readonly plainButton = this.viewButton('Plain')
  private readonly diffButton = this.viewButton('Diff')
  private readonly changeControls = new ChangeControls({
    steppedToChange: () => this.autoFit?.userMovedView(),
    showedAll: () => this.autoFit?.fit(),
  })
  private readonly zoomControls = new ZoomControls(this, (view) => {
    if (!this.destroyed) {
      this.sides.followPanelView(view)
      this.fit()
    }
  })
  private readonly diffGrid = h('div', { class: 'diagit-diff-grid' }, this.sides.elements)
  private readonly plainGrid = h('div', { class: 'diagit-diff-grid' }, [
    h('div', { class: 'diagit-diff-pane diagit-diff-single' }, [this.plainCanvas.element]),
  ])
  private readonly diagramArea = h('div', { class: 'diagit-diff-area' }, [
    this.diffGrid,
    this.plainGrid,
    this.zoomControls.element,
  ])
  private readonly toolbar = h('div', { class: 'diagit-toolbar' }, [
    h('div', { class: 'diagit-segmented', role: 'group', 'aria-label': 'View' }, [
      this.plainButton,
      this.diffButton,
    ]),
    this.changeControls.element,
  ])
  private readonly root = h('div', { class: 'diagit-wrap diagit-diff-root' }, [
    this.toolbar,
    this.diagramArea,
  ])
  private modelView: ModelView
  private diff: DiagramDiff | null = null
  private viewPickedByUser = false
  private base: LoadedModel | null = null
  private head: LoadedModel | null = null
  private plainRendered = false
  private diffRendered = false
  private interactive = false
  private destroyed = false
  private autoFit: AutoFit | null = null
  private viewportObserver: IntersectionObserver | null = null
  private detachFocusZoom: (() => void) | null = null
  private stopTrackingZoom: (() => void) | null = null
  private readonly finishedViews = new Set<ModelView>()

  private readonly notices: DiffNotices

  constructor(private readonly options: DiffPanelOptions) {
    this.notices = new DiffNotices(options.label, options.reportContext)
    this.modelView = options.hasNoOldVersion ? 'plain' : 'diff'
    this.changeControls.element.before(filePathLabel(options.filePath))
    if (options.codeToggle) {
      this.toolbar.append(options.codeToggle.element)
    }
    if (options.onOwnPage) {
      this.zoomControls.allowFullScreen(this.root)
    } else {
      this.zoomControls.allowExpanding(this.root)
    }
    this.zoomControls.leaveRoomForBpmnIoLogo(options.differ.showsBpmnIoLogo)
    const largerView = this.zoomControls.largerView
    if (largerView) {
      this.sides.offerEnlarging(largerView, () => this.zoomControls.enlarge())
    }
  }

  mount(container: HTMLElement): this {
    container.append(this.root)
    this.root.dataset.cdTheme = detectHostTheme(this.root)
    this.plainButton.addEventListener('click', () => this.pick('plain'))
    this.diffButton.addEventListener('click', () => this.pick('diff'))
    this.changeControls.showLoading()
    this.show(this.modelView)
    this.autoFit = new AutoFit(this.diagramArea, () => this.visibleViewers())
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
    this.autoFit?.fit()
  }

  zoomBy(factor: number): void {
    this.autoFit?.userMovedView()
    for (const viewer of this.visibleViewers()) {
      viewer?.zoomBy(factor)
    }
  }

  resetZoom(): void {
    this.autoFit?.userMovedView()
    for (const viewer of this.visibleViewers()) {
      ZoomControls.resetZoomOf(viewer)
    }
  }

  destroy(): void {
    this.destroyed = true
    this.stopTrackingZoom?.()
    this.stopTrackingZoom = null
    this.detachFocusZoom?.()
    this.autoFit?.stop()
    this.autoFit = null
    this.viewportObserver?.disconnect()
    this.viewportObserver = null
    this.destroyViewers()
    this.zoomControls.collapse()
    this.root.remove()
  }

  private sidesChanged(): void {
    if (this.destroyed) {
      return
    }
    this.showChanges()
    if (this.modelView === 'diff') {
      this.fit()
      this.trackZoomLevel()
    }
    this.allowHidingCodeWhileDiagramShows()
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
    this.allowHidingCodeWhileDiagramShows()
  }

  private allowHidingCodeWhileDiagramShows(): void {
    const stillLoading = !this.finishedViews.has(this.modelView)
    const showsDiagram = this.visibleViewers().some((viewer) => viewer !== null)
    this.options.codeToggle?.allowHiding(stillLoading || showsDiagram)
  }

  private trackZoomLevel(): void {
    this.stopTrackingZoom?.()
    const viewer = this.modelView === 'diff' ? this.sides.leadingViewer : this.plainCanvas.viewer
    if (!viewer) {
      this.stopTrackingZoom = null
      if (this.finishedViews.has(this.modelView)) {
        this.zoomControls.hide()
      } else {
        this.zoomControls.showLoading()
      }
      return
    }
    const showLevel = () => this.zoomControls.showLevel(viewer.zoomLevel())
    this.stopTrackingZoom = viewer.onViewChange(showLevel)
    showLevel()
  }

  private visibleViewers(): (DiffableViewer | null)[] {
    return this.modelView === 'diff'
      ? this.sides.shownPanes.map((pane) => pane.viewer)
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
    const fallsBackToPlain =
      !this.viewPickedByUser &&
      !this.bothVersionsLoaded(oldModel, newModel) &&
      !this.fileDeleted(oldModel, newModel)
    this.show(fallsBackToPlain ? 'plain' : this.modelView)
  }

  private fileDeleted(oldModel: LoadedModel, newModel: LoadedModel): boolean {
    const oldVersionLoaded = oldModel.status === 'fulfilled' && !!oldModel.value
    const newVersionMissing = newModel.status === 'fulfilled' && newModel.value === null
    return oldVersionLoaded && newVersionMissing
  }

  private async ensureDiffRendered(): Promise<void> {
    if (this.diffRendered || this.destroyed || !this.base || !this.head) {
      return
    }
    this.diffRendered = true
    const { base, head } = this
    const [, , diff] = await Promise.all([
      this.renderPane(this.oldPane, base, 'not in source'),
      this.renderPane(this.newPane, head, 'deleted'),
      this.computeDiff(base, head),
    ])
    if (this.destroyed) {
      this.destroyViewers()
      return
    }
    this.applyInteractive()
    if (this.oldPane.viewer || this.newPane.viewer) {
      this.options.onRendered?.()
    }
    if (!diff) {
      this.changeControls.showDiffUnavailable()
    } else if (this.bothVersionsLoaded(base, head)) {
      this.showDiff(diff)
    } else {
      this.changeControls.clear()
    }
    this.oldPane.reveal()
    this.newPane.reveal()
    this.finishedViews.add('diff')
    if (this.modelView === 'diff') {
      this.fit()
      this.trackZoomLevel()
    }
    this.allowHidingCodeWhileDiagramShows()
  }

  private showDiff(diff: DiagramDiff): void {
    this.oldPane.showDiff(diff)
    this.newPane.showDiff(diff)
    this.diff = diff
    this.showChanges()
  }

  private showChanges(): void {
    if (!this.diff) {
      return
    }
    const diff = this.sides.changesShown(this.diff)
    const viewers = this.sides.shownPanes.map((pane) => pane.viewer)
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
      this.finishedViews.add('plain')
      this.allowHidingCodeWhileDiagramShows()
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
    this.plainCanvas.reveal()
    this.finishedViews.add('plain')
    this.applyInteractive()
    if (viewer) {
      this.options.onRendered?.()
    }
    if (this.modelView === 'plain') {
      viewer?.fit()
      this.trackZoomLevel()
    }
    this.allowHidingCodeWhileDiagramShows()
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
