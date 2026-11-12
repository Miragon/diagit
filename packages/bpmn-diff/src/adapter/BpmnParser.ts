import { BpmnModdle } from 'bpmn-moddle'
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json' with { type: 'json' }
import type { ModdleElement } from 'bpmn-moddle'
import type { Bounds, DiffElement, ParsedModel } from '../domain/model'

export class BpmnParser {
  async parse(xml: string): Promise<ParsedModel> {
    const { rootElement } = await new BpmnModdle({ camunda: camundaModdle }).fromXML(xml)
    return this.buildModel(rootElement)
  }

  private buildModel(definitions: ModdleElement): ParsedModel {
    const model: ParsedModel = new Map()
    const diagrams: ModdleElement[] = definitions?.diagrams ?? []

    for (const diagram of diagrams) {
      const plane: ModdleElement | undefined = diagram?.plane
      if (!plane) {
        continue
      }
      this.addShapelessRoot(model, plane.bpmnElement)
      for (const di of plane.planeElement ?? []) {
        this.addDiElement(model, di)
      }
    }

    return model
  }

  private addShapelessRoot(model: ParsedModel, semantic: ModdleElement | undefined): void {
    if (!semantic?.id || model.has(semantic.id)) {
      return
    }
    model.set(semantic.id, { id: semantic.id, businessObject: semantic, isConnection: false })
  }

  private addDiElement(model: ParsedModel, di: ModdleElement): void {
    const semantic: ModdleElement | undefined = di?.bpmnElement
    if (!semantic?.id) {
      return
    }

    const waypoints = Array.isArray(di.waypoint)
      ? di.waypoint.map((point: ModdleElement) => ({ x: point.x, y: point.y }))
      : undefined
    const isConnection = di.$type === 'bpmndi:BPMNEdge' || waypoints !== undefined

    const element: DiffElement = { id: semantic.id, businessObject: semantic, isConnection }

    Object.assign(element, this.boundsOf(di))
    if (di.label?.bounds) {
      element.labelBounds = this.boundsOf(di.label)
    }
    if (waypoints) {
      element.waypoints = waypoints
    }

    model.set(semantic.id, element)
  }

  private boundsOf(di: ModdleElement): Bounds {
    const bounds: ModdleElement | undefined = di.bounds
    if (!bounds) {
      return {}
    }
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
  }
}
