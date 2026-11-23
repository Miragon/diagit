import type { DiagramDiff } from '../../notations/Notation'
import type { DiagramDiffer, DiffableViewer } from '../../notations/Notation'
import { Maximize, Maximize2 } from 'lucide'
import { h } from '../../platform/utils/dom'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import type { NoticeDetails } from '../../platform/ui/Notice'
import type { LargerView } from '../../platform/ui/ZoomControls'
import type { DiffNotices } from './DiffNotices'
import { MARKER } from './markers'
import { SIDE_LABEL, type DiffSide } from './sides'
import { ViewerCanvas } from './ViewerCanvas'

type ChangeCategory = keyof DiagramDiff

const CATEGORIES_MARKED_ON: Record<DiffSide, ChangeCategory[]> = {
  new: ['added', 'changed', 'moved'],
  old: ['removed', 'changed', 'moved'],
}

export class DiffPane {
  readonly element: HTMLElement
  private readonly canvas = new ViewerCanvas<DiffableViewer>()

  constructor(readonly side: DiffSide) {
    this.element = h('div', { class: 'diagit-diff-pane' }, [
      h('span', { class: 'diagit-pane-label', text: SIDE_LABEL[side] }),
      this.canvas.element,
    ])
  }

  get viewer(): DiffableViewer | null {
    return this.canvas.viewer
  }

  get shown(): boolean {
    return !this.element.hidden
  }

  set shown(visible: boolean) {
    this.element.hidden = !visible
  }

  offerEnlarging(view: LargerView, onEnlarge: () => void): void {
    const name = SIDE_LABEL[this.side]
    const label = view === 'expanded' ? `Expand ${name}` : `${name} in full screen`
    this.element.append(
      h(
        'button',
        {
          class: 'btn btn-icon diagit-pane-enlarge',
          type: 'button',
          title: label,
          'aria-label': label,
          onClick: onEnlarge,
        },
        [lucideIcon(view === 'expanded' ? Maximize2 : Maximize)],
      ),
    )
  }

  render(differ: DiagramDiffer, xml: string | null, emptyLabel: string, notices: DiffNotices) {
    return this.canvas.render(
      (canvas, source) => differ.createViewer(canvas, source),
      xml,
      emptyLabel,
      (err) => notices.notRendered(this.side, err),
    )
  }

  showFailure(failure: NoticeDetails): void {
    this.canvas.showFailure(failure)
  }

  reveal(): void {
    this.canvas.reveal()
  }

  showDiff(diff: DiagramDiff): void {
    for (const category of CATEGORIES_MARKED_ON[this.side]) {
      for (const id of diff[category]) {
        if (this.viewer?.hasElement(id)) {
          this.viewer.addMarker(id, MARKER[category])
        }
      }
    }
  }

  changesOn(diff: DiagramDiff): DiagramDiff {
    const changes = { ...diff }
    for (const category of Object.keys(changes) as ChangeCategory[]) {
      if (!CATEGORIES_MARKED_ON[this.side].includes(category)) {
        changes[category] = []
      }
    }
    return changes
  }

  destroy(): void {
    this.canvas.destroy()
  }
}
