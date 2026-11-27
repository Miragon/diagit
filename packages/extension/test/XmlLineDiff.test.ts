import { describe, expect, it } from 'vitest'
import { XmlLineDiff } from '../src/views/diff-viewer/XmlLineDiff'

const numbered = (text: string | null, first = 1) =>
  text === null
    ? null
    : text.split('\n').map((line, index) => ({ number: first + index, text: line }))
const lines = (before: string | null, after: string | null) =>
  new XmlLineDiff()
    .lines(numbered(before), numbered(after))
    .map((line) => `${line.kind}:${line.text}`)

describe('XmlLineDiff', () => {
  it('shows a changed line as the removed line followed by the added one', () => {
    expect(
      lines(
        '<task id="T">\n  <job type="a" />\n</task>',
        '<task id="T">\n  <job type="b" />\n</task>',
      ),
    ).toEqual([
      'same:<task id="T">',
      'removed:  <job type="a" />',
      'added:  <job type="b" />',
      'same:</task>',
    ])
  })

  it('puts a whole run of removed lines before the run that replaced it', () => {
    expect(lines('x\n1\n2\ny', 'x\n3\n4\n5\ny')).toEqual([
      'same:x',
      'removed:1',
      'removed:2',
      'added:3',
      'added:4',
      'added:5',
      'same:y',
    ])
  })

  it('marks every line of an added or a removed element', () => {
    expect(lines(null, '<a>\n</a>')).toEqual(['added:<a>', 'added:</a>'])
    expect(lines('<a />', null)).toEqual(['removed:<a />'])
  })

  it('keeps the numbers of both files and marks where lines are left out', () => {
    const before = [...numbered('<m />', 2)!, ...numbered('<t>\n</t>', 8)!]
    const after = [...numbered('<m />', 2)!, ...numbered('<t>\n</t>', 9)!]
    expect(
      new XmlLineDiff()
        .lines(before, after)
        .map((line) => `${line.afterGap ? '… ' : ''}${line.oldNumber}|${line.newNumber}`),
    ).toEqual(['2|2', '… 8|9', '9|10'])
  })

  it('marks the whole words that changed in a replaced line', () => {
    const marked = new XmlLineDiff()
      .lines(
        numbered('  <job type="collect-payment" />'),
        numbered('  <job type="payment.collect" retries="5" />'),
      )
      .map((line) => line.text.slice(line.changedPart!.start, line.changedPart!.end))
    expect(marked).toEqual(['collect-payment', 'payment.collect" retries="5'])
  })

  it('marks nothing when a replaced line shares only indentation and brackets', () => {
    const lines = new XmlLineDiff().lines(numbered('  <a />'), numbered('  <b>'))
    expect(lines.map((line) => line.changedPart)).toEqual([undefined, undefined])
  })
})
