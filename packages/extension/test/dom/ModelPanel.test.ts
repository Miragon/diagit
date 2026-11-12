import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModelPanel } from '../../src/views/blob-viewer/ModelPanel'
import { FakeDiffableViewer } from '../fakes/FakeDiffableViewer'
import { FakeNotation } from '../fakes/FakeNotation'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'

class UnreadableNotation extends FakeNotation {
  override async createViewer(): Promise<never> {
    throw new Error('unparsable content')
  }
}

function mountPanel(panel: ModelPanel): HTMLElement {
  const container = document.createElement('div')
  document.body.append(container)
  panel.mount(container)
  return container
}

function textOf(container: HTMLElement, selector: string): string {
  return container.querySelector(selector)?.textContent ?? ''
}

afterEach(() => {
  document.body.innerHTML = ''
})

function reportedConsole(container: HTMLElement): string | null {
  const report = container.querySelector<HTMLAnchorElement>('.diagit-notice-report')!
  return new URL(report.href).searchParams.get('console')
}

describe('ModelPanel', () => {
  it('shows a pane notice inside the canvas when the file cannot be downloaded', async () => {
    const container = mountPanel(
      new ModelPanel({
        notation: new FakeNotation(),
        filePath: 'flows/order.bpmn',
        loadXml: async () => {
          throw new Error('HTTP 500 for https://github.com/o/r/raw/main/order.bpmn')
        },
        reportContext: FAKE_REPORT_CONTEXT,
      }),
    )

    await vi.waitFor(() => expect(container.querySelector('.diagit-notice')).not.toBeNull())
    const notice = container.querySelector<HTMLElement>('.diagit-canvas > .diagit-notice')!
    expect(notice.dataset.layout).toBe('pane')
    expect(notice.dataset.tone).toBe('danger')
    expect(notice.getAttribute('role')).toBe('status')
    expect(textOf(container, '.diagit-notice-title')).toBe('BPMN file could not be downloaded')
    expect(textOf(container, '.diagit-notice-body')).toBe(
      'Check your connection and try again. The code below still shows the file.',
    )
    expect(container.querySelector('.diagit-placeholder')).toBeNull()
    expect(container.querySelector<HTMLElement>('.diagit-zoom')!.hidden).toBe(true)
    const report = container.querySelector<HTMLAnchorElement>('.diagit-notice-report')!
    expect(new URL(report.href).searchParams.get('where')).toBe(FAKE_REPORT_CONTEXT.where)
    expect(reportedConsole(container)).toBe('HTTP 500 for https://github.com')
    expect(decodeURIComponent(report.href)).not.toContain('order.bpmn')
  })

  it('renders the diagram when "Try again" downloads the file', async () => {
    let attempts = 0
    const container = mountPanel(
      new ModelPanel({
        notation: new FakeNotation(),
        filePath: 'flows/order.bpmn',
        loadXml: async () => {
          attempts += 1
          if (attempts === 1) {
            throw new Error('offline')
          }
          return '<bpmn/>'
        },
        reportContext: FAKE_REPORT_CONTEXT,
      }),
    )
    await vi.waitFor(() => expect(container.querySelector('.diagit-notice')).not.toBeNull())

    const tryAgain = container.querySelector<HTMLButtonElement>('.diagit-notice-actions button')!
    expect(tryAgain.textContent).toBe('Try again')
    expect(tryAgain.classList).toContain('btn-primary')
    tryAgain.click()

    await vi.waitFor(() => expect(container.querySelector('.fake-diagram')).not.toBeNull())
    expect(attempts).toBe(2)
    expect(container.querySelector('.diagit-notice')).toBeNull()
    expect(container.querySelector<HTMLElement>('.diagit-zoom')!.hidden).toBe(false)
  })

  it('announces a failure after "Try again" as an alert', async () => {
    const container = mountPanel(
      new ModelPanel({
        notation: new FakeNotation(),
        filePath: 'flows/order.bpmn',
        loadXml: async () => {
          throw new Error('offline')
        },
        reportContext: FAKE_REPORT_CONTEXT,
      }),
    )
    await vi.waitFor(() => expect(container.querySelector('.diagit-notice')).not.toBeNull())

    container.querySelector<HTMLButtonElement>('.diagit-notice-actions button')!.click()

    await vi.waitFor(() =>
      expect(container.querySelector('.diagit-notice')!.getAttribute('role')).toBe('alert'),
    )
  })

  it('names the file and its notation in the toolbar', () => {
    const container = mountPanel(
      new ModelPanel({
        notation: new FakeNotation(),
        filePath: 'flows/order.bpmn',
        loadXml: async () => '<bpmn/>',
        reportContext: FAKE_REPORT_CONTEXT,
      }),
    )

    expect(textOf(container, '.diagit-toolbar .file-name')).toBe('order.bpmn')
    expect(textOf(container, '.diagit-toolbar .kind')).toBe('BPMN')
  })

  it('reads out the zoom level of the rendered diagram', async () => {
    const container = mountPanel(
      new ModelPanel({
        notation: new FakeNotation(),
        filePath: 'flows/order.bpmn',
        loadXml: async () => '<bpmn/>',
        reportContext: FAKE_REPORT_CONTEXT,
      }),
    )
    await vi.waitFor(() => expect(container.querySelector('.fake-diagram')).not.toBeNull())
    const zoomIn = container.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!
    const readout = container.querySelector<HTMLButtonElement>('.diagit-zoom-level')!

    expect(readout.textContent).toBe('100%')
    zoomIn.click()
    expect(readout.textContent).toBe('120%')
    readout.click()
    expect(readout.textContent).toBe('100%')
  })

  it('hides the zoom island while the diagram has no zoomable canvas', async () => {
    const viewer = new FakeDiffableViewer()
    viewer.level = null
    const notation = new FakeNotation()
    vi.spyOn(notation, 'createViewer').mockResolvedValue(viewer)
    const container = mountPanel(
      new ModelPanel({
        notation,
        filePath: 'decision.dmn',
        loadXml: async () => '<dmn/>',
        reportContext: FAKE_REPORT_CONTEXT,
      }),
    )
    const zoom = container.querySelector<HTMLElement>('.diagit-zoom')!
    await vi.waitFor(() => expect(container.querySelector('.diagit-placeholder')).toBeNull())

    expect(zoom.hidden).toBe(true)
    viewer.level = 1
    viewer.zoomBy(1)
    expect(zoom.hidden).toBe(false)
  })

  it('shows a pane notice with a report link when the model cannot be read', async () => {
    const container = mountPanel(
      new ModelPanel({
        notation: new UnreadableNotation(),
        filePath: 'flows/order.bpmn',
        loadXml: async () => 'not a model',
        reportContext: FAKE_REPORT_CONTEXT,
      }),
    )

    await vi.waitFor(() => expect(container.querySelector('.diagit-notice')).not.toBeNull())
    expect(textOf(container, '.diagit-notice-title')).toBe('BPMN file could not be read')
    expect(textOf(container, '.diagit-notice-body')).toBe(
      'It is not a valid BPMN model. The code below still shows the file.',
    )
    expect(container.querySelector('.diagit-notice-actions button')).toBeNull()
    const report = container.querySelector<HTMLAnchorElement>('.diagit-notice-report')!
    expect(report.textContent).toBe('Report problem')
    expect(report.href).toContain('https://github.com/Miragon/diagit/issues/new')
    expect(new URL(report.href).searchParams.get('env')).toBe(FAKE_REPORT_CONTEXT.environment)
    expect(reportedConsole(container)).not.toContain('unparsable content')
  })
})
