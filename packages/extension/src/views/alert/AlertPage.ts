import { h } from '../../platform/utils/dom'

const CLOSING_KEYS = ['Enter', 'Escape']
const TITLE_ID = 'alert-title'
const MESSAGE_ID = 'alert-message'

export class AlertPage {
  constructor(
    private readonly query: URLSearchParams,
    private readonly closeWindow: () => void,
  ) {}

  mount(app: HTMLElement): void {
    const dialog = h(
      'div',
      {
        class: 'dialog',
        role: 'alertdialog',
        'aria-labelledby': TITLE_ID,
        'aria-describedby': MESSAGE_ID,
        tabindex: '-1',
      },
      [
        h('div', { class: 'dialog-head' }, [
          h('img', { class: 'dialog-icon', src: '/icon/icon.svg', alt: '' }),
          h('h1', { id: TITLE_ID, text: 'Diagit' }),
        ]),
        h('p', { id: MESSAGE_ID, class: 'message', text: this.query.get('message') ?? '' }),
        h('div', { class: 'dialog-foot' }, [
          h('button', {
            class: 'btn btn-large btn-primary',
            type: 'button',
            text: 'OK',
            onClick: () => this.closeWindow(),
          }),
        ]),
      ],
    )
    app.append(dialog)
    dialog.focus()
    app.ownerDocument.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLButtonElement) {
        return
      }
      if (CLOSING_KEYS.includes(event.key)) {
        this.closeWindow()
      }
    })
  }
}
