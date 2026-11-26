import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChangeDetail, DiagramDiff } from '../../src/notations/Notation'
import { CodeToggle } from '../../src/platform/ui/CodeToggle'
import { DiffPanel } from '../../src/views/diff-viewer/DiffPanel'
import { FakeDiffer } from '../fakes/FakeDiffer'
import { FakeIntersectionObserver } from '../fakes/FakeIntersectionObserver'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'

const DIFF: DiagramDiff = { added: ['Task_new'], removed: [], changed: ['Task_1'], moved: ['End'] }

const DETAILS: Record<string, ChangeDetail> = {
  Task_1: {
    type: 'bpmn:ServiceTask',
    name: 'Charge card',
    before:
      '<bpmn:serviceTask id="Task_1">\n  <zeebe:taskDefinition type="a" />\n</bpmn:serviceTask>',
    after:
      '<bpmn:serviceTask id="Task_1">\n  <zeebe:taskDefinition type="b" />\n</bpmn:serviceTask>',
  },
  Task_new: {
    type: 'bpmn:UserTask',
    name: null,
    before: null,
    after: '<bpmn:userTask id="Task_new" />',
  },
  End: { type: 'bpmn:EndEvent', name: 'Done', before: '<end />', after: '<end />' },
}

let panel: DiffPanel | null = null
let hostCodeHidden = false

function mounted(): { container: HTMLElement; codeToggle: CodeToggle } {
  const codeToggle = new CodeToggle({
    shown: true,
    hideCode: (hidden) => {
      hostCodeHidden = hidden
    },
  })
  const container = document.createElement('div')
  document.body.append(container)
  panel = new DiffPanel({
    differ: new FakeDiffer(DIFF, ['Task_1', 'Task_new', 'End'], DETAILS),
    loadOld: async () => '<old/>',
    loadNew: async () => '<new/>',
    label: 'BPMN',
    filePath: 'flows/order.bpmn',
    reportContext: FAKE_REPORT_CONTEXT,
    codeToggle,
  }).mount(container)
  FakeIntersectionObserver.bringNear()
  return { container, codeToggle }
}

const bar = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.diagit-change-code-bar')!
const changeCode = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.diagit-change-code')!
const xml = (container: HTMLElement) => container.querySelector<HTMLElement>('.diagit-change-xml')!
const lines = (container: HTMLElement) =>
  [...xml(container).querySelectorAll<HTMLElement>('.diagit-xml-line')].map(
    (line) => `${line.dataset.line}:${line.textContent}`,
  )
const next = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('button[aria-label="Next change"]')!.click()
const barText = (container: HTMLElement) =>
  [...bar(container).children].map((part) => part.textContent).join(' | ')

async function loaded(): Promise<{ container: HTMLElement; codeToggle: CodeToggle }> {
  const mount = mounted()
  await vi.waitFor(() =>
    expect(
      mount.container.querySelector<HTMLButtonElement>('button[aria-label="Next change"]')
        ?.disabled,
    ).toBe(false),
  )
  return mount
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  hostCodeHidden = false
})

afterEach(() => {
  panel?.destroy()
  panel = null
  document.body.innerHTML = ''
  FakeIntersectionObserver.reset()
  vi.unstubAllGlobals()
})

