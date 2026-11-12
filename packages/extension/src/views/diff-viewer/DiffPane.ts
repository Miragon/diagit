import type { DiagramDiff } from '../../notations/Notation'
import type { DiagramDiffer, DiffableViewer } from '../../notations/Notation'
import { h } from '../../platform/utils/dom'
import type { DiffNotices, DiffSide, PaneFailure } from './DiffNotices'
import { MARKER } from './markers'
import { ViewerCanvas } from './ViewerCanvas'

type ChangeCategory = keyof DiagramDiff

const CATEGORIES_MARKED_ON: Record<DiffSide, ChangeCategory[]> = {
  new: ['added', 'changed', 'moved'],
  old: ['removed', 'changed', 'moved'],
}

const SIDE_LABEL: Record<DiffSide, string> = {
  old: 'Before',
  new: 'After',
}

export class DiffPane {
  readonly element: HTMLElement
  private readonly canvas = new ViewerCanvas<DiffableViewer>()

  constructor(readonly side: DiffSide) {
    this.element = h('div', { class: 'diagit-diff-pane' }, [
      h('span', { class: 'diagit-diff-side', text: SIDE_LABEL[side] }),
      this.canvas.element,
    ])
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

  showFailure(failure: PaneFailure): void {
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

  destroy(): void {
    this.canvas.destroy()
  }
}
