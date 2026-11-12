import { h } from '../../platform/utils/dom'

const CLOSING_KEYS = ['Enter', 'Escape']

export class AlertPage {
  constructor(
    private readonly query: URLSearchParams,
    private readonly closeWindow: () => void,
  ) {}

  mount(app: HTMLElement): void {
    app.append(
      h('div', { class: 'dialog' }, [
        h('div', { class: 'dialog-head' }, [
          h('img', { class: 'dialog-icon', src: '/icon/icon.svg', alt: '' }),
          h('h1', { text: 'Diagit' }),
        ]),
        h('p', { class: 'message', text: this.query.get('message') ?? '' }),
        h('div', { class: 'dialog-foot' }, [
          h('button', {
            class: 'btn btn-large btn-primary',
            type: 'button',
            text: 'OK',
            onClick: () => this.closeWindow(),
          }),
        ]),
      ]),
    )
    app.ownerDocument.addEventListener('keydown', (event) => {
      if (CLOSING_KEYS.includes(event.key)) {
        this.closeWindow()
      }
    })
  }
}
