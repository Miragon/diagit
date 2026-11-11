import {
  DiffDataError,
  type ChangedFile,
  type DiffFileBlock,
  type DiffSource,
} from '../../git-hosts/DiffSource'
import { DIFF_ERROR_TAG, DIFF_PANEL_TAG } from '../../platform/injectedElements'
import type { DiagramDiffer, NotationLookup } from '../../notations/Notation'
import { diffableNotations } from '../../notations/diffableNotations'
import { DiffErrorNotice } from './DiffErrorNotice'
import { DiffPanel } from './DiffPanel'
import type { HostPage, ShadowPanel } from '../../platform/page/HostPage'
import { DiagramViewsLocalStorage } from '../../platform/settings/DiagramViewsLocalStorage'
import diffCss from './diff.css?inline'

const RERUN_DEBOUNCE_MS = 300
const COLLAPSE_DEBOUNCE_MS = 150
const FILE_ROOT_CHANGES: MutationObserverInit = { attributes: true, childList: true, subtree: true }

export class DiffController {
  private readonly mounting = new WeakSet<Element>()
  private readonly erroring = new WeakSet<Element>()

  constructor(
    private readonly page: HostPage,
    private readonly source: DiffSource,
    private readonly notations: NotationLookup = diffableNotations,
    private readonly diagramViews: DiagramViewsLocalStorage = new DiagramViewsLocalStorage(),
  ) {}

  start(): void {
    this.page.onChange(RERUN_DEBOUNCE_MS, () => void this.run())
    void this.run()
  }

  private async run(): Promise<void> {
    const { location, document } = this.page
    if (!this.source.pageKey(location)) return
    let blocks: DiffFileBlock[]
    try {
      blocks = await this.source.collect(location, document)
    } catch (err) {
      if (err instanceof DiffDataError) this.showErrors(err)
      else console.error('[diagit] failed to load diff data', err)
      return
    }
    for (const block of blocks) {
      const differ = this.differFor(block)
      if (!differ || this.wasReplacedByHost(block)) continue
      if (this.mounting.has(block.fileRoot) || this.hasPanel(block)) continue
      block.fileRoot.querySelector(DIFF_ERROR_TAG)?.remove()
      this.mounting.add(block.fileRoot)
      void this.mount(block, differ).finally(() => this.mounting.delete(block.fileRoot))
    }
  }

  private showErrors(err: DiffDataError): void {
    for (const file of err.files) {
      const differ = this.differFor(file)
      if (!differ || this.wasReplacedByHost(file)) continue
      if (this.erroring.has(file.fileRoot) || this.hasPanel(file)) continue
      if (file.fileRoot.querySelector(DIFF_ERROR_TAG)) continue
      this.erroring.add(file.fileRoot)
      void this.mountError(file, differ, err).finally(() => this.erroring.delete(file.fileRoot))
    }
  }

  private async mountError(file: ChangedFile, differ: DiagramDiffer, err: DiffDataError) {
    const label = this.notations.detect(file.path)?.descriptor.label ?? 'Diagram'
    const notice = new DiffErrorNotice({
      title: `${label} diff unavailable`,
      message: err.message,
      hint: err.hint,
    })
    const panel = await this.page.mountPanel({
      name: DIFF_ERROR_TAG,
      anchor: file.anchor,
      append: file.append,
      css: [differ.css, diffCss].join('\n'),
      render: (container) => notice.mount(container),
    })
    this.page.onInvalidated(() => panel.remove())
  }

  private async mount(block: DiffFileBlock, differ: DiagramDiffer): Promise<void> {
    const panel = await this.page.mountPanel({
      name: DIFF_PANEL_TAG,
      anchor: block.anchor,
      append: block.append,
      css: [differ.css, diffCss].join('\n'),
      render: (container) =>
        new DiffPanel({
          differ,
          loadOld: block.loadOld,
          loadNew: block.loadNew,
          onRendered: () => void this.diagramViews.save(this.page.location.pathname),
        }).mount(container),
    })
    this.page.onInvalidated(() => panel.remove())
    this.mirrorCollapse(panel, block)
  }

  private mirrorCollapse(panel: ShadowPanel<DiffPanel>, block: DiffFileBlock): void {
    let wasHidden = false
    const sync = () => {
      const collapsed = block.isCollapsed()
      panel.shadowHost.toggleAttribute('data-collapsed', collapsed)
      if (!collapsed && wasHidden) panel.mounted?.refit()
      wasHidden = collapsed
    }
    this.page.onElementChange(block.fileRoot, FILE_ROOT_CHANGES, COLLAPSE_DEBOUNCE_MS, sync)
    sync()
  }

  private differFor(file: ChangedFile): DiagramDiffer | null {
    return this.notations.detect(file.path)?.differ ?? null
  }

  private wasReplacedByHost(file: ChangedFile): boolean {
    return !file.anchor.isConnected
  }

  private hasPanel(file: ChangedFile): boolean {
    return !!file.fileRoot.querySelector(DIFF_PANEL_TAG)
  }
}
