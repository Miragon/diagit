import type { CodeLine } from '../../notations/Notation'

type XmlLineKind = 'same' | 'removed' | 'added'

export interface XmlLine {
  kind: XmlLineKind
  text: string
  /** The number in the old file; missing for an added line. */
  oldNumber?: number
  /** The number in the new file; missing for a removed line. */
  newNumber?: number
  /** Whether lines of the file are left out before this one. */
  afterGap: boolean
  /** The part of the text that differs from the line it replaced or that replaced it. */
  changedPart?: TextRange
}

export interface TextRange {
  start: number
  end: number
}

const WORD_CHARACTER = /[\w.-]/

/**
 * Lines up the lines of an element in the old and the new file in one column, like the diff of
 * a git host: unchanged lines once, and each run of removed lines before the added lines that
 * replaced it. A missing side (`null`) makes every line of the other side removed or added.
 */
export class XmlLineDiff {
  lines(before: readonly CodeLine[] | null, after: readonly CodeLine[] | null): XmlLine[] {
    const lines: XmlLine[] = []
    let removed: XmlLine[] = []
    let added: XmlLine[] = []
    const flushChangedRun = () => {
      this.markChangedParts(removed, added)
      lines.push(...removed, ...added)
      removed = []
      added = []
    }
    for (const step of this.steps(before ?? [], after ?? [])) {
      if (step.kind === 'same') {
        flushChangedRun()
        lines.push(step)
      } else if (step.kind === 'removed') {
        removed.push(step)
      } else {
        added.push(step)
      }
    }
    flushChangedRun()
    return this.withGaps(lines)
  }

  /**
   * Pairs the removed and the added lines of a run in order, like a git host, and marks the
   * part of each pair that differs, when the two lines share a name or a value, not only indentation and brackets.
   */
  private markChangedParts(removed: XmlLine[], added: XmlLine[]): void {
    const pairs = Math.min(removed.length, added.length)
    for (let index = 0; index < pairs; index += 1) {
      const oldLine = removed[index]!
      const newLine = added[index]!
      const parts = this.changedParts(oldLine.text, newLine.text)
      if (parts) {
        oldLine.changedPart = parts.old
        newLine.changedPart = parts.new
      }
    }
  }

  private changedParts(
    oldText: string,
    newText: string,
  ): { old: TextRange; new: TextRange } | null {
    let prefix = 0
    while (
      prefix < oldText.length &&
      prefix < newText.length &&
      oldText[prefix] === newText[prefix]
    ) {
      prefix += 1
    }
    let suffix = 0
    while (
      suffix < oldText.length - prefix &&
      suffix < newText.length - prefix &&
      oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
    ) {
      suffix += 1
    }
    const shared = oldText.slice(0, prefix) + oldText.slice(oldText.length - suffix)
    if (!/\w/.test(shared)) {
      return null
    }
    return {
      old: this.wholeWords(oldText, prefix, oldText.length - suffix),
      new: this.wholeWords(newText, prefix, newText.length - suffix),
    }
  }

  /** Widens a range to whole words, so a highlight never cuts a name in two. */
  private wholeWords(text: string, start: number, end: number): TextRange {
    let wordStart = start
    while (
      wordStart > 0 &&
      WORD_CHARACTER.test(text[wordStart - 1]!) &&
      WORD_CHARACTER.test(text[wordStart] ?? '')
    ) {
      wordStart -= 1
    }
    let wordEnd = end
    while (
      wordEnd < text.length &&
      WORD_CHARACTER.test(text[wordEnd]!) &&
      WORD_CHARACTER.test(text[wordEnd - 1] ?? '')
    ) {
      wordEnd += 1
    }
    return { start: wordStart, end: wordEnd }
  }

  /** Marks the lines after which a number jumps, on the old or the new side. */
  private withGaps(lines: XmlLine[]): XmlLine[] {
    let lastOld: number | undefined
    let lastNew: number | undefined
    return lines.map((line) => {
      const jumpsOld = this.jumps(lastOld, line.oldNumber)
      const jumpsNew = this.jumps(lastNew, line.newNumber)
      lastOld = line.oldNumber ?? lastOld
      lastNew = line.newNumber ?? lastNew
      return { ...line, afterGap: jumpsOld || jumpsNew }
    })
  }

  private jumps(last: number | undefined, next: number | undefined): boolean {
    return last !== undefined && next !== undefined && next !== last + 1
  }

  /** The edit steps of a longest-common-subsequence alignment. */
  private steps(oldLines: readonly CodeLine[], newLines: readonly CodeLine[]): XmlLine[] {
    const common = this.commonSuffixLengths(oldLines, newLines)
    const steps: XmlLine[] = []
    const removed = (line: CodeLine): XmlLine => ({
      kind: 'removed',
      text: line.text,
      oldNumber: line.number,
      afterGap: false,
    })
    const added = (line: CodeLine): XmlLine => ({
      kind: 'added',
      text: line.text,
      newNumber: line.number,
      afterGap: false,
    })
    let i = 0
    let j = 0
    while (i < oldLines.length && j < newLines.length) {
      const oldLine = oldLines[i]!
      const newLine = newLines[j]!
      if (oldLine.text === newLine.text) {
        steps.push({
          kind: 'same',
          text: newLine.text,
          oldNumber: oldLine.number,
          newNumber: newLine.number,
          afterGap: false,
        })
        i += 1
        j += 1
      } else if (common[i + 1]![j]! >= common[i]![j + 1]!) {
        steps.push(removed(oldLine))
        i += 1
      } else {
        steps.push(added(newLine))
        j += 1
      }
    }
    steps.push(...oldLines.slice(i).map(removed), ...newLines.slice(j).map(added))
    return steps
  }

  private commonSuffixLengths(
    oldLines: readonly CodeLine[],
    newLines: readonly CodeLine[],
  ): number[][] {
    const lengths = Array.from({ length: oldLines.length + 1 }, () =>
      new Array<number>(newLines.length + 1).fill(0),
    )
    for (let i = oldLines.length - 1; i >= 0; i -= 1) {
      for (let j = newLines.length - 1; j >= 0; j -= 1) {
        lengths[i]![j] =
          oldLines[i]!.text === newLines[j]!.text
            ? lengths[i + 1]![j + 1]! + 1
            : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
      }
    }
    return lengths
  }
}
