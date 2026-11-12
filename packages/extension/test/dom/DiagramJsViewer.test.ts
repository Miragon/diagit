import { describe, expect, it, vi } from 'vitest'
import { DiagramJsViewer, type DiagramJsDiagram } from '../../src/notations/DiagramJsViewer'

function fakeEventBus() {
  const listeners = new Map<string, Set<() => void>>()
  return {
    on: (event: string, listener: () => void) =>
      listeners.set(event, (listeners.get(event) ?? new Set()).add(listener)),
    off: (event: string, listener: () => void) => listeners.get(event)?.delete(listener),
    fire: (event: string) => listeners.get(event)?.forEach((listener) => listener()),
  }
}

class FakeDiagram implements DiagramJsDiagram {
  readonly destroy = vi.fn()
  readonly toggleZoomScroll = vi.fn()
  readonly eventBus = fakeEventBus()
  private scale = 1

  constructor(private readonly elementCount: number) {}

  get<T>(name: string): T {
    const services: Record<string, unknown> = {
      elementRegistry: { getAll: () => new Array(this.elementCount) },
      zoomScroll: { toggle: this.toggleZoomScroll },
      canvas: {
        resized: vi.fn(),
        zoom: (level?: number) => (this.scale = level ?? this.scale),
        viewbox: vi.fn(() => undefined),
      },
      eventBus: this.eventBus,
    }
    return services[name] as T
  }
}

describe('DiagramJsViewer', () => {
  it('starts with wheel zoom off, so scrolling the page does not zoom the diagram', async () => {
    const diagram = new FakeDiagram(3)
    await DiagramJsViewer.create(diagram, async () => [])
    expect(diagram.toggleZoomScroll).toHaveBeenCalledWith(false)
  })

  it('reports the first import warning when nothing could be imported', async () => {
    const diagram = new FakeDiagram(1)
    const importSource = async () => [{ message: 'Line 1: unknown keyword' }]
    await expect(DiagramJsViewer.create(diagram, importSource)).rejects.toThrow(
      'Line 1: unknown keyword',
    )
    expect(diagram.destroy).toHaveBeenCalled()
  })

  it('reads the zoom level it was zoomed to', async () => {
    const viewer = await DiagramJsViewer.create(new FakeDiagram(3), async () => [])

    viewer.zoomBy(1.5)
    expect(viewer.zoomLevel()).toBe(1.5)
    viewer.zoomBy(1 / viewer.zoomLevel())
    expect(viewer.zoomLevel()).toBe(1)
  })

  it('tells a listener about viewbox changes until it unsubscribes', async () => {
    const diagram = new FakeDiagram(3)
    const viewer = await DiagramJsViewer.create(diagram, async () => [])
    const listener = vi.fn()

    const unsubscribe = viewer.onViewChange(listener)
    diagram.eventBus.fire('canvas.viewbox.changed')
    unsubscribe()
    diagram.eventBus.fire('canvas.viewbox.changed')

    expect(listener).toHaveBeenCalledOnce()
  })

  it('keeps a diagram that imported despite warnings', async () => {
    const diagram = new FakeDiagram(4)
    const importSource = async () => [{ message: 'Line 7: ignored' }]
    await expect(DiagramJsViewer.create(diagram, importSource)).resolves.toBeInstanceOf(
      DiagramJsViewer,
    )
  })
})
