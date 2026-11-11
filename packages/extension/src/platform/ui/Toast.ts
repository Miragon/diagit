import { X, type IconNode } from 'lucide'
import type { HostPage, PanelHandle, ShadowPanel } from '../page/HostPage'
import { h } from '../utils/dom'
import { detectHostTheme } from '../utils/hostTheme'
import { lucideIcon } from '../utils/lucideIcon'
import toastCss from './toast.css?inline'

export interface ToastAction {
  label: string
  variant: 'primary' | 'secondary'
  url: string
}

export interface ToastOptions {
  tone: 'info' | 'danger'
  icon: IconNode
  title?: string
  message: string
  actions: ToastAction[]
  onClose: () => void
}

const VARIANT_CLASS: Record<ToastAction['variant'], string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
}

export class Toast implements PanelHandle {
  private readonly announcement = h('p', {
    class: 'diagit-toast-message',
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
    this.root = h('div', { class: 'diagit-toast', 'data-tone': options.tone }, [
      lucideIcon(options.icon, 'diagit-toast-icon'),
      h('div', { class: 'diagit-toast-text' }, [
        ...(options.title ? [h('p', { class: 'diagit-toast-title', text: options.title })] : []),
        this.announcement,
      ]),
      h('div', { class: 'diagit-toast-actions' }, [
        ...options.actions.map((action) => this.actionButton(action)),
        this.closeButton(),
      ]),
    ])
  }

  mount(container: HTMLElement): this {
    container.append(this.root)
    this.root.dataset.cdTheme = detectHostTheme(this.root)
    setTimeout(() => {
      this.announcement.textContent = this.options.message
    })
    return this
  }

  destroy(): void {
    this.root.remove()
  }

  private actionButton({ label, variant, url }: ToastAction): HTMLButtonElement {
    return h('button', {
      class: `btn btn-small ${VARIANT_CLASS[variant]}`,
      type: 'button',
      text: label,
      onClick: () => {
        window.open(url, '_blank', 'noopener')
        this.options.onClose()
      },
    })
  }

  private closeButton(): HTMLButtonElement {
    return h(
      'button',
      {
        class: 'btn btn-icon',
        type: 'button',
        title: 'Close',
        'aria-label': 'Close',
        onClick: () => this.options.onClose(),
      },
      [lucideIcon(X)],
    )
  }
}
