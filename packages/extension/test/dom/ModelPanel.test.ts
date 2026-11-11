import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModelPanel } from '../../src/views/blob-viewer/ModelPanel'
import { FakeNotation } from '../fakes/FakeNotation'

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
      }),
    )

    await vi.waitFor(() => expect(container.querySelector('.git-diagram-error')).not.toBeNull())
    expect(textOf(container, '.git-diagram-error-title')).toBe('BPMN view could not be loaded')
    expect(textOf(container, '.git-diagram-error-hint')).toContain('Reload the page')
    expect(textOf(container, '.git-diagram-error-detail')).toBe(
      'HTTP 500 for https://github.com/o/r/raw/main/order.bpmn',
    )
    expect(container.querySelector('.git-diagram-placeholder')).toBeNull()
    expect(container.querySelector('.git-diagram-error')!.hasAttribute('role')).toBe(false)
  })

  it('shows the error notice with a report link when the model cannot be rendered', async () => {
    const container = mountPanel(
      new ModelPanel({ notation: new UnreadableNotation(), loadXml: async () => 'not a model' }),
    )

    await vi.waitFor(() => expect(container.querySelector('.git-diagram-error')).not.toBeNull())
    expect(textOf(container, '.git-diagram-error-title')).toBe('BPMN view could not be rendered')
    expect(textOf(container, '.git-diagram-error-hint')).toContain('as a BPMN model')
    expect(textOf(container, '.git-diagram-error-detail')).toBe('unparsable content')
    const report = container.querySelector<HTMLAnchorElement>('.git-diagram-error-report')!
    expect(report.textContent).toBe('Report this problem')
    expect(report.href).toContain('https://github.com/Miragon/diagit/issues/new')
  })
})
