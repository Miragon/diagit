import type { DiagramDiff } from '../../notations/Notation'
import { h } from '../../platform/utils/dom'
import type { ChangeNavigator } from './ChangeNavigator'

type ChangeCategory = keyof DiagramDiff

const LEGEND: Record<ChangeCategory, { className: string; label: string }> = {
  added: { className: 'k-add', label: 'Added' },
  removed: { className: 'k-rem', label: 'Removed' },
  changed: { className: 'k-chg', label: 'Changed' },
  moved: { className: 'k-mov', label: 'Moved' },
}

export class ChangeControls {
  readonly element = h('div', { class: 'diagit-diff-changes' })

  showDiff(diff: DiagramDiff, navigator: ChangeNavigator): void {
    const position = h('span', { class: 'diagit-diff-position', 'aria-live': 'polite' })
    const showPosition = () => {
      position.textContent = this.positionText(navigator)
    }
    const button = (text: string, move: () => void) =>
      this.navButton(text, () => {
        move()
        showPosition()
      })
    const previous = button('Prev', () => navigator.previous())
    const next = button('Next', () => navigator.next())
    previous.disabled = !navigator.hasChanges
    next.disabled = !navigator.hasChanges
    showPosition()
    this.element.replaceChildren(
      this.legend(diff),
      h('div', { class: 'diagit-diff-nav', role: 'group', 'aria-label': 'Changes' }, [
        previous,
        next,
        button('All', () => navigator.showAll()),
        position,
      ]),
    )
  }

  showDiffUnavailable(): void {
    this.element.replaceChildren(
      h('span', { class: 'diagit-diff-legend', text: 'Changes could not be computed' }),
    )
  }

  private legend(diff: DiagramDiff): HTMLElement {
    const keys = (Object.keys(LEGEND) as ChangeCategory[]).map((category) => {
      const { className, label } = LEGEND[category]
      return h('span', { class: `k ${className}`, text: `${label}: ${diff[category].length}` })
    })
    return h('div', { class: 'diagit-diff-legend' }, keys)
  }

  private positionText({ position, ids }: ChangeNavigator): string {
    if (position) return `${position} of ${ids.length}`
    if (ids.length === 0) return 'No changes'
    return ids.length === 1 ? '1 change' : `${ids.length} changes`
  }

  private navButton(text: string, onClick: () => void): HTMLButtonElement {
    return h('button', { class: 'btn btn-secondary btn-small', type: 'button', text, onClick })
  }
}
