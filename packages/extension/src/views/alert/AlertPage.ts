import { h } from '../../platform/utils/dom'

export class AlertPage {
  private readonly okButton = h('button', { class: 'btn primary', type: 'button', text: 'OK' })

  constructor(
    private readonly query: URLSearchParams,
    private readonly closeWindow: () => void,
  ) {}

  mount(app: HTMLElement): void {
    const message = h('p', { class: 'message', text: this.query.get('message') ?? '' })
    this.okButton.addEventListener('click', () => this.closeWindow())
    app.append(message, this.okButton)
    this.okButton.focus()
  }
}
