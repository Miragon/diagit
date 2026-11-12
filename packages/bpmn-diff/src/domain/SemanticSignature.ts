import type { ModdleElement, ParsedModel } from './model'

type DiagramElements = Pick<ParsedModel, 'has'>

const MODDLE_INTERNALS = ['$parent', '$descriptor', '$model', '$instanceOf']
const LAYOUT = ['di']
const CHILDREN_DIFFED_AS_OWN_ELEMENTS = [
  'flowElements',
  'incoming',
  'outgoing',
  'lanes',
  'laneSets',
  'children',
  'artifacts',
  'rootElements',
  'diagrams',
  'participants',
  'messageFlows',
]

const SKIPPED_KEYS = new Set<string>([
  ...MODDLE_INTERNALS,
  ...LAYOUT,
  ...CHILDREN_DIFFED_AS_OWN_ELEMENTS,
])

const MAX_DEPTH = 16

export class SemanticSignature {
  of(businessObject: ModdleElement, diagramElements: DiagramElements): string {
    const otherDiagramElements: DiagramElements = {
      has: (id) => id !== businessObject.id && diagramElements.has(id),
    }
    return JSON.stringify(this.serialize(businessObject, otherDiagramElements, new Set(), 0))
  }

  private serialize(
    node: any,
    diagramElements: DiagramElements,
    seen: Set<object>,
    depth: number,
  ): unknown {
    if (node === null || typeof node !== 'object') {
      return node
    }
    if (depth > MAX_DEPTH) {
      return '__max__'
    }
    if (Array.isArray(node)) {
      return node.map((item) => this.serialize(item, diagramElements, seen, depth + 1))
    }
    if (diagramElements.has(node.id)) {
      return 'ref:' + node.id
    }
    if (seen.has(node)) {
      return '__cycle__'
    }
    seen.add(node)

    const out: Record<string, any> = {}
    if (node.$type) {
      out.__type = node.$type
    }

    for (const key of this.semanticKeys(node)) {
      if (key === '$type' || SKIPPED_KEYS.has(key)) {
        continue
      }
      const value = node[key]
      if (typeof value === 'function' || value === undefined) {
        continue
      }
      out[key] = this.serialize(value, diagramElements, seen, depth + 1)
    }

    seen.delete(node)
    return out
  }

  private semanticKeys(node: any): string[] {
    const nonEnumerableReferences: string[] = (node.$descriptor?.properties ?? [])
      .filter((property: any) => property.isReference)
      .map((property: any) => property.name)
    return [...new Set([...Object.keys(node), ...nonEnumerableReferences])].sort()
  }
}
