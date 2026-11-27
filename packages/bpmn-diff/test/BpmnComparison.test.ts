import { describe, expect, it } from 'vitest'
import { BpmnModelDiffer } from '../src/index'
import { readFixture } from './fixtures'

const differ = new BpmnModelDiffer()
const base = readFixture('base.bpmn')

const serviceTaskLines = [
  '    <bpmn:serviceTask id="Task_1" name="Do work">',
  '      <bpmn:extensionElements>',
  '        <zeebe:taskDefinition type="foo" />',
  '      </bpmn:extensionElements>',
  '      <bpmn:incoming>Flow_1</bpmn:incoming>',
  '      <bpmn:outgoing>Flow_2</bpmn:outgoing>',
  '    </bpmn:serviceTask>',
]

function numberedFrom(first: number, lines: string[]) {
  return lines.map((text, index) => ({ number: first + index, text }))
}

function texts(lines: readonly { text: string }[] | null | undefined): string[] {
  return (lines ?? []).map((line) => line.text)
}

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
    it('takes the lines of the element from the file, with their numbers', async () => {
      expect(await detailOfUnchanged(base, 'Task_1')).toEqual({
        type: 'bpmn:ServiceTask',
        name: 'Do work',
        before: numberedFrom(12, serviceTaskLines),
        after: numberedFrom(12, serviceTaskLines),
      })
    })

    it('shows both sides of a changed element', async () => {
      const changed = base.replace('type="foo"', 'type="bar"')
      const detail = (await differ.compare(base, changed)).detail('Task_1')
      expect(texts(detail?.before)).toContain('        <zeebe:taskDefinition type="foo" />')
      expect(texts(detail?.after)).toContain('        <zeebe:taskDefinition type="bar" />')
    })

    it('leaves out the elements inside a sub-process that have a shape', async () => {
      const detail = await detailOfUnchanged(readFixture('subprocess.bpmn'), 'SubProcess_1')
      expect(detail?.after?.map((line) => line.number)).toEqual([8, 9, 16])
    })

    describe('referenced elements without a shape of their own', () => {
      const references = readFixture('references.bpmn')

      it('adds the message behind a message event, in file order', async () => {
        const detail = await detailOfUnchanged(references, 'CatchEvent_1')
        expect(texts(detail?.after)).toEqual([
          '  <bpmn:message id="Message_1" name="order-received">',
          '    <bpmn:extensionElements>',
          '      <zeebe:subscription correlationKey="=orderId" />',
          '    </bpmn:extensionElements>',
          '  </bpmn:message>',
          '    <bpmn:intermediateCatchEvent id="CatchEvent_1" name="Order received">',
          '      <bpmn:messageEventDefinition id="MessageEventDefinition_1" messageRef="Message_1" />',
          '    </bpmn:intermediateCatchEvent>',
        ])
      })

      it('does not add the diagram elements a sequence flow connects', async () => {
        const detail = await detailOfUnchanged(references, 'Flow_1')
        expect(texts(detail?.after)).toEqual([
          '    <bpmn:sequenceFlow id="Flow_1" sourceRef="CatchEvent_1" targetRef="EndEvent_1">',
          '      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" id="Expression_1">=approved</bpmn:conditionExpression>',
          '    </bpmn:sequenceFlow>',
        ])
      })
    })

    it('shows a process property change behind a pool on the participant', async () => {
      const collab = readFixture('collaboration.bpmn')
      const notExecutable = collab.replace(
        'id="Process_1" isExecutable="true"',
        'id="Process_1" isExecutable="false"',
      )
      const detail = (await differ.compare(collab, notExecutable)).detail('Participant_1')
      expect(texts(detail?.after)).toEqual([
        '    <bpmn:participant id="Participant_1" name="Buyer" processRef="Process_1" />',
        '  <bpmn:process id="Process_1" isExecutable="false">',
        '  </bpmn:process>',
      ])
    })

    it('has no lines before an added element', async () => {
      const detail = (await differ.compare(base, readFixture('added-task.bpmn'))).detail('Task_2')
      expect(detail?.before).toBeNull()
      expect(texts(detail?.after)[0]).toBe('    <bpmn:serviceTask id="Task_2" name="Extra work">')
    })

    it('has no lines after a removed element', async () => {
      const comparison = await differ.compare(base, readFixture('removed-end.bpmn'))
      const detail = comparison.detail('EndEvent_1')
      expect(texts(detail?.before)).toEqual([
        '    <bpmn:endEvent id="EndEvent_1" name="Done">',
        '      <bpmn:incoming>Flow_2</bpmn:incoming>',
        '    </bpmn:endEvent>',
      ])
      expect(detail?.after).toBeNull()
    })

    it('returns null for an id in neither model', async () => {
      expect(await detailOfUnchanged(base, 'Unknown_1')).toBeNull()
    })
  })
})
