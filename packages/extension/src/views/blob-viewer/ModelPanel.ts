import { RotateCw } from 'lucide'
import type { Notation, DiagramViewer } from '../../notations/Notation'
import type { PanelHandle } from '../../platform/page/HostPage'
import { h } from '../../platform/utils/dom'
import { enableFocusZoom } from '../../platform/utils/focusZoom'
import { fileLabel } from '../../platform/utils/fileLabel'
import { detectHostTheme } from '../../platform/utils/hostTheme'
import { diagitRepository, type ReportContext } from '../../platform/DiagitRepository'
import { Notice, type NoticeDetails } from '../../platform/ui/Notice'
import { ZoomControls, type Zoomable } from '../../platform/ui/ZoomControls'

const CODE_STILL_SHOWN = 'The code below still shows the file.'

export interface ModelPanelOptions {
  notation: Notation
  fileName: string
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
  private readonly zoomControls = new ZoomControls(this)
  private readonly wrap: HTMLElement
  private viewer: DiagramViewer | null = null
  private stopTrackingZoom: (() => void) | null = null
  private destroyed = false
  private resizeObserver: ResizeObserver | null = null
  private detachFocusZoom: (() => void) | null = null

  constructor(private readonly options: ModelPanelOptions) {
    this.wrap = h('div', { class: 'diagit-wrap diagit-file-panel' }, [
      h('div', { class: 'diagit-toolbar' }, [fileLabel(options.fileName, this.label)]),
      this.canvas,
      this.zoomControls.element,
    ])
  }

  mount(container: HTMLElement): this {
    container.append(this.wrap)
    this.wrap.dataset.cdTheme = detectHostTheme(this.wrap)
    void this.load()
    return this
  }

  zoomBy(factor: number): void {
    this.viewer?.zoomBy(factor)
  }

  resetZoom(): void {
    const level = this.viewer?.zoomLevel()
    if (level) {
      this.viewer?.zoomBy(1 / level)
    }
  }

  fit(): void {
    this.viewer?.fit()
  }

  destroy(): void {
    this.destroyed = true
    this.stopTrackingZoom?.()
    this.stopTrackingZoom = null
    this.detachFocusZoom?.()
    this.detachFocusZoom = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.viewer?.destroy()
    this.viewer = null
    this.wrap.remove()
  }

  private async load(): Promise<void> {
    this.canvas.replaceChildren(this.placeholder)
    this.zoomControls.element.hidden = true
    let xml: string
    try {
      xml = await this.options.loadXml()
    } catch (err) {
      this.showError(this.downloadFailure(err))
      return
    }
    if (this.destroyed) {
      return
    }

    let viewer: DiagramViewer
    try {
      viewer = await this.options.notation.createViewer(this.canvas, xml)
    } catch (err) {
      const unreadable = Notice.unreadableModel(
        this.label,
        'on a file page',
        err,
        this.options.reportContext,
      )
      this.showError({ ...unreadable, body: `${unreadable.body} ${CODE_STILL_SHOWN}` })
      return
    }
    if (this.destroyed) {
      viewer.destroy()
      return
    }

    this.viewer = viewer
    this.placeholder.remove()
    viewer.fit()
    this.trackZoomLevel(viewer)
    this.options.onRendered?.()
    this.detachFocusZoom = enableFocusZoom(this.canvas, (active) =>
      this.viewer?.setInteractive(active),
    )
    this.resizeObserver = new ResizeObserver(() => this.viewer?.fit())
    this.resizeObserver.observe(this.canvas)
  }

  private trackZoomLevel(viewer: DiagramViewer): void {
    const showLevel = () => this.zoomControls.showLevel(viewer.zoomLevel())
    this.stopTrackingZoom = viewer.onViewChange(showLevel)
    showLevel()
    this.zoomControls.element.hidden = false
  }

  private get label(): string {
    return this.options.notation.descriptor.label
  }

  private downloadFailure(err: unknown): NoticeDetails {
    const title = `${this.label} file could not be downloaded`
    return {
      tone: 'danger',
      title,
      body: `Check your connection and try again. ${CODE_STILL_SHOWN}`,
      action: { label: 'Try again', icon: RotateCw, onClick: () => void this.load() },
      reportUrl: diagitRepository.problemReportUrl(
        `${this.label} file not loaded on a file page`,
        `Diagit showed "${title}" on a file page.`,
        this.options.reportContext,
        err,
      ),
    }
  }

  private showError(details: NoticeDetails): void {
    this.canvas.replaceChildren(new Notice(details, 'pane').element)
    this.zoomControls.element.hidden = true
  }
}
