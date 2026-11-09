import type NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import { transactionBoundariesOf, usesCamunda7 } from '../utils/transactionBoundaries'

const OVERLAY_TYPE = 'transaction-boundary'
const MARKER_GAP = 6

export class TransactionBoundaryOverlays {
  constructor(private readonly viewer: NavigatedViewer) {}

  show(): void {
    if (!usesCamunda7(this.viewer.getDefinitions())) return
    for (const shape of this.flowNodeShapes()) {
      const { before, after } = transactionBoundariesOf(shape.businessObject)
      if (before) this.addMarker(shape, -MARKER_GAP)
      if (after) this.addMarker(shape, shape.width + MARKER_GAP)
    }
  }

  private flowNodeShapes(): any[] {
    return this.viewer
      .get('elementRegistry')
      .filter((element: any) => !element.waypoints && element.type !== 'label')
  }

  private addMarker(shape: any, left: number): void {
    const marker = document.createElement('div')
    marker.className = 'git-diagram-transaction-boundary'
    marker.style.height = `${shape.height}px`
    this.viewer
      .get('overlays')
      .add(shape, OVERLAY_TYPE, { position: { top: 0, left }, html: marker })
  }
}