describe('DiffPanel: the code of the selected change', () => {
  it('keeps the place of the bar while the diagrams load, so the page does not jump', () => {
    const { container } = mounted()

    expect(barText(container)).toBe('All changes | Whole file')
  })

  it('drops the bar when the changes cannot be computed', async () => {
    const differ = new FakeDiffer(DIFF, [], DETAILS)
    vi.spyOn(differ, 'compare').mockRejectedValue(new Error('unsupported element'))
    const container = document.createElement('div')
    document.body.append(container)
    panel = new DiffPanel({
      differ,
      loadOld: async () => '<old/>',
      loadNew: async () => '<new/>',
      label: 'BPMN',
      filePath: 'flows/order.bpmn',
      reportContext: FAKE_REPORT_CONTEXT,
      codeToggle: new CodeToggle({ shown: true, hideCode: () => {} }),
    }).mount(container)
    FakeIntersectionObserver.bringNear()

    await vi.waitFor(() => expect(changeCode(container).hidden).toBe(true))
  })

  it('names the whole file under the diagram while no change is selected', async () => {
    const { container } = await loaded()

    expect(barText(container)).toBe('All changes | Whole file')
    expect(xml(container).hidden).toBe(true)
    expect(hostCodeHidden).toBe(false)
  })

  it('shows only the XML of a selected change, before and after, instead of the host code', async () => {
    const { container, codeToggle } = await loaded()

    next(container)
    next(container)

    expect(barText(container)).toBe('Charge card | Service task')
    expect(xml(container).dataset.columns).toBe('2')
    expect(lines(container)).toEqual([
      'same:<bpmn:serviceTask id="Task_1">',
      'same:<bpmn:serviceTask id="Task_1">',
      'removed:  <zeebe:taskDefinition type="a" />',
      'added:  <zeebe:taskDefinition type="b" />',
      'same:</bpmn:serviceTask>',
      'same:</bpmn:serviceTask>',
    ])
    expect(hostCodeHidden).toBe(true)
    expect(codeToggle.element.getAttribute('aria-pressed')).toBe('true')
    expect(codeToggle.element.getAttribute('aria-controls')).toBe(changeCode(container).id)
  })

  it('keeps both columns for an added element, empty on the Before side, named by its id', async () => {
    const { container } = await loaded()

    next(container)

    expect(barText(container)).toBe('Task_new | User task')
    expect(xml(container).dataset.columns).toBe('2')
    expect(lines(container)).toEqual(['gap:', 'added:<bpmn:userTask id="Task_new" />'])
  })

  it('says only the layout changed for a moved element', async () => {
    const { container } = await loaded()

    next(container)
    next(container)
    next(container)

    expect(barText(container)).toBe('Done | End event | Only the layout changed')
    expect(xml(container).hidden).toBe(true)
    expect(hostCodeHidden).toBe(true)
  })

  it('goes back to the whole file on Esc and on the overview stop of the arrows', async () => {
    const { container } = await loaded()
    next(container)

    container
      .querySelector('.diagit-diff-root')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(barText(container)).toBe('All changes | Whole file')
    expect(hostCodeHidden).toBe(false)

    next(container)
    next(container)
    next(container)
    next(container)

    expect(barText(container)).toBe('All changes | Whole file')
  })

  it('shows neither the bar nor the code while Code is off', async () => {
    const { container, codeToggle } = await loaded()
    next(container)

    codeToggle.element.click()

    expect(changeCode(container).hidden).toBe(true)
    expect(hostCodeHidden).toBe(true)

    codeToggle.element.click()

    expect(barText(container)).toBe('Task_new | User task')
  })

  it('shows no bar in Plain', async () => {
    const { container } = await loaded()

    const plain = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Plain',
    )
    plain!.click()

    expect(changeCode(container).hidden).toBe(true)
    expect(hostCodeHidden).toBe(false)
  })

  it('puts the position before the arrows, so the arrows do not move while stepping', async () => {
    const { container } = await loaded()
    const nav = [...container.querySelector('.diagit-diff-nav')!.children]

    expect(nav.map((part) => part.getAttribute('aria-label') ?? part.textContent)).toEqual([
      '3 changes',
      'Previous change',
      'Next change',
      '·',
      'Show all',
    ])
  })

  it('counts the review comments that the code of the change hides', async () => {
    const { container, codeToggle } = await loaded()
    codeToggle.countReviewComments(2)
    const count = codeToggle.element.querySelector<HTMLElement>('.diagit-code-count')!
    expect(count.hidden).toBe(true)

    next(container)

    expect(count.textContent).toBe('2')
    expect(count.hidden).toBe(false)
  })
})
