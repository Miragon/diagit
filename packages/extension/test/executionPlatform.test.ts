import { describe, expect, it } from 'vitest'
import { ExecutionPlatform } from '../src/notations/bpmn/execution-platform/ExecutionPlatform'

const CAMUNDA_7 = { 'xmlns:camunda': 'http://camunda.org/schema/1.0/bpmn' }
const OPERATON = { 'xmlns:operaton': 'http://operaton.org/schema/1.0/bpmn' }
const ZEEBE = { 'xmlns:zeebe': 'http://camunda.org/schema/zeebe/1.0' }

function engineOf($attrs: Record<string, string>) {
  return ExecutionPlatform.detect({ $attrs }).engine
}

describe('ExecutionPlatform', () => {
  it.each([
    ['Camunda Platform', 'camunda7'],
    ['Camunda Cloud', 'camunda8'],
    ['Operaton', 'operaton'],
  ])('trusts the declared execution platform %s', (platform, engine) => {
    expect(engineOf({ ...CAMUNDA_7, 'modeler:executionPlatform': platform })).toBe(engine)
  })

  it('falls back to the Camunda 7 namespace', () => {
    expect(engineOf(CAMUNDA_7)).toBe('camunda7')
  })

  it('falls back to the Operaton namespace', () => {
    expect(engineOf(OPERATON)).toBe('operaton')
  })

  it('falls back to the namespaces for an unknown declared platform', () => {
    expect(engineOf({ ...OPERATON, 'modeler:executionPlatform': 'Other' })).toBe('operaton')
  })

  it('knows no engine for a model without engine namespaces', () => {
    expect(engineOf(ZEEBE)).toBe('unknown')
  })

  it('has transaction boundaries only on Camunda 7 and Operaton', () => {
    expect(ExecutionPlatform.detect({ $attrs: CAMUNDA_7 }).hasTransactionBoundaries).toBe(true)
    expect(ExecutionPlatform.detect({ $attrs: OPERATON }).hasTransactionBoundaries).toBe(true)
    expect(ExecutionPlatform.detect({ $attrs: ZEEBE }).hasTransactionBoundaries).toBe(false)
  })

  it('reads Operaton attributes under the prefix the model declares', () => {
    const platform = ExecutionPlatform.detect({
      $attrs: { 'xmlns:op': 'http://operaton.org/schema/1.0/bpmn' },
    })
    expect(
      platform.extensionAttribute({ $attrs: { 'op:asyncBefore': 'true' } }, 'asyncBefore'),
    ).toBe('true')
  })
})
