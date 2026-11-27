import type { ModdleElement } from 'bpmn-moddle'
import type { BpmnDocument } from './adapter/BpmnParser'
import type { DiagramDiff } from './domain/model'
import { ReferencedElements } from './domain/ReferencedElements'
import { XmlSource, type SourceLine } from './domain/XmlSource'

/** A model next to the text of its file. */
export interface BpmnFile {
  readonly document: BpmnDocument
  readonly text: string
}

export interface ElementDetail {
  id: string
  /** The moddle type, such as `bpmn:ServiceTask`. */
  type: string
  name: string | null
  /** The element's lines in the old file, `null` when it is not there (added). */
  before: SourceLine[] | null
  /** The element's lines in the new file, `null` when it is not there (removed). */
  after: SourceLine[] | null
}

/**
 * The diff of two BPMN files, which keeps both to show one element in detail: the lines of the
 * file it is written on, without the elements inside it that have a shape of their own, and
 * with the elements without a shape that it references, such as a message.
 */
export class BpmnComparison {
  private readonly referencedElements = new ReferencedElements()
  private readonly oldSource: XmlSource
  private readonly newSource: XmlSource

  constructor(
    readonly diff: DiagramDiff,
    private readonly oldFile: BpmnFile,
    private readonly newFile: BpmnFile,
  ) {
    this.oldSource = new XmlSource(oldFile.text)
    this.newSource = new XmlSource(newFile.text)
  }

  detail(id: string): ElementDetail | null {
    const businessObject = (
      this.newFile.document.model.get(id) ?? this.oldFile.document.model.get(id)
    )?.businessObject
    if (!businessObject) {
      return null
    }
    return {
      id,
      type: businessObject.$type,
      name: typeof businessObject.name === 'string' ? businessObject.name : null,
      before: this.linesOf(id, this.oldFile, this.oldSource),
      after: this.linesOf(id, this.newFile, this.newSource),
    }
  }

  private linesOf(id: string, file: BpmnFile, source: XmlSource): SourceLine[] | null {
    const businessObject = file.document.model.get(id)?.businessObject
    if (!businessObject) {
      return null
    }
    const ids = [id, ...this.referencedIdsOf(businessObject, file)]
    const lines = source.linesOf(ids, (nested) => nested !== id && file.document.model.has(nested))
    return lines.length > 0 ? lines : null
  }

  private referencedIdsOf(businessObject: ModdleElement, file: BpmnFile): string[] {
    try {
      return this.referencedElements
        .of(businessObject, file.document.model)
        .map((element) => element.id)
        .filter((referencedId): referencedId is string => typeof referencedId === 'string')
    } catch {
      return []
    }
  }
}
