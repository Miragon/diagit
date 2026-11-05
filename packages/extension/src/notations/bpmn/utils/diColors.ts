const DI_COLOR_ATTRIBUTES = [
  'bioc:fill',
  'bioc:stroke',
  'color:background-color',
  'color:border-color',
  'color:color',
]

interface DiElement {
  get(attribute: string): string | undefined
  set(attribute: string, value: undefined): void
}

export function dropInvalidDiColors(
  definitions: Record<string, any>,
  isColor: (value: string) => boolean,
): void {
  for (const diagram of definitions.diagrams ?? []) {
    for (const di of diagram.plane?.planeElement ?? []) {
      dropInvalidColors(di, isColor)
      if (di.label) dropInvalidColors(di.label, isColor)
    }
  }
}

function dropInvalidColors(element: DiElement, isColor: (value: string) => boolean): void {
  for (const attribute of DI_COLOR_ATTRIBUTES) {
    const value = element.get(attribute)
    if (value !== undefined && !isColor(value)) element.set(attribute, undefined)
  }
}
