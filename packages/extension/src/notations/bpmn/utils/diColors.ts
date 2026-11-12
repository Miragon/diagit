const DI_COLOR_ATTRIBUTES = [
  'bioc:fill',
  'bioc:stroke',
  'color:background-color',
  'color:border-color',
  'color:color',
]

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const KEYWORD_COLOR = /^[a-z]+$/i
const NUMERIC_COLOR_FUNCTION = /^(?:rgba?|hsla?)\([\d.,%\s/+-]*\)$/i

interface DiElement {
  get(attribute: string): string | undefined
  set(attribute: string, value: undefined): void
  label?: DiElement
}

interface DiDefinitions {
  diagrams?: { plane?: { planeElement?: DiElement[] } }[]
}

export function isSafeDiColor(value: string): boolean {
  return HEX_COLOR.test(value) || KEYWORD_COLOR.test(value) || NUMERIC_COLOR_FUNCTION.test(value)
}

export function dropInvalidDiColors(definitions: DiDefinitions): void {
  for (const diagram of definitions.diagrams ?? []) {
    for (const di of diagram.plane?.planeElement ?? []) {
      dropInvalidColors(di)
      if (di.label) {
        dropInvalidColors(di.label)
      }
    }
  }
}

function dropInvalidColors(element: DiElement): void {
  for (const attribute of DI_COLOR_ATTRIBUTES) {
    const value = element.get(attribute)
    if (value !== undefined && !isSafeDiColor(value)) {
      element.set(attribute, undefined)
    }
  }
}
