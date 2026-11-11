import { createElement, type IconNode } from 'lucide'

const ICON_STROKE_WIDTH = 2.5

export function lucideIcon(icon: IconNode, className?: string): SVGElement {
  return createElement(icon, {
    'stroke-width': ICON_STROKE_WIDTH,
    'aria-hidden': 'true',
    ...(className ? { class: className } : {}),
  })
}
