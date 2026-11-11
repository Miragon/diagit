import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiffPanel } from '../../src/views/diff-viewer/DiffPanel'
import { MARKER } from '../../src/views/diff-viewer/markers'
import { FakeDiffer } from '../fakes/FakeDiffer'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'

const LOADING_LABEL = 'Loading diagram…'
const downloadFailed = () => Promise.reject(new Error('HTTP 403 for raw file'))

const plainPane = (container: HTMLElement) => container.querySelector('.diagit-diff-single')!
const diffPanes = (container: HTMLElement) => [
  ...container
    .querySelector('.diagit-diff-grid')!
    .querySelectorAll<HTMLElement>('.diagit-diff-pane'),
]
const tabNamed = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === name)!

let panel: DiffPanel | null = null

function mount(differ: FakeDiffer, loadOld: () => Promise<string | null>, loadNew = loadOld) {
  const container = document.createElement('div')
  document.body.append(container)
  panel = new DiffPanel({
    differ,
    loadOld,
    loadNew,
    label: 'BPMN',
    reportContext: FAKE_REPORT_CONTEXT,
  }).mount(container)
  return container
}

afterEach(() => {
  panel?.destroy()
  panel = null
  document.body.innerHTML = ''
})

describe('DiffPanel', () => {
  it('shows a loading label while the models are still on their way', () => {
    const neverArrives = () => new Promise<string | null>(() => {})

    const container = mount(new FakeDiffer(), neverArrives)

    expect(container.textContent).toContain(LOADING_LABEL)
  })

  it('takes only the mode from the host page, as data-cd-theme', () => {
    const container = mount(new FakeDiffer(), async () => null)

    expect(container.querySelector<HTMLElement>('.diagit-diff-root')!.dataset.cdTheme).toBe('light')
  })

  it('drops the loading label once the models have arrived', async () => {
    const container = mount(new FakeDiffer(), async () => null)

    await vi.waitFor(() =>
      expect(container.textContent).toContain('No current model (file deleted).'),
    )
    expect(container.textContent).not.toContain(LOADING_LABEL)
  })

  it('marks the diff on both sides and counts every category in the legend', async () => {
    const differ = new FakeDiffer({ added: ['A'], removed: ['R'], changed: ['C'], moved: [] }, [
      'A',
      'R',
      'C',
    ])

    const container = mount(
      differ,
      async () => '<old/>',
      async () => '<new/>',
    )

    await vi.waitFor(() => expect(container.textContent).toContain('Added: 1'))
    const [oldViewer, newViewer] = differ.viewers
    expect(oldViewer!.markers).toEqual([
      { id: 'R', marker: MARKER.removed },
      { id: 'C', marker: MARKER.changed },
    ])
    expect(newViewer!.markers).toEqual([
      { id: 'A', marker: MARKER.added },
      { id: 'C', marker: MARKER.changed },
    ])
  })

  it('disables change navigation when nothing changed', async () => {
    const container = mount(new FakeDiffer(), async () => '<same/>')

    await vi.waitFor(() => {
      const next = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Next')
      expect(next?.disabled).toBe(true)
    })
  })

  it('tells which version failed to download instead of calling the file deleted', async () => {
    const container = mount(new FakeDiffer(), async () => '<old/>', downloadFailed)

    await vi.waitFor(() =>
      expect(plainPane(container).textContent).toContain('New version could not be loaded'),
    )
    expect(plainPane(container).textContent).toContain('HTTP 403 for raw file')
    expect(plainPane(container).textContent).toContain('Report this problem')
    expect(plainPane(container).textContent).not.toContain('file deleted')
    const [, newPane] = diffPanes(container)
    expect(newPane!.textContent).toContain('New version could not be loaded')
    expect(newPane!.textContent).not.toContain('deleted')
  })

  it('names the old version when its download fails', async () => {
    const differ = new FakeDiffer({ added: [], removed: ['R'], changed: [], moved: [] }, ['R'])
    const container = mount(differ, downloadFailed, async () => '<new/>')

    await vi.waitFor(() =>
      expect(diffPanes(container)[0]!.textContent).toContain('Old version could not be loaded'),
    )
    expect(diffPanes(container)[0]!.textContent).not.toContain('not in source')
    expect(differ.viewers.flatMap((viewer) => viewer.markers)).toEqual([])
  })

  it('says the changes could not be computed when a version is missing', async () => {
    const container = mount(new FakeDiffer(), async () => '<old/>', downloadFailed)

    await vi.waitFor(() => expect(container.textContent).toContain('Changes could not be computed'))
    expect(container.textContent).not.toContain('Added: 0')
  })

  it('shows a notice when a loader throws before it returns a promise', async () => {
    const throwsAtOnce = () => {
      throw new Error('bad raw file url')
    }

    const container = mount(new FakeDiffer(), async () => '<old/>', throwsAtOnce)

    await vi.waitFor(() =>
      expect(plainPane(container).textContent).toContain('New version could not be loaded'),
    )
    expect(container.textContent).not.toContain('Prev')
  })

  it('says the changes could not be computed when the diff fails', async () => {
    const differ = new FakeDiffer()
    vi.spyOn(differ, 'diff').mockRejectedValue(new Error('unsupported element'))

    const container = mount(
      differ,
      async () => '<old/>',
      async () => '<new/>',
    )

    await vi.waitFor(() => expect(container.textContent).toContain('Changes could not be computed'))
    expect(container.textContent).not.toContain('Added: 0')
  })

  it('shows the unreadable model notice when a version cannot be rendered', async () => {
    const differ = new FakeDiffer()
    vi.spyOn(differ, 'createViewer').mockRejectedValue(new Error('no diagram found'))

    const container = mount(differ, async () => '<broken/>')

    await vi.waitFor(() =>
      expect(plainPane(container).textContent).toContain('BPMN view could not be rendered'),
    )
    expect(container.textContent).toContain('no diagram found')
    expect(container.textContent).not.toContain('render error')
  })

  it('shows the notice on the Plain tab when it is opened after the Diff tab', async () => {
    const container = mount(new FakeDiffer(), async () => '<old/>', downloadFailed)
    tabNamed(container, 'Diff').click()
    await vi.waitFor(() => expect(container.textContent).toContain('Changes could not be computed'))

    tabNamed(container, 'Plain').click()

    await vi.waitFor(() =>
      expect(plainPane(container).textContent).toContain('New version could not be loaded'),
    )
  })
})
