const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const TASK_HEIGHT = 40

type Attributes = Record<string, string | number>

export class ProcessSketch {
  element(): SVGElement {
    const canvas = { class: 'process-sketch', viewBox: '0 0 300 150', 'aria-hidden': 'true' }
    return this.svg('svg', canvas, [
      this.svg('defs', {}, [this.arrowHead()]),
      this.svg('circle', { class: 'sketch-shape', cx: 22, cy: 75, r: 12 }),
      ...this.task(56, 55, 72, 'Check order'),
      this.svg('path', { class: 'sketch-shape', d: 'M160 75l18-18 18 18-18 18z' }),
      this.svg('path', { class: 'sketch-flow', d: 'M172 69l12 12M184 69l-12 12' }),
      ...this.task(222, 15, 68, 'Ship'),
      ...this.task(222, 95, 68, 'Cancel'),
      this.flow('M34 75h20'),
      this.flow('M128 75h30'),
      this.flow('M178 57V35h42'),
      this.flow('M178 93v22h42'),
    ])
  }

  private arrowHead(): SVGElement {
    const marker = {
      id: 'sketch-arrow',
      viewBox: '0 0 10 10',
      refX: 9,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: 'auto',
    }
    return this.svg('marker', marker, [
      this.svg('path', { class: 'sketch-arrow-head', d: 'M0 0L10 5L0 10z' }),
    ])
  }

  private task(x: number, y: number, width: number, label: string): SVGElement[] {
    const labelPosition = { x: x + width / 2, y: y + TASK_HEIGHT / 2 + 4 }
    return [
      this.svg('rect', { class: 'sketch-shape', x, y, width, height: TASK_HEIGHT, rx: 8 }),
      this.svg('text', { class: 'sketch-label', ...labelPosition }, [label]),
    ]
  }

  private flow(path: string): SVGElement {
    return this.svg('path', { class: 'sketch-flow', d: path, 'marker-end': 'url(#sketch-arrow)' })
  }

  private svg(tag: string, attributes: Attributes, children: (SVGElement | string)[] = []) {
    const element = document.createElementNS(SVG_NAMESPACE, tag)
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, String(value))
    }
    element.append(...children)
    return element
  }
}
