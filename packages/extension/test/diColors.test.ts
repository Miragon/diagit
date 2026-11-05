import { describe, expect, it } from 'vitest'
import { dropInvalidDiColors } from '../src/notations/bpmn/utils/diColors'

class FakeDiElement {
  constructor(
    readonly attributes: Record<string, string | undefined>,
    readonly label?: FakeDiElement,
  ) {}

  get(attribute: string): string | undefined {
    return this.attributes[attribute]
  }

  set(attribute: string, value: undefined): void {
    this.attributes[attribute] = value
  }
}

const isColorWithoutUrl = (value: string) => value !== '' && !value.includes('url(')

const definitionsWith = (...planeElement: FakeDiElement[]) => ({
  diagrams: [{ plane: { planeElement } }],
})

describe('dropInvalidDiColors', () => {
  it('drops shape and edge colours that are not valid colours', () => {
    const shape = new FakeDiElement({
      'bioc:fill': 'url(https://attacker.example/fill.svg#a)',
      'bioc:stroke': 'red',
      'color:background-color': 'url(https://attacker.example/background.svg#a)',
      'color:border-color': 'blue',
    })
    const edge = new FakeDiElement({ 'bioc:stroke': 'url(https://attacker.example/edge.svg#a)' })

    dropInvalidDiColors(definitionsWith(shape, edge), isColorWithoutUrl)

    expect(shape.attributes).toEqual({
      'bioc:fill': undefined,
      'bioc:stroke': 'red',
      'color:background-color': undefined,
      'color:border-color': 'blue',
    })
    expect(edge.attributes).toEqual({ 'bioc:stroke': undefined })
  })

  it('drops label colours that are not valid colours', () => {
    const label = new FakeDiElement({ 'color:color': 'url(https://attacker.example/label.svg#a)' })
    const shape = new FakeDiElement({}, label)

    dropInvalidDiColors(definitionsWith(shape), isColorWithoutUrl)

    expect(label.attributes).toEqual({ 'color:color': undefined })
  })

  it('checks every diagram, including drilled-down sub-process planes', () => {
    const subProcessShape = new FakeDiElement({ 'bioc:fill': 'url(https://attacker.example)' })
    const definitions = {
      diagrams: [
        { plane: { planeElement: [new FakeDiElement({})] } },
        { plane: { planeElement: [subProcessShape] } },
      ],
    }

    dropInvalidDiColors(definitions, isColorWithoutUrl)

    expect(subProcessShape.attributes).toEqual({ 'bioc:fill': undefined })
  })

  it('accepts definitions without diagrams or planes', () => {
    expect(() => dropInvalidDiColors({}, isColorWithoutUrl)).not.toThrow()
    expect(() => dropInvalidDiColors({ diagrams: [{}] }, isColorWithoutUrl)).not.toThrow()
  })
})
