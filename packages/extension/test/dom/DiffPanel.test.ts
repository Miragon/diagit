import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DiffPanel } from '../../src/views/diff-viewer/DiffPanel'
import { MARKER } from '../../src/views/diff-viewer/markers'
import { FetchError } from '../../src/platform/messaging/HttpClient'
import { FakeDiffer } from '../fakes/FakeDiffer'
import { FakeIntersectionObserver } from '../fakes/FakeIntersectionObserver'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'

const LOADING_LABEL = 'Loading diagram…'
const downloadFailed = () => Promise.reject(new FetchError('HTTP 403 for raw file', 403))

const plainPane = (container: HTMLElement) => container.querySelector('.diagit-diff-single')!
const diffPanes = (container: HTMLElement) => [
  ...container
    .querySelector('.diagit-diff-grid')!
    .querySelectorAll<HTMLElement>('.diagit-diff-pane'),
]
const failureIn = (pane: Element) => pane.querySelector<HTMLElement>('[role="alert"]')!
const reportedConsole = (pane: Element) => {
  const report = failureIn(pane).querySelector<HTMLAnchorElement>('[aria-label="Report problem"]')!
  return new URL(report.href).searchParams.get('console')
}
const buttonsNamed = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll('button')].filter((button) => button.textContent === name)
const buttonNamed = (container: HTMLElement, name: string) => buttonsNamed(container, name)[0]!
const position = (container: HTMLElement) =>
  container.querySelector('.diagit-diff-position')?.textContent
const changeControls = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.diagit-diff-changes')!
const untilLoaded = (container: HTMLElement) =>
  vi.waitFor(() => expect(plainPane(container).textContent).not.toContain(LOADING_LABEL))

let panel: DiffPanel | null = null

function mountAwayFromViewport(
  differ: FakeDiffer,
  loadOld: () => Promise<string | null>,
  loadNew = loadOld,
  onRendered?: () => void,
) {
  const container = document.createElement('div')
  document.body.append(container)
  panel = new DiffPanel({
    differ,
    loadOld,
    loadNew,
    label: 'BPMN',
    reportContext: FAKE_REPORT_CONTEXT,
    onRendered,
  }).mount(container)
  return container
}

function mount(differ: FakeDiffer, loadOld: () => Promise<string | null>, loadNew = loadOld) {
  const container = mountAwayFromViewport(differ, loadOld, loadNew)
  FakeIntersectionObserver.bringNear()
  return container
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
})

afterEach(() => {
  panel?.destroy()
  panel = null
  document.body.innerHTML = ''
  FakeIntersectionObserver.reset()
  vi.unstubAllGlobals()
})

