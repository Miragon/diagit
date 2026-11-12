import { afterEach, describe, expect, it, vi } from 'vitest'
import { FetchError } from '../../src/platform/messaging/HttpClient'
import { StandaloneViewerPage } from '../../src/views/standalone-viewer/StandaloneViewerPage'
import { FakeDiffableViewer } from '../fakes/FakeDiffableViewer'
import { FakeLinkedModels } from '../fakes/FakeLinkedModels'
import { FakeNotation } from '../fakes/FakeNotation'
import { FakeNotationLookup } from '../fakes/FakeNotationLookup'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'

function notationRendering(viewer: FakeDiffableViewer): FakeNotation {
  const notation = new FakeNotation()
  vi.spyOn(notation, 'createViewer').mockResolvedValue(viewer)
  return notation
}

class UnreadableNotation extends FakeNotation {
  override async createViewer(): Promise<never> {
    throw new Error('unparsable content')
  }
}

const READABLE_FILE = 'https://github.com/o/r/raw/main/order.bpmn'

function mountPage(
  notation: FakeNotation,
  linkedModels = new FakeLinkedModels(async () => '<bpmn/>'),
): { app: HTMLElement; page: StandaloneViewerPage } {
  const app = document.createElement('div')
  document.body.append(app)
  const page = new StandaloneViewerPage(
    new FakeNotationLookup([notation]),
    ['.bpmn'],
    ['BPMN', 'DMN'],
    FAKE_REPORT_CONTEXT,
    linkedModels,
  )
  page.mount(app)
  return { app, page }
}

function openFile(app: HTMLElement, file: File): void {
  const input = app.querySelector<HTMLInputElement>('input[type=file]')!
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change'))
}

function buttonNamed(app: HTMLElement, name: string): HTMLButtonElement {
  return [...app.querySelectorAll('button')].find((button) => button.textContent === name)!
}

