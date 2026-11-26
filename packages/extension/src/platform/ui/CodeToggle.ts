import { CodeXml } from 'lucide'
import { h } from '../utils/dom'
import { lucideIcon } from '../utils/lucideIcon'

export interface CodeToggleOptions {
  shown: boolean
  chosenByUser?: boolean
  hideCode(hidden: boolean): void
  toggled?(shown: boolean): void
}

/**
 * The Code button of a panel toolbar: shows or hides the host's code under the panel. The code
 * stays shown while hiding is not allowed, e.g. while the panel shows an error instead of a
 * diagram. Diagit itself only ever brings the code back; hiding it is the person's choice or
 * the start they picked.
 */
export class CodeToggle {
  private readonly hiddenComments = h('span', { class: 'diagit-code-count', hidden: '' })
  readonly element = h(
    'button',
    {
      class: 'btn btn-toggle diagit-code-toggle',
      type: 'button',
      title: 'Show the code under the diagram',
    },
    [lucideIcon(CodeXml), 'Code', this.hiddenComments],
  )
  private shown: boolean
  private chosenByUser: boolean
  private keptShown = false
  private hidingAllowed = true
  private hiddenCommentCount = 0
  private panelShowsCode = false
  private controlledElements: Element[] = []
  private readonly listeners = new Set<() => void>()

  constructor(private readonly options: CodeToggleOptions) {
    this.shown = options.shown
    this.chosenByUser = options.chosenByUser ?? false
    this.element.addEventListener('click', () => this.toggle())
    this.apply()
  }

  get codeShown(): boolean {
    return this.shown || !this.hidingAllowed
  }

  /** While the panel shows the code of a selected change itself, the host's code steps aside. */
  showCodeInPanel(active: boolean): void {
    if (this.panelShowsCode === active) {
      return
    }
    this.panelShowsCode = active
    this.apply()
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  allowHiding(allowed: boolean): void {
    this.hidingAllowed = allowed
    this.apply()
  }

  /** Something on the page needs the code, e.g. a review comment or a link to a line. */
  keepCodeShown(): void {
    this.keptShown = true
    if (!this.chosenByUser) {
      this.shown = true
    }
    this.apply()
  }

  followStart(shown: boolean): void {
    if (this.chosenByUser) {
      return
    }
    this.shown = shown || this.keptShown
    this.apply()
  }

  countReviewComments(count: number): void {
    this.hiddenCommentCount = count
    this.apply()
  }

  controls(elements: Element[]): void {
    this.controlledElements = elements
    if ('ariaControlsElements' in this.element) {
      this.element.ariaControlsElements = elements
    }
  }

  /** Also controls an element of the panel itself, which `aria-controls` can name by id. */
  alsoControls(element: HTMLElement): void {
    this.element.setAttribute('aria-controls', element.id)
    this.controls([...this.controlledElements, element])
  }

  private toggle(): void {
    this.shown = !this.shown
    this.chosenByUser = true
    this.options.toggled?.(this.shown)
    this.apply()
  }

  private apply(): void {
    this.element.hidden = !this.hidingAllowed
    this.element.setAttribute('aria-pressed', String(this.shown))
    this.showHiddenCommentCount()
    this.options.hideCode(!this.codeShown || this.panelShowsCode)
    this.listeners.forEach((listener) => listener())
  }

  private showHiddenCommentCount(): void {
    const hostCodeShown = this.codeShown && !this.panelShowsCode
    const hiddenCount = hostCodeShown ? 0 : this.hiddenCommentCount
    this.hiddenComments.hidden = hiddenCount === 0
    this.hiddenComments.textContent = hiddenCount ? String(hiddenCount) : ''
    const commentNote = hiddenCount === 1 ? '1 review comment' : `${hiddenCount} review comments`
    this.element.title = hiddenCount
      ? `Show the code under the diagram (${commentNote} hidden)`
      : 'Show the code under the diagram'
    if (hiddenCount) {
      this.element.setAttribute('aria-description', `${commentNote} hidden`)
    } else {
      this.element.removeAttribute('aria-description')
    }
  }
}
