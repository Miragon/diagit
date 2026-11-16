import type { ExecutionPlatform } from '../execution-platform/ExecutionPlatform'

const WAIT_STATE_TYPES = new Set([
  'bpmn:UserTask',
  'bpmn:ReceiveTask',
  'bpmn:IntermediateCatchEvent',
])

export interface TransactionBoundary {
  before: boolean
  after: boolean
}

export class TransactionBoundaries {
  constructor(private readonly platform: ExecutionPlatform) {}

  of(businessObject: Record<string, any>): TransactionBoundary {
    return {
      before: this.isAsync(businessObject, 'asyncBefore') || this.isWaitState(businessObject),
      after: this.isAsync(businessObject, 'asyncAfter'),
    }
  }

  private isWaitState(businessObject: Record<string, any>): boolean {
    return (
      WAIT_STATE_TYPES.has(businessObject.$type) ||
      this.platform.extensionAttribute(businessObject, 'type') === 'external'
    )
  }

  private isAsync(businessObject: Record<string, any>, name: string): boolean {
    const value = this.platform.extensionAttribute(businessObject, name)
    return value === true || value === 'true'
  }
}
