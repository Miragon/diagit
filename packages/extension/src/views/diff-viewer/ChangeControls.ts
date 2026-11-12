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

export class ChangeControls {
  readonly element = h('div', { class: 'diagit-diff-changes' })

  showDiff(diff: DiagramDiff, navigator: ChangeNavigator): void {
    const position = h('span', {
      class: 'diagit-btn-group-position diagit-diff-position',
      'aria-live': 'polite',
    })
    const step = (move: () => void) => () => {
      move()
      position.textContent = navigator.position
        ? `${navigator.position} of ${navigator.ids.length}`
        : ''
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
    previous.disabled = !navigator.hasChanges
    next.disabled = !navigator.hasChanges
    this.element.replaceChildren(
      this.legend(diff, navigator.ids.length),
      h(
        'div',
        {
          class: 'diagit-btn-group diagit-toolbar-end diagit-diff-nav',
          role: 'group',
          'aria-label': 'Changes',
        },
        [
          previous,
          next,
          position,
          h('span', { class: 'diagit-diff-nav-separator', 'aria-hidden': 'true', text: '·' }),
          h('button', {
            class: 'btn btn-ghost',
            type: 'button',
            text: 'Show all',
            onClick: step(() => navigator.showAll()),
          }),
        ],
      ),
    )
  }

  showDiffUnavailable(): void {
    this.element.replaceChildren(
      h('span', { class: 'diagit-diff-legend', text: 'Changes could not be computed' }),
    )
  }

  private legend(diff: DiagramDiff, total: number): HTMLElement {
    const chips = (Object.keys(LEGEND_LABEL) as ChangeCategory[])
      .filter((category) => diff[category].length > 0)
      .map((category) =>
        h('span', { class: 'diagit-legend-chip' }, [
          h('i', { class: 'diagit-swatch', 'data-change': category }),
          `${LEGEND_LABEL[category]} ${diff[category].length}`,
        ]),
      )
    return h('div', { class: 'diagit-diff-legend' }, [
      ...chips,
      h('span', { class: 'diagit-diff-total', text: this.totalText(total) }),
    ])
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
