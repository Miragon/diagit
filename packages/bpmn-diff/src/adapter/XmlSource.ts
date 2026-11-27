/** One line of a file, numbered from 1. */
export interface SourceLine {
  readonly number: number
  readonly text: string
}

interface ElementSpan {
  readonly id: string | null
  readonly start: number
  end: number
}

interface CharRange {
  readonly start: number
  readonly end: number
}

/** One attribute; matched from the start of a tag, a quoted value is consumed whole. */
const ATTRIBUTE = /\s([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
const MARKUP_ENDS: ReadonlyArray<readonly [string, string]> = [
  ['<!--', '-->'],
  ['<![CDATA[', ']]>'],
  ['<?', '?>'],
  ['<!', '>'],
]

/**
 * The text of an XML file, which finds the lines an element with an id is written on. It reads
 * the text itself, because the parsed model knows no positions.
 */
export class XmlSource {
  private readonly lineStarts: number[]
  private readonly elements: ElementSpan[]

  constructor(private readonly text: string) {
    this.lineStarts = this.lineStartsOf(text)
    this.elements = this.elementsOf(text)
  }

  /**
   * The lines of the elements with these ids, in file order, without the lines of the nested
   * elements that `isOwnElement` names: those are shown on their own.
   */
  linesOf(ids: readonly string[], isOwnElement: (id: string) => boolean): SourceLine[] {
    const wanted = new Set(ids)
    const kept: CharRange[] = []
    for (const element of this.elements) {
      if (element.id !== null && wanted.has(element.id)) {
        kept.push(...this.withoutNestedOwnElements(element, isOwnElement))
      }
    }
    return this.linesCovering(kept)
  }

  private withoutNestedOwnElements(
    element: ElementSpan,
    isOwnElement: (id: string) => boolean,
  ): CharRange[] {
    const ranges: CharRange[] = []
    let start = element.start
    for (const nested of this.elements) {
      const isInside = nested.start > element.start && nested.end <= element.end
      if (!isInside || nested.start < start || nested.id === null || !isOwnElement(nested.id)) {
        continue
      }
      ranges.push({ start, end: nested.start })
      start = nested.end
    }
    ranges.push({ start, end: element.end })
    return ranges
  }

  /** The lines that hold more than whitespace of the ranges. */
  private linesCovering(ranges: readonly CharRange[]): SourceLine[] {
    const numbers = new Set<number>()
    for (const range of ranges) {
      for (let offset = range.start; offset < range.end; offset += 1) {
        if (!/\s/.test(this.text[offset]!)) {
          numbers.add(this.lineNumberAt(offset))
        }
      }
    }
    return [...numbers]
      .sort((a, b) => a - b)
      .map((number) => ({ number, text: this.lineText(number) }))
  }

  private lineNumberAt(offset: number): number {
    let low = 0
    let high = this.lineStarts.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (this.lineStarts[middle]! <= offset) {
        low = middle
      } else {
        high = middle - 1
      }
    }
    return low + 1
  }

  private lineText(number: number): string {
    const start = this.lineStarts[number - 1]!
    const next = this.lineStarts[number]
    const end = next === undefined ? this.text.length : next - 1
    return this.text.slice(start, end).replace(/\r$/, '')
  }

  private lineStartsOf(text: string): number[] {
    const starts = [0]
    for (let offset = text.indexOf('\n'); offset !== -1; offset = text.indexOf('\n', offset + 1)) {
      starts.push(offset + 1)
    }
    return starts
  }

  /** Every element with its span from `<` of the start tag to `>` of the end tag. */
  private elementsOf(text: string): ElementSpan[] {
    const elements: ElementSpan[] = []
    const open: ElementSpan[] = []
    let offset = text.indexOf('<')
    while (offset !== -1) {
      const markupEnd = this.endOfMarkup(text, offset)
      if (markupEnd !== null) {
        offset = text.indexOf('<', markupEnd)
        continue
      }
      const tagEnd = this.endOfTag(text, offset)
      if (tagEnd === -1) {
        break
      }
      const tag = text.slice(offset, tagEnd)
      if (tag.startsWith('</')) {
        const element = open.pop()
        if (element) {
          element.end = tagEnd
        }
      } else {
        const element: ElementSpan = { id: this.idOf(tag), start: offset, end: tagEnd }
        elements.push(element)
        if (!tag.endsWith('/>')) {
          open.push(element)
        }
      }
      offset = text.indexOf('<', tagEnd)
    }
    return elements
  }

  /** The value of the tag's `id` attribute, never text inside another attribute's value. */
  private idOf(tag: string): string | null {
    for (const [, name, doubleQuoted, singleQuoted] of tag.matchAll(ATTRIBUTE)) {
      if (name === 'id') {
        return doubleQuoted ?? singleQuoted ?? null
      }
    }
    return null
  }

  /** The end of a comment, CDATA section, processing instruction or declaration at `offset`. */
  private endOfMarkup(text: string, offset: number): number | null {
    for (const [opening, closing] of MARKUP_ENDS) {
      if (text.startsWith(opening, offset)) {
        const end = text.indexOf(closing, offset + opening.length)
        return end === -1 ? text.length : end + closing.length
      }
    }
    return null
  }

  /** The offset after the `>` of the tag at `offset`, skipping `>` inside attribute values. */
  private endOfTag(text: string, offset: number): number {
    let quote: string | null = null
    for (let index = offset + 1; index < text.length; index += 1) {
      const char = text[index]
      if (quote !== null) {
        if (char === quote) {
          quote = null
        }
      } else if (char === '"' || char === "'") {
        quote = char
      } else if (char === '>') {
        return index + 1
      }
    }
    return -1
  }
}
