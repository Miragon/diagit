import { BpmnModelDiffer, type ElementDetail } from '@diagit/bpmn-diff'
import type { ChangeDetail, DiagramComparison, DiagramDiffer, DiffableViewer } from '../Notation'
import { BPMN_PANEL_CSS } from './bpmnCss'
import { BpmnViewer } from './BpmnViewer'

const TYPE_PREFIX = /^[^:]*:/
const WORD_START = /(?<=[a-z])(?=[A-Z])/

export class BpmnDiffer implements DiagramDiffer {
  readonly css = BPMN_PANEL_CSS
  readonly showsBpmnIoLogo = true
  private readonly models = new BpmnModelDiffer()

  async compare(oldXml: string, newXml: string): Promise<DiagramComparison> {
    const comparison = await this.models.compare(oldXml, newXml)
    return {
      diff: comparison.diff,
      detail: (id) => {
        const detail = comparison.detail(id)
        return detail ? this.changeDetail(detail) : null
      },
    }
  }

  createViewer(canvas: HTMLElement, xml: string): Promise<DiffableViewer> {
    return BpmnViewer.create(canvas, xml)
  }

  private changeDetail({ type, name, before, after }: ElementDetail): ChangeDetail {
    return { typeLabel: this.typeLabel(type), name, before, after }
  }

  /** `bpmn:ServiceTask` → "Service task". */
  private typeLabel(type: string): string {
    const words = type.replace(TYPE_PREFIX, '').split(WORD_START)
    const label = words.join(' ').toLowerCase()
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
}
