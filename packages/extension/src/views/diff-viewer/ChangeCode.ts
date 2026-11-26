import type { ChangeDetail, DiagramDiff } from '../../notations/Notation'
import { h } from '../../platform/utils/dom'
import type { DiffSide } from './sides'
import { XmlLineDiff, type XmlLine, type XmlLinePair } from './XmlLineDiff'

export interface SelectedChange {
  id: string
  category: keyof DiagramDiff
  detail: ChangeDetail | null
  shownSides: readonly DiffSide[]
}

const CHANGE_CODE_ID = 'diagit-change-code'

const TYPE_PREFIX = /^[^:]*:/
const WORD_START = /(?<=[a-z])(?=[A-Z])/

/**
 * The bar under the diagram and, for a selected change, its XML without layout: before and
 * after on the columns of the panes, also for an added or removed element.
 */
export class ChangeCode {
  private readonly bar = h('div', { class: 'diagit-change-code-bar' })
  private readonly xml = h('div', { class: 'diagit-change-xml' })
  readonly element = h('section', { class: 'diagit-change-code', id: CHANGE_CODE_ID }, [
    this.bar,
    this.xml,
  ])
  private readonly lineDiff = new XmlLineDiff()

  constructor() {
    this.hide()
  }

  hide(): void {
    this.element.hidden = true
  }

  showWholeFile(): void {
    this.show('Code of the whole file', 'All changes', 'Whole file')
    this.xml.hidden = true
  }

  /** Shows the change; returns whether the panel now shows its code itself. */
  showChange(change: SelectedChange): boolean {
    const { detail } = change
    const name = detail?.name || change.id
    const type = detail ? this.typeLabel(detail.type) : ''
    if (change.category === 'moved') {
      this.show('XML of the selected change', name, type, 'Only the layout changed')
      this.xml.hidden = true
      return true
    }
    const columns = detail ? this.columnsOf(change, detail) : []
    this.show('XML of the selected change', name, type)
    this.xml.hidden = columns.length === 0
    this.renderColumns(columns)
    return columns.length > 0
  }

  private show(label: string, title: string, ...details: string[]): void {
    this.element.hidden = false
    this.element.setAttribute('aria-label', label)
    this.bar.replaceChildren(
      h('b', { text: title }),
      ...details
        .filter((detail) => detail !== '')
        .map((detail) => h('span', { class: 'diagit-change-code-muted', text: detail })),
    )
  }

  private columnsOf(change: SelectedChange, detail: ChangeDetail): XmlLine[][] {
    const { before, after } = detail
    if (before === null && after === null) {
      return []
    }
    const pairs =
      before !== null && after !== null
        ? this.lineDiff.pairs(before, after)
        : this.pairsOfOneSide(before, after)
    const oldColumn = pairs.map(([line]) => line)
    const newColumn = pairs.map(([, line]) => line)
    const shown = change.shownSides
    if (shown.length === 1) {
      const column = shown[0] === 'old' ? oldColumn : newColumn
      return [column.filter((line) => line.kind !== 'gap')]
    }
    return [oldColumn, newColumn]
  }

  /** An added or removed element keeps both columns: the side it is missing from stays empty. */
  private pairsOfOneSide(before: string | null, after: string | null): XmlLinePair[] {
    const gap: XmlLine = { kind: 'gap', text: '' }
    if (after !== null) {
      return after.split('\n').map((text) => [gap, { kind: 'added', text }])
    }
    return (before ?? '').split('\n').map((text) => [{ kind: 'removed', text }, gap])
  }

  private renderColumns(columns: XmlLine[][]): void {
    this.xml.dataset.columns = String(columns.length)
    const rows = Math.max(0, ...columns.map((column) => column.length))
    const cells = Array.from({ length: rows }, (_, row) =>
      columns.map((column) => this.lineCell(column[row] ?? { kind: 'gap', text: '' })),
    ).flat()
    this.xml.replaceChildren(...cells)
  }

  private lineCell(line: XmlLine): HTMLElement {
    return h('span', { class: 'diagit-xml-line', 'data-line': line.kind, text: line.text })
  }

  private typeLabel(type: string): string {
    const words = type.replace(TYPE_PREFIX, '').split(WORD_START)
    const label = words.join(' ').toLowerCase()
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
}
