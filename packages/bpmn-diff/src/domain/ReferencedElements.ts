import { CHILDREN_DIFFED_AS_OWN_ELEMENTS, LAYOUT_PROPERTIES } from './elementContent'
import type { ModdleElement, ParsedModel } from './model'

type DiagramElements = Pick<ParsedModel, 'has'>

interface Walk {
  readonly diagramElements: DiagramElements
  readonly visited: Set<object>
  readonly found: ModdleElement[]
}

const NOT_FOLLOWED = new Set<string>([...LAYOUT_PROPERTIES, ...CHILDREN_DIFFED_AS_OWN_ELEMENTS])

const MAX_DEPTH = 16

/**
 * The elements without a shape of their own that an element references, directly or from its
 * nested content: the message behind a message event definition, the process behind a pool, …
 * Like {@link SemanticSignature}, it never follows a reference to another diagram element.
 */
export class ReferencedElements {
  of(element: ModdleElement, diagramElements: DiagramElements): ModdleElement[] {
    const walk: Walk = { diagramElements, visited: new Set([element]), found: [] }
    this.visitProperties(element, walk, 0)
    return walk.found
  }

  private visitProperties(node: ModdleElement, walk: Walk, depth: number): void {
    if (depth > MAX_DEPTH) {
      return
    }
    const referenceNames = this.referenceNamesOf(node)
    for (const name of referenceNames) {
      for (const target of [node[name]].flat()) {
        this.take(target, walk, depth)
      }
    }
    for (const key of Object.keys(node)) {
      if (key.startsWith('$') || NOT_FOLLOWED.has(key) || referenceNames.has(key)) {
        continue
      }
      this.visit(node[key], walk, depth + 1)
    }
  }

  private visit(value: unknown, walk: Walk, depth: number): void {
    if (Array.isArray(value)) {
      for (const item of value) {
        this.visit(item, walk, depth)
      }
      return
    }
    if (!this.isElement(value) || walk.visited.has(value) || this.isDiagramElement(value, walk)) {
      return
    }
    walk.visited.add(value)
    this.visitProperties(value, walk, depth)
  }

  private take(target: unknown, walk: Walk, depth: number): void {
    if (!this.isElement(target) || !target.id || walk.visited.has(target)) {
      return
    }
    if (this.isDiagramElement(target, walk)) {
      return
    }
    walk.visited.add(target)
    walk.found.push(target)
    this.visitProperties(target, walk, depth + 1)
  }

  private isElement(value: unknown): value is ModdleElement {
    return value !== null && typeof value === 'object' && typeof (value as any).$type === 'string'
  }

  private isDiagramElement(element: ModdleElement, walk: Walk): boolean {
    return element.id !== undefined && walk.diagramElements.has(element.id)
  }

  private referenceNamesOf(node: ModdleElement): Set<string> {
    const properties: any[] = node.$descriptor?.properties ?? []
    return new Set(
      properties.filter((property) => property.isReference).map((property) => property.name),
    )
  }
}
