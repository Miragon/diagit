import { BpmnModelDiffer } from '@diagit/bpmn-diff'
import type { DiagramDiff, DiagramDiffer, DiffableViewer } from '../Notation'
import { BPMN_PANEL_CSS } from './bpmnCss'
import { BpmnViewer } from './BpmnViewer'

export class BpmnDiffer implements DiagramDiffer {
  readonly css = BPMN_PANEL_CSS
  readonly showsBpmnIoLogo = true
  private readonly models = new BpmnModelDiffer()

  diff(oldXml: string, newXml: string): Promise<DiagramDiff> {
    return this.models.diff(oldXml, newXml)
  }

  createViewer(canvas: HTMLElement, xml: string): Promise<DiffableViewer> {
    return BpmnViewer.create(canvas, xml)
  }
}
