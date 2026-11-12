import { FolderOpen, RotateCw, Settings } from 'lucide'
import type { Notation, DiagramViewer, NotationLookup } from '../../notations/Notation'
import { diagitRepository, type ReportContext } from '../../platform/DiagitRepository'
import { h } from '../../platform/utils/dom'
import { fileLabel } from '../../platform/utils/fileLabel'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import { Notice, type NoticeDetails } from '../../platform/ui/Notice'
import { ZoomControls, type Zoomable } from '../../platform/ui/ZoomControls'

export interface LinkedModelSource {
  mayRead(url: string): Promise<boolean>
  fetchText(url: string): Promise<string>
}

export class StandaloneViewerPage implements Zoomable {
  private readonly fileInput: HTMLInputElement
  private readonly fileLabelSlot = h('div', { class: 'file' })
  private readonly toolbar = h('div', { class: 'diagit-toolbar', hidden: '' }, [
    this.fileLabelSlot,
    h(
      'button',
      {
        class: 'btn btn-ghost diagit-toolbar-end',
        type: 'button',
        onClick: () => this.fileInput.click(),
      },
      [lucideIcon(FolderOpen), 'Open another file'],
    ),
  ])
  private readonly canvas = h('div', { class: 'canvas' })
  private readonly emptyState: HTMLElement
  private readonly stage: HTMLElement
  private readonly panel: HTMLElement
  private readonly loadedAssetCss = new Set<Notation>()
  private readonly zoomControls = new ZoomControls(this)
  private viewer: DiagramViewer | null = null
  private stopTrackingZoom: (() => void) | null = null
  private openCount = 0

  constructor(
    private readonly notations: NotationLookup,
    private readonly fileExtensions: string[],
    notationLabels: string[],
    private readonly reportContext: ReportContext,
    private readonly linkedModels: LinkedModelSource,
  ) {
    const lastExtensions = fileExtensions.map((extension) =>
      extension.slice(extension.lastIndexOf('.')),
    )
    this.fileInput = h('input', {
      type: 'file',
      accept: [...new Set(lastExtensions)].join(','),
      style: 'display:none',
    })
    this.emptyState = h('div', { class: 'empty-state' }, [
      h('img', { class: 'empty-state-icon', src: '/icon/icon.svg', alt: '' }),
      h('h2', { text: 'Open a diagram' }),
      h('p', { text: 'Drop a file anywhere on this page.' }),
      h(
        'button',
        {
          class: 'btn btn-large btn-primary',
          type: 'button',
          onClick: () => this.fileInput.click(),
        },
        [lucideIcon(FolderOpen), 'Open file…'],
      ),
      h('p', { class: 'fine-print', text: this.supportedNotations(notationLabels) }),
    ])
    this.stage = h('div', { class: 'diagit-canvas' }, [
      this.canvas,
      this.emptyState,
      this.zoomControls.element,
    ])
    this.panel = h('section', { class: 'diagit-wrap' }, [this.toolbar, this.stage])
    this.zoomControls.allowFullScreen(this.panel)
  }

  mount(app: HTMLElement): void {
    const header = h('header', { class: 'page-header' }, [
      h('img', { class: 'app-icon', src: '/icon/icon.svg', alt: '' }),
      h('h1', { text: 'Diagit' }),
      h('span', { class: 'page-subtitle', text: 'Viewer' }),
      this.fileInput,
    ])
    app.append(header, this.panel)
    this.listen()
    new ResizeObserver(() => this.viewer?.fit()).observe(this.stage)
  }

  async openLink(url: string): Promise<void> {
    const openCountBefore = this.openCount
    const mayRead = await this.linkedModels.mayRead(url)
    if (openCountBefore !== this.openCount) {
      return
    }
    const fileName = this.linkedFileName(url)
    if (!mayRead) {
      this.showFile(fileName, this.notations.detect(fileName)?.descriptor.label ?? '')
      this.showError(this.notAllowed(fileName, new URL(url).hostname))
      return
    }
    await this.open(
      fileName,
      () => this.linkedModels.fetchText(url),
      () => void this.openLink(url),
    )
  }

  zoomBy(factor: number): void {
    this.viewer?.zoomBy(factor)
  }

  resetZoom(): void {
    ZoomControls.resetZoomOf(this.viewer)
  }

  fit(): void {
    this.viewer?.fit()
  }

  private listen(): void {
    this.fileInput.addEventListener('change', () => this.openFirst(this.fileInput.files))
    document.addEventListener('dragover', (event) => event.preventDefault())
    document.addEventListener('drop', (event) => {
      event.preventDefault()
      this.stage.classList.remove('dragover')
      this.openFirst(event.dataTransfer?.files)
    })
    this.stage.addEventListener('dragover', () => this.stage.classList.add('dragover'))
    this.stage.addEventListener('dragleave', (event) => {
      if (!this.stage.contains(event.relatedTarget as Node | null)) {
        this.stage.classList.remove('dragover')
      }
    })
  }

