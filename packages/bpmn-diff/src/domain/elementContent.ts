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
