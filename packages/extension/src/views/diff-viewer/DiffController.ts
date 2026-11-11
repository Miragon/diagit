import {
  DiffDataError,
  type ChangedFile,
  type DiffFileBlock,
  type DiffSource,
} from '../../git-hosts/DiffSource'
import { DIFF_ERROR_TAG, DIFF_PANEL_TAG } from '../../platform/injectedElements'
import type { DiagramDiffer, NotationLookup } from '../../notations/Notation'
import { diffableNotations } from '../../notations/diffableNotations'
import { UnrecognizedFileNotices } from './UnrecognizedFileNotices'
import { DiffPanel } from './DiffPanel'
import { ErrorNotice } from '../../platform/ui/ErrorNotice'
import type { HostPage, PanelHandle, ShadowPanel } from '../../platform/page/HostPage'
import { DiagramViewsLocalStorage } from '../../platform/settings/DiagramViewsLocalStorage'
import type { ReportContext } from '../../platform/DiagitRepository'
import diffCss from './diff.css?inline'

const RERUN_DEBOUNCE_MS = 300
const COLLAPSE_DEBOUNCE_MS = 150
const FILE_ROOT_CHANGES: MutationObserverInit = { attributes: true, childList: true, subtree: true }

export class DiffController {
  private readonly mounting = new WeakSet<Element>()
  private readonly erroring = new WeakSet<Element>()
  private readonly shownOnPage = new Map<ShadowPanel<PanelHandle>, () => void>()
  private shownPageKey: string | null = null
  private readonly unrecognizedNotices: UnrecognizedFileNotices

  constructor(
    private readonly page: HostPage,
    private readonly source: DiffSource,
    private readonly reportContext: ReportContext,
    private readonly notations: NotationLookup = diffableNotations,
    private readonly diagramViews: DiagramViewsLocalStorage = new DiagramViewsLocalStorage(),
  ) {
    this.unrecognizedNotices = new UnrecognizedFileNotices(page, notations, reportContext)
  }

  start(): void {
    this.page.onChange(RERUN_DEBOUNCE_MS, () => void this.run())
    void this.run()
  }

  private async run(): Promise<void> {
    const { location, document } = this.page
    const pageKey = this.source.pageKey(location)
    if (!this.isShowing(pageKey)) this.showPage(pageKey)
    this.releaseDetached()
    if (!pageKey) {
      this.unrecognizedNotices.removeAll()
      return
    }
    let blocks: DiffFileBlock[]
    try {
      blocks = await this.source.collect(location, document)
    } catch (err) {
      if (!this.isShowing(pageKey)) return
      if (err instanceof DiffDataError) this.showErrors(err, pageKey)
      else console.error('[diagit] failed to load diff data', err)
      return
    }
    if (!this.isShowing(pageKey)) return
    for (const block of blocks) {
      const differ = this.differFor(block)
      if (!differ || this.wasReplacedByHost(block)) continue
      if (this.mounting.has(block.fileRoot) || this.hasPanel(block)) continue
      block.fileRoot.querySelector(DIFF_ERROR_TAG)?.remove()
      this.mounting.add(block.fileRoot)
      void this.mount(block, differ, pageKey).finally(() => this.mounting.delete(block.fileRoot))
    }
    await this.flagUnrecognizedFiles(location, document)
  }

  private async flagUnrecognizedFiles(location: Location, doc: Document): Promise<void> {
    const files = await this.source.unrecognizedFiles(location, doc).catch(() => null)
    if (files) this.unrecognizedNotices.showOnly(files)
  }

  private showErrors(err: DiffDataError, pageKey: string): void {
    for (const file of err.files) {
      const differ = this.differFor(file)
      if (!differ || this.wasReplacedByHost(file)) continue
      if (this.erroring.has(file.fileRoot) || this.hasPanel(file)) continue
      if (file.fileRoot.querySelector(DIFF_ERROR_TAG)) continue
      this.erroring.add(file.fileRoot)
      void this.mountError(file, err, pageKey).finally(() => this.erroring.delete(file.fileRoot))
    }
  }

  private async mountError(file: ChangedFile, err: DiffDataError, pageKey: string) {
    const label = this.labelFor(file)
    const notice = await ErrorNotice.mountOn(
      this.page,
      { name: DIFF_ERROR_TAG, anchor: file.anchor, append: file.append },
      { title: `${label} diff could not be loaded`, message: err.message, ...err.help },
    )
    this.keepOnPage(notice, pageKey)
  }

  private async mount(block: DiffFileBlock, differ: DiagramDiffer, pageKey: string): Promise<void> {
    const panel = await this.page.mountPanel({
      name: DIFF_PANEL_TAG,
      anchor: block.anchor,
      append: block.append,
      css: [differ.css, diffCss].join('\n'),
      render: (container) =>
        new DiffPanel({
          differ,
          label: this.labelFor(block),
          reportContext: this.reportContext,
          loadOld: block.loadOld,
          loadNew: block.loadNew,
          onRendered: () => void this.diagramViews.save(this.page.location.pathname),
        }).mount(container),
    })
    this.keepOnPage(panel, pageKey, this.mirrorCollapse(panel, block))
  }

  private isShowing(pageKey: string | null): boolean {
    return pageKey === this.shownPageKey
  }

  private showPage(pageKey: string | null): void {
    for (const [shown, stopTracking] of this.shownOnPage) this.release(shown, stopTracking)
    this.shownOnPage.clear()
    this.shownPageKey = pageKey
  }

  private releaseDetached(): void {
    for (const [shown, stopTracking] of this.shownOnPage) {
      if (shown.shadowHost.isConnected) continue
      this.shownOnPage.delete(shown)
      this.release(shown, stopTracking)
    }
  }

  private keepOnPage(
    shown: ShadowPanel<PanelHandle>,
    pageKey: string,
    stopTracking: () => void = () => {},
  ): void {
    if (this.isShowing(pageKey) && shown.shadowHost.isConnected) {
      this.shownOnPage.set(shown, stopTracking)
    } else {
      this.release(shown, stopTracking)
    }
  }

  private release(shown: ShadowPanel<PanelHandle>, stopTracking: () => void): void {
    stopTracking()
    shown.remove()
  }

  private mirrorCollapse(panel: ShadowPanel<DiffPanel>, block: DiffFileBlock): () => void {
    let wasHidden = false
    const sync = () => {
      const collapsed = block.isCollapsed()
      panel.shadowHost.toggleAttribute('data-collapsed', collapsed)
      if (!collapsed && wasHidden) panel.mounted?.refit()
      wasHidden = collapsed
    }
    const stopMirroring = this.page.onElementChange(
      block.fileRoot,
      FILE_ROOT_CHANGES,
      COLLAPSE_DEBOUNCE_MS,
      sync,
    )
    sync()
    return stopMirroring
  }

  private labelFor(file: ChangedFile): string {
    return this.notations.detect(file.path)?.descriptor.label ?? 'Diagram'
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
