import type { DiagramDiff } from '../../notations/Notation'
import type { DiffLoaders } from '../../git-hosts/DiffSource'
import type { DiagramDiffer, DiffableViewer } from '../../notations/Notation'
import type { PanelHandle } from '../../platform/page/HostPage'
import { h } from '../../platform/utils/dom'
import { enableFocusZoom } from '../../platform/utils/focusZoom'
import { detectHostTheme } from '../../platform/utils/hostTheme'
import { ZoomControls, type Zoomable } from '../../platform/ui/ZoomControls'
import { ChangeNavigator } from './ChangeNavigator'
import { DiffPane } from './DiffPane'
import { ViewerCanvas } from './ViewerCanvas'

export interface DiffPanelOptions extends DiffLoaders {
  differ: DiagramDiffer
  onRendered?: () => void
}

type ModelView = 'plain' | 'diff'

const NO_CHANGES: DiagramDiff = { added: [], removed: [], changed: [], moved: [] }

export class DiffPanel implements PanelHandle, Zoomable {
  private readonly oldPane = new DiffPane('old')
  private readonly newPane = new DiffPane('new')
  private readonly plainCanvas = new ViewerCanvas<DiffableViewer>()
  private readonly plainTab = this.tab('Plain')
  private readonly diffTab = this.tab('Diff')
  private readonly diffGrid = h('div', { class: 'git-diagram-di-grid' }, [
    this.oldPane.element,
    this.newPane.element,
  ])
  private readonly plainGrid = h('div', { class: 'git-diagram-di-grid' }, [
    h('div', { class: 'git-diagram-di-pane git-diagram-di-single' }, [this.plainCanvas.element]),
  ])
  private readonly diagramArea = h('div', { class: 'git-diagram-di-area' }, [
    this.diffGrid,
    this.plainGrid,
  ])
  private readonly root = h('div', { class: 'git-diagram-wrap git-diagram-di-root' }, [
    h('div', { class: 'git-diagram-toolbar' }, [
      h('div', { class: 'git-diagram-tabs' }, [this.plainTab, this.diffTab]),
      new ZoomControls(this).element,
    ]),
    this.diagramArea,
  ])
  private modelView: ModelView = 'plain'
  private headXml: string | null = null
  private headLoaded = false
  private plainRendered = false
  private interactive = false
  private destroyed = false
  private resizeObserver: ResizeObserver | null = null
  private detachFocusZoom: (() => void) | null = null

  constructor(private readonly options: DiffPanelOptions) {}

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
    const [oldXml, newXml] = await Promise.all([
      this.loadOrNull(this.options.loadOld),
      this.loadOrNull(this.options.loadNew),
    ])
    if (this.destroyed) return
    this.headXml = newXml
    this.headLoaded = true

    const { differ } = this.options
    await this.oldPane.render(differ, oldXml, 'not in source')
    await this.newPane.render(differ, newXml, 'deleted')
    if (this.destroyed) {
      this.destroyViewers()
      return
    }
    this.applyInteractive()
    if (this.oldPane.viewer || this.newPane.viewer) this.options.onRendered?.()

    const diff = oldXml && newXml ? await this.diffOrNoChanges(oldXml, newXml) : NO_CHANGES
    if (this.destroyed) return
    this.oldPane.showDiff(diff)
    this.newPane.showDiff(diff)
    const navigator = ChangeNavigator.forDiff(diff, [this.oldPane.viewer, this.newPane.viewer])
    this.oldPane.bind(navigator)
    this.newPane.bind(navigator)

    if (this.modelView === 'plain') void this.ensurePlainRendered()
    else this.fit()
  }

  private async ensurePlainRendered(): Promise<void> {
    if (this.plainRendered || this.destroyed || !this.headLoaded) return
    this.plainRendered = true
    const { differ } = this.options
    const viewer = await this.plainCanvas.render(
      (canvas, xml) => differ.createViewer(canvas, xml),
      this.headXml,
      'No current model (file deleted).',
    )
    this.applyInteractive()
    if (this.modelView === 'plain') viewer?.fit()
  }

  private async diffOrNoChanges(oldXml: string, newXml: string): Promise<DiagramDiff> {
    try {
      return await this.options.differ.diff(oldXml, newXml)
    } catch {
      return NO_CHANGES
    }
  }

  private async loadOrNull(load: () => Promise<string | null>): Promise<string | null> {
    try {
      return await load()
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
    return h('button', { class: 'git-diagram-tab', type: 'button', text })
  }
}
