import type { Notation, DiagramViewer, NotationLookup } from '../../notations/Notation'
import { h } from '../../platform/utils/dom'
import { errorMessage } from '../../platform/utils/errorMessage'

export class StandaloneViewerPage {
  private readonly fileInput: HTMLInputElement
  private readonly openButton = h('button', {
    class: 'btn btn-primary btn-large',
    type: 'button',
    text: 'Open file…',
  })
  private readonly canvas = h('div', { class: 'canvas' })
  private readonly dropzone: HTMLElement
  private readonly stage: HTMLElement
  private readonly loadedAssetCss = new Set<Notation>()
  private viewer: DiagramViewer | null = null

  constructor(
    private readonly notations: NotationLookup,
    private readonly fileExtensions: string[],
  ) {
    const extensionList = fileExtensions.join(' or ')
    const lastExtensions = fileExtensions.map((extension) =>
      extension.slice(extension.lastIndexOf('.')),
    )
    this.fileInput = h('input', {
      type: 'file',
      accept: [...new Set(lastExtensions)].join(','),
      style: 'display:none',
    })
    this.dropzone = h('div', { class: 'dropzone' }, [
      h('div', { class: 'dropzone-card' }, [
        h('img', { class: 'dropzone-icon', src: '/icon/icon.svg', alt: '' }),
        h('span', { text: `Drop a ${extensionList} file here, or use “Open file…”.` }),
      ]),
    ])
    this.stage = h('div', { class: 'stage' }, [this.canvas, this.dropzone])
  }

  mount(app: HTMLElement): void {
    const toolbar = h('div', { class: 'toolbar' }, [this.openButton, this.fileInput])
    app.append(toolbar, this.stage)
    this.listen()
  }

  private listen(): void {
    this.openButton.addEventListener('click', () => this.fileInput.click())
    this.fileInput.addEventListener('change', () => this.openFirst(this.fileInput.files))
    this.dropzone.addEventListener('dragover', (event) => {
      event.preventDefault()
      this.dropzone.classList.add('dragover')
    })
    this.dropzone.addEventListener('dragleave', () => this.dropzone.classList.remove('dragover'))
    this.stage.addEventListener('drop', (event) => {
      event.preventDefault()
      this.openFirst(event.dataTransfer?.files)
    })
    this.stage.addEventListener('dragover', (event) => event.preventDefault())
  }

  private openFirst(files: FileList | null | undefined): void {
    const file = files?.[0]
    if (file) void this.open(file)
  }

  private async open(file: File): Promise<void> {
    const notation = this.notations.detect(file.name)
    if (!notation) {
      const expected = this.fileExtensions.join(' or ')
      this.showError(`Unsupported file: ${file.name} (expected ${expected}).`)
      return
    }
    this.loadAssetCss(notation)
    const xml = await file.text()
    this.viewer?.destroy()
    this.viewer = null
    this.canvas.replaceChildren()
    try {
      this.viewer = await notation.createViewer(this.canvas, xml)
      this.dropzone.classList.add('hidden')
    } catch (err) {
      this.showError(`Could not render ${notation.descriptor.label}: ${errorMessage(err)}`)
    }
  }

  private loadAssetCss(notation: Notation): void {
    if (this.loadedAssetCss.has(notation)) return
    this.loadedAssetCss.add(notation)
    document.head.append(h('style', { text: notation.assetCss }))
  }

  private showError(text: string): void {
    this.dropzone.classList.remove('hidden', 'dragover')
    this.dropzone.replaceChildren(
      h('div', { class: 'dropzone-card error', role: 'alert' }, [h('span', { text })]),
    )
  }
}
