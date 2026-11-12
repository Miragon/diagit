import { afterEach, describe, expect, it, vi } from 'vitest'
import { StandaloneViewerPage } from '../../src/views/standalone-viewer/StandaloneViewerPage'
import { FakeDiffableViewer } from '../fakes/FakeDiffableViewer'
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

function mountPage(notation: FakeNotation): HTMLElement {
  const app = document.createElement('div')
  document.body.append(app)
  new StandaloneViewerPage(
    new FakeNotationLookup([notation]),
    ['.bpmn'],
    ['BPMN', 'DMN'],
    FAKE_REPORT_CONTEXT,
  ).mount(app)
  return app
}

function openFile(app: HTMLElement, file: File): void {
  const input = app.querySelector<HTMLInputElement>('input[type=file]')!
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change'))
}

function textOf(app: HTMLElement, selector: string): string {
  return app.querySelector(selector)?.textContent ?? ''
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('StandaloneViewerPage', () => {
  it('names the supported notations while no file is open', () => {
    const app = mountPage(new FakeNotation())

    expect(textOf(app, '.file-name')).toBe('No file open')
    expect(textOf(app, '.dropzone')).toContain('BPMN, DMN')
    expect(app.querySelector('.diagit-wrap')!.classList.contains('has-diagram')).toBe(false)
  })

  it('shows the file name and notation and fits the diagram once it is open', async () => {
    const viewer = new FakeDiffableViewer()
    const app = mountPage(notationRendering(viewer))

    openFile(app, new File(['<definitions/>'], 'order.bpmn'))

    await vi.waitFor(() => expect(textOf(app, '.file-name')).toBe('order.bpmn'))
    expect(textOf(app, '.notation-badge')).toBe('BPMN')
    expect(app.querySelector('.diagit-wrap')!.classList.contains('has-diagram')).toBe(true)
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
    const app = mountPage(notation)

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
    const app = mountPage(notationRendering(viewer))
    openFile(app, new File(['<definitions/>'], 'order.bpmn'))
    await vi.waitFor(() => expect(textOf(app, '.file-name')).toBe('order.bpmn'))

    openFile(app, new File(['hello'], 'notes.txt'))

    await vi.waitFor(() => expect(app.querySelector('.diagit-error')).not.toBeNull())
    expect(viewer.destroyed).toBe(true)
    expect(textOf(app, '.file-name')).toBe('No file open')
    expect(app.querySelector('.diagit-wrap')!.classList.contains('has-diagram')).toBe(false)
  })

  it('shows the error notice with a report link when the model cannot be rendered', async () => {
    const app = mountPage(new UnreadableNotation())

    openFile(app, new File(['not a model'], 'order.bpmn'))

    await vi.waitFor(() => expect(app.querySelector('.diagit-error')).not.toBeNull())
    expect(textOf(app, '.diagit-error-title')).toBe('BPMN view could not be rendered')
    expect(textOf(app, '.diagit-error-hint')).toContain('as a BPMN model')
    expect(textOf(app, '.diagit-error-detail')).toBe('unparsable content')
    expect(textOf(app, '.diagit-error-report')).toBe('Report this problem')
    const report = app.querySelector<HTMLAnchorElement>('.diagit-error-report')!
    expect(new URL(report.href).searchParams.get('where')).toBe(FAKE_REPORT_CONTEXT.where)
    expect(app.querySelector('.diagit-error')!.getAttribute('role')).toBe('alert')
  })

  it('shows the error notice without a report link for an unsupported file', async () => {
    const app = mountPage(new FakeNotation())

    openFile(app, new File(['hello'], 'notes.txt'))

    await vi.waitFor(() => expect(app.querySelector('.diagit-error')).not.toBeNull())
    expect(textOf(app, '.diagit-error-title')).toBe('File not supported')
    expect(textOf(app, '.diagit-error-hint')).toBe('Diagit opens .bpmn files.')
    expect(textOf(app, '.diagit-error-detail')).toBe('notes.txt')
    expect(app.querySelector('.diagit-error-report')).toBeNull()
  })
})
