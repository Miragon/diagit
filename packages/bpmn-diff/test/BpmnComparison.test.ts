import { describe, expect, it } from 'vitest'
import { BpmnModelDiffer } from '../src/index'
import { readFixture } from './fixtures'

const differ = new BpmnModelDiffer()
const base = readFixture('base.bpmn')

async function detailOfUnchanged(xml: string, id: string) {
  return (await differ.compare(xml, xml)).detail(id)
}

describe('BpmnComparison', () => {
  it('carries the same diff as BpmnModelDiffer.diff', async () => {
    const changed = readFixture('added-task.bpmn').replace('name="Do work"', 'name="Do more"')
    const comparison = await differ.compare(base, changed)
    expect(comparison.diff).toEqual(await differ.diff(base, changed))
    expect(comparison.diff).toEqual({
      added: ['Task_2'],
      removed: [],
      changed: ['Task_1'],
      moved: [],
    })
  })

  describe('detail', () => {
    it('writes a service task flat: its extension, no flows, no namespace declarations', async () => {
      const serviceTask = [
        '<bpmn:serviceTask id="Task_1" name="Do work">',
        '  <bpmn:extensionElements>',
        '    <zeebe:taskDefinition type="foo" />',
        '  </bpmn:extensionElements>',
        '</bpmn:serviceTask>',
      ].join('\n')

      expect(await detailOfUnchanged(base, 'Task_1')).toEqual({
        id: 'Task_1',
        type: 'bpmn:ServiceTask',
        name: 'Do work',
        before: serviceTask,
        after: serviceTask,
      })
    })

    it('shows both sides of a changed element', async () => {
      const changed = base.replace('type="foo"', 'type="bar"')
      const detail = (await differ.compare(base, changed)).detail('Task_1')
      expect(detail?.before).toContain('<zeebe:taskDefinition type="foo" />')
      expect(detail?.after).toContain('<zeebe:taskDefinition type="bar" />')
    })

    it('keeps the prefixes of attributes from namespaces without a schema', async () => {
      const foreign = readFixture('foreign-attributes.bpmn')
      const operatonTask = await detailOfUnchanged(foreign, 'Task_1')
      const flowableTask = await detailOfUnchanged(foreign, 'Task_2')
      expect(operatonTask?.after).toBe(
        '<bpmn:serviceTask id="Task_1" name="Charge card" operaton:delegateExpression="${chargeCard}" operaton:asyncBefore="true" />',
      )
      expect(flowableTask?.after).toBe(
        '<bpmn:userTask id="Task_2" name="Approve" flowable:assignee="${initiator}" foo:bar="one" />',
      )
    })

    it('writes a sub-process without the elements inside it', async () => {
      const detail = await detailOfUnchanged(readFixture('subprocess.bpmn'), 'SubProcess_1')
      expect(detail?.after).toBe(
        [
          '<bpmn:subProcess id="SubProcess_1" name="Handle order">',
          '  <bpmn:multiInstanceLoopCharacteristics id="Loop_1" isSequential="true" />',
          '</bpmn:subProcess>',
        ].join('\n'),
      )
    })

    describe('referenced elements without a shape of their own', () => {
      const references = readFixture('references.bpmn')

      it('appends the message behind a message event', async () => {
        const detail = await detailOfUnchanged(references, 'CatchEvent_1')
        expect(detail?.after).toBe(
          [
            '<bpmn:intermediateCatchEvent id="CatchEvent_1" name="Order received">',
            '  <bpmn:messageEventDefinition id="MessageEventDefinition_1" messageRef="Message_1" />',
            '</bpmn:intermediateCatchEvent>',
            '',
            '<bpmn:message id="Message_1" name="order-received">',
            '  <bpmn:extensionElements>',
            '    <zeebe:subscription correlationKey="=orderId" />',
            '  </bpmn:extensionElements>',
            '</bpmn:message>',
          ].join('\n'),
        )
      })

      it('appends the error behind an error end event', async () => {
        const detail = await detailOfUnchanged(references, 'EndEvent_1')
        expect(detail?.after).toBe(
          [
            '<bpmn:endEvent id="EndEvent_1">',
            '  <bpmn:errorEventDefinition id="ErrorEventDefinition_1" errorRef="Error_1" />',
            '</bpmn:endEvent>',
            '',
            '<bpmn:error id="Error_1" name="Rejected" errorCode="rejected" />',
          ].join('\n'),
        )
      })

      it('writes an event whose message reference does not resolve', async () => {
        const dangling = references.replace('messageRef="Message_1"', 'messageRef="Message_404"')
        const detail = await detailOfUnchanged(dangling, 'CatchEvent_1')
        expect(detail?.after).toBe(
          [
            '<bpmn:intermediateCatchEvent id="CatchEvent_1" name="Order received">',
            '  <bpmn:messageEventDefinition id="MessageEventDefinition_1" />',
            '</bpmn:intermediateCatchEvent>',
          ].join('\n'),
        )
      })

      it('does not append the diagram elements a sequence flow connects', async () => {
        const detail = await detailOfUnchanged(references, 'Flow_1')
        expect(detail?.after).toBe(
          [
            '<bpmn:sequenceFlow id="Flow_1" sourceRef="CatchEvent_1" targetRef="EndEvent_1">',
            '  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" id="Expression_1">=approved</bpmn:conditionExpression>',
            '</bpmn:sequenceFlow>',
          ].join('\n'),
        )
      })
    })

    it('shows a process property change behind a pool on the participant', async () => {
      const collab = readFixture('collaboration.bpmn')
      const notExecutable = collab.replace(
        'id="Process_1" isExecutable="true"',
        'id="Process_1" isExecutable="false"',
      )
      const detail = (await differ.compare(collab, notExecutable)).detail('Participant_1')
      const participant =
        '<bpmn:participant id="Participant_1" name="Buyer" processRef="Process_1" />'
      expect(detail?.before).toBe(
        `${participant}\n\n<bpmn:process id="Process_1" isExecutable="true" />`,
      )
      expect(detail?.after).toBe(
        `${participant}\n\n<bpmn:process id="Process_1" isExecutable="false" />`,
      )
    })

    it('writes the shapeless root process of a plain diagram', async () => {
      expect(await detailOfUnchanged(base, 'Process_1')).toEqual({
        id: 'Process_1',
        type: 'bpmn:Process',
        name: null,
        before: '<bpmn:process id="Process_1" isExecutable="true" />',
        after: '<bpmn:process id="Process_1" isExecutable="true" />',
      })
    })

    it('has no XML before an added element', async () => {
      const detail = (await differ.compare(base, readFixture('added-task.bpmn'))).detail('Task_2')
      expect(detail).toEqual({
        id: 'Task_2',
        type: 'bpmn:ServiceTask',
        name: 'Extra work',
        before: null,
        after: [
          '<bpmn:serviceTask id="Task_2" name="Extra work">',
          '  <bpmn:extensionElements>',
          '    <zeebe:taskDefinition type="extra" />',
          '  </bpmn:extensionElements>',
          '</bpmn:serviceTask>',
        ].join('\n'),
      })
    })

    it('has no XML after a removed element', async () => {
      const comparison = await differ.compare(base, readFixture('removed-end.bpmn'))
      expect(comparison.detail('EndEvent_1')).toEqual({
        id: 'EndEvent_1',
        type: 'bpmn:EndEvent',
        name: 'Done',
        before: '<bpmn:endEvent id="EndEvent_1" name="Done" />',
        after: null,
      })
    })

    it('returns null for an id in neither model', async () => {
      expect(await detailOfUnchanged(base, 'Unknown_1')).toBeNull()
    })
  })
})
