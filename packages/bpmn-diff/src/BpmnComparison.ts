import type { ModdleElement, DiagramDiff, ParsedModel } from './domain/model'
import { ReferencedElements } from './domain/ReferencedElements'
import { XmlSource, type SourceLine } from './adapter/XmlSource'

/** A parsed model next to the text of its file. */
export interface BpmnFile {
  readonly model: ParsedModel
  readonly text: string
}

export interface ElementDetail {
  /** The moddle type, such as `bpmn:ServiceTask`. */
  readonly type: string
  readonly name: string | null
  /** The element's lines in the old file, `null` when it is not there (added). */
  readonly before: readonly SourceLine[] | null
  /** The element's lines in the new file, `null` when it is not there (removed). */
  readonly after: readonly SourceLine[] | null
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
    const businessObject = (this.newFile.model.get(id) ?? this.oldFile.model.get(id))
      ?.businessObject
    if (!businessObject) {
      return null
    }
    return {
      type: businessObject.$type,
      name: typeof businessObject.name === 'string' ? businessObject.name : null,
      before: this.linesOf(id, this.oldFile, this.oldSource),
      after: this.linesOf(id, this.newFile, this.newSource),
    }
  }

  private linesOf(id: string, file: BpmnFile, source: XmlSource): SourceLine[] | null {
    const businessObject = file.model.get(id)?.businessObject
    if (!businessObject) {
      return null
    }
    const ids = [id, ...this.referencedIdsOf(businessObject, file.model)]
    const lines = source.linesOf(ids, (nested) => nested !== id && file.model.has(nested))
    return lines.length > 0 ? lines : null
  }

  private referencedIdsOf(businessObject: ModdleElement, model: ParsedModel): string[] {
    return this.referencedElements
      .of(businessObject, model)
      .map((element) => element.id)
      .filter((referencedId): referencedId is string => typeof referencedId === 'string')
  }
}
