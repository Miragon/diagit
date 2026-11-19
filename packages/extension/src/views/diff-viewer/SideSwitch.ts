import { h } from '../../platform/utils/dom'
import type { DiffSide } from './DiffNotices'
import { SIDE_LABEL, type ShownSides } from './sides'

const SIDES: DiffSide[] = ['old', 'new']

export class SideSwitch {
  readonly element: HTMLElement
  private readonly buttons: Record<DiffSide, HTMLButtonElement>
  private shownSides: ShownSides = 'both'

  constructor(private readonly onPick: (sides: ShownSides) => void) {
    this.buttons = { old: this.button('old'), new: this.button('new') }
    this.element = h(
      'div',
      { class: 'diagit-segmented diagit-side-switch', role: 'group', 'aria-label': 'Side' },
      [this.buttons.old, this.buttons.new],
    )
    this.show('both')
  }

  show(sides: ShownSides): void {
    this.shownSides = sides
    for (const side of SIDES) {
      const pressed = sides === side
      const button = this.buttons[side]
      button.setAttribute('aria-pressed', String(pressed))
      button.title = pressed ? 'Show both sides' : `Show ${SIDE_LABEL[side]} only`
    }
  }

  focusPressed(): void {
    if (this.shownSides !== 'both') {
      this.buttons[this.shownSides].focus({ preventScroll: true })
    }
  }

  private button(side: DiffSide): HTMLButtonElement {
    return h('button', {
      type: 'button',
      text: SIDE_LABEL[side],
      onClick: () => this.onPick(this.shownSides === side ? 'both' : side),
    })
  }
}
