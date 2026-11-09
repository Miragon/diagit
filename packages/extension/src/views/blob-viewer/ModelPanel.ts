import type { Notation, DiagramViewer } from '../../notations/Notation'
import type { PanelHandle } from '../../platform/page/HostPage'
import { h } from '../../platform/utils/dom'
import { errorMessage } from '../../platform/utils/errorMessage'
import { enableFocusZoom } from '../../platform/utils/focusZoom'
import { detectHostTheme } from '../../platform/utils/hostTheme'
import { ZoomControls, type Zoomable } from '../../platform/ui/ZoomControls'

export interface ModelPanelOptions {
  notation: Notation
  loadXml: () => Promise<string>
}

export class ModelPanel implements PanelHandle, Zoomable {
  private readonly placeholder = h('div', {
    class: 'git-diagram-placeholder',
    text: 'Loading diagram…',
  })
  private readonly canvas = h('div', { class: 'git-diagram-canvas' }, [this.placeholder])
  private readonly wrap = h('div', { class: 'git-diagram-wrap' }, [
    this.canvas,
    new ZoomControls(this).element,
  ])
  private viewer: DiagramViewer | null = null
  private destroyed = false
  private resizeObserver: ResizeObserver | null = null
  private detachFocusZoom: (() => void) | null = null

  constructor(private readonly options: ModelPanelOptions) {}

  mount(container: HTMLElement): this {
    container.append(this.wrap)
    this.wrap.dataset.cdTheme = detectHostTheme(this.wrap)
    void this.load()
    return this
  }

  zoomBy(factor: number): void {
    this.viewer?.zoomBy(factor)
  }

  fit(): void {
    this.viewer?.fit()
  }

  destroy(): void {
    this.destroyed = true
    this.detachFocusZoom?.()
    this.detachFocusZoom = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.viewer?.destroy()
    this.viewer = null
    this.wrap.remove()
  }

  private async load(): Promise<void> {
    let xml: string
    try {
      xml = await this.options.loadXml()
    } catch (err) {
      this.placeholder.textContent = `Could not load file: ${errorMessage(err)}`
      return
    }
    if (this.destroyed) return

    let viewer: DiagramViewer
    try {
      viewer = await this.options.notation.createViewer(this.canvas, xml)
    } catch (err) {
      const label = this.options.notation.descriptor.label
      this.placeholder.textContent = `Could not render ${label}: ${errorMessage(err)}`
      return
    }
    if (this.destroyed) {
      viewer.destroy()
      return
    }

    this.viewer = viewer
    this.placeholder.remove()
    viewer.fit()
    this.detachFocusZoom = enableFocusZoom(this.canvas, (active) =>
      this.viewer?.setInteractive(active),
    )
    this.resizeObserver = new ResizeObserver(() => this.viewer?.fit())
    this.resizeObserver.observe(this.canvas)
  }
}
