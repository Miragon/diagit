import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DiffPanel } from '../../src/views/diff-viewer/DiffPanel'
import { MARKER } from '../../src/views/diff-viewer/markers'
import { FetchError } from '../../src/platform/messaging/HttpClient'
import { ModelRejected } from '../../src/platform/ModelRejected'
import { FakeDiffer } from '../fakes/FakeDiffer'
import { FakeFullScreen } from '../fakes/FakeFullScreen'
import { FakeIntersectionObserver } from '../fakes/FakeIntersectionObserver'
import { FakeResizeObserver } from '../fakes/FakeResizeObserver'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'

const LOADING_LABEL = 'Loading diagram…'
const downloadFailed = () => Promise.reject(new FetchError('HTTP 403 for raw file', 403))

const plainPane = (container: HTMLElement) => container.querySelector('.diagit-diff-single')!
const diffPanes = (container: HTMLElement) => [
  ...container
    .querySelector('.diagit-diff-grid')!
    .querySelectorAll<HTMLElement>('.diagit-diff-pane'),
]
const failureIn = (pane: Element) =>
  pane.querySelector<HTMLElement>('.diagit-notice[role="status"]')!
const reportedConsole = (pane: Element) => {
  const report = failureIn(pane).querySelector<HTMLAnchorElement>('[aria-label="Report problem"]')!
  return new URL(report.href).searchParams.get('console')
}
const buttonsNamed = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll('button')].filter((button) => button.textContent === name)
const buttonNamed = (container: HTMLElement, name: string) => buttonsNamed(container, name)[0]!
const buttonLabelled = (container: HTMLElement, label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
const total = (container: HTMLElement) => container.querySelector('.diagit-diff-total')?.textContent
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
    filePath: 'processes/order.bpmn',
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
  FakeFullScreen.uninstall()
  panel?.destroy()
  panel = null
  document.body.innerHTML = ''
  FakeIntersectionObserver.reset()
  FakeResizeObserver.reset()
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

    it('keeps its shape with disabled controls while the models load', () => {
      const container = mount(new FakeDiffer(), () => new Promise<string | null>(() => {}))

      expect(container.querySelector<HTMLElement>('.diagit-zoom')!.hidden).toBe(false)
      expect(zoomButton(container, 'Zoom in').disabled).toBe(true)
    })

    it('hides when no version could be rendered', async () => {
      const container = mount(new FakeDiffer(), downloadFailed)
      const zoom = container.querySelector<HTMLElement>('.diagit-zoom')!

      await vi.waitFor(() =>
        expect(plainPane(container).textContent).toContain('New version could not be loaded'),
      )
      buttonNamed(container, 'Diff').click()
      await vi.waitFor(() => expect(diffPanes(container)[0]!.textContent).toContain('could not'))
      await vi.waitFor(() => expect(zoom.hidden).toBe(true))
    })

    it('keeps its shape with disabled controls while the versions render', async () => {
      const differ = new FakeDiffer()
      vi.spyOn(differ, 'createViewer').mockImplementation(() => new Promise(() => {}))
      const container = mount(
        differ,
        async () => '<old/>',
        async () => '<new/>',
      )

      await vi.waitFor(() => expect(differ.createViewer).toHaveBeenCalledTimes(2))
      expect(container.querySelector<HTMLElement>('.diagit-zoom')!.hidden).toBe(false)
      expect(zoomButton(container, 'Zoom in').disabled).toBe(true)
    })

    it('leaves room for the bpmn.io logo from the start when the notation draws it', () => {
      const withLogo = Object.assign(new FakeDiffer(), { showsBpmnIoLogo: true })
      const container = mount(withLogo, () => new Promise<string | null>(() => {}))

      const zoom = container.querySelector('.diagit-zoom')!
      expect(zoom.classList.contains('beside-bpmn-io-logo')).toBe(true)
    })

    it('keeps the corner free when the notation draws no logo', () => {
      const container = mount(new FakeDiffer(), () => new Promise<string | null>(() => {}))

      const zoom = container.querySelector('.diagit-zoom')!
      expect(zoom.classList.contains('beside-bpmn-io-logo')).toBe(false)
    })

    it('shows once a version is rendered', async () => {
      const { container } = await diffShowingBothVersions()

      expect(container.querySelector<HTMLElement>('.diagit-zoom')!.hidden).toBe(false)
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

  it('offers direct full screen instead of Expand on its own page', () => {
    FakeFullScreen.install()
    const container = document.createElement('div')
    document.body.append(container)
    panel = new DiffPanel({
      differ: new FakeDiffer(),
      loadOld: async () => '<old/>',
      loadNew: async () => '<new/>',
      label: 'BPMN',
      filePath: 'processes/order.bpmn',
      reportContext: FAKE_REPORT_CONTEXT,
      onOwnPage: true,
    }).mount(container)

    expect(buttonLabelled(container, 'Full screen').hidden).toBe(false)
    expect(container.querySelector('.diagit-zoom-expand')).toBeNull()
  })

  describe('full screen', () => {
    async function fullScreenDiff() {
      FakeFullScreen.install()
      const differ = new FakeDiffer()
      const container = mount(
        differ,
        async () => '<old/>',
        async () => '<new/>',
      )
      await vi.waitFor(() => expect(differ.viewers).toHaveLength(2))
      const root = container.querySelector<HTMLElement>('.diagit-diff-root')!
      const enter = async () => {
        buttonLabelled(container, 'Expand').click()
        buttonLabelled(container, 'Full screen').click()
        await FakeFullScreen.settled()
      }
      return { container, differ, root, enter }
    }

    it('keeps Diff open on entering and on leaving', async () => {
      const { container, root, enter } = await fullScreenDiff()

      await enter()
      expect(document.fullscreenElement).toBe(root)
      expect(buttonNamed(container, 'Diff').getAttribute('aria-pressed')).toBe('true')

      await FakeFullScreen.exit()
      expect(buttonNamed(container, 'Diff').getAttribute('aria-pressed')).toBe('true')
    })

    it('names the full file path in the toolbar', async () => {
      const { container } = await fullScreenDiff()

      const path = container.querySelector('.diagit-toolbar .diagit-file-path .file-name')
      expect(path?.textContent).toBe('processes/order.bpmn')
    })

    it('switches to Plain while in full screen and fits it', async () => {
      const { container, differ, enter } = await fullScreenDiff()
      await enter()

      buttonNamed(container, 'Plain').click()
      await vi.waitFor(() => expect(differ.viewers[2]?.fits).toBeGreaterThan(0))

      expect(document.fullscreenElement).not.toBeNull()
    })

    it('keeps the full screen button when Plain cannot be rendered', async () => {
      const { container, differ, enter } = await fullScreenDiff()
      await enter()
      vi.spyOn(differ, 'createViewer').mockRejectedValue(new Error('unparsable'))

      buttonNamed(container, 'Plain').click()
      await vi.waitFor(() => expect(failureIn(plainPane(container))).not.toBeNull())

      expect(container.querySelector<HTMLElement>('.diagit-zoom')!.hidden).toBe(false)
      expect(buttonLabelled(container, 'Full screen').hidden).toBe(false)
      expect(container.querySelector<HTMLElement>('.diagit-zoom-fit')!.hidden).toBe(true)
    })

    it('keeps the theme from the host page', async () => {
      const { root, enter } = await fullScreenDiff()
      const theme = root.dataset.cdTheme

      await enter()

      expect(root.dataset.cdTheme).toBe(theme)
    })
  })

  describe('one side alone', () => {
    const DIFF = { added: ['A'], removed: ['R'], changed: ['C'], moved: [] }
    const sideButton = (container: HTMLElement, name: string) =>
      [...container.querySelectorAll<HTMLButtonElement>('.diagit-side-switch button')].find(
        (button) => button.textContent === name,
      )!
    const shownSides = (container: HTMLElement) =>
      diffPanes(container)
        .filter((pane) => !pane.hidden)
        .map((pane) => pane.querySelector('.diagit-pane-label')!.textContent)
    const chips = (container: HTMLElement) =>
      [...container.querySelectorAll('.diagit-legend-chip')].map((chip) => chip.textContent)
    const isExpanded = () => document.querySelector('dialog.diagit-expanded') !== null

    async function diffOf(options: { onOwnPage?: boolean; fullScreenAllowed?: boolean } = {}) {
      if (options.fullScreenAllowed !== false) {
        FakeFullScreen.install()
      }
      const differ = new FakeDiffer(DIFF, ['A', 'R', 'C'])
      const container = document.createElement('div')
      document.body.append(container)
      panel = new DiffPanel({
        differ,
        loadOld: async () => '<old/>',
        loadNew: async () => '<new/>',
        label: 'BPMN',
        filePath: 'processes/order.bpmn',
        reportContext: FAKE_REPORT_CONTEXT,
        onOwnPage: options.onOwnPage,
      }).mount(container)
      FakeIntersectionObserver.bringNear()
      await vi.waitFor(() => expect(total(container)).toBe('3 changes'))
      const [oldViewer, newViewer] = differ.viewers
      return { container, differ, oldViewer: oldViewer!, newViewer: newViewer! }
    }

    it('offers to expand each side in a host page', async () => {
      const { container } = await diffOf()

      expect(buttonLabelled(container, 'Expand Before')).not.toBeNull()
      expect(buttonLabelled(container, 'Expand After')).not.toBeNull()
    })

    it('offers each side in full screen on its own page', async () => {
      const { container } = await diffOf({ onOwnPage: true })

      expect(buttonLabelled(container, 'Before in full screen')).not.toBeNull()
      expect(buttonLabelled(container, 'After in full screen')).not.toBeNull()
    })

    it('offers no side button on its own page where full screen is not allowed', async () => {
      const { container } = await diffOf({ onOwnPage: true, fullScreenAllowed: false })

      expect(container.querySelector('.diagit-pane-enlarge')).toBeNull()
    })

    it('expands with only the picked side and presses it in the side switch', async () => {
      const { container } = await diffOf()

      buttonLabelled(container, 'Expand After').click()

      expect(isExpanded()).toBe(true)
      expect(shownSides(container)).toEqual(['After'])
      expect(sideButton(container, 'After').getAttribute('aria-pressed')).toBe('true')
    })

    it('moves the focus to the picked side once the dialog opened from a pane', async () => {
      const { container } = await diffOf()

      buttonLabelled(container, 'Expand Before').click()

      expect(document.activeElement).toBe(sideButton(container, 'Before'))
    })

    it('keeps the focus on Collapse when expanded from the zoom island', async () => {
      const { container } = await diffOf()

      buttonLabelled(container, 'Expand').click()

      expect(document.activeElement).toBe(buttonLabelled(container, 'Expand'))
    })

    it('expands with both sides from the zoom island', async () => {
      const { container } = await diffOf()

      buttonLabelled(container, 'Expand').click()

      expect(shownSides(container)).toEqual(['Before', 'After'])
      expect(sideButton(container, 'Before').getAttribute('aria-pressed')).toBe('false')
      expect(sideButton(container, 'After').getAttribute('aria-pressed')).toBe('false')
    })

    it('goes back to both sides when the pressed side is picked again, still expanded', async () => {
      const { container } = await diffOf()
      buttonLabelled(container, 'Expand After').click()

      sideButton(container, 'After').click()

      expect(isExpanded()).toBe(true)
      expect(shownSides(container)).toEqual(['Before', 'After'])
    })

    it('counts and steps through the changes of the shown side only', async () => {
      const { container, oldViewer, newViewer } = await diffOf()
      buttonLabelled(container, 'Expand After').click()

      expect(chips(container)).toEqual(['Added 1', 'Changed 1'])
      expect(total(container)).toBe('2 changes')
      buttonLabelled(container, 'Next change').click()
      buttonLabelled(container, 'Next change').click()

      expect(position(container)).toBe('2 of 2')
      expect(newViewer.focused).toEqual(['A', 'C'])
      expect(oldViewer.focused).toEqual([])
    })

    it('leaves no selected change on a side that is hidden', async () => {
      const { container, oldViewer } = await diffOf()
      buttonLabelled(container, 'Expand').click()
      buttonLabelled(container, 'Next change').click()
      buttonLabelled(container, 'Next change').click()
      expect(oldViewer.markers).toContainEqual({ id: 'R', marker: MARKER.active })

      sideButton(container, 'After').click()

      expect(oldViewer.markers).not.toContainEqual({ id: 'R', marker: MARKER.active })
    })

    it('keeps the change it stepped to when the panel changes size', async () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver)
      const { container, newViewer } = await diffOf()
      buttonLabelled(container, 'Next change').click()
      const fitsBefore = newViewer.fits

      FakeResizeObserver.resizeAll()

      expect(newViewer.fits).toBe(fitsBefore)
    })

    it('fits again when the next change after the last one is the overview', async () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver)
      const { container, newViewer } = await diffOf()
      buttonLabelled(container, 'Expand After').click()
      buttonLabelled(container, 'Next change').click()
      buttonLabelled(container, 'Next change').click()
      buttonLabelled(container, 'Next change').click()
      expect(position(container)).toBe('2 changes')
      const fitsBefore = newViewer.fits

      FakeResizeObserver.resizeAll()

      expect(newViewer.fits).toBe(fitsBefore + 1)
    })

    it('fits again on resize after "Show all"', async () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver)
      const { container, newViewer } = await diffOf()
      buttonLabelled(container, 'Next change').click()
      buttonNamed(container, 'Show all').click()
      const fitsBefore = newViewer.fits

      FakeResizeObserver.resizeAll()

      expect(newViewer.fits).toBe(fitsBefore + 1)
    })

    it('fits only the shown side when switching, and both when going back', async () => {
      const { container, oldViewer, newViewer } = await diffOf()
      buttonLabelled(container, 'Expand').click()
      const [oldFits, newFits] = [oldViewer.fits, newViewer.fits]

      sideButton(container, 'Before').click()
      expect(oldViewer.fits).toBe(oldFits + 1)
      expect(newViewer.fits).toBe(newFits)

      sideButton(container, 'Before').click()
      expect(oldViewer.fits).toBe(oldFits + 2)
      expect(newViewer.fits).toBe(newFits + 1)
    })

    it('zooms only the shown side and reads out its level', async () => {
      const { container, oldViewer } = await diffOf()
      oldViewer.level = 0.5
      buttonLabelled(container, 'Expand Before').click()

      container.querySelector<HTMLButtonElement>('.diagit-zoom [aria-label="Zoom in"]')!.click()

      expect(oldViewer.level).toBeCloseTo(0.6)
      expect(container.querySelector('.diagit-zoom [aria-label^="Reset zoom"]')!.textContent).toBe(
        '60%',
      )
    })

    it('keeps the side across Plain and back to Diff', async () => {
      const { container } = await diffOf()
      buttonLabelled(container, 'Expand Before').click()

      buttonNamed(container, 'Plain').click()
      buttonNamed(container, 'Diff').click()

      expect(shownSides(container)).toEqual(['Before'])
    })

    it('shows both sides again after collapsing', async () => {
      const { container } = await diffOf()
      buttonLabelled(container, 'Expand After').click()

      buttonLabelled(container, 'Expand').click()

      expect(isExpanded()).toBe(false)
      expect(shownSides(container)).toEqual(['Before', 'After'])
      expect(total(container)).toBe('3 changes')
    })

    it('keeps the side when leaving full screen back to the dialog', async () => {
      const { container } = await diffOf()
      buttonLabelled(container, 'Expand Before').click()
      buttonLabelled(container, 'Full screen').click()
      await FakeFullScreen.settled()

      await FakeFullScreen.exit()

      expect(isExpanded()).toBe(true)
      expect(shownSides(container)).toEqual(['Before'])
    })

    it('opens one side in full screen on its own page and both again on leaving', async () => {
      const { container } = await diffOf({ onOwnPage: true })

      buttonLabelled(container, 'After in full screen').click()
      await FakeFullScreen.settled()
      expect(document.fullscreenElement).not.toBeNull()
      expect(shownSides(container)).toEqual(['After'])

      await FakeFullScreen.exit()
      expect(shownSides(container)).toEqual(['Before', 'After'])
    })

    it('moves the focus to the picked side once full screen opened from a pane', async () => {
      const { container } = await diffOf({ onOwnPage: true })

      buttonLabelled(container, 'Before in full screen').click()
      await FakeFullScreen.settled()

      expect(document.activeElement).toBe(sideButton(container, 'Before'))
    })

    it('keeps both sides when the browser refuses full screen', async () => {
      const { container } = await diffOf({ onOwnPage: true })
      FakeFullScreen.refuse()

      buttonLabelled(container, 'After in full screen').click()
      await vi.waitFor(() => expect(document.fullscreenElement).toBeNull())
      await Promise.resolve()

      expect(shownSides(container)).toEqual(['Before', 'After'])
    })

    it('scopes the changes that arrive after a side was picked', async () => {
      FakeFullScreen.install()
      const differ = new FakeDiffer(DIFF, ['A', 'R', 'C'])
      let deliverDiff!: () => void
      const diffArrives = new Promise<void>((done) => (deliverDiff = done))
      vi.spyOn(differ, 'compare').mockImplementation(async () => {
        await diffArrives
        return { diff: DIFF, detail: () => null }
      })
      const container = document.createElement('div')
      document.body.append(container)
      panel = new DiffPanel({
        differ,
        loadOld: async () => '<old/>',
        loadNew: async () => '<new/>',
        label: 'BPMN',
        filePath: 'processes/order.bpmn',
        reportContext: FAKE_REPORT_CONTEXT,
      }).mount(container)
      FakeIntersectionObserver.bringNear()
      await vi.waitFor(() => expect(differ.viewers).toHaveLength(2))

      buttonLabelled(container, 'Expand Before').click()
      deliverDiff()

      await vi.waitFor(() => expect(total(container)).toBe('2 changes'))
      expect(chips(container)).toEqual(['Removed 1', 'Changed 1'])
    })

    it('collapses without touching the diagrams when destroyed while expanded', async () => {
      const { container, oldViewer, newViewer } = await diffOf()
      buttonLabelled(container, 'Expand After').click()
      const markers = [...oldViewer.markers]

      panel!.destroy()
      panel = null

      expect(isExpanded()).toBe(false)
      expect(oldViewer.markers).toEqual(markers)
      expect(newViewer.destroyed).toBe(true)
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

    await vi.waitFor(() => expect(container.textContent).toContain('Added 1'))
    const chips = [...container.querySelectorAll('.diagit-legend-chip')]
    expect(chips.map((chip) => chip.textContent)).toEqual(['Added 1', 'Removed 1', 'Changed 1'])
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

  it('names the whole legend on hover, for when a narrow panel cuts it off', async () => {
    const container = mount(
      new FakeDiffer({ added: ['A'], removed: ['R'], changed: [], moved: ['M'] }, ['A', 'R', 'M']),
      async () => '<old/>',
      async () => '<new/>',
    )

    await vi.waitFor(() => expect(container.textContent).toContain('Added 1'))

    expect(container.querySelector('.diagit-diff-legend')?.getAttribute('title')).toBe(
      'Added 1, Removed 1, Moved 1',
    )
  })

  it('shows one legend and one change navigator for both panes', async () => {
    const container = mount(
      new FakeDiffer({ added: ['A'], removed: ['R'], changed: [], moved: [] }, ['A', 'R']),
      async () => '<old/>',
      async () => '<new/>',
    )

    await vi.waitFor(() => expect(container.textContent).toContain('Added 1'))

    expect(container.querySelectorAll('.diagit-diff-legend')).toHaveLength(1)
    expect(container.querySelectorAll('[aria-label="Next change"]')).toHaveLength(1)
    expect(container.querySelectorAll('[aria-label="Previous change"]')).toHaveLength(1)
    expect(buttonsNamed(container, 'Show all')).toHaveLength(1)
  })

  it('tells the position of the selected change while stepping through them', async () => {
    const container = mount(
      new FakeDiffer({ added: ['A'], removed: ['R'], changed: ['C'], moved: [] }, ['A', 'R', 'C']),
      async () => '<old/>',
      async () => '<new/>',
    )
    await vi.waitFor(() => expect(position(container)).toBe('3 changes'))

    buttonLabelled(container, 'Next change').click()
    expect(position(container)).toBe('1 of 3')
    buttonLabelled(container, 'Next change').click()
    expect(position(container)).toBe('2 of 3')
    buttonLabelled(container, 'Previous change').click()
    expect(position(container)).toBe('1 of 3')
    buttonNamed(container, 'Show all').click()
    expect(position(container)).toBe('3 changes')
    buttonLabelled(container, 'Previous change').click()
    expect(position(container)).toBe('3 of 3')
  })

  it('counts a single change in the singular', async () => {
    const container = mount(
      new FakeDiffer({ added: ['A'], removed: [], changed: [], moved: [] }, ['A']),
      async () => '<old/>',
      async () => '<new/>',
    )

    await vi.waitFor(() => expect(total(container)).toBe('1 change'))
  })

  it('disables change navigation when nothing changed', async () => {
    const container = mount(new FakeDiffer(), async () => '<same/>')

    await vi.waitFor(() => expect(buttonLabelled(container, 'Next change').disabled).toBe(true))
    expect(buttonLabelled(container, 'Previous change').disabled).toBe(true)
    expect(total(container)).toBe('No changes')
    expect(container.querySelectorAll('.diagit-legend-chip')).toHaveLength(0)
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
    expect(oldPane!.querySelector('.diagit-pane-label')!.textContent).toBe('Before')
    expect(newPane!.querySelector('.diagit-pane-label')!.textContent).toBe('After')
  })

  it('shows the legend and the navigator on Diff only', async () => {
    const container = mount(
      new FakeDiffer(),
      async () => '<old/>',
      async () => '<new/>',
    )
    await vi.waitFor(() => expect(total(container)).toBe('No changes'))

    expect(changeControls(container).style.display).toBe('')
    buttonNamed(container, 'Plain').click()
    expect(changeControls(container).style.display).toBe('none')
  })

  it('tells which version failed to download instead of calling the file deleted', async () => {
    const container = mount(new FakeDiffer(), async () => '<old/>', downloadFailed)

    await vi.waitFor(() =>
      expect(
        failureIn(plainPane(container)).querySelector('.diagit-notice-title')?.textContent,
      ).toBe('New version could not be loaded · HTTP 403'),
    )
    expect(failureIn(plainPane(container)).querySelector('.diagit-notice-meta')!.textContent).toBe(
      '· HTTP 403',
    )
    expect(failureIn(plainPane(container)).hasAttribute('title')).toBe(false)
    expect(reportedConsole(plainPane(container))).toContain('HTTP 403 for raw file')
    expect(failureIn(plainPane(container)).querySelector('[aria-label="Reload"]')).not.toBeNull()
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
    expect(failureIn(plainPane(container)).querySelector('.diagit-notice-title')!.textContent).toBe(
      'New version could not be loaded',
    )
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
    expect(container.querySelector('.diagit-diff-total')).toBeNull()
  })

  it('shows a notice when a loader throws before it returns a promise', async () => {
    const throwsAtOnce = () => {
      throw new Error('bad raw file url')
    }

    const container = mount(new FakeDiffer(), async () => '<old/>', throwsAtOnce)

    await vi.waitFor(() =>
      expect(plainPane(container).textContent).toContain('New version could not be loaded'),
    )
    expect(container.querySelector('[aria-label="Previous change"]')).toBeNull()
  })

  it('says the changes could not be computed when the diff fails', async () => {
    const differ = new FakeDiffer()
    vi.spyOn(differ, 'compare').mockRejectedValue(new Error('unsupported element'))

    const container = mount(
      differ,
      async () => '<old/>',
      async () => '<new/>',
    )

    await vi.waitFor(() => expect(container.textContent).toContain('Changes could not be computed'))
    expect(container.querySelector('.diagit-diff-total')).toBeNull()
  })

  it('shows the unreadable model notice when a version cannot be rendered', async () => {
    const differ = new FakeDiffer()
    vi.spyOn(differ, 'createViewer').mockRejectedValue(new Error('no diagram found'))

    const container = mount(differ, async () => '<broken/>')
    const newPane = diffPanes(container)[1]!

    await vi.waitFor(() => expect(newPane.textContent).toContain('New version could not be read'))
    expect(failureIn(newPane).textContent).not.toContain('no diagram found')
    expect(reportedConsole(newPane)).not.toContain('no diagram found')
    expect(failureIn(newPane).querySelector('[aria-label="Reload"]')).toBeNull()
    expect(container.textContent).not.toContain('render error')
  })

  it('explains a version without a layout and offers no report link', async () => {
    const differ = new FakeDiffer()
    vi.spyOn(differ, 'createViewer').mockRejectedValue(new ModelRejected('no-layout'))

    const container = mount(differ, async () => '<bpmn:definitions/>')
    const newPane = diffPanes(container)[1]!

    await vi.waitFor(() =>
      expect(newPane.textContent).toContain('New version has no diagram layout'),
    )
    expect(failureIn(newPane).dataset.tone).toBe('info')
    expect(failureIn(newPane).querySelector('.diagit-notice-report')).toBeNull()
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

  describe('while the models load', () => {
    const neverArrives = () => new Promise<string | null>(() => {})
    const isLoading = (pane: Element) => !!pane.querySelector('.diagit-diff-loading')

    it('already shows the Diff layout', () => {
      const container = mount(new FakeDiffer(), neverArrives)

      expect(buttonNamed(container, 'Diff').getAttribute('aria-pressed')).toBe('true')
      expect(diffPanes(container).every(isLoading)).toBe(true)
    })

    it('holds a placeholder where the legend will be', () => {
      const container = mount(new FakeDiffer(), neverArrives)

      const placeholder = changeControls(container).querySelector('.diagit-diff-legend-placeholder')
      expect(placeholder?.getAttribute('aria-hidden')).toBe('true')
    })

    it('reveals both versions and the legend together', async () => {
      const differ = new FakeDiffer()
      const createViewer = differ.createViewer.bind(differ)
      let finishNewVersion!: () => void
      const newVersionRendering = new Promise<void>((done) => (finishNewVersion = done))
      vi.spyOn(differ, 'createViewer').mockImplementation(async (canvas) => {
        if (differ.viewers.length === 1) {
          await newVersionRendering
        }
        return createViewer(canvas)
      })
      const container = mount(
        differ,
        async () => '<old/>',
        async () => '<new/>',
      )
      await vi.waitFor(() => expect(differ.viewers).toHaveLength(1))

      expect(diffPanes(container).every(isLoading)).toBe(true)
      expect(total(container)).toBeUndefined()

      finishNewVersion()

      await vi.waitFor(() => expect(total(container)).toBe('No changes'))
      expect(diffPanes(container).some(isLoading)).toBe(false)
    })
  })

  describe('the tab it opens on', () => {
    const activeTab = (container: HTMLElement) =>
      container.querySelector('.diagit-segmented [aria-pressed="true"]')?.textContent

    it('opens on Diff when the file has an old and a new version', async () => {
      const differ = new FakeDiffer()
      const createViewer = vi.spyOn(differ, 'createViewer')

      const container = mount(
        differ,
        async () => '<old/>',
        async () => '<new/>',
      )

      await vi.waitFor(() => expect(createViewer).toHaveBeenCalledTimes(2))
      expect(activeTab(container)).toBe('Diff')
    })

    it('starts on Plain when the host already says the file is new', () => {
      const container = document.createElement('div')
      document.body.append(container)
      panel = new DiffPanel({
        differ: new FakeDiffer(),
        loadOld: () => new Promise<string | null>(() => {}),
        loadNew: () => new Promise<string | null>(() => {}),
        hasNoOldVersion: true,
        label: 'BPMN',
        filePath: 'processes/order.bpmn',
        reportContext: FAKE_REPORT_CONTEXT,
      }).mount(container)

      expect(activeTab(container)).toBe('Plain')
    })

    it('stays on Plain for an added file', async () => {
      const container = mount(
        new FakeDiffer(),
        async () => null,
        async () => '<new/>',
      )

      await untilLoaded(container)

      expect(activeTab(container)).toBe('Plain')
    })

    it('opens on Diff for a deleted file, with the old version beside the deleted one', async () => {
      const container = mount(
        new FakeDiffer(),
        async () => '<old/>',
        async () => null,
      )

      await vi.waitFor(() => expect(activeTab(container)).toBe('Diff'))
      await vi.waitFor(() =>
        expect(diffPanes(container)[0]!.querySelector('.fake-diagram')).not.toBeNull(),
      )
      expect(diffPanes(container)[1]!.textContent).toContain('deleted')
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
