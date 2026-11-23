import type { NotationDescriptor } from '../NotationDescriptor'

export const BPMN: NotationDescriptor = {
  id: 'bpmn',
  label: 'BPMN',
  extensions: ['bpmn'],
  diffable: true,
  showsBpmnIoLogo: true,
}
