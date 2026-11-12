import { Minus, Plus, type IconNode } from 'lucide'
import { h } from '../utils/dom'
import { lucideIcon } from '../utils/lucideIcon'

export interface Zoomable {
  zoomBy(factor: number): void
  resetZoom(): void
  fit(): void
}

interface ZoomedViewer {
  zoomBy(factor: number): void
  zoomLevel(): number | null
}

const ZOOM_STEP = 1.2
const RESET_ZOOM = 'Reset zoom'

export class ZoomControls {
  readonly element: HTMLElement
  private readonly levelButton: HTMLButtonElement

  constructor(target: Zoomable) {
    this.levelButton = h('button', {
      class: 'btn btn-ghost diagit-zoom-level',
      type: 'button',
      title: RESET_ZOOM,
      'aria-label': RESET_ZOOM,
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

  static resetZoomOf(viewer: ZoomedViewer | null): void {
    const level = viewer?.zoomLevel()
    if (viewer && level) {
      viewer.zoomBy(1 / level)
    }
  }

  showLevel(level: number | null): void {
    const zoomable = level !== null && Number.isFinite(level)
    this.element.hidden = !zoomable
    if (!zoomable) {
      return
    }
    const text = `${Math.round(level * 100)}%`
    this.levelButton.textContent = text
    this.levelButton.setAttribute('aria-label', `${RESET_ZOOM}, ${text}`)
  }

  private iconButton(label: string, icon: IconNode, onClick: () => void): HTMLButtonElement {
    return h(
      'button',
      { class: 'btn btn-icon', type: 'button', title: label, 'aria-label': label, onClick },
      [lucideIcon(icon)],
    )
  }
}
