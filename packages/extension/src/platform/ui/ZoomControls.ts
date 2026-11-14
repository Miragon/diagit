import { Maximize, Maximize2, Minimize, Minimize2, Minus, Plus, type IconNode } from 'lucide'
import { h } from '../utils/dom'
import { lucideIcon } from '../utils/lucideIcon'
import { ExpandDialog } from './ExpandDialog'

export interface Zoomable {
  zoomBy(factor: number): void
  resetZoom(): void
  fit(): void
}

interface ZoomedViewer {
  zoomBy(factor: number): void
  zoomLevel(): number | null
}

type View = 'inline' | 'expanded' | 'fullScreen'

const ZOOM_STEP = 1.2
const RESET_ZOOM = 'Reset zoom'
const FULL_SCREEN = 'Full screen'
const EXPAND = 'Expand'

export class ZoomControls {
  readonly element: HTMLElement
  private readonly levelButton: HTMLButtonElement
  private readonly zoomParts: HTMLElement[]
  private fullScreenButton: HTMLButtonElement | null = null
  private expandButton: HTMLButtonElement | null = null
  private expandDialog: ExpandDialog | null = null
  private view: View = 'inline'
  private pageScrollBeforeFullScreen = 0
  private hasNothingToShow = false

  constructor(target: Zoomable) {
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
    this.fullScreenButton = this.viewButton('diagit-zoom-full-screen', FULL_SCREEN, () =>
      this.toggleFullScreen(panel),
    )
    this.element.append(this.fullScreenButton)
    panel.addEventListener('fullscreenchange', () => {
      if (ZoomControls.isFullScreen(panel)) {
        this.showView('fullScreen')
        return
      }
      this.showView(this.expandDialog?.isOpen ? 'expanded' : 'inline')
      window.scrollTo({ top: this.pageScrollBeforeFullScreen, behavior: 'instant' })
    })
    this.renderViewButtons()
  }

  allowExpanding(panel: HTMLElement): void {
    this.allowFullScreen(panel)
    const expandDialog = new ExpandDialog(panel, (expanded) => this.toggledExpanded(expanded))
    this.expandDialog = expandDialog
    this.expandButton = this.viewButton('diagit-zoom-expand', EXPAND, () => expandDialog.toggle())
    this.element.append(this.expandButton)
    this.renderViewButtons()
  }

  collapse(): void {
    this.expandDialog?.close()
  }

  showLevel(level: number | null): void {
    this.hasNothingToShow = false
    const zoomable = level !== null && Number.isFinite(level)
    for (const part of this.zoomParts) {
      part.hidden = !zoomable
    }
    this.element.hidden = !zoomable && !this.fullScreenButton && !this.expandButton
    if (!zoomable) {
      return
    }
    const text = `${Math.round(level * 100)}%`
    this.levelButton.textContent = text
    this.levelButton.setAttribute('aria-label', `${RESET_ZOOM}, ${text}`)
  }

  hide(): void {
    this.showLevel(null)
    this.hasNothingToShow = true
    this.element.hidden = this.view === 'inline'
  }

  private toggledExpanded(expanded: boolean): void {
    this.showView(expanded ? 'expanded' : 'inline')
    this.expandButton?.focus({ preventScroll: true })
  }

  private showView(view: View): void {
    this.view = view
    if (view === 'inline') {
      this.element.hidden ||= this.hasNothingToShow
    }
    this.renderViewButtons()
  }

  private renderViewButtons(): void {
    const inFullScreen = this.view === 'fullScreen'
    const expanded = this.view === 'expanded'
    if (this.fullScreenButton) {
      ZoomControls.showState(
        this.fullScreenButton,
        inFullScreen ? Minimize : Maximize,
        inFullScreen,
        inFullScreen ? 'Exit full screen' : FULL_SCREEN,
      )
      this.fullScreenButton.hidden = this.expandButton !== null && this.view === 'inline'
    }
    if (this.expandButton) {
      ZoomControls.showState(
        this.expandButton,
        expanded ? Minimize2 : Maximize2,
        expanded,
        expanded ? 'Collapse' : EXPAND,
      )
      this.expandButton.hidden = inFullScreen
    }
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

  private static showState(
    button: HTMLButtonElement,
    icon: IconNode,
    pressed: boolean,
    title: string,
  ): void {
    button.replaceChildren(lucideIcon(icon))
    button.setAttribute('aria-pressed', String(pressed))
    button.title = title
  }

  private viewButton(className: string, label: string, onClick: () => void): HTMLButtonElement {
    return h('button', {
      class: `btn btn-icon ${className}`,
      type: 'button',
      'aria-label': label,
      onClick,
    })
  }

  private iconButton(label: string, icon: IconNode, onClick: () => void): HTMLButtonElement {
    return h(
      'button',
      { class: 'btn btn-icon', type: 'button', title: label, 'aria-label': label, onClick },
      [lucideIcon(icon)],
    )
  }
}
