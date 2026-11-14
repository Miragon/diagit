import { h } from '../utils/dom'

export class ExpandDialog {
  private readonly dialog = h('dialog', {
    class: 'diagit-expanded',
    onPointerdown: (event: PointerEvent) => {
      this.pressedOnBackdrop = event.target === this.dialog
    },
    onClick: (event: MouseEvent) => this.closeOnBackdropClick(event),
    onCancel: (event: Event) => {
      event.preventDefault()
      this.close()
    },
    onClose: () => {
      if (!this.dialog.open) {
        this.putBack()
      }
    },
  })
  private readonly spot = h('div')
  private pressedOnBackdrop = false

  constructor(
    private readonly panel: HTMLElement,
    private readonly onToggle: (expanded: boolean) => void,
  ) {}

  get isOpen(): boolean {
    return this.spot.isConnected
  }

  toggle(): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  private open(): void {
    this.spot.style.height = `${this.panel.offsetHeight}px`
    this.dialog.dataset.cdTheme = this.panel.dataset.cdTheme
    this.panel.replaceWith(this.spot)
    this.spot.after(this.dialog)
    this.dialog.append(this.panel)
    this.dialog.showModal()
    this.onToggle(true)
  }

  close(): void {
    if (this.dialog.open) {
      this.dialog.close()
    }
    this.putBack()
  }

  private putBack(): void {
    if (!this.isOpen) {
      return
    }
    this.spot.replaceWith(this.panel)
    this.dialog.remove()
    this.onToggle(false)
  }

  private closeOnBackdropClick(event: MouseEvent): void {
    if (this.pressedOnBackdrop && event.target === this.dialog) {
      this.close()
    }
  }
}
