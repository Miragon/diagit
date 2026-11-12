export interface FitCanvas {
  resized(): void
  zoom(level?: number | string): number
  viewbox(box?: ViewboxBox): Viewbox
}

interface ViewboxBox {
  x: number
  y: number
  width: number
  height: number
}

interface Viewbox extends ViewboxBox {
  scale: number
  inner: ViewboxBox
  outer: { width: number; height: number }
}

const NEVER_ENLARGE_PAST = 1

export function fitWithPadding(canvas: FitCanvas, pad = 48): void {
  canvas.resized()
  const viewbox = canvas.viewbox()
  const content = viewbox?.inner
  const viewport = viewbox?.outer
  if (!content?.width || !content?.height || !viewport?.width || !viewport?.height) {
    return
  }

  const scaleWithPadding = (padding: number) =>
    Math.min(
      NEVER_ENLARGE_PAST,
      (viewport.width - padding * 2) / content.width,
      (viewport.height - padding * 2) / content.height,
    )
  let scale = scaleWithPadding(pad)
  if (scale <= 0) {
    scale = scaleWithPadding(0)
  }
  const containerIsMeasurable = Number.isFinite(scale) && scale > 0
  if (!containerIsMeasurable) {
    return
  }

  const width = viewport.width / scale
  const height = viewport.height / scale
  const x = content.x + content.width / 2 - width / 2
  const y = content.y + content.height / 2 - height / 2
  if (![x, y, width, height].every(Number.isFinite)) {
    return
  }
  canvas.viewbox({ x, y, width, height })
}
