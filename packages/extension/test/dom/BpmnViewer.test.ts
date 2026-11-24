import { beforeAll, describe, expect, it } from 'vitest'
import { BpmnViewer } from '../../src/notations/bpmn/BpmnViewer'
import { ModelRejected } from '../../src/platform/ModelRejected'
import { e2eModel, unreadableModel } from '../fixtures/modelFixtures'

// happy-dom has no SVGTransformList.consolidate, which bpmn-js needs to draw anything.
function polyfillTransformListConsolidate(): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement
  const transformListPrototype = Object.getPrototypeOf(svg.transform.baseVal) as {
    consolidate?: () => unknown
  }
  transformListPrototype.consolidate ??= function (this: SVGTransformList) {
    return this.numberOfItems ? this.getItem(0) : null
  }
}

function canvas(): HTMLElement {
  const element = document.createElement('div')
  document.body.append(element)
  return element
}

async function rejectionOf(xml: string): Promise<unknown> {
  return BpmnViewer.create(canvas(), xml).then(
    () => expect.fail('expected the import to fail'),
    (err: unknown) => err,
  )
}

describe('BpmnViewer', () => {
  beforeAll(polyfillTransformListConsolidate)

  it('draws a model with a diagram layout', async () => {
    const viewer = await BpmnViewer.create(canvas(), e2eModel('sample.bpmn'))

    expect(viewer.hasElement('StartEvent_1')).toBe(true)
    viewer.destroy()
  })

  it('rejects a model without diagram interchange as having no layout', async () => {
    const err = await rejectionOf(e2eModel('no-di.bpmn'))

    expect(err).toBeInstanceOf(ModelRejected)
    expect((err as ModelRejected).reason).toBe('no-layout')
    expect((err as ModelRejected).cause).toBeInstanceOf(Error)
  })

  it('rejects merge conflict markers as malformed', async () => {
    const err = await rejectionOf(e2eModel('conflict-markers.bpmn'))

    expect(err).toBeInstanceOf(ModelRejected)
    expect((err as ModelRejected).reason).toBe('malformed')
  })

  it('rejects a DMN model as unsupported', async () => {
    const err = await rejectionOf(e2eModel('sample.dmn'))

    expect(err).toBeInstanceOf(ModelRejected)
    expect((err as ModelRejected).reason).toBe('unsupported')
  })

  it('keeps the original error for a host page served instead of the file', async () => {
    const err = await rejectionOf(unreadableModel('login-page.html'))

    expect(err).not.toBeInstanceOf(ModelRejected)
    expect(err).toBeInstanceOf(Error)
  })
})
