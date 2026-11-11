import { browser } from 'wxt/browser'
import type { HostPage, ShadowPanel } from '../page/HostPage'
import { SettingsStore } from '../settings/SettingsStore'
import { StarPromptToast } from './StarPromptToast'
import { STORE_LISTINGS } from './storeListings'
import starPromptCss from './starPrompt.css?inline'

export const STAR_PROMPT_TAG = 'diagit-star-prompt'
export const PAGES_BEFORE_PROMPT = 5

const PAGES_WITH_DIAGRAM_KEY = 'reviewPromptPagesWithDiagram'
const DISMISSED_AT_KEY = 'reviewPromptDismissedAt'

interface PagesWithDiagram {
  count: number
}

export class StarPrompt {
  private pending: Promise<void> = Promise.resolve()
  private lastCountedPage: string | null = null
  private toast: ShadowPanel<StarPromptToast> | null = null

  constructor(
    private readonly page: HostPage,
    private readonly store: SettingsStore = new SettingsStore(),
    private readonly extensionId: () => string = () => browser.runtime.id,
  ) {}

  recordRender(): Promise<void> {
    this.pending = this.pending
      .then(() => this.countPage())
      .catch((err) => console.error('[diagit] could not update the star prompt', err))
    return this.pending
  }

  private async countPage(): Promise<void> {
    const currentPage = this.page.location.pathname
    if (this.lastCountedPage === currentPage) return
    this.lastCountedPage = currentPage
    if (await this.wasDismissed()) return
    const count = await this.incrementPagesWithDiagram()
    if (count >= PAGES_BEFORE_PROMPT && !this.isShowing()) await this.show()
  }

  private async incrementPagesWithDiagram(): Promise<number> {
    const stored = await this.store.readRecord<PagesWithDiagram>(PAGES_WITH_DIAGRAM_KEY)
    const count = (stored?.count ?? 0) + 1
    await this.store.writeRecord<PagesWithDiagram>(PAGES_WITH_DIAGRAM_KEY, { count })
    return count
  }

  private isShowing(): boolean {
    return !!this.page.document.querySelector(STAR_PROMPT_TAG)
  }

  private async show(): Promise<void> {
    const toast = new StarPromptToast({
      storeListingUrl: this.storeListingUrl(),
      onDone: () => void this.dismiss(),
    })
    this.toast = await this.page.mountPanel({
      name: STAR_PROMPT_TAG,
      anchor: this.page.document.body,
      append: 'last',
      css: starPromptCss,
      render: (container) => toast.mount(container),
    })
  }

  private storeListingUrl(): string | undefined {
    const extensionId = this.extensionId()
    return STORE_LISTINGS.find((listing) => listing.extensionId === extensionId)?.reviewUrl
  }

  private async dismiss(): Promise<void> {
    this.toast?.remove()
    this.toast = null
    await this.store.writeString(DISMISSED_AT_KEY, new Date().toISOString())
  }

  private async wasDismissed(): Promise<boolean> {
    return !!(await this.store.readString(DISMISSED_AT_KEY))
  }
}
