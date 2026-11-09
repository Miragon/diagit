import { PLACEMENT_NOTICE_TAG } from '../../platform/injectedElements'
import type { HostPage, ShadowPanel } from '../../platform/page/HostPage'
import { PlacementNotice } from './PlacementNotice'
import placementNoticeCss from './placementNotice.css?inline'

export class PlacementNoticeSlot {
  private notice: ShadowPanel<PlacementNotice> | null = null
  private shownPath: string | null = null
  private dismissedPath: string | null = null

  constructor(private readonly page: HostPage) {}

  async show(path: string, label: string): Promise<void> {
    if (this.shownPath === path || this.dismissedPath === path) return
    this.shownPath = path
    const notice = await this.page.mountPanel({
      name: PLACEMENT_NOTICE_TAG,
      anchor: this.page.document.body,
      append: 'last',
      css: placementNoticeCss,
      render: (container) =>
        new PlacementNotice({ label, onDismiss: () => this.dismiss(path) }).mount(container),
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
