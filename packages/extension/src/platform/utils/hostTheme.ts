import brandTokens from '../theme/cd-tokens.generated.json' with { type: 'json' }

export type Theme = 'light' | 'dark'

export function detectHostTheme(context?: Element | null): Theme {
  const rgb =
    paintedBackgroundNear(context) ??
    readBackground(document.body) ??
    readBackground(document.documentElement)
  if (rgb) return luminance(rgb) < 0.5 ? 'dark' : 'light'
  if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function paintedBackgroundNear(el?: Element | null): [number, number, number] | null {
  let node = hostPageContext(el)
  while (node) {
    const rgb = readBackground(node)
    if (rgb) return rgb
    const parent = node.parentElement
    if (parent) {
      node = parent
      continue
    }
    const root = node.getRootNode()
    node = root instanceof ShadowRoot ? root.host : null
  }
  return null
}

function hostPageContext(el?: Element | null): Element | null {
  if (!el) return null
  const root = el.getRootNode()
  if (root instanceof ShadowRoot) return root.host.parentElement ?? root.host
  return el
}

export interface DiagramColors {
  stroke: string
  fill: string
}

export function diagramColors(theme: Theme): DiagramColors {
  const roles = theme === 'dark' ? brandTokens.dunkel : brandTokens.hell
  return { stroke: roles['--cd-ui-text'], fill: roles['--cd-ui-plot'] }
}

function readBackground(el: Element | null): [number, number, number] | null {
  if (!el) return null
  const match = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/)
  if (!match) return null
  const parts = match[1]!.split(',').map((s) => parseFloat(s))
  const [r, g, b, a = 1] = parts
  if (a === 0 || r === undefined || g === undefined || b === undefined) return null
  return [r, g, b]
}

function luminance([r, g, b]: [number, number, number]): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}