function textOf(app: HTMLElement, selector: string): string {
  return app.querySelector(selector)?.textContent ?? ''
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('StandaloneViewerPage', () => {
  it('invites to open a file and names the supported notations while no file is open', () => {
    const { app } = mountPage(new FakeNotation())

    expect(textOf(app, '.empty-state h2')).toBe('Open a diagram')
    expect(textOf(app, '.empty-state .fine-print')).toBe('BPMN and DMN')
    expect(app.querySelector<HTMLElement>('.diagit-toolbar')!.hidden).toBe(true)
    expect(app.querySelector('.diagit-wrap')!.classList.contains('has-diagram')).toBe(false)
  })

  it('opens the file picker from the empty state and from the toolbar', () => {
    const { app } = mountPage(new FakeNotation())
    const input = app.querySelector<HTMLInputElement>('input[type=file]')!
    const pick = vi.spyOn(input, 'click')

    buttonNamed(app, 'Open file…').click()
    buttonNamed(app, 'Open another file').click()

    expect(pick).toHaveBeenCalledTimes(2)
  })

  it('shows the file name and notation and fits the diagram once it is open', async () => {
    const viewer = new FakeDiffableViewer()
    const { app } = mountPage(notationRendering(viewer))

    openFile(app, new File(['<definitions/>'], 'order.bpmn'))

    await vi.waitFor(() =>
      expect(app.querySelector('.diagit-wrap')!.classList.contains('has-diagram')).toBe(true),
    )
    expect(textOf(app, '.file-name')).toBe('order.bpmn')
    expect(textOf(app, '.diagit-file-label .kind')).toBe('BPMN')
    expect(app.querySelector<HTMLElement>('.diagit-toolbar')!.hidden).toBe(false)
    expect(viewer.fits).toBe(1)
  })

  it('keeps only the last file when a second one opens before the first has rendered', async () => {
    const slowViewer = new FakeDiffableViewer()
    const fastViewer = new FakeDiffableViewer()
    let renderSlowViewer: (viewer: FakeDiffableViewer) => void = () => {}
    const notation = new FakeNotation()
    vi.spyOn(notation, 'createViewer')
      .mockReturnValueOnce(new Promise((resolve) => (renderSlowViewer = resolve)))
      .mockResolvedValueOnce(fastViewer)
    const { app } = mountPage(notation)

    openFile(app, new File(['<definitions/>'], 'slow.bpmn'))
    await vi.waitFor(() => expect(notation.createViewer).toHaveBeenCalledOnce())
    openFile(app, new File(['<definitions/>'], 'fast.bpmn'))
    await vi.waitFor(() => expect(textOf(app, '.file-name')).toBe('fast.bpmn'))
    renderSlowViewer(slowViewer)

    await vi.waitFor(() => expect(slowViewer.destroyed).toBe(true))
    expect(textOf(app, '.file-name')).toBe('fast.bpmn')
    expect(fastViewer.destroyed).toBe(false)
  })

  it('closes the open diagram when the next file is not supported', async () => {
    const viewer = new FakeDiffableViewer()
    const { app } = mountPage(notationRendering(viewer))
    openFile(app, new File(['<definitions/>'], 'order.bpmn'))
    await vi.waitFor(() =>
      expect(app.querySelector('.diagit-wrap')!.classList.contains('has-diagram')).toBe(true),
    )

    openFile(app, new File(['hello'], 'notes.txt'))

    await vi.waitFor(() => expect(app.querySelector('.diagit-notice')).not.toBeNull())
    expect(viewer.destroyed).toBe(true)
    expect(textOf(app, '.file-name')).toBe('notes.txt')
    expect(app.querySelector('.diagit-wrap')!.classList.contains('has-diagram')).toBe(false)
  })

  it('shows a pane notice in the canvas with a report link when the model cannot be read', async () => {
    const { app } = mountPage(new UnreadableNotation())

    openFile(app, new File(['not a model'], 'order.bpmn'))

    await vi.waitFor(() => expect(app.querySelector('.diagit-notice')).not.toBeNull())
    const notice = app.querySelector<HTMLElement>('.canvas > .diagit-notice')!
    expect(notice.dataset.layout).toBe('pane')
    expect(notice.getAttribute('role')).toBe('alert')
    expect(textOf(app, '.diagit-notice-title')).toBe('BPMN file could not be read')
    expect(textOf(app, '.diagit-notice-body')).toBe('It is not a valid BPMN model.')
    expect(textOf(app, '.diagit-notice-report')).toBe('Report problem')
    const report = app.querySelector<HTMLAnchorElement>('.diagit-notice-report')!
    expect(new URL(report.href).searchParams.get('where')).toBe(FAKE_REPORT_CONTEXT.where)
    expect(new URL(report.href).searchParams.get('console')).toBe(
      'Error while parsing the model (details withheld, they quote the model)',
    )
    expect(app.querySelector('.diagit-wrap')!.classList.contains('has-error')).toBe(true)
    expect(textOf(app, '.diagit-toolbar .file-name')).toBe('order.bpmn')
  })

  it('shows a warning without a report link for an unsupported file', async () => {
    const { app } = mountPage(new FakeNotation())

    openFile(app, new File(['hello'], 'notes.txt'))

    await vi.waitFor(() => expect(app.querySelector('.diagit-notice')).not.toBeNull())
    expect(app.querySelector<HTMLElement>('.diagit-notice')!.dataset.tone).toBe('warning')
    expect(app.querySelector('.diagit-notice')!.getAttribute('role')).toBe('status')
    expect(textOf(app, '.diagit-notice-title')).toBe("Diagit can't open notes.txt")
    expect(textOf(app, '.diagit-notice-body')).toBe('It opens .bpmn files.')
    expect(app.querySelector('.diagit-notice-actions')).toBeNull()
  })

  it('clears the error once the next file renders', async () => {
    const { app } = mountPage(new FakeNotation())
    openFile(app, new File(['hello'], 'notes.txt'))
    await vi.waitFor(() => expect(app.querySelector('.diagit-notice')).not.toBeNull())

    openFile(app, new File(['<bpmn/>'], 'order.bpmn'))

    await vi.waitFor(() => expect(app.querySelector('.canvas .fake-diagram')).not.toBeNull())
    expect(app.querySelector('.diagit-notice')).toBeNull()
    expect(app.querySelector('.diagit-wrap')!.classList.contains('has-error')).toBe(false)
  })
})

describe('StandaloneViewerPage with a linked model', () => {
  it('renders the model it may read with its file name and notation', async () => {
    const linkedModels = new FakeLinkedModels(async () => '<bpmn/>')
    const { app, page } = mountPage(new FakeNotation(), linkedModels)

    await page.openLink(READABLE_FILE)

    expect(linkedModels.fetched).toEqual([READABLE_FILE])
    expect(app.querySelector('.canvas .fake-diagram')).not.toBeNull()
    expect(app.querySelector('.diagit-wrap')!.classList.contains('has-diagram')).toBe(true)
    expect(textOf(app, '.file-name')).toBe('order.bpmn')
    expect(textOf(app, '.diagit-file-label .kind')).toBe('BPMN')
  })

  it('names the linked model by the decoded last segment of its path', async () => {
    const { app, page } = mountPage(new FakeNotation())

    await page.openLink('https://github.com/o/r/raw/main/models/order%20process.bpmn')

    expect(textOf(app, '.file-name')).toBe('order process.bpmn')
  })

  it('refuses a model from a domain Diagit may not read and fetches nothing', async () => {
    const linkedModels = new FakeLinkedModels(async () => '<bpmn/>')
    const { app, page } = mountPage(new FakeNotation(), linkedModels)

    await page.openLink('https://evil.example/order.bpmn')

    expect(linkedModels.fetched).toEqual([])
    expect(app.querySelector<HTMLElement>('.diagit-notice')!.dataset.tone).toBe('warning')
    expect(textOf(app, '.diagit-notice-title')).toBe("Can't open order.bpmn")
    expect(textOf(app, '.diagit-notice-body')).toBe(
      'Diagit may not read files from evil.example yet. Add the domain in the options.',
    )
    expect(textOf(app, '.diagit-notice-actions button')).toBe('Open options')
    const report = app.querySelector<HTMLAnchorElement>('.diagit-notice-report')!
    expect(decodeURIComponent(report.href)).not.toContain('evil.example')
    expect(app.querySelector('.canvas .fake-diagram')).toBeNull()
    expect(textOf(app, '.file-name')).toBe('order.bpmn')
  })

  it('shows the download error with a report link', async () => {
    const linkedModels = new FakeLinkedModels(async (url) => {
      throw new FetchError(`HTTP 404 for ${url}`, 404)
    })
    const { app, page } = mountPage(new FakeNotation(), linkedModels)

    await page.openLink(READABLE_FILE)

    expect(textOf(app, '.diagit-notice-title')).toBe('order.bpmn could not be downloaded')
    expect(textOf(app, '.diagit-notice-body')).toBe('Check your connection and try again.')
    const report = app.querySelector<HTMLAnchorElement>('.diagit-notice-report')!
    expect(report.textContent).toBe('Report problem')
    expect(new URL(report.href).searchParams.get('console')).toBe('HTTP 404 for https://github.com')
    expect(decodeURIComponent(report.href)).not.toContain('order.bpmn')
  })

  it('downloads the linked model again on "Try again"', async () => {
    let attempts = 0
    const linkedModels = new FakeLinkedModels(async () => {
      attempts += 1
      if (attempts === 1) {
        throw new FetchError('HTTP 503', 503)
      }
      return '<bpmn/>'
    })
    const { app, page } = mountPage(new FakeNotation(), linkedModels)
    await page.openLink(READABLE_FILE)

    app.querySelector<HTMLButtonElement>('.diagit-notice-actions button')!.click()

    await vi.waitFor(() => expect(app.querySelector('.canvas .fake-diagram')).not.toBeNull())
    expect(attempts).toBe(2)
  })

  it('refuses a file that is no supported model without fetching it', async () => {
    const linkedModels = new FakeLinkedModels(async () => 'hello')
    const { app, page } = mountPage(new FakeNotation(), linkedModels)

    await page.openLink('https://github.com/o/r/raw/main/notes.txt')

    expect(linkedModels.fetched).toEqual([])
    expect(textOf(app, '.diagit-notice-title')).toBe("Diagit can't open notes.txt")
  })

  it('keeps a file dropped while the linked model still downloads', async () => {
    let finishDownload: (xml: string) => void = () => undefined
    const linkedModels = new FakeLinkedModels(
      () => new Promise((resolve) => (finishDownload = resolve)),
    )
    const notation = new FakeNotation()
    const createViewer = vi.spyOn(notation, 'createViewer')
    const { app, page } = mountPage(notation, linkedModels)
    const linkedModelLoaded = page.openLink(READABLE_FILE)
    await vi.waitFor(() => expect(linkedModels.fetched).toEqual([READABLE_FILE]))

    openFile(app, new File(['<bpmn/>'], 'local.bpmn'))
    await vi.waitFor(() => expect(textOf(app, '.file-name')).toBe('local.bpmn'))
    finishDownload('<bpmn/>')
    await linkedModelLoaded

    expect(createViewer).toHaveBeenCalledOnce()
    expect(textOf(app, '.file-name')).toBe('local.bpmn')
  })

  it('keeps a file dropped while Diagit still checks whether it may read the link', async () => {
    let answerMayRead: (mayRead: boolean) => void = () => undefined
    const linkedModels = new FakeLinkedModels(async () => '<bpmn/>')
    vi.spyOn(linkedModels, 'mayRead').mockReturnValue(
      new Promise((resolve) => (answerMayRead = resolve)),
    )
    const { app, page } = mountPage(new FakeNotation(), linkedModels)
    const linkedModelLoaded = page.openLink('https://evil.example/order.bpmn')

    openFile(app, new File(['<bpmn/>'], 'local.bpmn'))
    await vi.waitFor(() => expect(textOf(app, '.file-name')).toBe('local.bpmn'))
    answerMayRead(false)
    await linkedModelLoaded

    expect(app.querySelector('.diagit-notice')).toBeNull()
    expect(textOf(app, '.file-name')).toBe('local.bpmn')
  })
})
