import { Upload } from 'lucide'
import type { Notation, DiagramViewer, NotationLookup } from '../../notations/Notation'
import { diagitRepository, type ReportContext } from '../../platform/DiagitRepository'
import { h } from '../../platform/utils/dom'
import { errorMessage } from '../../platform/utils/errorMessage'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import { ErrorNotice, type ErrorNoticeDetails } from '../../platform/ui/ErrorNotice'
import { ZoomControls, type Zoomable } from '../../platform/ui/ZoomControls'

const NO_FILE = 'No file open'

export interface LinkedModelSource {
  mayRead(url: string): Promise<boolean>
  fetchText(url: string): Promise<string>
}

export class StandaloneViewerPage implements Zoomable {
  private readonly fileInput: HTMLInputElement
  private readonly openButton = h('button', {
    class: 'btn btn-primary',
    type: 'button',
    text: 'Open file…',
  })
  private readonly fileName = h('span', { class: 'file-name', text: NO_FILE })
  private readonly notationBadge = h('span', { class: 'notation-badge' })
  private readonly canvas = h('div', { class: 'canvas' })
  private readonly errorSlot = h('div', { class: 'error-slot' })
  private readonly dropzone: HTMLElement
  private readonly stage: HTMLElement
  private readonly panel: HTMLElement
  private readonly loadedAssetCss = new Set<Notation>()
  private viewer: DiagramViewer | null = null
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
    this.dropzone = h('div', { class: 'dropzone' }, [
      lucideIcon(Upload, 'dropzone-icon'),
      h('strong', { text: 'Drop a diagram here or open a file' }),
      h('span', { text: notationLabels.join(', ') }),
      this.errorSlot,
    ])
    this.stage = h('div', { class: 'diagit-canvas' }, [this.canvas, this.dropzone])
    this.panel = h('section', { class: 'diagit-wrap' }, [
      h('div', { class: 'diagit-toolbar' }, [
        h('div', { class: 'file' }, [this.fileName, this.notationBadge]),
        new ZoomControls(this).element,
      ]),
      this.stage,
    ])
  }

  mount(app: HTMLElement): void {
    const header = h('header', { class: 'page-header' }, [
      h('img', { class: 'app-icon', src: '/icon/icon.svg', alt: '' }),
      h('h1', { text: 'Diagit' }),
      h('span', { class: 'page-subtitle', text: 'Viewer' }),
      this.openButton,
      this.fileInput,
    ])
    app.append(header, this.panel)
    this.listen()
    new ResizeObserver(() => this.viewer?.fit()).observe(this.stage)
  }

  async openLink(url: string): Promise<void> {
    const openCountBefore = this.openCount
    const mayRead = await this.linkedModels.mayRead(url)
    if (openCountBefore !== this.openCount) return
    if (!mayRead) {
      this.showError({
        title: 'Model could not be opened',
        hint: 'Diagit only opens models from GitHub, GitLab and the domains you allowed.',
        message: url,
      })
      return
    }
    await this.open(this.linkedFileName(url), () => this.linkedModels.fetchText(url))
  }

  zoomBy(factor: number): void {
    this.viewer?.zoomBy(factor)
  }

  fit(): void {
    this.viewer?.fit()
  }

  private listen(): void {
    this.openButton.addEventListener('click', () => this.fileInput.click())
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
    if (file) void this.open(file.name, () => file.text())
  }

  private async open(fileName: string, readContent: () => Promise<string>): Promise<void> {
    const openId = ++this.openCount
    const notation = this.notations.detect(fileName)
    if (!notation) {
      this.showError({
        title: 'File not supported',
        hint: `Diagit opens ${this.fileExtensions.join(' or ')} files.`,
        message: fileName,
      })
      return
    }
    this.loadAssetCss(notation)
    let xml: string
    try {
      xml = await readContent()
    } catch (err) {
      if (openId === this.openCount)
        this.showError(this.loadFailure(notation.descriptor.label, err))
      return
    }
    if (openId !== this.openCount) return
    this.closeDiagram()
    try {
      const viewer = await notation.createViewer(this.canvas, xml)
      if (openId !== this.openCount) return viewer.destroy()
      this.viewer = viewer
    } catch (err) {
      if (openId !== this.openCount) return
      this.showError(
        ErrorNotice.unreadableModel(
          notation.descriptor.label,
          'in the standalone viewer',
          err,
          this.reportContext,
        ),
      )
      return
    }
    this.showDiagram(fileName, notation.descriptor.label)
  }

  private showDiagram(fileName: string, notationLabel: string): void {
    this.errorSlot.replaceChildren()
    this.fileName.textContent = fileName
    this.notationBadge.textContent = notationLabel
    this.panel.classList.add('has-diagram')
    this.viewer?.setInteractive(true)
    this.viewer?.fit()
  }

  private closeDiagram(): void {
    this.viewer?.destroy()
    this.viewer = null
    this.canvas.replaceChildren()
    this.fileName.textContent = NO_FILE
    this.notationBadge.textContent = ''
    this.panel.classList.remove('has-diagram')
  }

  private linkedFileName(url: string): string {
    const lastSegment = new URL(url).pathname.split('/').pop() ?? ''
    try {
      return decodeURIComponent(lastSegment)
    } catch {
      return lastSegment
    }
  }

  private loadFailure(label: string, err: unknown): ErrorNoticeDetails {
    const title = `${label} view could not be loaded`
    return {
      title,
      hint: 'Diagit could not download this file. Reload the page to try again.',
      message: errorMessage(err),
      reportUrl: diagitRepository.problemReportUrl(
        `${label} file not loaded in the standalone viewer`,
        `Diagit showed "${title}" in the standalone viewer.`,
        this.reportContext,
      ),
    }
  }

  private loadAssetCss(notation: Notation): void {
    if (this.loadedAssetCss.has(notation)) return
    this.loadedAssetCss.add(notation)
    document.head.append(h('style', { text: notation.assetCss }))
  }

  private showError(details: ErrorNoticeDetails): void {
    this.closeDiagram()
    const notice = new ErrorNotice(details).element
    notice.setAttribute('role', 'alert')
    this.errorSlot.replaceChildren(notice)
  }
}
