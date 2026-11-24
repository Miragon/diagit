import { describe, expect, it } from 'vitest'
import { rejectionOfUnparsedXml } from '../../src/platform/utils/modelSource'
import { e2eModel, unreadableModel } from '../fixtures/modelFixtures'

const BPMN_NAMESPACE = 'http://www.omg.org/spec/BPMN/20100524/MODEL'
const PARSE_ERROR = new Error('failed to parse document as <bpmn:Definitions>')

const reasonOf = (source: string) =>
  rejectionOfUnparsedXml(source, BPMN_NAMESPACE, PARSE_ERROR)?.reason ?? null

describe('rejectionOfUnparsedXml', () => {
  it('rejects text that is not well-formed as malformed, keeping the parse error as cause', () => {
    const rejection = rejectionOfUnparsedXml(
      e2eModel('conflict-markers.bpmn'),
      BPMN_NAMESPACE,
      PARSE_ERROR,
    )

    expect(rejection?.reason).toBe('malformed')
    expect(rejection?.cause).toBe(PARSE_ERROR)
  })

  it('rejects a model of another namespace as unsupported', () => {
    expect(reasonOf(e2eModel('sample.dmn'))).toBe('unsupported')
  })

  it('leaves a failure on a model of its own namespace to Diagit', () => {
    expect(reasonOf(e2eModel('sample.bpmn'))).toBeNull()
  })

  it.each([
    ['a login page', unreadableModel('login-page.html')],
    ['an upper-case root', '<HTML><body>Sign in</body></HTML>'],
    ['a legacy doctype', '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">\n<html><br></html>'],
    ['leading whitespace', '\n  <!doctype html><html><br></html>'],
    ['an XML declaration', '<?xml version="1.0"?>\n<!DOCTYPE html><html><br></html>'],
    ['a leading comment', '<!-- served by the SSO proxy -->\n<html><br></html>'],
  ])('leaves a host page served instead of the file to Diagit: %s', (_shape, page) => {
    expect(reasonOf(page)).toBeNull()
  })
})
