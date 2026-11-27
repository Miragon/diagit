import { describe, expect, it } from 'vitest'
import { XmlSource } from '../../src/domain/XmlSource'

const noneOwn = () => false
const numbered = (source: XmlSource, ids: string[], isOwn: (id: string) => boolean = noneOwn) =>
  source.linesOf(ids, isOwn).map((line) => `${line.number}:${line.text}`)

describe('XmlSource', () => {
  it('finds the lines from the start tag to the end tag of an element', () => {
    const source = new XmlSource(['<a>', '  <b id="B">', '    <c />', '  </b>', '</a>'].join('\n'))
    expect(numbered(source, ['B'])).toEqual(['2:  <b id="B">', '3:    <c />', '4:  </b>'])
  })

  it('finds a self-closing element and skips > inside attribute values', () => {
    const source = new XmlSource('<a>\n  <b id="B" when="=x > 1" />\n  <c id="C" />\n</a>')
    expect(numbered(source, ['B'])).toEqual(['2:  <b id="B" when="=x > 1" />'])
  })

  it('leaves out nested elements that are shown on their own', () => {
    const source = new XmlSource(
      [
        '<sub id="S">',
        '  <loop id="L" />',
        '  <task id="T">',
        '    <x />',
        '  </task>',
        '</sub>',
      ].join('\n'),
    )
    expect(numbered(source, ['S'], (id) => id === 'T')).toEqual([
      '1:<sub id="S">',
      '2:  <loop id="L" />',
      '6:</sub>',
    ])
  })

  it('returns several elements in file order', () => {
    const source = new XmlSource('<m id="M" />\n<p>\n  <e id="E" />\n</p>')
    expect(numbered(source, ['E', 'M'])).toEqual(['1:<m id="M" />', '3:  <e id="E" />'])
  })

  it('matches only the attribute id and ignores comments and CDATA', () => {
    const source = new XmlSource(
      ['<!-- <b id="B"> -->', '<shape bpmnElement="B" />', '<b id="B"><![CDATA[ </b> ]]></b>'].join(
        '\n',
      ),
    )
    expect(numbered(source, ['B'])).toEqual(['3:<b id="B"><![CDATA[ </b> ]]></b>'])
  })

  it('finds nothing for an unknown id', () => {
    expect(numbered(new XmlSource('<a id="A" />'), ['B'])).toEqual([])
  })
})
