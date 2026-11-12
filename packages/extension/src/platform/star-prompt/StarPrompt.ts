import { Star } from 'lucide'
import { browser } from 'wxt/browser'
import type { HostPage, ShadowPanel } from '../page/HostPage'
import { DIAGRAM_VIEWS_KEY, type DiagramViews } from '../settings/DiagramViewsLocalStorage'
import { SettingsStore } from '../settings/SettingsStore'
import { Toast, type ToastAction } from '../ui/Toast'
import { diagitRepository } from '../DiagitRepository'
import { STORE_LISTINGS } from './storeListings'

export const STAR_PROMPT_TAG = 'diagit-star-prompt'
export const PAGES_BEFORE_PROMPT = 5

const DISMISSED_AT_KEY = 'reviewPromptDismissedAt'
const MESSAGE = 'Thanks for using Diagit.'

export class StarPrompt {
  private toast: ShadowPanel<Toast> | null = null
  private showing = false

  constructor(
    private readonly page: HostPage,
    private readonly store: SettingsStore = new SettingsStore(),
    private readonly extensionId: () => string = () => browser.runtime.id,
  ) {}

  start(): void {
    const stopWatchingViews = this.store.onChange(DIAGRAM_VIEWS_KEY, (views) =>
      this.onDiagramViews(views as DiagramViews | undefined).catch((err) =>
        console.error('[diagit] could not show the star prompt', err),
      ),
    )
    const stopWatchingDismissal = this.store.onChange(DISMISSED_AT_KEY, () => this.hide())
    this.page.onInvalidated(() => {
      stopWatchingViews()
      stopWatchingDismissal()
    })
  }

  private async onDiagramViews(views: DiagramViews | undefined): Promise<void> {
    if (!views || views.pageCount < PAGES_BEFORE_PROMPT) {
      return
    }
    if (views.lastPage !== this.page.location.pathname || this.showing) {
      return
    }
    this.showing = true
    if (await this.wasDismissed()) {
      this.showing = false
      return
    }
    await this.show()
  }

  private async show(): Promise<void> {
    this.toast = await Toast.mountOn(this.page, STAR_PROMPT_TAG, {
      tone: 'info',
      icon: Star,
      message: MESSAGE,
      actions: this.actions(),
      onClose: () => void this.dismiss(),
    })
  }

  private actions(): ToastAction[] {
    const star: ToastAction = {
      label: 'Star on GitHub',
      variant: 'primary',
      url: diagitRepository.url,
    }
    const storeListingUrl = this.storeListingUrl()
    const rate: ToastAction[] = storeListingUrl
      ? [{ label: 'Rate Diagit', variant: 'secondary', url: storeListingUrl }]
      : []
    return [star, ...rate]
  }

  private storeListingUrl(): string | undefined {
    const extensionId = this.extensionId()
    return STORE_LISTINGS.find((listing) => listing.extensionId === extensionId)?.reviewUrl
  }

  private hide(): void {
    this.toast?.remove()
    this.toast = null
  }

  private async dismiss(): Promise<void> {
    this.hide()
    await this.store.writeString(DISMISSED_AT_KEY, new Date().toISOString())
  }

  private async wasDismissed(): Promise<boolean> {
    return !!(await this.store.readString(DISMISSED_AT_KEY))
  }
}
