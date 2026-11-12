import { Minus, Plus, type IconNode } from 'lucide'
import { h } from '../utils/dom'
import { lucideIcon } from '../utils/lucideIcon'

export interface Zoomable {
  zoomBy(factor: number): void
  resetZoom(): void
  fit(): void
}

const ZOOM_STEP = 1.2
const RESET_ZOOM = 'Reset zoom'
const UNKNOWN_LEVEL = '–'

export class ZoomControls {
  readonly element: HTMLElement
  private readonly levelButton: HTMLButtonElement

  constructor(target: Zoomable) {
    this.levelButton = h('button', {
      class: 'btn btn-ghost diagit-zoom-level',
      type: 'button',
      title: RESET_ZOOM,
      onClick: () => target.resetZoom(),
    })
    this.element = h('div', { class: 'diagit-zoom', role: 'group', 'aria-label': 'Zoom' }, [
      this.iconButton('Zoom out', Minus, () => target.zoomBy(1 / ZOOM_STEP)),
      this.levelButton,
      this.iconButton('Zoom in', Plus, () => target.zoomBy(ZOOM_STEP)),
      h('span', { class: 'diagit-zoom-divider', 'aria-hidden': 'true' }),
      h('button', {
        class: 'btn btn-ghost diagit-zoom-fit',
        type: 'button',
        text: 'Fit',
        title: 'Fit to view',
        'aria-label': 'Fit to view',
        onClick: () => target.fit(),
      }),
    ])
    this.showLevel(null)
  }

  showLevel(level: number | null): void {
    const known = level !== null && Number.isFinite(level)
    const text = known ? `${Math.round(level * 100)}%` : UNKNOWN_LEVEL
    this.levelButton.textContent = text
    this.levelButton.disabled = !known
    this.levelButton.setAttribute('aria-label', known ? `${RESET_ZOOM}, ${text}` : RESET_ZOOM)
  }

  private iconButton(label: string, icon: IconNode, onClick: () => void): HTMLButtonElement {
    return h(
      'button',
      { class: 'btn btn-icon', type: 'button', title: label, 'aria-label': label, onClick },
      [lucideIcon(icon)],
    )
  }
}