describe('DiffPanel', () => {
  describe('zoom island', () => {
    const zoomButton = (container: HTMLElement, label: string) =>
      container.querySelector<HTMLButtonElement>(`.diagit-zoom [aria-label^="${label}"]`)!

    async function diffShowingBothVersions() {
      const differ = new FakeDiffer()
      const container = mount(
        differ,
        async () => '<old/>',
        async () => '<new/>',
      )
      await vi.waitFor(() => expect(differ.viewers).toHaveLength(2))
      const [oldViewer, newViewer] = differ.viewers
      oldViewer!.level = 0.5
      newViewer!.level = 0.8
      return { container, oldViewer: oldViewer!, newViewer: newViewer! }
    }

    it('floats over the diagram area, not in the toolbar', async () => {
      const container = mount(new FakeDiffer(), async () => '<model/>')

      expect(container.querySelector('.diagit-diff-area > .diagit-zoom')).not.toBeNull()
      expect(container.querySelector('.diagit-toolbar .diagit-zoom')).toBeNull()
    })

    it('reads out the zoom level of the new version after "Zoom in"', async () => {
      const { container } = await diffShowingBothVersions()

      zoomButton(container, 'Zoom in').click()

      expect(zoomButton(container, 'Reset zoom').textContent).toBe('96%')
    })

    it('resets both versions to 100%', async () => {
      const { container, oldViewer, newViewer } = await diffShowingBothVersions()
      zoomButton(container, 'Zoom in').click()

      zoomButton(container, 'Reset zoom').click()

      expect(oldViewer.level).toBeCloseTo(1)
      expect(newViewer.level).toBeCloseTo(1)
      expect(zoomButton(container, 'Reset zoom').textContent).toBe('100%')
    })
  })

  describe('loading on demand', () => {
    it('downloads nothing until the panel comes near the viewport', async () => {
      const loadOld = vi.fn(async () => '<old/>')
      const loadNew = vi.fn(async () => '<new/>')

      const container = mountAwayFromViewport(new FakeDiffer(), loadOld, loadNew)
      await Promise.resolve()

      expect(loadOld).not.toHaveBeenCalled()
      expect(loadNew).not.toHaveBeenCalled()
      expect(diffPanes(container)[0]!.textContent).toContain(LOADING_LABEL)
    })

    it('loads and renders once the panel comes within a screen of the viewport', async () => {
      const differ = new FakeDiffer()
      const container = mountAwayFromViewport(
        differ,
        async () => '<old/>',
        async () => '<new/>',
      )

      FakeIntersectionObserver.bringNear()

      await vi.waitFor(() => expect(differ.viewers).toHaveLength(2))
      expect(diffPanes(container)[0]!.textContent).not.toContain(LOADING_LABEL)
      expect(FakeIntersectionObserver.instances[0]!.options.rootMargin).toBe('100% 0px')
    })

    it('keeps waiting when the panel is still far from the viewport', async () => {
      const loadNew = vi.fn(async () => '<new/>')
      const container = mountAwayFromViewport(new FakeDiffer(), async () => '<old/>', loadNew)

      FakeIntersectionObserver.instances[0]!.report(container, false)
      await Promise.resolve()

      expect(loadNew).not.toHaveBeenCalled()
    })

    it('counts a diagram view once a panel that stays on Plain rendered its diagram', async () => {
      const onRendered = vi.fn()
      mountAwayFromViewport(
        new FakeDiffer(),
        async () => null,
        async () => '<new/>',
        onRendered,
      )

      FakeIntersectionObserver.bringNear()

      await vi.waitFor(() => expect(onRendered).toHaveBeenCalled())
    })

    it('counts no diagram view when there is no diagram to show', async () => {
      const onRendered = vi.fn()
      const container = mountAwayFromViewport(
        new FakeDiffer(),
        async () => '<old/>',
        downloadFailed,
        onRendered,
      )

      FakeIntersectionObserver.bringNear()
      await untilLoaded(container)

      expect(onRendered).not.toHaveBeenCalled()
    })

    it('releases a diagram that finishes rendering after the panel was destroyed', async () => {
      const differ = new FakeDiffer()
      const createViewer = differ.createViewer.bind(differ)
      let finishRendering!: () => void
      const rendering = new Promise<void>((done) => (finishRendering = done))
      const slowCreateViewer = vi
        .spyOn(differ, 'createViewer')
        .mockImplementation(async (canvas) => {
          await rendering
          return createViewer(canvas)
        })
      const onRendered = vi.fn()
      mountAwayFromViewport(
        differ,
        async () => null,
        async () => '<new/>',
        onRendered,
      )
      FakeIntersectionObserver.bringNear()
      await vi.waitFor(() => expect(slowCreateViewer).toHaveBeenCalled())

      panel!.destroy()
      finishRendering()

      await vi.waitFor(() => expect(differ.viewers[0]?.destroyed).toBe(true))
      expect(onRendered).not.toHaveBeenCalled()
    })

    it('builds the Diff tab of a panel that stays on Plain only once it is opened', async () => {
      const differ = new FakeDiffer()
      const container = mount(
        differ,
        async () => null,
        async () => '<new/>',
      )
      await vi.waitFor(() => expect(plainPane(container).textContent).not.toContain(LOADING_LABEL))
      expect(differ.viewers).toHaveLength(1)

      buttonNamed(container, 'Diff').click()

      await vi.waitFor(() => expect(differ.viewers).toHaveLength(2))
      expect(diffPanes(container)[0]!.textContent).toContain('not in source')
    })

    it('stops watching the viewport once destroyed', () => {
      mountAwayFromViewport(new FakeDiffer(), async () => '<old/>')

      panel!.destroy()

      expect(FakeIntersectionObserver.instances[0]!.observed.size).toBe(0)
    })
  })

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
    expect(plainPane(container).textContent).not.toContain(LOADING_LABEL)
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

  it('shows one legend and one change navigator for both panes', async () => {
    const container = mount(
      new FakeDiffer({ added: ['A'], removed: ['R'], changed: [], moved: [] }, ['A', 'R']),
      async () => '<old/>',
      async () => '<new/>',
    )

    await vi.waitFor(() => expect(container.textContent).toContain('Added: 1'))

    expect(container.querySelectorAll('.diagit-diff-legend')).toHaveLength(1)
    expect(buttonsNamed(container, 'Next')).toHaveLength(1)
    expect(buttonsNamed(container, 'Prev')).toHaveLength(1)
    expect(buttonsNamed(container, 'All')).toHaveLength(1)
  })

  it('tells the position of the selected change while stepping through them', async () => {
    const container = mount(
      new FakeDiffer({ added: ['A'], removed: ['R'], changed: ['C'], moved: [] }, ['A', 'R', 'C']),
      async () => '<old/>',
      async () => '<new/>',
    )
    await vi.waitFor(() => expect(position(container)).toBe('3 changes'))

    buttonNamed(container, 'Next').click()
    expect(position(container)).toBe('1 of 3')
    buttonNamed(container, 'Next').click()
    expect(position(container)).toBe('2 of 3')
    buttonNamed(container, 'Prev').click()
    expect(position(container)).toBe('1 of 3')
    buttonNamed(container, 'All').click()
    expect(position(container)).toBe('3 changes')
    buttonNamed(container, 'Prev').click()
    expect(position(container)).toBe('3 of 3')
  })

  it('counts a single change in the singular', async () => {
    const container = mount(
      new FakeDiffer({ added: ['A'], removed: [], changed: [], moved: [] }, ['A']),
      async () => '<old/>',
      async () => '<new/>',
    )

    await vi.waitFor(() => expect(position(container)).toBe('1 change'))
  })

  it('disables change navigation when nothing changed', async () => {
    const container = mount(new FakeDiffer(), async () => '<same/>')

    await vi.waitFor(() => expect(buttonNamed(container, 'Next').disabled).toBe(true))
    expect(buttonNamed(container, 'Prev').disabled).toBe(true)
    expect(position(container)).toBe('No changes')
  })

  it('shows no legend and no navigator for an added file', async () => {
    const container = mount(
      new FakeDiffer(),
      async () => null,
      async () => '<new/>',
    )
    await untilLoaded(container)

    buttonNamed(container, 'Diff').click()

    await vi.waitFor(() => expect(diffPanes(container)[0]!.textContent).toContain('not in source'))
    expect(changeControls(container).textContent).toBe('')
  })

  it('labels the panes Before and After', () => {
    const container = mount(new FakeDiffer(), async () => '<old/>')

    const [oldPane, newPane] = diffPanes(container)
    expect(oldPane!.querySelector('.diagit-diff-side')!.textContent).toBe('Before')
    expect(newPane!.querySelector('.diagit-diff-side')!.textContent).toBe('After')
  })

  it('shows the legend and the navigator on Diff only', async () => {
    const container = mount(
      new FakeDiffer(),
      async () => '<old/>',
      async () => '<new/>',
    )
    await vi.waitFor(() => expect(container.textContent).toContain('Added: 0'))

    expect(changeControls(container).style.display).toBe('')
    buttonNamed(container, 'Plain').click()
    expect(changeControls(container).style.display).toBe('none')
  })

  it('tells which version failed to download instead of calling the file deleted', async () => {
    const container = mount(new FakeDiffer(), async () => '<old/>', downloadFailed)

    await vi.waitFor(() =>
      expect(
        failureIn(plainPane(container)).querySelector('.diagit-diff-failure-title')?.textContent,
      ).toBe('New version could not be loaded · HTTP 403'),
    )
    expect(failureIn(plainPane(container)).querySelector('.diagit-notice-meta')!.textContent).toBe(
      '· HTTP 403',
    )
    expect(failureIn(plainPane(container)).hasAttribute('title')).toBe(false)
    expect(reportedConsole(plainPane(container))).toContain('HTTP 403 for raw file')
    expect(
      failureIn(plainPane(container)).querySelector('[aria-label="Reload page"]'),
    ).not.toBeNull()
    expect(plainPane(container).textContent).toContain('No diagram for this version')
    expect(plainPane(container).textContent).not.toContain('file deleted')
    buttonNamed(container, 'Diff').click()
    const [, newPane] = diffPanes(container)
    await vi.waitFor(() =>
      expect(newPane!.textContent).toContain('New version could not be loaded'),
    )
    expect(newPane!.textContent).not.toContain('deleted')
  })

  it('leaves the HTTP status out of the title when the download failed without one', async () => {
    const container = mount(
      new FakeDiffer(),
      async () => '<old/>',
      () => Promise.reject(new Error('offline')),
    )

    await vi.waitFor(() => expect(failureIn(plainPane(container))).not.toBeNull())
    expect(
      failureIn(plainPane(container)).querySelector('.diagit-diff-failure-title')!.textContent,
    ).toBe('New version could not be loaded')
    expect(failureIn(plainPane(container)).textContent).not.toContain('offline')
    expect(reportedConsole(plainPane(container))).toBe('offline')
  })

  it('names the old version when its download fails', async () => {
    const differ = new FakeDiffer({ added: [], removed: ['R'], changed: [], moved: [] }, ['R'])
    const container = mount(differ, downloadFailed, async () => '<new/>')
    await untilLoaded(container)

    buttonNamed(container, 'Diff').click()

    await vi.waitFor(() =>
      expect(diffPanes(container)[0]!.textContent).toContain('Old version could not be loaded'),
    )
    expect(diffPanes(container)[0]!.textContent).not.toContain('not in source')
    expect(differ.viewers.flatMap((viewer) => viewer.markers)).toEqual([])
  })

  it('says the changes could not be computed when a version is missing', async () => {
    const container = mount(new FakeDiffer(), async () => '<old/>', downloadFailed)
    await untilLoaded(container)

    buttonNamed(container, 'Diff').click()

    await vi.waitFor(() => expect(container.textContent).toContain('Changes could not be computed'))
    expect(container.querySelectorAll('.diagit-diff-legend')).toHaveLength(1)
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
    const newPane = diffPanes(container)[1]!

    await vi.waitFor(() => expect(newPane.textContent).toContain('New version could not be read'))
    expect(failureIn(newPane).textContent).not.toContain('no diagram found')
    expect(reportedConsole(newPane)).toBe('no diagram found')
    expect(failureIn(newPane).querySelector('[aria-label="Reload page"]')).toBeNull()
    expect(container.textContent).not.toContain('render error')
  })

  it('shows the notice on the Plain tab when it is opened after the Diff tab', async () => {
    const container = mount(new FakeDiffer(), async () => '<old/>', downloadFailed)
    buttonNamed(container, 'Diff').click()
    await vi.waitFor(() => expect(container.textContent).toContain('Changes could not be computed'))

    buttonNamed(container, 'Plain').click()

    await vi.waitFor(() =>
      expect(plainPane(container).textContent).toContain('New version could not be loaded'),
    )
  })

  describe('the tab it opens on', () => {
    const activeTab = (container: HTMLElement) =>
      container.querySelector('.diagit-tab.is-active')?.textContent

    it('opens on Diff when the file has an old and a new version', async () => {
      const differ = new FakeDiffer()
      const createViewer = vi.spyOn(differ, 'createViewer')

      const container = mount(
        differ,
        async () => '<old/>',
        async () => '<new/>',
      )

      await vi.waitFor(() => expect(activeTab(container)).toBe('Diff'))
      expect(createViewer).toHaveBeenCalledTimes(2)
    })

    it('stays on Plain for an added or a deleted file', async () => {
      const added = mount(
        new FakeDiffer(),
        async () => null,
        async () => '<new/>',
      )
      const deleted = mount(
        new FakeDiffer(),
        async () => '<old/>',
        async () => null,
      )

      await untilLoaded(added)
      await untilLoaded(deleted)

      expect(activeTab(added)).toBe('Plain')
      expect(activeTab(deleted)).toBe('Plain')
    })

    it('stays on Plain when a version could not be loaded', async () => {
      const container = mount(new FakeDiffer(), async () => '<old/>', downloadFailed)

      await untilLoaded(container)

      expect(activeTab(container)).toBe('Plain')
    })

    it('builds the Diff tab the user opened while the models were loading', async () => {
      const differ = new FakeDiffer()
      const container = mount(
        differ,
        async () => null,
        async () => '<new/>',
      )
      buttonNamed(container, 'Diff').click()

      await vi.waitFor(() => expect(differ.viewers).toHaveLength(1))

      expect(activeTab(container)).toBe('Diff')
      expect(diffPanes(container)[1]!.querySelector('.fake-diagram')).not.toBeNull()
    })

    it('keeps the tab the user picked while the models were loading', async () => {
      const container = mount(
        new FakeDiffer(),
        async () => '<old/>',
        async () => '<new/>',
      )
      buttonNamed(container, 'Plain').click()

      await untilLoaded(container)

      expect(activeTab(container)).toBe('Plain')
    })
  })
})
