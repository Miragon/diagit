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
const SIGN: Record<XmlLine['kind'], string> = { same: ' ', removed: '−', added: '+' }

/**
 * The bar under the diagram and, for a selected change, the lines of the file it is written on,
 * in one column like the diff of a git host: the old and the new line number, unchanged lines,
 * removed lines (−) and added lines (+), and a gap where lines of the file are left out.
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
    this.xml.replaceChildren(...this.rows(lines))
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

  private rows(lines: readonly XmlLine[]): HTMLElement[] {
    const digits = Math.max(
      1,
      ...lines.map((line) => String(Math.max(line.oldNumber ?? 0, line.newNumber ?? 0)).length),
    )
    this.xml.style.setProperty('--diagit-xml-digits', `${digits}ch`)
    return lines.flatMap((line) => {
      const row = this.lineRow(line)
      return line.afterGap
        ? [h('div', { class: 'diagit-xml-gap', 'aria-hidden': 'true' }), row]
        : [row]
    })
  }

  /** The indentation is a cell of its own, so a wrapped line goes on under its indentation. */
  private lineRow(line: XmlLine): HTMLElement {
    const [, indentation = '', code = ''] = line.text.match(LEADING_WHITESPACE) ?? []
    return h('div', { class: 'diagit-xml-line', 'data-line': line.kind }, [
      this.numberCell(line.oldNumber, 'Old line'),
      this.numberCell(line.newNumber, 'New line'),
      h('span', { class: 'diagit-xml-sign', 'aria-hidden': 'true', text: SIGN[line.kind] }),
      h('span', { class: 'diagit-xml-indentation', text: indentation }),
      h('span', { class: 'diagit-xml-code' }, this.codeParts(code, line, indentation.length)),
    ])
  }

  /** The code with the part that changed against its paired line marked, like a git host. */
  private codeParts(code: string, line: XmlLine, codeStart: number): (string | HTMLElement)[] {
    const part = line.changedPart
    if (!part) {
      return [code]
    }
    const start = Math.max(part.start - codeStart, 0)
    const end = Math.max(part.end - codeStart, start)
    if (start === end) {
      return [code]
    }
    return [
      code.slice(0, start),
      h('mark', { class: 'diagit-xml-changed-part', text: code.slice(start, end) }),
      code.slice(end),
    ].filter((piece) => piece !== '')
  }

  private numberCell(number: number | undefined, label: string): HTMLElement {
    if (number === undefined) {
      return h('span', { class: 'diagit-xml-number' })
    }
    return h('span', {
      class: 'diagit-xml-number',
      title: `${label} ${number}`,
      text: String(number),
    })
  }

  private typeLabel(type: string): string {
    const words = type.replace(TYPE_PREFIX, '').split(WORD_START)
    const label = words.join(' ').toLowerCase()
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
}
