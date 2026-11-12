import type { Notation, DiagramViewer } from '../../notations/Notation'
import type { PanelHandle } from '../../platform/page/HostPage'
import { h } from '../../platform/utils/dom'
import { errorMessage } from '../../platform/utils/errorMessage'
import { enableFocusZoom } from '../../platform/utils/focusZoom'
import { detectHostTheme } from '../../platform/utils/hostTheme'
import { diagitRepository, type ReportContext } from '../../platform/DiagitRepository'
import { ErrorNotice, type ErrorNoticeDetails } from '../../platform/ui/ErrorNotice'
import { ZoomControls, type Zoomable } from '../../platform/ui/ZoomControls'

export interface ModelPanelOptions {
  notation: Notation
  loadXml: () => Promise<string>
  reportContext: ReportContext
  onRendered?: () => void
}

export class ModelPanel implements PanelHandle, Zoomable {
  private readonly placeholder = h('div', {
    class: 'diagit-placeholder',
    text: 'Loading diagram…',
  })
  private readonly canvas = h('div', { class: 'diagit-canvas' }, [this.placeholder])
  private readonly wrap = h('div', { class: 'diagit-wrap' }, [
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
      const title = `${this.label} view could not be loaded`
      this.showError({
        title,
        hint: 'Diagit could not download this file. Reload the page to try again.',
        message: errorMessage(err),
        reportUrl: diagitRepository.problemReportUrl(
          `${this.label} file not loaded on a file page`,
          `Diagit showed "${title}" on a file page.`,
          this.options.reportContext,
        ),
      })
      return
    }
    if (this.destroyed) {
      return
    }

    let viewer: DiagramViewer
    try {
      viewer = await this.options.notation.createViewer(this.canvas, xml)
    } catch (err) {
      this.showError(
        ErrorNotice.unreadableModel(this.label, 'on a file page', err, this.options.reportContext),
      )
      return
    }
    if (this.destroyed) {
      viewer.destroy()
      return
    }

    this.viewer = viewer
    this.placeholder.remove()
    viewer.fit()
    this.options.onRendered?.()
    this.detachFocusZoom = enableFocusZoom(this.canvas, (active) =>
      this.viewer?.setInteractive(active),
    )
    this.resizeObserver = new ResizeObserver(() => this.viewer?.fit())
    this.resizeObserver.observe(this.canvas)
  }

  private get label(): string {
    return this.options.notation.descriptor.label
  }

  private showError(details: ErrorNoticeDetails): void {
    this.wrap.replaceChildren(new ErrorNotice(details).element)
  }
}
