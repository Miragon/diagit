import type { ModdleElement, ParsedModel } from './model'

/** Properties that hold other diagram elements, which the diff treats as elements of their own. */
export const CHILDREN_DIFFED_AS_OWN_ELEMENTS: readonly string[] = [
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

/** Properties that hold the layout of an element, not its meaning. */
export const LAYOUT_PROPERTIES: readonly string[] = ['di']

/** How deep a walk through an element's content goes, as a guard against odd models. */
export const MAX_CONTENT_DEPTH = 16

/** The diagram elements of a model, which a walk through content stops at. */
export type DiagramElements = Pick<ParsedModel, 'has'>

/**
 * The names of the properties of a moddle element that reference other elements. moddle keeps
 * references non-enumerable, so they are read from the element's descriptor.
 */
export class ReferenceProperties {
  namesOf(element: ModdleElement): string[] {
    const properties: { name: string; isReference?: boolean }[] =
      element.$descriptor?.properties ?? []
    return properties.filter((property) => property.isReference).map((property) => property.name)
  }
}