  private openFirst(files: FileList | null | undefined): void {
    const file = files?.[0]
    if (file) {
      void this.open(file.name, () => file.text())
    }
  }

  private async open(
    fileName: string,
    readContent: () => Promise<string>,
    retry?: () => void,
  ): Promise<void> {
    const openId = ++this.openCount
    const notation = this.notations.detect(fileName)
    this.showFile(fileName, notation?.descriptor.label ?? '')
    if (!notation) {
      this.showError({
        tone: 'warning',
        title: `Can't open ${fileName}`,
        body: `It opens ${this.fileExtensions.join(' or ')} files.`,
      })
      return
    }
    this.loadAssetCss(notation)
    let xml: string
    try {
      xml = await readContent()
    } catch (err) {
      if (openId === this.openCount) {
        this.showError(this.downloadFailure(notation.descriptor.label, fileName, err, retry))
      }
      return
    }
    if (openId !== this.openCount) {
      return
    }
    this.closeDiagram()
    try {
      const viewer = await notation.createViewer(this.canvas, xml)
      if (openId !== this.openCount) {
        return viewer.destroy()
      }
      this.viewer = viewer
    } catch (err) {
      if (openId !== this.openCount) {
        return
      }
      this.showError(
        Notice.unreadableModel(
          notation.descriptor.label,
          'in the standalone viewer',
          err,
          this.reportContext,
        ),
      )
      return
    }
    this.showDiagram()
  }

  private showFile(fileName: string, notationLabel: string): void {
    this.fileLabelSlot.replaceChildren(fileLabel(fileName, notationLabel))
    this.toolbar.hidden = false
    this.panel.classList.add('has-file')
  }

  private showDiagram(): void {
    this.panel.classList.remove('has-error')
    this.panel.classList.add('has-diagram')
    this.viewer?.setInteractive(true)
    this.viewer?.fit()
    this.trackZoomLevel()
  }

  private trackZoomLevel(): void {
    const { viewer } = this
    if (!viewer) {
      return
    }
    const showLevel = () => this.zoomControls.showLevel(viewer.zoomLevel())
    this.stopTrackingZoom = viewer.onViewChange(showLevel)
    showLevel()
  }

  private closeDiagram(): void {
    this.stopTrackingZoom?.()
    this.stopTrackingZoom = null
    this.zoomControls.hide()
    this.viewer?.destroy()
    this.viewer = null
    this.canvas.replaceChildren()
    this.panel.classList.remove('has-diagram')
  }

  private supportedNotations(labels: string[]): string {
    if (labels.length > 2) {
      return `${labels[0]}, ${labels[1]} and ${labels.length - 2} more`
    }
    return labels.join(' and ')
  }

  private linkedFileName(url: string): string {
    const lastSegment = new URL(url).pathname.split('/').pop() ?? ''
    try {
      return decodeURIComponent(lastSegment)
    } catch {
      return lastSegment
    }
  }

  private notAllowed(fileName: string, host: string): NoticeDetails {
    return {
      tone: 'warning',
      title: `Can't open ${fileName}`,
      body: `Diagit may not read files from ${host} yet. Add the domain in the options.`,
      action: { label: 'Open options', icon: Settings, opensOptions: true },
      reportUrl: diagitRepository.problemReportUrl(
        'Linked model refused in the standalone viewer',
        `Diagit showed "Can't open" for a model from a domain it may not read.`,
        this.reportContext,
      ),
    }
  }

  private downloadFailure(
    label: string,
    fileName: string,
    err: unknown,
    retry?: () => void,
  ): NoticeDetails {
    return {
      tone: 'danger',
      title: `${fileName} could not be downloaded`,
      body: 'Check your connection and try again.',
      action: retry ? { label: 'Try again', icon: RotateCw, onClick: retry } : undefined,
      reportUrl: diagitRepository.problemReportUrl(
        `${label} file not loaded in the standalone viewer`,
        `Diagit could not download a ${label} file in the standalone viewer.`,
        this.reportContext,
        err,
      ),
    }
  }

  private loadAssetCss(notation: Notation): void {
    if (this.loadedAssetCss.has(notation)) {
      return
    }
    this.loadedAssetCss.add(notation)
    document.head.append(h('style', { text: notation.assetCss }))
  }

  private showError(details: NoticeDetails): void {
    this.closeDiagram()
    this.canvas.replaceChildren(new Notice({ ...details, followsUserAction: true }, 'pane').element)
    this.panel.classList.add('has-error')
  }
}
