import { afterEach, describe, expect, it, vi } from 'vitest'
import { StandaloneViewerPage } from '../../src/views/standalone-viewer/StandaloneViewerPage'
import { FakeNotation } from '../fakes/FakeNotation'
import { FakeNotationLookup } from '../fakes/FakeNotationLookup'

class UnreadableNotation extends FakeNotation {
  override async createViewer(): Promise<never> {
    throw new Error('unparsable content')
  }
}

function mountPage(notation: FakeNotation): HTMLElement {
  const app = document.createElement('div')
  document.body.append(app)
  new StandaloneViewerPage(new FakeNotationLookup([notation]), ['.bpmn']).mount(app)
  return app
}

function openFile(app: HTMLElement, file: File): void {
  const input = app.querySelector<HTMLInputElement>('input[type=file]')!
  Object.defineProperty(input, 'files', { value: [file] })
  input.dispatchEvent(new Event('change'))
}

function textOf(app: HTMLElement, selector: string): string {
  return app.querySelector(selector)?.textContent ?? ''
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('StandaloneViewerPage', () => {
  it('shows the error notice with a report link when the model cannot be rendered', async () => {
    const app = mountPage(new UnreadableNotation())

    openFile(app, new File(['not a model'], 'order.bpmn'))

    await vi.waitFor(() => expect(app.querySelector('.diagit-error')).not.toBeNull())
    expect(textOf(app, '.diagit-error-title')).toBe('BPMN view could not be rendered')
    expect(textOf(app, '.diagit-error-hint')).toContain('as a BPMN model')
    expect(textOf(app, '.diagit-error-detail')).toBe('unparsable content')
    expect(textOf(app, '.diagit-error-report')).toBe('Report this problem')
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
