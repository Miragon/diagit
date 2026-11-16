import { BpmnModdle } from 'bpmn-moddle'
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json' with { type: 'json' }
import { describe, expect, it } from 'vitest'
import { ExecutionPlatform } from '../src/notations/bpmn/execution-platform/ExecutionPlatform'
import { TransactionBoundaries } from '../src/notations/bpmn/transaction-boundaries/TransactionBoundaries'

const CAMUNDA_7 = ExecutionPlatform.detect({
  $attrs: { 'xmlns:camunda': 'http://camunda.org/schema/1.0/bpmn' },
})

async function parse(definitionsAttributes: string, taskAttributes: string) {
  const xml = `<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" ${definitionsAttributes} id="d">
    <process id="p"><serviceTask id="task" ${taskAttributes} /></process>
  </definitions>`
  const { rootElement } = await new BpmnModdle({ camunda: camundaModdle } as any).fromXML(xml)
  const definitions = rootElement as any
  const platform = ExecutionPlatform.detect(definitions)
  return { platform, task: definitions.rootElements[0].flowElements[0] }
}

describe('TransactionBoundaries', () => {
  it('reads explicit async continuations', () => {
    const task = { $type: 'bpmn:ServiceTask', asyncBefore: true, asyncAfter: true }
    expect(new TransactionBoundaries(CAMUNDA_7).of(task)).toEqual({ before: true, after: true })
  })

  it.each([
    { $type: 'bpmn:UserTask' },
    { $type: 'bpmn:ReceiveTask' },
    { $type: 'bpmn:IntermediateCatchEvent' },
    { $type: 'bpmn:ServiceTask', type: 'external' },
  ])('treats the wait state $type as a boundary before the element', (waitState) => {
    expect(new TransactionBoundaries(CAMUNDA_7).of(waitState)).toEqual({
      before: true,
      after: false,
    })
  })

  it('reports no boundary for a synchronous task', () => {
    expect(new TransactionBoundaries(CAMUNDA_7).of({ $type: 'bpmn:ServiceTask' })).toEqual({
      before: false,
      after: false,
    })
  })

  it('reads async continuations and external tasks of an Operaton model', async () => {
    const { platform, task } = await parse(
      'xmlns:operaton="http://operaton.org/schema/1.0/bpmn"',
      'operaton:asyncAfter="true" operaton:asyncBefore="false" operaton:type="external"',
    )
    expect(platform.hasTransactionBoundaries).toBe(true)
    expect(new TransactionBoundaries(platform).of(task)).toEqual({ before: true, after: true })
  })

  it('shows none for a Camunda 8 model that still declares the camunda namespace', async () => {
    const { platform } = await parse(
      'xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:modeler="http://camunda.org/schema/modeler/1.0" modeler:executionPlatform="Camunda Cloud"',
      'camunda:asyncBefore="true"',
    )
    expect(platform.hasTransactionBoundaries).toBe(false)
  })

  it('reads a Camunda 7 model without a declared execution platform', async () => {
    const { platform, task } = await parse(
      'xmlns:camunda="http://camunda.org/schema/1.0/bpmn"',
      'camunda:asyncBefore="true"',
    )
    expect(platform.hasTransactionBoundaries).toBe(true)
    expect(new TransactionBoundaries(platform).of(task)).toEqual({ before: true, after: false })
  })
})
