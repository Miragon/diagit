import { describe, expect, it } from 'vitest'
import { XmlLineDiff } from '../src/views/diff-viewer/XmlLineDiff'

const rows = (before: string, after: string) =>
  new XmlLineDiff()
    .pairs(before, after)
    .map(([old, current]) => `${old.kind}:${old.text} | ${current.kind}:${current.text}`)

describe('XmlLineDiff', () => {
  it('puts a changed line next to the line it replaced', () => {
    expect(
      rows(
        '<task id="T">\n  <job type="a" />\n</task>',
        '<task id="T">\n  <job type="b" />\n</task>',
      ),
    ).toEqual([
      'same:<task id="T"> | same:<task id="T">',
      'removed:  <job type="a" /> | added:  <job type="b" />',
      'same:</task> | same:</task>',
    ])
  })

  it('leaves a gap on the side that has no line', () => {
    expect(rows('<a>\n</a>', '<a>\n  <input />\n  <output />\n</a>')).toEqual([
      'same:<a> | same:<a>',
      'gap: | added:  <input />',
      'gap: | added:  <output />',
      'same:</a> | same:</a>',
    ])
    expect(rows('<a>\n  <input />\n</a>', '<a>\n</a>')).toEqual([
      'same:<a> | same:<a>',
      'removed:  <input /> | gap:',
      'same:</a> | same:</a>',
    ])
  })

  it('pairs a longer run of removed lines with the shorter run that replaced it', () => {
    expect(rows('x\n1\n2\ny', 'x\n3\ny')).toEqual([
      'same:x | same:x',
      'removed:1 | added:3',
      'removed:2 | gap:',
      'same:y | same:y',
    ])
  })
})
