import diagramCss from 'bpmn-js/dist/assets/diagram-js.css?inline'
import bpmnCss from 'bpmn-js/dist/assets/bpmn-js.css?inline'
import bpmnFontCss from 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css?inline'
import viewerCss from '../../platform/ui/viewer.css?inline'
import transactionBoundariesCss from './transaction-boundaries/transactionBoundaries.css?inline'

export const BPMN_ASSET_CSS = [diagramCss, bpmnCss, bpmnFontCss, transactionBoundariesCss].join(
  '\n',
)
export const BPMN_PANEL_CSS = [BPMN_ASSET_CSS, viewerCss].join('\n')
