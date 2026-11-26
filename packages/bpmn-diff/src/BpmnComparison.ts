import type { BpmnDocument } from './adapter/BpmnParser'
import { ElementXmlWriter } from './adapter/ElementXmlWriter'
import type { DiagramDiff } from './domain/model'

export interface ElementDetail {
  id: string
  /** The moddle type, such as `bpmn:ServiceTask`. */
  type: string
  name: string | null
  /** The element's XML in the old model, `null` when it is not there (added). */
  before: string | null
  /** The element's XML in the new model, `null` when it is not there (removed). */
  after: string | null
}

/** The diff of two BPMN models, which keeps both models to show one element in detail. */
export class BpmnComparison {
  private readonly beforeXml: ElementXmlWriter
  private readonly afterXml: ElementXmlWriter

  constructor(
    readonly diff: DiagramDiff,
    private readonly oldDocument: BpmnDocument,
    private readonly newDocument: BpmnDocument,
  ) {
    this.beforeXml = new ElementXmlWriter(oldDocument)
    this.afterXml = new ElementXmlWriter(newDocument)
  }

  detail(id: string): ElementDetail | null {
    const businessObject = (this.newDocument.model.get(id) ?? this.oldDocument.model.get(id))
      ?.businessObject
    if (!businessObject) {
      return null
    }
    return {
      id,
      type: businessObject.$type,
      name: typeof businessObject.name === 'string' ? businessObject.name : null,
      before: this.beforeXml.write(id),
      after: this.afterXml.write(id),
    }
  }
}
