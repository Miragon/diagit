import type { ChangeDetail, DiagramDiff } from '../../notations/Notation'
import { h } from '../../platform/utils/dom'
import { XmlLineDiff, type XmlLine } from './XmlLineDiff'

export interface SelectedChange {
  id: string
  category: keyof DiagramDiff
  detail: ChangeDetail | null
}

const CHANGE_CODE_ID = 'diagit-change-code'

const TYPE_PREFIX = /^[^:]*:/
const WORD_START = /(?<=[a-z])(?=[A-Z])/
const LEADING_WHITESPACE = /^(\s*)(.*)$/s

/**
 * The bar under the diagram and, for a selected change, its XML without layout in one column,
 * like the diff of a git host: unchanged lines, removed lines (−) and added lines (+).
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
    const lines = detail ? this.lineDiff.lines(detail.before, detail.after) : []
    this.show('XML of the selected change', name, type)
    this.xml.hidden = lines.length === 0
    this.xml.replaceChildren(...lines.map((line) => this.lineRow(line)))
    return lines.length > 0
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

  /** The indentation is a cell of its own, so a wrapped line goes on under its indentation. */
  private lineRow(line: XmlLine): HTMLElement {
    const [, indentation = '', code = ''] = line.text.match(LEADING_WHITESPACE) ?? []
    return h('span', { class: 'diagit-xml-line', 'data-line': line.kind }, [
      h('span', { class: 'diagit-xml-indentation', text: indentation }),
      h('span', { class: 'diagit-xml-code', text: code }),
    ])
  }

  private typeLabel(type: string): string {
    const words = type.replace(TYPE_PREFIX, '').split(WORD_START)
    const label = words.join(' ').toLowerCase()
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
}
