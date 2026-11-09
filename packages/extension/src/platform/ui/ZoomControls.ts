import { createElement, Maximize, Minus, Plus, type IconNode } from 'lucide'
import { h } from '../utils/dom'

export interface Zoomable {
  zoomBy(factor: number): void
  fit(): void
}

const ZOOM_STEP = 1.2
const ICON_STROKE_WIDTH = 2.5

export class ZoomControls {
  readonly element: HTMLElement

  constructor(target: Zoomable) {
    this.element = h(
      'div',
      { class: 'git-diagram-controls', role: 'group', 'aria-label': 'Zoom' },
      [
        this.button('Zoom out', Minus, () => target.zoomBy(1 / ZOOM_STEP)),
        this.button('Zoom in', Plus, () => target.zoomBy(ZOOM_STEP)),
        h('span', { class: 'git-diagram-controls-divider', 'aria-hidden': 'true' }),
        this.button('Fit to view', Maximize, () => target.fit()),
      ],
    )
  }

  private button(label: string, icon: IconNode, onClick: () => void): HTMLButtonElement {
    const svg = createElement(icon, { 'stroke-width': ICON_STROKE_WIDTH, 'aria-hidden': 'true' })
    return h(
      'button',
      { class: 'git-diagram-btn', type: 'button', title: label, 'aria-label': label, onClick },
      [svg],
    )
  }
}
