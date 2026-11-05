import { describe, expect, it } from 'vitest'
import { dropInvalidDiColors, isSafeDiColor } from '../src/notations/bpmn/utils/diColors'

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
    const edge = new FakeDiElement({
      'bioc:stroke': 'var(--missing, url(https://attacker.example/edge.svg#a))',
    })

    dropInvalidDiColors(definitionsWith(shape, edge))

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

    dropInvalidDiColors(definitionsWith(shape))

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

    dropInvalidDiColors(definitions)

    expect(subProcessShape.attributes).toEqual({ 'bioc:fill': undefined })
  })

  it('accepts definitions without diagrams or planes', () => {
    expect(() => dropInvalidDiColors({})).not.toThrow()
    expect(() => dropInvalidDiColors({ diagrams: [{}] })).not.toThrow()
  })
})

describe('isSafeDiColor', () => {
  it.each([
    '#abc',
    '#abcd',
    '#aabbcc',
    '#aabbcc80',
    'red',
    'transparent',
    'rgb(1, 2, 3)',
    'rgba(1,2,3,0.5)',
    'hsl(120 50% 50% / 0.3)',
    'hsla(120, 50%, 50%, -0.3)',
  ])('accepts the colour %s', (value) => {
    expect(isSafeDiColor(value)).toBe(true)
  })

  it.each([
    'url(https://attacker.example/x.svg#a)',
    'var(--a, url(https://attacker.example/x.svg#a))',
    'env(a, url(https://attacker.example/x.svg#a))',
    'attr(x)',
    'if(media(print): red; else: url(x))',
    'red url(x)',
    'image(url(x))',
    'rgb(var(--a))',
    'rgb(1, 2, 3) url(x)',
    '#abcde',
    '',
  ])('rejects %s', (value) => {
    expect(isSafeDiColor(value)).toBe(false)
  })
})
