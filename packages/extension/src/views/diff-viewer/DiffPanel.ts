import type { DiagramDiff } from '../../notations/Notation'
import type { DiffLoaders } from '../../git-hosts/DiffSource'
import type { DiagramDiffer, DiffableViewer } from '../../notations/Notation'
import type { PanelHandle } from '../../platform/page/HostPage'
import type { ReportContext } from '../../platform/DiagitRepository'
import { h } from '../../platform/utils/dom'
import { enableFocusZoom } from '../../platform/utils/focusZoom'
import { detectHostTheme } from '../../platform/utils/hostTheme'
import { ZoomControls, type Zoomable } from '../../platform/ui/ZoomControls'
import { ChangeNavigator } from './ChangeNavigator'
import { DiffNotices } from './DiffNotices'
import { DiffPane } from './DiffPane'
import { ViewerCanvas } from './ViewerCanvas'

export interface DiffPanelOptions extends DiffLoaders {
  differ: DiagramDiffer
  label: string
  reportContext: ReportContext
  onRendered?: () => void
}

type ModelView = 'plain' | 'diff'
type LoadedModel = PromiseSettledResult<string | null>

const NO_CHANGES: DiagramDiff = { added: [], removed: [], changed: [], moved: [] }

export class DiffPanel implements PanelHandle, Zoomable {
  private readonly oldPane = new DiffPane('old')
  private readonly newPane = new DiffPane('new')
  private readonly plainCanvas = new ViewerCanvas<DiffableViewer>()
  private readonly plainTab = this.tab('Plain')
  private readonly diffTab = this.tab('Diff')
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
  ])
  private readonly root = h('div', { class: 'diagit-wrap diagit-diff-root' }, [
    h('div', { class: 'diagit-toolbar' }, [
      h('div', { class: 'diagit-tabs' }, [this.plainTab, this.diffTab]),
      new ZoomControls(this).element,
    ]),
    this.diagramArea,
  ])
  private modelView: ModelView = 'plain'
  private head: LoadedModel | null = null
  private plainRendered = false
  private interactive = false
  private destroyed = false
  private resizeObserver: ResizeObserver | null = null
  private detachFocusZoom: (() => void) | null = null

  private readonly notices: DiffNotices

  constructor(private readonly options: DiffPanelOptions) {
    this.notices = new DiffNotices(options.label, options.reportContext)
  }

  mount(container: HTMLElement): this {
    container.append(this.root)
    this.root.dataset.cdTheme = detectHostTheme(this.root)
    this.plainTab.addEventListener('click', () => this.show('plain'))
    this.diffTab.addEventListener('click', () => this.show('diff'))
    this.show('plain')
    this.resizeObserver = new ResizeObserver(() => this.fit())
    this.resizeObserver.observe(this.diagramArea)
    this.detachFocusZoom = enableFocusZoom(this.diagramArea, (active) => {
      this.interactive = active
      this.applyInteractive()
    })
    void this.load()
    return this
  }

  refit(): void {
    this.fit()
  }

  fit(): void {
    for (const viewer of this.visibleViewers()) viewer?.fit()
  }

  zoomBy(factor: number): void {
    for (const viewer of this.visibleViewers()) viewer?.zoomBy(factor)
  }

  destroy(): void {
    this.destroyed = true
    this.detachFocusZoom?.()
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.destroyViewers()
    this.root.remove()
  }

  private show(view: ModelView): void {
    this.modelView = view
    const isDiff = view === 'diff'
    this.diffGrid.style.display = isDiff ? '' : 'none'
    this.plainGrid.style.display = isDiff ? 'none' : ''
    this.diffTab.classList.toggle('is-active', isDiff)
    this.plainTab.classList.toggle('is-active', !isDiff)
    if (!isDiff) void this.ensurePlainRendered()
    this.fit()
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

  private async load(): Promise<void> {
    const { loadOld, loadNew } = this.options
    const [oldModel, newModel] = await Promise.allSettled([
      Promise.resolve().then(loadOld),
      Promise.resolve().then(loadNew),
    ])
    if (this.destroyed) return
    this.head = newModel

    await this.renderPane(this.oldPane, oldModel, 'not in source')
    await this.renderPane(this.newPane, newModel, 'deleted')
    if (this.destroyed) {
      this.destroyViewers()
      return
    }
    this.applyInteractive()
    if (this.oldPane.viewer || this.newPane.viewer) this.options.onRendered?.()

    const diff = await this.computeDiff(oldModel, newModel)
    if (this.destroyed) return
    for (const pane of [this.oldPane, this.newPane]) {
      if (diff) pane.showDiff(diff)
      else pane.showDiffUnavailable()
    }
    const navigator = ChangeNavigator.forDiff(diff ?? NO_CHANGES, [
      this.oldPane.viewer,
      this.newPane.viewer,
    ])
    this.oldPane.bind(navigator)
    this.newPane.bind(navigator)

    if (this.modelView === 'plain') void this.ensurePlainRendered()
    else this.fit()
  }

  private async renderPane(pane: DiffPane, model: LoadedModel, emptyLabel: string): Promise<void> {
    if (model.status === 'rejected') pane.showError(this.notices.notLoaded(pane.side, model.reason))
    else await pane.render(this.options.differ, model.value, emptyLabel, this.notices)
  }

  private async ensurePlainRendered(): Promise<void> {
    if (this.plainRendered || this.destroyed || !this.head) return
    this.plainRendered = true
    if (this.head.status === 'rejected') {
      this.plainCanvas.showError(this.notices.notLoaded('new', this.head.reason))
      return
    }
    const { differ } = this.options
    const viewer = await this.plainCanvas.render(
      (canvas, xml) => differ.createViewer(canvas, xml),
      this.head.value,
      'No current model (file deleted).',
      this.notices,
    )
    this.applyInteractive()
    if (this.modelView === 'plain') viewer?.fit()
  }

  private async computeDiff(
    oldModel: LoadedModel,
    newModel: LoadedModel,
  ): Promise<DiagramDiff | null> {
    if (oldModel.status === 'rejected' || newModel.status === 'rejected') return null
    if (!oldModel.value || !newModel.value) return NO_CHANGES
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

  private tab(text: string): HTMLButtonElement {
    return h('button', { class: 'diagit-tab', type: 'button', text })
  }
}
