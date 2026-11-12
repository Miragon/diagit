import { h } from '../../platform/utils/dom'
import { detectHostTheme } from '../../platform/utils/hostTheme'
import type { DiagramViewer } from '../Notation'
import { parseExcalidrawScene } from './utils/parseExcalidrawScene'
import { renderSceneSvg } from './utils/renderSceneSvg'

const FIT_PADDING = 32
const MAX_FIT_SCALE = 1
const WHEEL_ZOOM_SPEED = 0.002
const MAIN_BUTTON = 0

export class ExcalidrawViewer implements DiagramViewer {
  static async create(canvas: HTMLElement, source: string): Promise<ExcalidrawViewer> {
    const scene = parseExcalidrawScene(source)
    const image = h('img', {
      class: 'excalidraw-image',
      alt: 'Excalidraw diagram',
      draggable: 'false',
      src: await renderSceneSvg(scene, detectHostTheme(canvas)),
    })
    await image.decode()
    canvas.classList.add('excalidraw-canvas')
    canvas.append(image)
    return new ExcalidrawViewer(canvas, image)
  }

  private scale = 1
  private x = 0
  private y = 0
  private readonly listeners = new AbortController()

  private constructor(
    private readonly canvas: HTMLElement,
    private readonly image: HTMLImageElement,
  ) {
    canvas.addEventListener('pointerdown', this.startPan, { signal: this.listeners.signal })
    this.fit()
  }

  fit(): void {
    const { clientWidth, clientHeight } = this.canvas
    const { naturalWidth, naturalHeight } = this.image
    if (clientWidth === 0 || clientHeight === 0) {
      return
    }
    const scaleWithPadding = (padding: number) =>
      Math.min(
        (clientWidth - 2 * padding) / naturalWidth,
        (clientHeight - 2 * padding) / naturalHeight,
        MAX_FIT_SCALE,
      )
    const paddedScale = scaleWithPadding(FIT_PADDING)
    this.scale = paddedScale > 0 ? paddedScale : scaleWithPadding(0)
    this.x = (clientWidth - naturalWidth * this.scale) / 2
    this.y = (clientHeight - naturalHeight * this.scale) / 2
    this.applyTransform()
  }

  zoomBy(factor: number): void {
    this.zoomAround(factor, this.canvas.clientWidth / 2, this.canvas.clientHeight / 2)
  }

  setInteractive(active: boolean): void {
    if (active) {
      this.canvas.addEventListener('wheel', this.zoomWithWheel, { passive: false })
    } else {
      this.canvas.removeEventListener('wheel', this.zoomWithWheel)
    }
  }

  destroy(): void {
    this.listeners.abort()
    this.setInteractive(false)
    this.canvas.classList.remove('excalidraw-canvas')
    this.image.remove()
  }

  private readonly startPan = (start: PointerEvent): void => {
    if (start.button !== MAIN_BUTTON || !start.isPrimary) {
      return
    }
    const originX = start.clientX - this.x
    const originY = start.clientY - this.y
    const pan = new AbortController()
    const signal = AbortSignal.any([pan.signal, this.listeners.signal])
    this.canvas.setPointerCapture(start.pointerId)
    this.canvas.addEventListener(
      'pointermove',
      (move) => {
        this.x = move.clientX - originX
        this.y = move.clientY - originY
        this.applyTransform()
      },
      { signal },
    )
    this.canvas.addEventListener('pointerup', () => pan.abort(), { signal })
    this.canvas.addEventListener('pointercancel', () => pan.abort(), { signal })
  }

  private readonly zoomWithWheel = (wheel: WheelEvent): void => {
    wheel.preventDefault()
    const { left, top } = this.canvas.getBoundingClientRect()
    this.zoomAround(
      Math.exp(-wheel.deltaY * WHEEL_ZOOM_SPEED),
      wheel.clientX - left,
      wheel.clientY - top,
    )
  }

  private zoomAround(factor: number, pointX: number, pointY: number): void {
    this.x = pointX - (pointX - this.x) * factor
    this.y = pointY - (pointY - this.y) * factor
    this.scale *= factor
    this.applyTransform()
  }

  private applyTransform(): void {
    this.image.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`
  }
}
