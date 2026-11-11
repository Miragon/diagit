import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModelPanel } from '../../src/views/blob-viewer/ModelPanel'
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

describe('ModelPanel', () => {
  it('shows the error notice when the file cannot be loaded', async () => {
    const container = mountPanel(
      new ModelPanel({
        notation: new FakeNotation(),
        loadXml: async () => {
          throw new Error('HTTP 500 for https://github.com/o/r/raw/main/order.bpmn')
        },
        reportContext: FAKE_REPORT_CONTEXT,
      }),
    )

    await vi.waitFor(() => expect(container.querySelector('.diagit-error')).not.toBeNull())
    expect(textOf(container, '.diagit-error-title')).toBe('BPMN view could not be loaded')
    expect(textOf(container, '.diagit-error-hint')).toContain('Reload the page')
    expect(textOf(container, '.diagit-error-detail')).toBe(
      'HTTP 500 for https://github.com/o/r/raw/main/order.bpmn',
    )
    expect(container.querySelector('.diagit-placeholder')).toBeNull()
    expect(container.querySelector('.diagit-error')!.hasAttribute('role')).toBe(false)
    const report = container.querySelector<HTMLAnchorElement>('.diagit-error-report')!
    expect(new URL(report.href).searchParams.get('where')).toBe(FAKE_REPORT_CONTEXT.where)
    expect(decodeURIComponent(report.href)).not.toContain('order.bpmn')
  })

  it('shows the error notice with a report link when the model cannot be rendered', async () => {
    const container = mountPanel(
      new ModelPanel({
        notation: new UnreadableNotation(),
        loadXml: async () => 'not a model',
        reportContext: FAKE_REPORT_CONTEXT,
      }),
    )

    await vi.waitFor(() => expect(container.querySelector('.diagit-error')).not.toBeNull())
    expect(textOf(container, '.diagit-error-title')).toBe('BPMN view could not be rendered')
    expect(textOf(container, '.diagit-error-hint')).toContain('as a BPMN model')
    expect(textOf(container, '.diagit-error-detail')).toBe('unparsable content')
    const report = container.querySelector<HTMLAnchorElement>('.diagit-error-report')!
    expect(report.textContent).toBe('Report this problem')
    expect(report.href).toContain('https://github.com/Miragon/diagit/issues/new')
    expect(new URL(report.href).searchParams.get('env')).toBe(FAKE_REPORT_CONTEXT.environment)
    expect(decodeURIComponent(report.href)).not.toContain('unparsable content')
  })
})
