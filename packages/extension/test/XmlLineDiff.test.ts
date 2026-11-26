import { describe, expect, it } from 'vitest'
import { XmlLineDiff } from '../src/views/diff-viewer/XmlLineDiff'

const lines = (before: string | null, after: string | null) =>
  new XmlLineDiff().lines(before, after).map((line) => `${line.kind}:${line.text}`)

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
})
