type XmlLineKind = 'same' | 'removed' | 'added'

export interface XmlLine {
  kind: XmlLineKind
  text: string
}

/**
 * Lines up two short XML snippets in one column, like the diff of a git host: unchanged lines
 * once, and each run of removed lines before the added lines that replaced it. A missing side
 * (`null`) makes every line of the other side removed or added.
 */
export class XmlLineDiff {
  lines(before: string | null, after: string | null): XmlLine[] {
    const oldLines = before === null ? [] : before.split('\n')
    const newLines = after === null ? [] : after.split('\n')
    const lines: XmlLine[] = []
    let removed: XmlLine[] = []
    let added: XmlLine[] = []
    const flushChangedRun = () => {
      lines.push(...removed, ...added)
      removed = []
      added = []
    }
    for (const step of this.steps(oldLines, newLines)) {
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
    return lines
  }

  /** The edit steps of a longest-common-subsequence alignment. */
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
