import { Star, X } from 'lucide'
import type { PanelHandle } from '../page/HostPage'
import { h } from '../utils/dom'
import { detectHostTheme } from '../utils/hostTheme'
import { lucideIcon } from '../utils/lucideIcon'
import { GITHUB_REPOSITORY_URL } from './storeListings'

const MESSAGE = 'Thanks for using Diagit.'

export interface StarPromptToastOptions {
  storeListingUrl: string | undefined
  onDone: () => void
}

export class StarPromptToast implements PanelHandle {
  private readonly announcement = h('p', {
    class: 'diagit-toast-text',
    role: 'status',
    'aria-live': 'polite',
  })
  private readonly root: HTMLElement

  constructor(private readonly options: StarPromptToastOptions) {
    this.root = h('div', { class: 'diagit-toast' }, [
      lucideIcon(Star, 'diagit-toast-icon'),
      this.announcement,
      h('div', { class: 'diagit-toast-actions' }, this.actions()),
    ])
  }

  mount(container: HTMLElement): this {
    container.append(this.root)
    this.root.dataset.cdTheme = detectHostTheme(this.root)
    setTimeout(() => {
      this.announcement.textContent = MESSAGE
    })
    return this
  }

  destroy(): void {
    this.root.remove()
  }

  private actions(): HTMLButtonElement[] {
    const { storeListingUrl } = this.options
    const star = this.openButton('Star on GitHub', 'diagit-toast-primary', GITHUB_REPOSITORY_URL)
    const rate = storeListingUrl
      ? [this.openButton('Rate Diagit', 'diagit-toast-secondary', storeListingUrl)]
      : []
    const close = h(
      'button',
      {
        class: 'diagit-toast-close',
        type: 'button',
        title: 'Close',
        'aria-label': 'Close',
        onClick: () => this.options.onDone(),
      },
      [lucideIcon(X)],
    )
    return [star, ...rate, close]
  }

  private openButton(label: string, variant: string, url: string): HTMLButtonElement {
    return h('button', {
      class: variant,
      type: 'button',
      text: label,
      onClick: () => {
        window.open(url, '_blank', 'noopener')
        this.options.onDone()
      },
    })
  }
}
