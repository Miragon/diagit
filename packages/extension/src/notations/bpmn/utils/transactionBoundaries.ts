const CAMUNDA_7_NAMESPACE = 'http://camunda.org/schema/1.0/bpmn'

const WAIT_STATE_TYPES = new Set([
  'bpmn:UserTask',
  'bpmn:ReceiveTask',
  'bpmn:IntermediateCatchEvent',
])

export interface TransactionBoundaries {
  before: boolean
  after: boolean
}

export function usesCamunda7(definitions: { $attrs?: Record<string, string> }): boolean {
  return Object.values(definitions.$attrs ?? {}).includes(CAMUNDA_7_NAMESPACE)
}

export function transactionBoundariesOf(
  businessObject: Record<string, any>,
): TransactionBoundaries {
  const isWaitState =
    WAIT_STATE_TYPES.has(businessObject.$type) || businessObject.type === 'external'
  return {
    before: Boolean(businessObject.asyncBefore) || isWaitState,
    after: Boolean(businessObject.asyncAfter),
  }
}
