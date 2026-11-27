import { BpmnParser } from './adapter/BpmnParser'
import { BpmnComparison } from './BpmnComparison'
import { ModelComparator } from './domain/ModelComparator'
import type { DiagramDiff } from './domain/model'

export class BpmnModelDiffer {
  private readonly parser = new BpmnParser()
  private readonly comparator = new ModelComparator()

  async diff(oldXml: string, newXml: string): Promise<DiagramDiff> {
    return (await this.compare(oldXml, newXml)).diff
  }

  async compare(oldXml: string, newXml: string): Promise<BpmnComparison> {
    const [oldModel, newModel] = await Promise.all([
      this.parser.parse(oldXml),
      this.parser.parse(newXml),
    ])
    const diff = this.comparator.compare(oldModel, newModel)
    return new BpmnComparison(
      diff,
      { model: oldModel, text: oldXml },
      { model: newModel, text: newXml },
    )
  }
}
