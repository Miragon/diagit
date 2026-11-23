import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoFit } from '../../src/platform/ui/AutoFit'
import { FakeResizeObserver } from '../fakes/FakeResizeObserver'

function viewer() {
  return { fit: vi.fn(), resized: vi.fn() }
}

function autoFitOver(viewers: ReturnType<typeof viewer>[]) {
  const area = document.createElement('div')
  const button = document.createElement('button')
  area.append(button)
  document.body.append(area)
  const autoFit = new AutoFit(area, () => viewers)
  return { area, button, autoFit }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
})

afterEach(() => {
  document.body.innerHTML = ''
  FakeResizeObserver.reset()
  vi.unstubAllGlobals()
})

describe('AutoFit', () => {
  it('fits every diagram to its area again when the area changes size', () => {
    const diagrams = [viewer(), viewer()]
    autoFitOver(diagrams)

    FakeResizeObserver.resizeAll()

    expect(diagrams.map((diagram) => diagram.fit.mock.calls.length)).toEqual([1, 1])
  })

  it('keeps the view once it was dragged in the area', () => {
    const diagram = viewer()
    const { area } = autoFitOver([diagram])

    area.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    FakeResizeObserver.resizeAll()

    expect(diagram.fit).not.toHaveBeenCalled()
    expect(diagram.resized).toHaveBeenCalledOnce()
  })

  it('keeps the view once it was zoomed', () => {
    const diagram = viewer()
    const { autoFit } = autoFitOver([diagram])

    autoFit.userMovedView()
    FakeResizeObserver.resizeAll()

    expect(diagram.fit).not.toHaveBeenCalled()
  })

  it('keeps the view once the diagram zoomed or scrolled with the wheel', () => {
    const diagram = viewer()
    const { button } = autoFitOver([diagram])
    button.addEventListener('wheel', (event) => event.preventDefault())

    button.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true }))
    FakeResizeObserver.resizeAll()

    expect(diagram.fit).not.toHaveBeenCalled()
  })

  it('still fits after a wheel the diagram left to the page', () => {
    const diagram = viewer()
    const { area } = autoFitOver([diagram])

    area.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true }))
    FakeResizeObserver.resizeAll()

    expect(diagram.fit).toHaveBeenCalledOnce()
  })

  it('still fits after a press on a button in the area', () => {
    const diagram = viewer()
    const { button } = autoFitOver([diagram])

    button.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    FakeResizeObserver.resizeAll()

    expect(diagram.fit).toHaveBeenCalledOnce()
  })

  it('fits again on resize after an explicit fit', () => {
    const diagram = viewer()
    const { autoFit } = autoFitOver([diagram])
    autoFit.userMovedView()

    autoFit.fit()
    FakeResizeObserver.resizeAll()

    expect(diagram.fit).toHaveBeenCalledTimes(2)
  })

  it('stops following the area once stopped', () => {
    const { autoFit } = autoFitOver([viewer()])

    autoFit.stop()

    expect(FakeResizeObserver.instances[0]!.observed.size).toBe(0)
  })
})
