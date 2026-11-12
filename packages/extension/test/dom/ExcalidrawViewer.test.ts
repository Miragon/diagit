import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExcalidrawViewer } from '../../src/notations/excalidraw/ExcalidrawViewer'

vi.mock('../../src/notations/excalidraw/utils/renderSceneSvg', () => ({
  renderSceneSvg: async () => 'data:image/svg+xml,',
}))

const SCENE = JSON.stringify({ type: 'excalidraw', elements: [] })

function canvasOfSize(width: number, height: number): HTMLElement {
  const canvas = document.createElement('div')
  vi.spyOn(canvas, 'clientWidth', 'get').mockReturnValue(width)
  vi.spyOn(canvas, 'clientHeight', 'get').mockReturnValue(height)
  canvas.setPointerCapture = vi.fn()
  return canvas
}

async function renderImageOfSize(canvas: HTMLElement, width: number, height: number) {
  vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue()
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(width)
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(height)
  await ExcalidrawViewer.create(canvas, SCENE)
  return canvas.querySelector('img')!
}

function pointer(type: string, init: PointerEventInit): PointerEvent {
  return new PointerEvent(type, { pointerId: 1, isPrimary: true, ...init })
}

describe('ExcalidrawViewer', () => {
  afterEach(() => vi.restoreAllMocks())

  it('centers the scene at its natural size when it fits', async () => {
    const image = await renderImageOfSize(canvasOfSize(600, 400), 200, 100)

    expect(image.style.transform).toBe('translate(200px, 150px) scale(1)')
  })

  it('keeps a positive scale in a canvas narrower than the padding', async () => {
    const image = await renderImageOfSize(canvasOfSize(50, 400), 200, 100)

    expect(image.style.transform).toContain('scale(0.25)')
  })

  it('reads its scale as zoom level and tells a listener until it unsubscribes', async () => {
    const canvas = canvasOfSize(600, 400)
    await renderImageOfSize(canvas, 200, 100)
    const viewer = await ExcalidrawViewer.create(canvas, SCENE)
    const listener = vi.fn()

    const unsubscribe = viewer.onViewChange(listener)
    viewer.zoomBy(2)
    expect(viewer.zoomLevel()).toBe(2)
    unsubscribe()
    viewer.zoomBy(0.5)

    expect(listener).toHaveBeenCalledOnce()
    expect(viewer.zoomLevel()).toBe(1)
  })

  it('pans with the main button', async () => {
    const canvas = canvasOfSize(600, 400)
    const image = await renderImageOfSize(canvas, 200, 100)

    canvas.dispatchEvent(pointer('pointerdown', { button: 0, clientX: 0, clientY: 0 }))
    canvas.dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 20 }))

    expect(image.style.transform).toContain('translate(210px, 170px)')
  })

  it('does not pan with the secondary button, whose pointerup the context menu swallows', async () => {
    const canvas = canvasOfSize(600, 400)
    const image = await renderImageOfSize(canvas, 200, 100)

    canvas.dispatchEvent(pointer('pointerdown', { button: 2, clientX: 0, clientY: 0 }))
    canvas.dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 20 }))

    expect(image.style.transform).toContain('translate(200px, 150px)')
  })

  it('does not pan with a second finger', async () => {
    const canvas = canvasOfSize(600, 400)
    const image = await renderImageOfSize(canvas, 200, 100)

    canvas.dispatchEvent(pointer('pointerdown', { button: 0, isPrimary: false }))
    canvas.dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 20 }))

    expect(image.style.transform).toContain('translate(200px, 150px)')
  })

  it('opts the image out of native drag, which would cancel the pan in Firefox', async () => {
    const image = await renderImageOfSize(canvasOfSize(600, 400), 200, 100)

    expect(image.getAttribute('draggable')).toBe('false')
  })
})
