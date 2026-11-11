import { CircleAlert } from 'lucide'
import { PLACEMENT_NOTICE_TAG } from '../../platform/injectedElements'
import type { HostPage, ShadowPanel } from '../../platform/page/HostPage'
import { Toast } from '../../platform/ui/Toast'
import { diagitRepository } from '../../platform/DiagitRepository'

export class PlacementNoticeSlot {
  private notice: ShadowPanel<Toast> | null = null
  private shownPath: string | null = null
  private dismissedPath: string | null = null

  constructor(private readonly page: HostPage) {}

  async show(path: string, label: string): Promise<void> {
    if (this.shownPath === path || this.dismissedPath === path) return
    this.shownPath = path
    const notice = await Toast.mountOn(this.page, PLACEMENT_NOTICE_TAG, {
      tone: 'danger',
      icon: CircleAlert,
      title: `${label} view could not be added`,
      message: `Diagit cannot find where to show this ${label} model. The page layout has probably changed.`,
      actions: [
        {
          label: 'Report this problem',
          variant: 'secondary',
          url: diagitRepository.problemReportUrl(
            `${label} view not added to a file page`,
            `Diagit showed "${label} view could not be added" on a file page.`,
          ),
        },
      ],
      onClose: () => this.dismiss(path),
    })
    if (this.shownPath === path) this.notice = notice
    else notice.remove()
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
}
