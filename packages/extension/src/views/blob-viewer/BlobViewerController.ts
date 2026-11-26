import type { BlobPage } from '../../git-hosts/BlobPage'
import { CODE_HIDDEN_ATTRIBUTE, HOST_TAG } from '../../platform/injectedElements'
import type { Notation, NotationLookup } from '../../notations/Notation'
import { allNotations } from '../../notations/allNotations'
import { ModelPanel } from './ModelPanel'
import { PlacementNoticeSlot } from './PlacementNoticeSlot'
import type { HostPage, ShadowPanel } from '../../platform/page/HostPage'
import { DiagramViewsLocalStorage } from '../../platform/settings/DiagramViewsLocalStorage'
import type { ReportContext } from '../../platform/DiagitRepository'
import type { CodeToggle } from '../../platform/ui/CodeToggle'
import { CodeVisibility } from '../../platform/ui/CodeVisibility'

const MOUNT_RETRIES = 12
const RETRY_INTERVAL_MS = 500
const RECHECK_DEBOUNCE_MS = 50
const HIDDEN_CODE_PANEL = `${HOST_TAG}[${CODE_HIDDEN_ATTRIBUTE}]`

type MountOutcome = 'settled' | 'code-not-rendered-yet'

export class BlobViewerController {
  private panel: ShadowPanel<ModelPanel> | null = null
  private readonly placementNotice: PlacementNoticeSlot
  private mountedPath: string | null = null
  private mounting = false
  private restoreAnchor: (() => void) | null = null
  private retryTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly page: HostPage,
    private readonly blobPage: BlobPage,
    private readonly reportContext: ReportContext,
    private readonly notations: NotationLookup = allNotations,
    private readonly diagramViews: DiagramViewsLocalStorage = new DiagramViewsLocalStorage(),
    private readonly codeVisibility: CodeVisibility = new CodeVisibility(),
  ) {
    this.placementNotice = new PlacementNoticeSlot(page, reportContext)
  }

  start(): void {
    this.page.addDocumentStyle(this.blobPage.hiddenCodeCss(HIDDEN_CODE_PANEL))
    void this.codeVisibility.load().then((stopFollowingCodeStart) => {
      if (this.page.isInvalid) {
        stopFollowingCodeStart()
        return
      }
      this.page.onInvalidated(stopFollowingCodeStart)
      this.watchPage()
    })
  }

  private watchPage(): void {
    this.page.onChange(RECHECK_DEBOUNCE_MS, () => {
      if (!this.mounting && this.isOutOfSync()) {
        this.sync()
      }
    })
    this.page.onInvalidated(() => {
      this.stopRetry()
      this.teardown()
    })
    this.sync()
  }

  private sync(): void {
    this.stopRetry()
    let attempts = 0
    void this.render().then((outcome) => {
      if (outcome === 'settled') {
        return
      }
      this.retryTimer = setInterval(() => {
        attempts += 1
        const lastAttempt = attempts >= MOUNT_RETRIES
        void this.render().then((retried) => {
          if (retried === 'settled' || lastAttempt) {
            this.stopRetry()
          }
          if (retried !== 'settled' && lastAttempt) {
            this.showPlacementNotice()
          }
        })
      }, RETRY_INTERVAL_MS)
    })
  }

  private async render(): Promise<MountOutcome> {
    if (this.mounting) {
      return 'settled'
    }
    const { location, document } = this.page
    const notation = this.currentNotation()
    if (!notation) {
      this.teardown()
      return 'settled'
    }
    if (this.isCurrent()) {
      return 'settled'
    }

    const anchor = this.blobPage.findInsertAnchor(document)
    if (!anchor) {
      return 'code-not-rendered-yet'
    }

    this.teardown()
    this.mounting = true
    try {
      const path = location.pathname
      this.mountedPath = path
      const stickyHeaderClearance = this.moveStickyHeaderClearance(anchor)
      const loadXml = this.blobPage.fileLoader(location)
      const filePath = this.blobPage.filePath(location)
      this.panel = await this.page.mountPanel({
        name: HOST_TAG,
        anchor,
        append: 'before',
        css: notation.css,
        render: (container, shadowHost) => {
          container.style.paddingTop = stickyHeaderClearance
          return new ModelPanel({
            notation,
            filePath,
            loadXml,
            reportContext: this.reportContext,
            codeToggle: this.codeToggleFor(path, shadowHost),
            onRendered: () => void this.diagramViews.save(path),
          }).mount(container)
        },
      })
      const navigatedAwayWhileMounting = path !== this.page.location.pathname
      if (navigatedAwayWhileMounting) {
        this.teardown()
      }
    } catch (err) {
      console.error('[diagit] could not mount the diagram viewer', err)
      this.teardown()
    } finally {
      this.mounting = false
    }
    return 'settled'
  }

  private codeToggleFor(path: string, shadowHost: HTMLElement): CodeToggle {
    const code = this.blobPage.findCode(this.page.document)
    return this.codeVisibility.toggleFor({
      key: path,
      hostCode: code ? [code] : [],
      isLinked: this.blobPage.isLinkedToLine(this.page.location),
      hideCode: (hidden) => shadowHost.toggleAttribute(CODE_HIDDEN_ATTRIBUTE, hidden),
    })
  }

  private showPlacementNotice(): void {
    const notation = this.currentNotation()
    const { location } = this.page
    if (notation) {
      void this.placementNotice.show(
        location.pathname,
        notation.descriptor.label,
        this.blobPage.rawUrl(location),
      )
    }
  }

  private currentNotation(): Notation | null {
    const { location } = this.page
    return this.blobPage.isBlob(location) ? this.notations.detect(location.pathname) : null
  }

  private moveStickyHeaderClearance(anchor: HTMLElement): string {
    const clearance = getComputedStyle(anchor).marginTop
    const previousMarginTop = anchor.style.marginTop
    anchor.style.marginTop = '0'
    this.restoreAnchor = () => {
      anchor.style.marginTop = previousMarginTop
    }
    return clearance
  }

  private isCurrent(): boolean {
    return (
      this.mountedPath === this.page.location.pathname &&
      !!this.page.document.querySelector(HOST_TAG)
    )
  }

  private isOutOfSync(): boolean {
    return this.blobPage.showsDiagram(this.page.location)
      ? !this.isCurrent()
      : this.mountedPath !== null
  }

  private teardown(): void {
    this.restoreAnchor?.()
    this.restoreAnchor = null
    this.panel?.remove()
    this.panel = null
    this.mountedPath = null
    this.placementNotice.remove()
  }

  private stopRetry(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer)
    }
    this.retryTimer = null
  }
}
