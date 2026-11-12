import { describe, expect, it, vi } from 'vitest'
import { DmnViewer } from '../../src/notations/dmn/DmnViewer'

const { FakeDmnManager, fakeEventBus } = vi.hoisted(() => {
  type Listeners = Map<string, Set<() => void>>

  function fakeEventBus() {
    const listeners: Listeners = new Map()
    return {
      on: (event: string, listener: () => void) => {
        listeners.set(event, (listeners.get(event) ?? new Set()).add(listener))
      },
      off: (event: string, listener: () => void) => {
        listeners.get(event)?.delete(listener)
      },
      fire: (event: string) => listeners.get(event)?.forEach((listener) => listener()),
    }
  }

  class FakeDmnManager {
    static latest: FakeDmnManager
    readonly views = fakeEventBus()
    readonly on = this.views.on
    readonly off = this.views.off
    active: { get<T>(service: string): T } | undefined

    constructor() {
      FakeDmnManager.latest = this
    }

    async importXML() {
      return { warnings: [] }
    }

    getActiveViewer() {
      return this.active
    }

    destroy() {}
  }

  return { FakeDmnManager, fakeEventBus }
})

vi.mock('dmn-js/lib/NavigatedViewer', () => ({ default: FakeDmnManager }))

function drdView(level: number) {
  const eventBus = fakeEventBus()
  const canvas = { zoom: (fit?: unknown) => (fit === undefined ? level : undefined) }
  const services: Record<string, unknown> = { canvas, eventBus }
  return { eventBus, get: <T>(service: string) => services[service] as T }
}

const decisionTableView = {
  get: <T>(): T => {
    throw new Error('No provider for "canvas"')
  },
}

async function dmnViewerShowing(view: { get<T>(service: string): T }) {
  const viewer = await DmnViewer.create(document.createElement('div'), '<dmn/>')
  const manager = FakeDmnManager.latest
  manager.active = view
  const switchTo = (next: { get<T>(service: string): T }) => {
    manager.active = next
    manager.views.fire('views.changed')
  }
  return { viewer, switchTo }
}

describe('DmnViewer', () => {
  it('follows the viewbox of the DRD it shows', async () => {
    const drd = drdView(0.75)
    const { viewer } = await dmnViewerShowing(drd)
    const listener = vi.fn()

    viewer.onViewChange(listener)
    drd.eventBus.fire('canvas.viewbox.changed')

    expect(listener).toHaveBeenCalledOnce()
    expect(viewer.zoomLevel()).toBe(0.75)
  })

  it('re-attaches to the active view whenever the views change', async () => {
    const firstDrd = drdView(1)
    const secondDrd = drdView(0.5)
    const { viewer, switchTo } = await dmnViewerShowing(firstDrd)
    const listener = vi.fn()
    viewer.onViewChange(listener)

    switchTo(decisionTableView)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(viewer.zoomLevel()).toBeNull()
    firstDrd.eventBus.fire('canvas.viewbox.changed')
    expect(listener).toHaveBeenCalledTimes(1)

    switchTo(secondDrd)
    expect(listener).toHaveBeenCalledTimes(2)
    secondDrd.eventBus.fire('canvas.viewbox.changed')
    expect(listener).toHaveBeenCalledTimes(3)
    expect(viewer.zoomLevel()).toBe(0.5)
  })

  it('stops following views and viewboxes once unsubscribed', async () => {
    const drd = drdView(1)
    const { viewer, switchTo } = await dmnViewerShowing(drd)
    const listener = vi.fn()

    viewer.onViewChange(listener)()
    drd.eventBus.fire('canvas.viewbox.changed')
    switchTo(drdView(1))

    expect(listener).not.toHaveBeenCalled()
  })
})
