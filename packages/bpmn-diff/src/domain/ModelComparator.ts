import type { Bounds, DiagramDiff, DiffElement, ParsedModel } from './model'
import { SemanticSignature } from './SemanticSignature'

export class ModelComparator {
  private readonly signature = new SemanticSignature()

  compare(oldModel: ParsedModel, newModel: ParsedModel): DiagramDiff {
    const diff: DiagramDiff = { added: [], removed: [], changed: [], moved: [] }

    newModel.forEach((element, id) => {
      const old = oldModel.get(id)
      if (!old) {
        diff.added.push(id)
      } else if (this.semanticChanged(old, oldModel, element, newModel)) {
        diff.changed.push(id)
      } else if (this.layoutChanged(old, element)) {
        diff.moved.push(id)
      }
    })

    oldModel.forEach((_element, id) => {
      if (!newModel.has(id)) {
        diff.removed.push(id)
      }
    })

    return diff
  }

  private semanticChanged(
    old: DiffElement,
    oldModel: ParsedModel,
    element: DiffElement,
    newModel: ParsedModel,
  ): boolean {
    return (
      this.signature.of(old.businessObject, oldModel) !==
      this.signature.of(element.businessObject, newModel)
    )
  }

  private layoutChanged(a: DiffElement, b: DiffElement): boolean {
    if (this.boundsChanged(a, b) || this.boundsChanged(a.labelBounds, b.labelBounds)) {
      return true
    }
    return this.waypointSignature(a.waypoints) !== this.waypointSignature(b.waypoints)
  }

  private boundsChanged(a: Bounds | undefined, b: Bounds | undefined): boolean {
    return a?.x !== b?.x || a?.y !== b?.y || a?.width !== b?.width || a?.height !== b?.height
  }

  private waypointSignature(points: DiffElement['waypoints']): string {
    if (!points) {
      return ''
    }
    return JSON.stringify(points.map((point) => [point.x, point.y]))
  }
}
