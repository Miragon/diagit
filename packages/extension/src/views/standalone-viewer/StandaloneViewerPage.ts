import { Upload } from 'lucide'
import type { Notation, DiagramViewer, NotationLookup } from '../../notations/Notation'
import type { ReportContext } from '../../platform/DiagitRepository'
import { h } from '../../platform/utils/dom'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import { ErrorNotice, type ErrorNoticeDetails } from '../../platform/ui/ErrorNotice'
import { ZoomControls, type Zoomable } from '../../platform/ui/ZoomControls'

const NO_FILE = 'No file open'

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

  constructor(
    private readonly notations: NotationLookup,
    private readonly fileExtensions: string[],
    notationLabels: string[],
    private readonly reportContext: ReportContext,
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
    this.stage.addEventListener('dragover', (event) => {
      event.preventDefault()
      this.stage.classList.add('dragover')
    })
    this.stage.addEventListener('dragleave', () => this.stage.classList.remove('dragover'))
    this.stage.addEventListener('drop', (event) => {
      event.preventDefault()
      this.stage.classList.remove('dragover')
      this.openFirst(event.dataTransfer?.files)
    })
  }

  private openFirst(files: FileList | null | undefined): void {
    const file = files?.[0]
    if (file) void this.open(file)
  }

  private async open(file: File): Promise<void> {
    const notation = this.notations.detect(file.name)
    if (!notation) {
      this.showError({
        title: 'File not supported',
        hint: `Diagit opens ${this.fileExtensions.join(' or ')} files.`,
        message: file.name,
      })
      return
    }
    this.loadAssetCss(notation)
    const xml = await file.text()
    this.closeDiagram()
    try {
      this.viewer = await notation.createViewer(this.canvas, xml)
    } catch (err) {
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
    this.showDiagram(file.name, notation.descriptor.label)
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
