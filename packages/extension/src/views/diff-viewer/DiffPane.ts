import type { DiagramDiff } from '../../notations/Notation'
import type { DiagramDiffer, DiffableViewer } from '../../notations/Notation'
import { Maximize, Maximize2 } from 'lucide'
import { h } from '../../platform/utils/dom'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import type { NoticeDetails } from '../../platform/ui/Notice'
import type { LargerView } from '../../platform/ui/ZoomControls'
import type { DiffNotices, DiffSide } from './DiffNotices'
import { MARKER } from './markers'
import { SIDE_LABEL } from './sides'
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
    const marked = CATEGORIES_MARKED_ON[this.side]
    const keep = (category: ChangeCategory) => (marked.includes(category) ? diff[category] : [])
    return {
      added: keep('added'),
      removed: keep('removed'),
      changed: keep('changed'),
      moved: keep('moved'),
    }
  }

  destroy(): void {
    this.canvas.destroy()
  }
}
