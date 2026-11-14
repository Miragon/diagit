import type { DiagramDiff } from '../../notations/Notation'
import type { DiffableViewer } from '../../notations/Notation'
import { MARKER } from './markers'

const FOCUS_ZOOM = 1.3

export class ChangeNavigator {
  private index = -1
  private activeId: string | null = null

  static forDiff(diff: DiagramDiff, viewers: (DiffableViewer | null)[]): ChangeNavigator {
    const ids = [...new Set([...diff.added, ...diff.removed, ...diff.changed, ...diff.moved])]
    return new ChangeNavigator(ids, viewers)
  }

  constructor(
    readonly ids: readonly string[],
    private readonly viewers: (DiffableViewer | null)[],
  ) {}

  get hasChanges(): boolean {
    return this.ids.length > 0
  }

  get position(): number | null {
    return this.index < 0 ? null : this.index + 1
  }

  next(): void {
    this.go(1)
  }

  previous(): void {
    this.go(-1)
  }

  showAll(): void {
    this.clearActive()
    this.index = -1
    for (const viewer of this.viewers) {
      viewer?.resetView()
    }
  }

  private go(direction: number): void {
    if (!this.hasChanges) {
      return
    }
    const from = this.index < 0 && direction < 0 ? 0 : this.index
    this.index = (from + direction + this.ids.length) % this.ids.length
    this.focus(this.ids[this.index]!)
  }

  private focus(id: string): void {
    this.clearActive()
    this.activeId = id
    for (const viewer of this.viewersShowing(id)) {
      viewer.addMarker(id, MARKER.active)
      viewer.focusElement(id, FOCUS_ZOOM)
    }
  }

  private clearActive(): void {
    if (!this.activeId) {
      return
    }
    for (const viewer of this.viewersShowing(this.activeId)) {
      viewer.removeMarker(this.activeId, MARKER.active)
    }
    this.activeId = null
  }

  private viewersShowing(id: string): DiffableViewer[] {
    return this.viewers.filter((viewer): viewer is DiffableViewer => !!viewer?.hasElement(id))
  }
}
