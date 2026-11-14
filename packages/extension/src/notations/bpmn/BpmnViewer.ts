import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json' with { type: 'json' }
import { detectHostTheme, diagramColors } from '../../platform/utils/hostTheme'
import { fitWithPadding } from '../../platform/utils/fitWithPadding'
import { onViewboxChange } from '../../platform/utils/viewboxChange'
import { toggleZoomScroll } from '../../platform/utils/zoomScroll'
import type { DiffableViewer } from '../Notation'
import { TransactionBoundaryOverlays } from './transaction-boundaries/TransactionBoundaryOverlays'
import { dropInvalidDiColors } from './utils/diColors'

export class BpmnViewer implements DiffableViewer {
  static async create(canvas: HTMLElement, xml: string): Promise<BpmnViewer> {
    const { stroke, fill } = diagramColors(detectHostTheme(canvas))
    const viewer = new NavigatedViewer({
      container: canvas,
      bpmnRenderer: { defaultStrokeColor: stroke, defaultFillColor: fill },
      zoomScroll: { enabled: false },
      moddleExtensions: { camunda: camundaModdle },
    })
    viewer.on('import.parse.complete', ({ error, definitions }) => {
      if (!error) {
        dropInvalidDiColors(definitions)
      }
    })
    try {
      await viewer.importXML(xml)
    } catch (err) {
      viewer.destroy()
      throw err
    }
    new TransactionBoundaryOverlays(viewer).show()
    const bpmnViewer = new BpmnViewer(viewer)
    bpmnViewer.fitViewportUnlessContainerIsUnmeasured()
    return bpmnViewer
  }

  private readonly initialRoot

  private constructor(private readonly viewer: NavigatedViewer) {
    this.initialRoot = this.canvas.getRootElement()
  }

  fit(): void {
    fitWithPadding(this.canvas)
  }

  zoomBy(factor: number): void {
    this.canvas.zoom(this.canvas.zoom() * factor)
  }

  zoomLevel(): number {
    return this.canvas.zoom()
  }

  onViewChange(listener: () => void): () => void {
    return onViewboxChange(this.viewer.get('eventBus'), listener)
  }

  setInteractive(active: boolean): void {
    toggleZoomScroll(this.viewer, active)
  }

  hasElement(id: string): boolean {
    return Boolean(this.elementRegistry.get(id))
  }

  addMarker(id: string, marker: string): void {
    this.canvas.addMarker(id, marker)
  }

  removeMarker(id: string, marker: string): void {
    this.canvas.removeMarker(id, marker)
  }

  focusElement(id: string, zoom: number): void {
    const element = this.elementRegistry.get(id)
    if (!element) {
      return
    }
    this.canvas.zoom(zoom)
    this.canvas.scrollToElement(element)
  }

  resetView(): void {
    this.canvas.setRootElement(this.initialRoot)
    this.fit()
  }

  destroy(): void {
    this.viewer.destroy()
  }

  private get canvas() {
    return this.viewer.get('canvas')
  }

  private get elementRegistry() {
    return this.viewer.get('elementRegistry')
  }

  private fitViewportUnlessContainerIsUnmeasured(): void {
    try {
      this.canvas.zoom('fit-viewport')
    } catch {
      return
    }
  }
}
