import { BpmnModdle } from 'bpmn-moddle'
import { describe, expect, it } from 'vitest'
import { ExecutionPlatform } from '../src/notations/bpmn/execution-platform/ExecutionPlatform'
import { camundaModdleFor } from '../src/notations/bpmn/utils/camundaModdle'

const CAMUNDA_7 = 'xmlns:camunda="http://camunda.org/schema/1.0/bpmn"'
const OPERATON = 'xmlns:operaton="http://operaton.org/schema/1.0/bpmn"'

async function parse(definitionsAttributes: string, taskAttributes: string) {
  const xml = `<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" ${definitionsAttributes} id="d">
    <process id="p"><serviceTask id="task" ${taskAttributes} /></process>
  </definitions>`
  const moddle = new BpmnModdle({ camunda: camundaModdleFor(xml) } as any)
  const definitions = (await moddle.fromXML(xml)).rootElement as any
  return {
    platform: ExecutionPlatform.detect(definitions),
    task: definitions.rootElements[0].flowElements[0],
  }
}

describe('camundaModdleFor', () => {
  it('reads Camunda 7 async continuations and external tasks', async () => {
    const { platform, task } = await parse(
      CAMUNDA_7,
      'camunda:asyncBefore="true" camunda:asyncAfter="true" camunda:type="external"',
    )
    expect(platform.hasTransactionBoundaries).toBe(true)
    expect(task).toMatchObject({ asyncBefore: true, asyncAfter: true, type: 'external' })
  })

  it('reads Operaton attributes as the Camunda 7 properties they fork', async () => {
    const { platform, task } = await parse(
      OPERATON,
      'operaton:asyncAfter="true" operaton:asyncBefore="false" operaton:type="external"',
    )
    expect(platform.hasTransactionBoundaries).toBe(true)
    expect(task).toMatchObject({ asyncBefore: false, asyncAfter: true, type: 'external' })
  })

  it('keeps the Camunda 7 namespace when a model declares both', async () => {
    const { task } = await parse(`${CAMUNDA_7} ${OPERATON}`, 'camunda:asyncBefore="true"')
    expect(task.asyncBefore).toBe(true)
  })

  it('shows none for a Camunda 8 model that still declares the camunda namespace', async () => {
    const { platform } = await parse(
      `${CAMUNDA_7} xmlns:modeler="http://camunda.org/schema/modeler/1.0" modeler:executionPlatform="Camunda Cloud"`,
      'camunda:asyncBefore="true"',
    )
    expect(platform.hasTransactionBoundaries).toBe(false)
  })
})
