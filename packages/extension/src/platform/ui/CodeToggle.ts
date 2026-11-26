import { CodeXml } from 'lucide'
import { h } from '../utils/dom'
import { lucideIcon } from '../utils/lucideIcon'

export interface CodeToggleOptions {
  shown: boolean
  hideCode(hidden: boolean): void
  toggled?(shown: boolean): void
}

/**
 * The Code button of a panel toolbar: shows or hides the host's code under the panel. The code
 * stays shown while hiding is not allowed, e.g. while the panel shows an error instead of a
 * diagram.
 */
export class CodeToggle {
  readonly element = h(
    'button',
    {
      class: 'btn btn-toggle diagit-code-toggle',
      type: 'button',
      title: 'Show the code under the diagram',
    },
    [lucideIcon(CodeXml), 'Code'],
  )
  private shown: boolean
  private hidingAllowed = true

  constructor(private readonly options: CodeToggleOptions) {
    this.shown = options.shown
    this.element.addEventListener('click', () => this.toggle())
    this.apply()
  }

  get codeShown(): boolean {
    return this.shown || !this.hidingAllowed
  }

  allowHiding(allowed: boolean): void {
    this.hidingAllowed = allowed
    this.apply()
  }

  controls(elements: Element[]): void {
    if ('ariaControlsElements' in this.element) {
      this.element.ariaControlsElements = elements
    }
  }

  private toggle(): void {
    this.shown = !this.shown
    this.options.toggled?.(this.shown)
    this.apply()
  }

  private apply(): void {
    this.element.hidden = !this.hidingAllowed
    this.element.setAttribute('aria-pressed', String(this.shown))
    this.options.hideCode(!this.codeShown)
  }
}
