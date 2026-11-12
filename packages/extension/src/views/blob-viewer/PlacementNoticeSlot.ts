import { CircleAlert } from 'lucide'
import { browser } from 'wxt/browser'
import { PLACEMENT_NOTICE_TAG } from '../../platform/injectedElements'
import type { HostPage, ShadowPanel } from '../../platform/page/HostPage'
import { BackgroundClient } from '../../platform/messaging/BackgroundClient'
import { Toast, type ToastAction } from '../../platform/ui/Toast'
import { diagitRepository, type ReportContext } from '../../platform/DiagitRepository'

export class PlacementNoticeSlot {
  private notice: ShadowPanel<Toast> | null = null
  private shownPath: string | null = null
  private dismissedPath: string | null = null

  constructor(
    private readonly page: HostPage,
    private readonly reportContext: ReportContext,
  ) {}

  async show(path: string, label: string, rawUrl: string): Promise<void> {
    if (this.shownPath === path || this.dismissedPath === path) {
      return
    }
    this.shownPath = path
    const notice = await Toast.mountOn(this.page, PLACEMENT_NOTICE_TAG, {
      tone: 'danger',
      icon: CircleAlert,
      title: `${label} view could not be added`,
      message: `Diagit cannot find where to show this ${label} model. The page layout has probably changed.`,
      actions: [
        ...this.openInViewer(rawUrl),
        {
          label: 'Report this problem',
          variant: 'secondary',
          url: diagitRepository.problemReportUrl(
            `${label} view not added to a file page`,
            `Diagit showed "${label} view could not be added" on a file page.`,
            this.reportContext,
          ),
        },
      ],
      onClose: () => this.dismiss(path),
    })
    if (this.shownPath === path) {
      this.notice = notice
    } else {
      notice.remove()
    }
  }

  remove(): void {
    this.notice?.remove()
    this.notice = null
    this.shownPath = null
  }

  private dismiss(path: string): void {
    this.dismissedPath = path
    this.remove()
  }

  private openInViewer(rawUrl: string): ToastAction[] {
    if (browser.extension.inIncognitoContext) {
      return []
    }
    return [
      {
        label: 'Open in Diagit',
        variant: 'primary',
        onClick: () => void new BackgroundClient().openViewer(rawUrl),
      },
    ]
  }
}
