import { describe, expect, it } from 'vitest'
import { BpmnDiffer } from '../../src/notations/bpmn/BpmnDiffer'
import { e2eModel } from '../fixtures/modelFixtures'

describe('BpmnDiffer', () => {
  it('describes a changed element with a type label for people and its lines', async () => {
    const before = e2eModel('sample.bpmn')
    const after = before.replace('name="Do work"', 'name="Do more work"')

    const comparison = await new BpmnDiffer().compare(before, after)
    const detail = comparison.detail('Task_1')

    expect(comparison.diff.changed).toContain('Task_1')
    expect(detail?.typeLabel).toBe('Service task')
    expect(detail?.name).toBe('Do more work')
    expect(detail?.after?.[0]?.text).toContain('name="Do more work"')
  })

  it('has no detail for an id in neither model', async () => {
    const model = e2eModel('sample.bpmn')

    expect((await new BpmnDiffer().compare(model, model)).detail('Unknown_1')).toBeNull()
  })
})
