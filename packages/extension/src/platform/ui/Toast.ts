import { X, type IconNode } from 'lucide'
import type { HostPage, PanelHandle, ShadowPanel } from '../page/HostPage'
import { h } from '../utils/dom'
import { detectHostTheme } from '../utils/hostTheme'
import { lucideIcon } from '../utils/lucideIcon'
import { Notice, type NoticeTone } from './Notice'
import toastCss from './toast.css?inline'

export type ToastAction = {
  label: string
  icon?: IconNode
  variant: 'primary' | 'secondary'
} & ({ url: string } | { onClick: () => void })

export interface ToastOptions {
  tone: NoticeTone
  title: string
  body: string
  actions: ToastAction[]
  onClose: () => void
}

const VARIANT_CLASS: Record<ToastAction['variant'], string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
}

export class Toast implements PanelHandle {
  private readonly announcement = h('p', {
    class: 'diagit-notice-body',
    role: 'status',
    'aria-live': 'polite',
  })
  private readonly root: HTMLElement

  static mountOn(page: HostPage, name: string, options: ToastOptions): Promise<ShadowPanel<Toast>> {
    return page.mountPanel({
      name,
      anchor: page.document.body,
      append: 'last',
      css: toastCss,
      render: (container) => new Toast(options).mount(container),
    })
  }

  constructor(private readonly options: ToastOptions) {
    this.root = h('div', { class: 'diagit-notice diagit-toast', 'data-tone': options.tone }, [
      lucideIcon(Notice.toneIcon(options.tone), 'diagit-notice-icon'),
      h('p', { class: 'diagit-notice-title', text: options.title }),
      this.announcement,
      h('div', { class: 'diagit-notice-actions' }, [
        ...options.actions.map((action) => this.actionButton(action)),
      ]),
      this.closeButton(),
    ])
  }

  mount(container: HTMLElement): this {
    container.append(this.root)
    this.root.dataset.cdTheme = detectHostTheme(this.root)
    setTimeout(() => {
      this.announcement.textContent = this.options.body
    })
    return this
  }

  destroy(): void {
    this.root.remove()
  }

  private actionButton(action: ToastAction): HTMLButtonElement {
    return h(
      'button',
      {
        class: `btn btn-small ${VARIANT_CLASS[action.variant]}`,
        type: 'button',
        onClick: () => {
          if ('url' in action) {
            window.open(action.url, '_blank', 'noopener')
          } else {
            action.onClick()
          }
          this.options.onClose()
        },
      },
      [...(action.icon ? [lucideIcon(action.icon)] : []), action.label],
    )
  }

  private closeButton(): HTMLButtonElement {
    return h(
      'button',
      {
        class: 'btn btn-icon btn-small diagit-toast-close',
        type: 'button',
        title: 'Close',
        'aria-label': 'Close',
        onClick: () => this.options.onClose(),
      },
      [lucideIcon(X)],
    )
  }
}
