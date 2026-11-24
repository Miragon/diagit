import { describe, expect, it } from 'vitest'
import { DmnViewer } from '../../src/notations/dmn/DmnViewer'
import { ModelRejected } from '../../src/platform/ModelRejected'
import { e2eModel, unreadableModel } from '../fixtures/modelFixtures'

async function rejectionOf(xml: string): Promise<unknown> {
  return DmnViewer.create(document.createElement('div'), xml).then(
    () => expect.fail('expected the import to fail'),
    (err: unknown) => err,
  )
}

async function reasonOf(xml: string): Promise<string | undefined> {
  const err = await rejectionOf(xml)
  return err instanceof ModelRejected ? err.reason : undefined
}

describe('DmnViewer import failures', () => {
  it('draws a model without a DRD layout as its decision table', async () => {
    const viewer = await DmnViewer.create(
      document.createElement('div'),
      e2eModel('sample.dmn').replace(/<dmndi:DMNDI>[\s\S]*<\/dmndi:DMNDI>/, ''),
    )

    viewer.destroy()
  })

  it('rejects a model with nothing to show as having no content', async () => {
    expect(await reasonOf(unreadableModel('empty.dmn'))).toBe('no-content')
  })

  it('rejects merge conflict markers as malformed', async () => {
    expect(await reasonOf(unreadableModel('conflict-markers.bpmn'))).toBe('malformed')
  })

  it('rejects a BPMN model and a DMN 1.1 model as unsupported', async () => {
    expect(await reasonOf(e2eModel('sample.bpmn'))).toBe('unsupported')
    expect(await reasonOf(unreadableModel('dmn-1.1.dmn'))).toBe('unsupported')
  })

  it('keeps the original error for a host page served instead of the file', async () => {
    const err = await rejectionOf(unreadableModel('login-page.html'))

    expect(err).toBeInstanceOf(Error)
    expect(err).not.toBeInstanceOf(ModelRejected)
  })
})
