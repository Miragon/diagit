import { Maximize, Minus, Plus, type IconNode } from 'lucide'
import { h } from '../utils/dom'
import { lucideIcon } from '../utils/lucideIcon'

export interface Zoomable {
  zoomBy(factor: number): void
  fit(): void
}

const ZOOM_STEP = 1.2

export class ZoomControls {
  readonly element: HTMLElement

  constructor(target: Zoomable) {
    this.element = h('div', { class: 'diagit-controls', role: 'group', 'aria-label': 'Zoom' }, [
      this.button('Zoom out', Minus, () => target.zoomBy(1 / ZOOM_STEP)),
      this.button('Zoom in', Plus, () => target.zoomBy(ZOOM_STEP)),
      h('span', { class: 'diagit-controls-divider', 'aria-hidden': 'true' }),
      this.button('Fit to view', Maximize, () => target.fit()),
    ])
  }

  private button(label: string, icon: IconNode, onClick: () => void): HTMLButtonElement {
    return h(
      'button',
      { class: 'btn btn-icon', type: 'button', title: label, 'aria-label': label, onClick },
      [lucideIcon(icon)],
    )
  }
}
