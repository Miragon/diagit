import type { DiagramDiff, DiffableViewer } from '../../notations/Notation'
import type { LargerView, PanelView } from '../../platform/ui/ZoomControls'
import { DiffPane } from './DiffPane'
import { SideSwitch } from './SideSwitch'
import type { DiffSide, ShownSides } from './sides'

export class DiffSides {
  readonly oldPane = new DiffPane('old')
  readonly newPane = new DiffPane('new')
  private readonly sideSwitch = new SideSwitch((side) => this.pick(side))
  readonly elements: HTMLElement[] = [
    this.oldPane.element,
    this.newPane.element,
    this.sideSwitch.element,
  ]
  private shown: ShownSides = 'both'
  private requested: DiffSide | null = null

  constructor(private readonly onChange: () => void) {}

  get panes(): DiffPane[] {
    return [this.oldPane, this.newPane]
  }

  get shownPanes(): DiffPane[] {
    return this.panes.filter((pane) => pane.shown)
  }

  get leadingViewer(): DiffableViewer | null {
    return [this.newPane, this.oldPane].find((pane) => pane.shown && pane.viewer)?.viewer ?? null
  }

  offerEnlarging(view: LargerView, enlarge: () => Promise<boolean>): void {
    for (const pane of this.panes) {
      pane.offerEnlarging(view, () => void this.enlargeWith(pane.side, enlarge))
    }
  }

  followPanelView(view: PanelView): void {
    if (view === 'inline') {
      this.requested = null
      this.show('both')
      return
    }
    if (this.requested) {
      const side = this.requested
      this.requested = null
      this.show(side)
      this.sideSwitch.focus(side)
    }
  }

  changesShown(diff: DiagramDiff): DiagramDiff {
    return this.shown === 'both' ? diff : this.paneOf(this.shown).changesOn(diff)
  }

  private async enlargeWith(side: DiffSide, enlarge: () => Promise<boolean>): Promise<void> {
    this.requested = side
    if (!(await enlarge())) {
      this.requested = null
    }
  }

  private pick(side: DiffSide): void {
    this.show(this.shown === side ? 'both' : side)
  }

  private show(sides: ShownSides): void {
    if (sides === this.shown) {
      return
    }
    this.shown = sides
    this.oldPane.shown = sides !== 'new'
    this.newPane.shown = sides !== 'old'
    this.sideSwitch.show(sides)
    this.onChange()
  }

  private paneOf(side: DiffSide): DiffPane {
    return side === 'old' ? this.oldPane : this.newPane
  }
}
