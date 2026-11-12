import { Maximize, Minimize, Minus, Plus, type IconNode } from 'lucide'
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
const FULL_SCREEN = 'Full screen'

export class ZoomControls {
  readonly element: HTMLElement
  private readonly levelButton: HTMLButtonElement
  private readonly zoomParts: HTMLElement[]
  private fullScreenButton: HTMLButtonElement | null = null
  private pageScrollBeforeFullScreen = 0

  constructor(private readonly target: Zoomable) {
    this.levelButton = h('button', {
      class: 'btn btn-ghost diagit-zoom-level',
      type: 'button',
      title: RESET_ZOOM,
      'aria-label': RESET_ZOOM,
      onClick: () => target.resetZoom(),
    })
    this.zoomParts = [
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
    ]
    this.element = h(
      'div',
      { class: 'diagit-zoom', role: 'group', 'aria-label': 'Zoom' },
      this.zoomParts,
    )
    this.showLevel(null)
  }

  static resetZoomOf(viewer: ZoomedViewer | null): void {
    const level = viewer?.zoomLevel()
    if (viewer && level) {
      viewer.zoomBy(1 / level)
    }
  }

  allowFullScreen(panel: HTMLElement): void {
    if (!document.fullscreenEnabled) {
      return
    }
    this.fullScreenButton = h('button', {
      class: 'btn btn-icon diagit-zoom-full-screen',
      type: 'button',
      'aria-label': FULL_SCREEN,
      onClick: () => this.toggleFullScreen(panel),
    })
    this.element.append(this.fullScreenButton)
    panel.addEventListener('fullscreenchange', () => {
      const active = ZoomControls.isFullScreen(panel)
      this.showFullScreen(active)
      if (!active) {
        window.scrollTo({ top: this.pageScrollBeforeFullScreen, behavior: 'instant' })
      }
      this.target.fit()
    })
    this.showFullScreen(false)
  }

  showLevel(level: number | null): void {
    const zoomable = level !== null && Number.isFinite(level)
    for (const part of this.zoomParts) {
      part.hidden = !zoomable
    }
    this.element.hidden = !zoomable && !this.fullScreenButton
    if (!zoomable) {
      return
    }
    const text = `${Math.round(level * 100)}%`
    this.levelButton.textContent = text
    this.levelButton.setAttribute('aria-label', `${RESET_ZOOM}, ${text}`)
  }

  hide(): void {
    this.element.hidden = true
  }

  private showFullScreen(active: boolean): void {
    const button = this.fullScreenButton
    if (!button) {
      return
    }
    button.replaceChildren(lucideIcon(active ? Minimize : Maximize))
    button.setAttribute('aria-pressed', String(active))
    button.title = active ? 'Exit full screen' : FULL_SCREEN
  }

  private toggleFullScreen(panel: HTMLElement): void {
    if (ZoomControls.isFullScreen(panel)) {
      document.exitFullscreen().catch(() => {})
    } else {
      this.pageScrollBeforeFullScreen = window.scrollY
      panel.requestFullscreen().catch(() => {})
    }
  }

  private static isFullScreen(panel: HTMLElement): boolean {
    return (panel.getRootNode() as Document | ShadowRoot).fullscreenElement === panel
  }

  private iconButton(label: string, icon: IconNode, onClick: () => void): HTMLButtonElement {
    return h(
      'button',
      { class: 'btn btn-icon', type: 'button', title: label, 'aria-label': label, onClick },
      [lucideIcon(icon)],
    )
  }
}
