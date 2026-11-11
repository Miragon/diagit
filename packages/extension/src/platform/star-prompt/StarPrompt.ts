import { browser } from 'wxt/browser'
import type { HostPage, ShadowPanel } from '../page/HostPage'
import { SettingsStore } from '../settings/SettingsStore'
import { StarPromptToast } from './StarPromptToast'
import { STORE_LISTING_BY_EXTENSION_ID } from './storeListings'
import starPromptCss from './starPrompt.css?inline'

export const STAR_PROMPT_TAG = 'diagit-star-prompt'
export const RENDERS_BEFORE_PROMPT = 5

const STATE_KEY = 'reviewPrompt'

interface StarPromptState {
  renderCount: number
  dismissed: boolean
}

const NEVER_PROMPTED: StarPromptState = { renderCount: 0, dismissed: false }

export class StarPrompt {
  private pending: Promise<void> = Promise.resolve()
  private toast: ShadowPanel<StarPromptToast> | null = null

  constructor(
    private readonly page: HostPage,
    private readonly store: SettingsStore = new SettingsStore(),
    private readonly extensionId: () => string = () => browser.runtime.id,
  ) {}

  recordRender(): Promise<void> {
    this.pending = this.pending
      .then(() => this.countRender())
      .catch((err) => console.error('[diagit] could not update the star prompt', err))
    return this.pending
  }

  private async countRender(): Promise<void> {
    if (this.toast) return
    const state = await this.readState()
    if (state.dismissed) return
    const renderCount = state.renderCount + 1
    await this.store.writeRecord(STATE_KEY, { ...state, renderCount })
    if (renderCount >= RENDERS_BEFORE_PROMPT) await this.show()
  }

  private async show(): Promise<void> {
    const toast = new StarPromptToast({
      storeListingUrl: STORE_LISTING_BY_EXTENSION_ID[this.extensionId()],
      onDone: () => void this.dismiss(),
    })
    this.toast = await this.page.mountPanel({
      name: STAR_PROMPT_TAG,
      anchor: this.page.document.body,
      append: 'first',
      css: starPromptCss,
      render: (container) => toast.mount(container),
    })
    this.page.onInvalidated(() => this.toast?.remove())
  }

  private async dismiss(): Promise<void> {
    this.toast?.remove()
    const state = await this.readState()
    await this.store.writeRecord(STATE_KEY, { ...state, dismissed: true })
  }

  private async readState(): Promise<StarPromptState> {
    return (await this.store.readRecord<StarPromptState>(STATE_KEY)) ?? NEVER_PROMPTED
  }
}
