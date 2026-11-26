import { describe, expect, it } from 'vitest'
import { BpmnModelDiffer, BpmnParser, ModelComparator, isEmptyDiff } from '../../src/index'
import { readFixture } from '../fixtures'

const base = readFixture('base.bpmn')

const parser = new BpmnParser()
const comparator = new ModelComparator()

async function diff(oldXml: string, newXml: string) {
  return comparator.compare(await parser.parse(oldXml), await parser.parse(newXml))
}

describe('ModelComparator', () => {
  it('reports no differences for an unchanged model', async () => {
    const result = await diff(base, base)
    expect(isEmptyDiff(result)).toBe(true)
  })

  it('detects an added element', async () => {
    const result = await diff(base, readFixture('added-task.bpmn'))
    expect(result.added).toEqual(['Task_2'])
    expect(result.removed).toEqual([])
    expect(result.changed).toEqual([])
    expect(result.moved).toEqual([])
  })

  it('detects removed elements', async () => {
    const result = await diff(base, readFixture('removed-end.bpmn'))
    expect(result.removed.sort()).toEqual(['EndEvent_1', 'Flow_2'])
    expect(result.added).toEqual([])
    expect(result.changed).toEqual([])
    expect(result.moved).toEqual([])
  })

  it('detects a renamed element as changed', async () => {
    const renamed = base.replace('name="Do work"', 'name="Do redone work"')
    const result = await diff(base, renamed)
    expect(result.changed).toEqual(['Task_1'])
    expect(result.moved).toEqual([])
  })

  it('detects a zeebe extension property change (unregistered namespace)', async () => {
    const changed = base.replace('type="foo"', 'type="bar"')
    const result = await diff(base, changed)
    expect(result.changed).toEqual(['Task_1'])
    expect(result.added).toEqual([])
    expect(result.removed).toEqual([])
  })

  it('detects a camunda 7 async continuation change', async () => {
    const c7 = readFixture('c7-async.bpmn')
    const synchronous = c7.replace(' camunda:asyncBefore="true"', '')
    const result = await diff(c7, synchronous)
    expect(result.changed).toEqual(['Task_1'])
  })

  it('detects a pure layout move without a semantic change', async () => {
    const moved = base.replace('x="250" y="78"', 'x="250" y="240"')
    const result = await diff(base, moved)
    expect(result.moved).toEqual(['Task_1'])
    expect(result.changed).toEqual([])
  })

  it('does not fold pool changes into the collaboration root', async () => {
    const collab = readFixture('collaboration.bpmn')
    const renamedPool = collab.replace('name="Buyer"', 'name="Purchaser"')
    const result = await diff(collab, renamedPool)
    // Only the participant itself changes — not the collaboration root that
    // contains it (participants/messageFlows are diffed as their own elements).
    expect(result.changed).toEqual(['Participant_1'])
  })

  it('detects a process property change behind a pool', async () => {
    const collab = readFixture('collaboration.bpmn')
    const notExecutable = collab.replace(
      'id="Process_1" isExecutable="true"',
      'id="Process_1" isExecutable="false"',
    )
    const result = await diff(collab, notExecutable)
    expect(result.changed).toEqual(['Participant_1'])
  })

  describe('attributes from namespaces without a registered schema', () => {
    const foreign = readFixture('foreign-attributes.bpmn')

    it('detects a changed operaton attribute', async () => {
      const changed = foreign.replace('${chargeCard}', '${refundCard}')
      const result = await diff(foreign, changed)
      expect(result.changed).toEqual(['Task_1'])
    })

    it('detects a removed operaton attribute', async () => {
      const result = await diff(foreign, foreign.replace(' operaton:asyncBefore="true"', ''))
      expect(result.changed).toEqual(['Task_1'])
    })

    it('detects a changed flowable attribute', async () => {
      const result = await diff(foreign, foreign.replace('${initiator}', '${manager}'))
      expect(result.changed).toEqual(['Task_2'])
    })

    it('detects a changed attribute of an unknown namespace', async () => {
      const result = await diff(foreign, foreign.replace('foo:bar="one"', 'foo:bar="two"'))
      expect(result.changed).toEqual(['Task_2'])
    })

    it('ignores a namespace declaration that moves onto an element', async () => {
      const redeclared = foreign.replace(
        '<bpmn:userTask id="Task_2"',
        '<bpmn:userTask xmlns:foo="http://example.com/foo" id="Task_2"',
      )
      const result = await diff(foreign, redeclared)
      expect(isEmptyDiff(result)).toBe(true)
    })

    it('ignores the order of the attributes', async () => {
      const reordered = foreign.replace(
        'operaton:delegateExpression="${chargeCard}" operaton:asyncBefore="true"',
        'operaton:asyncBefore="true" operaton:delegateExpression="${chargeCard}"',
      )
      const result = await diff(foreign, reordered)
      expect(isEmptyDiff(result)).toBe(true)
    })
  })

  describe('referenced elements without a shape of their own', () => {
    const references = readFixture('references.bpmn')

    it('detects a renamed message on the event that references it', async () => {
      const result = await diff(references, references.replace('order-received', 'order-placed'))
      expect(result.changed).toEqual(['CatchEvent_1'])
    })

    it('detects a changed message correlation key', async () => {
      const result = await diff(references, references.replace('=orderId', '=customerId'))
      expect(result.changed).toEqual(['CatchEvent_1'])
    })

    it('detects a changed error code', async () => {
      const changed = references.replace('errorCode="rejected"', 'errorCode="declined"')
      const result = await diff(references, changed)
      expect(result.changed).toEqual(['EndEvent_1'])
    })

    it('detects a relabelled group', async () => {
      const result = await diff(references, references.replace('Fulfilment', 'Shipping'))
      expect(result.changed).toEqual(['Group_1'])
    })

    it('detects a changed condition expression that carries an id', async () => {
      const result = await diff(references, references.replace('=approved', '=rejected'))
      expect(result.changed).toEqual(['Flow_1'])
    })

    it('detects a rewired sequence flow', async () => {
      const rewired = references.replace(
        'sourceRef="CatchEvent_1" targetRef="EndEvent_1"',
        'sourceRef="EndEvent_1" targetRef="CatchEvent_1"',
      )
      const result = await diff(references, rewired)
      expect(result.changed).toEqual(['Flow_1'])
    })

    it('keeps comparing diagram elements by id only', async () => {
      const renamedTarget = references.replace(
        '<bpmn:endEvent id="EndEvent_1">',
        '<bpmn:endEvent id="EndEvent_1" name="Rejected">',
      )
      const result = await diff(references, renamedTarget)
      expect(result.changed).toEqual(['EndEvent_1'])
    })

    it('detects a moved label as a layout move', async () => {
      const movedLabel = references.replace('x="130" y="143"', 'x="130" y="60"')
      const result = await diff(references, movedLabel)
      expect(result.moved).toEqual(['CatchEvent_1'])
      expect(result.changed).toEqual([])
    })
  })
})

describe('BpmnModelDiffer', () => {
  it('parses both documents and diffs them', async () => {
    const result = await new BpmnModelDiffer().diff(base, readFixture('added-task.bpmn'))
    expect(result.added).toEqual(['Task_2'])
  })
})
