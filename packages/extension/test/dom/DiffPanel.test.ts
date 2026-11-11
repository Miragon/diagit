import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiffPanel } from '../../src/views/diff-viewer/DiffPanel'
import { MARKER } from '../../src/views/diff-viewer/markers'
import { FakeDiffer } from '../fakes/FakeDiffer'

const LOADING_LABEL = 'Loading diagram…'

let panel: DiffPanel | null = null

function mount(differ: FakeDiffer, loadOld: () => Promise<string | null>, loadNew = loadOld) {
  const container = document.createElement('div')
  document.body.append(container)
  panel = new DiffPanel({ differ, loadOld, loadNew }).mount(container)
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
})
