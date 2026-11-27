import type { DiagramDiff } from '../../notations/Notation'
import { ChevronLeft, ChevronRight, type IconNode } from 'lucide'
import { h } from '../../platform/utils/dom'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import type { ChangeNavigator } from './ChangeNavigator'

type ChangeCategory = keyof DiagramDiff

const LEGEND_LABEL: Record<ChangeCategory, string> = {
  added: 'Added',
  removed: 'Removed',
  changed: 'Changed',
  moved: 'Moved',
}

interface NavigationListener {
  steppedToChange(id: string): void
  showedAll(): void
}

export class ChangeControls {
  readonly element = h('div', { class: 'diagit-diff-changes' })
  private navigator: ChangeNavigator | null = null
  private showAllChanges: (() => void) | null = null

  constructor(private readonly navigation: NavigationListener) {}

  get selectedId(): string | null {
    return this.navigator?.selectedId ?? null
  }

  /** Clears the selected change, like Show all; does nothing while none is selected. */
  showAll(): void {
    if (this.selectedId !== null) {
      this.showAllChanges?.()
    }
  }

  showDiff(diff: DiagramDiff, navigator: ChangeNavigator): void {
    this.releaseNavigator()
    this.navigator = navigator
    const position = h('span', {
      class: 'diagit-btn-group-position diagit-diff-position diagit-diff-total',
      'aria-live': 'polite',
      text: this.totalText(navigator.ids.length),
    })
    const step = (move: () => void) => () => {
      move()
      position.textContent = navigator.position
        ? `${navigator.position} of ${navigator.ids.length}`
        : this.totalText(navigator.ids.length)
      const selected = navigator.selectedId
      if (selected === null) {
        this.navigation.showedAll()
      } else {
        this.navigation.steppedToChange(selected)
      }
    }
    const previous = this.iconButton(
      'Previous change',
      ChevronLeft,
      step(() => navigator.previous()),
    )
    const next = this.iconButton(
      'Next change',
      ChevronRight,
      step(() => navigator.next()),
    )
    this.showAllChanges = step(() => navigator.showAll())
    previous.disabled = !navigator.hasChanges
    next.disabled = !navigator.hasChanges
    this.element.replaceChildren(
      this.legend(diff),
      h(
        'div',
        {
          class: 'diagit-btn-group diagit-toolbar-end diagit-diff-nav',
          role: 'group',
          'aria-label': 'Changes',
        },
        [
          position,
          previous,
          next,
          h('span', { class: 'diagit-diff-nav-separator', 'aria-hidden': 'true', text: '·' }),
          h('button', {
            class: 'btn btn-ghost',
            type: 'button',
            text: 'Show all',
            onClick: this.showAllChanges,
          }),
        ],
      ),
    )
  }

  showLoading(): void {
    this.releaseNavigator()
    this.element.replaceChildren(
      h(
        'div',
        { class: 'diagit-diff-legend-placeholder', 'aria-hidden': 'true' },
        Array.from({ length: 4 }, () => h('span', { class: 'diagit-skeleton' })),
      ),
    )
  }

  clear(): void {
    this.releaseNavigator()
    this.element.replaceChildren()
  }

  showDiffUnavailable(): void {
    this.releaseNavigator()
    this.element.replaceChildren(
      h('span', { class: 'diagit-diff-legend', text: 'Changes could not be computed' }),
    )
  }

  private releaseNavigator(): void {
    this.navigator?.release()
    this.navigator = null
    this.showAllChanges = null
  }

  private legend(diff: DiagramDiff): HTMLElement {
    const counts = (Object.keys(LEGEND_LABEL) as ChangeCategory[])
      .filter((category) => diff[category].length > 0)
      .map((category) => ({ category, text: `${LEGEND_LABEL[category]} ${diff[category].length}` }))
    const fullLegend = counts.map(({ text }) => text).join(', ')
    return h(
      'div',
      { class: 'diagit-diff-legend', title: fullLegend },
      counts.map(({ category, text }) =>
        h('span', { class: 'diagit-legend-chip' }, [
          h('i', { class: 'diagit-swatch', 'data-change': category }),
          text,
        ]),
      ),
    )
  }

  private totalText(total: number): string {
    if (total === 0) {
      return 'No changes'
    }
    return total === 1 ? '1 change' : `${total} changes`
  }

  private iconButton(label: string, icon: IconNode, onClick: () => void): HTMLButtonElement {
    return h(
      'button',
      { class: 'btn btn-icon', type: 'button', title: label, 'aria-label': label, onClick },
      [lucideIcon(icon)],
    )
  }
}
