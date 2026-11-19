import { h } from '../../platform/utils/dom'
import { SIDE_LABEL, type DiffSide, type ShownSides } from './sides'

const SIDES: DiffSide[] = ['old', 'new']

export class SideSwitch {
  readonly element: HTMLElement
  private readonly buttons: Record<DiffSide, HTMLButtonElement>

  constructor(onPick: (side: DiffSide) => void) {
    this.buttons = { old: this.button('old', onPick), new: this.button('new', onPick) }
    this.element = h(
      'div',
      { class: 'diagit-segmented diagit-side-switch', role: 'group', 'aria-label': 'Side' },
      [this.buttons.old, this.buttons.new],
    )
    this.show('both')
  }

  show(sides: ShownSides): void {
    for (const side of SIDES) {
      const pressed = sides === side
      const button = this.buttons[side]
      button.setAttribute('aria-pressed', String(pressed))
      button.title = pressed ? 'Show both sides' : `Show ${SIDE_LABEL[side]} only`
    }
  }

  focus(side: DiffSide): void {
    this.buttons[side].focus({ preventScroll: true })
  }

  private button(side: DiffSide, onPick: (side: DiffSide) => void): HTMLButtonElement {
    return h('button', {
      type: 'button',
      text: SIDE_LABEL[side],
      'data-side': side,
      onClick: () => onPick(side),
    })
  }
}
