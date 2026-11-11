import type { DiagramDiff } from '../../notations/Notation'
import type { DiagramDiffer, DiffableViewer } from '../../notations/Notation'
import type { ErrorNoticeDetails } from '../../platform/ui/ErrorNotice'
import { h } from '../../platform/utils/dom'
import type { ChangeNavigator } from './ChangeNavigator'
import type { DiffNotices, DiffSide } from './DiffNotices'
import { MARKER } from './markers'
import { ViewerCanvas } from './ViewerCanvas'

type ChangeCategory = keyof DiagramDiff

const CATEGORIES_MARKED_ON: Record<DiffSide, ChangeCategory[]> = {
  new: ['added', 'changed', 'moved'],
  old: ['removed', 'changed', 'moved'],
}

const LEGEND: Record<ChangeCategory, { className: string; label: string }> = {
  added: { className: 'k-add', label: 'Added' },
  removed: { className: 'k-rem', label: 'Removed' },
  changed: { className: 'k-chg', label: 'Changed' },
  moved: { className: 'k-mov', label: 'Moved' },
}

export class DiffPane {
  readonly element: HTMLElement
  private readonly canvas = new ViewerCanvas<DiffableViewer>()
  private readonly legendKeys: Record<ChangeCategory, HTMLElement>
  private readonly legend: HTMLElement
  private readonly previousButton = this.navButton('Prev')
  private readonly nextButton = this.navButton('Next')
  private readonly allButton = this.navButton('All')
  private readonly navigation = h('div', { class: 'diagit-diff-nav' }, [
    this.previousButton,
    this.nextButton,
    this.allButton,
  ])

  constructor(readonly side: DiffSide) {
    this.legendKeys = {
      added: this.legendKey('added'),
      removed: this.legendKey('removed'),
      changed: this.legendKey('changed'),
      moved: this.legendKey('moved'),
    }
    this.legend = h('div', { class: 'diagit-diff-legend' }, Object.values(this.legendKeys))
    const overlay = h('div', { class: 'diagit-diff-overlay' }, [this.legend, this.navigation])
    this.element = h('div', { class: 'diagit-diff-pane' }, [overlay, this.canvas.element])
  }

  get viewer(): DiffableViewer | null {
    return this.canvas.viewer
  }

  render(differ: DiagramDiffer, xml: string | null, emptyLabel: string, notices: DiffNotices) {
    return this.canvas.render(
      (canvas, source) => differ.createViewer(canvas, source),
      xml,
      emptyLabel,
      notices,
    )
  }

  showError(details: ErrorNoticeDetails): void {
    this.canvas.showError(details)
  }

  showDiff(diff: DiagramDiff): void {
    for (const category of CATEGORIES_MARKED_ON[this.side]) {
      for (const id of diff[category]) {
        if (this.viewer?.hasElement(id)) this.viewer.addMarker(id, MARKER[category])
      }
    }
    for (const category of Object.keys(LEGEND) as ChangeCategory[]) {
      this.legendKeys[category].textContent = `${LEGEND[category].label}: ${diff[category].length}`
    }
  }

  showDiffUnavailable(): void {
    this.legend.replaceChildren(h('span', { text: 'Changes could not be computed' }))
    this.navigation.remove()
  }

  bind(navigator: ChangeNavigator): void {
    this.previousButton.addEventListener('click', () => navigator.previous())
    this.nextButton.addEventListener('click', () => navigator.next())
    this.allButton.addEventListener('click', () => navigator.showAll())
    this.previousButton.disabled = !navigator.hasChanges
    this.nextButton.disabled = !navigator.hasChanges
  }

  destroy(): void {
    this.canvas.destroy()
  }

  private legendKey(category: ChangeCategory): HTMLElement {
    const { className, label } = LEGEND[category]
    return h('span', { class: `k ${className}`, text: `${label}: 0` })
  }

  private navButton(text: string): HTMLButtonElement {
    return h('button', { class: 'btn btn-secondary btn-small', type: 'button', text })
  }
}
