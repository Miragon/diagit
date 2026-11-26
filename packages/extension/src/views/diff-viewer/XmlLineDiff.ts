type XmlLineKind = 'same' | 'removed' | 'added' | 'gap'

export interface XmlLine {
  kind: XmlLineKind
  text: string
}

/** One row of the side-by-side XML: the line before the change and the line after it. */
export type XmlLinePair = readonly [before: XmlLine, after: XmlLine]

const GAP: XmlLine = { kind: 'gap', text: '' }

/**
 * Lines up two short XML snippets: unchanged lines side by side, a run of removed lines next
 * to the run of added lines that replaced it, and a gap where one side has no line.
 */
export class XmlLineDiff {
  pairs(before: string, after: string): XmlLinePair[] {
    const oldLines = before.split('\n')
    const newLines = after.split('\n')
    const pairs: XmlLinePair[] = []
    let removed: string[] = []
    let added: string[] = []
    const flushChangedRun = () => {
      pairs.push(...this.pairChangedRun(removed, added))
      removed = []
      added = []
    }
    for (const step of this.steps(oldLines, newLines)) {
      if (step.kind === 'same') {
        flushChangedRun()
        pairs.push([step, step])
      } else if (step.kind === 'removed') {
        removed.push(step.text)
      } else {
        added.push(step.text)
      }
    }
    flushChangedRun()
    return pairs
  }

  private pairChangedRun(removed: string[], added: string[]): XmlLinePair[] {
    const rows = Math.max(removed.length, added.length)
    return Array.from({ length: rows }, (_, row) => [
      row < removed.length ? { kind: 'removed', text: removed[row]! } : GAP,
      row < added.length ? { kind: 'added', text: added[row]! } : GAP,
    ])
  }

  /** The edit steps of a longest-common-subsequence alignment, removed lines first. */
  private steps(oldLines: string[], newLines: string[]): XmlLine[] {
    const common = this.commonSuffixLengths(oldLines, newLines)
    const steps: XmlLine[] = []
    let i = 0
    let j = 0
    while (i < oldLines.length && j < newLines.length) {
      if (oldLines[i] === newLines[j]) {
        steps.push({ kind: 'same', text: oldLines[i]! })
        i += 1
        j += 1
      } else if (common[i + 1]![j]! >= common[i]![j + 1]!) {
        steps.push({ kind: 'removed', text: oldLines[i]! })
        i += 1
      } else {
        steps.push({ kind: 'added', text: newLines[j]! })
        j += 1
      }
    }
    for (; i < oldLines.length; i += 1) {
      steps.push({ kind: 'removed', text: oldLines[i]! })
    }
    for (; j < newLines.length; j += 1) {
      steps.push({ kind: 'added', text: newLines[j]! })
    }
    return steps
  }

  private commonSuffixLengths(oldLines: string[], newLines: string[]): number[][] {
    const lengths = Array.from({ length: oldLines.length + 1 }, () =>
      new Array<number>(newLines.length + 1).fill(0),
    )
    for (let i = oldLines.length - 1; i >= 0; i -= 1) {
      for (let j = newLines.length - 1; j >= 0; j -= 1) {
        lengths[i]![j] =
          oldLines[i] === newLines[j]
            ? lengths[i + 1]![j + 1]! + 1
            : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
      }
    }
    return lengths
  }
}
