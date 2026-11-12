import { describe, expect, it } from 'vitest'
import { Notice } from '../src/platform/ui/Notice'
import { DiffNotices } from '../src/views/diff-viewer/DiffNotices'
import { FAKE_REPORT_CONTEXT } from './fakes/fakeReportContext'

const SECRET = 'AcmeMerger'

function jsonParseError(): unknown {
  try {
    JSON.parse(`${SECRET} was pasted over the scene`)
  } catch (err) {
    return err
  }
  throw new Error('expected JSON.parse to fail')
}

function moddleError(): unknown {
  return new Error(
    `unparsable content <bpmn:task id="${SECRET}" name="Sign the term sheet"> detected\n\tline: 4\n\tcolumn: 12`,
  )
}

const reportedUrls = (err: unknown) => [
  Notice.unreadableModel('BPMN', 'on a file page', err, FAKE_REPORT_CONTEXT).reportUrl!,
  new DiffNotices('BPMN', FAKE_REPORT_CONTEXT).notRendered('new', err).reportUrl!,
]

describe('problem reports for an unreadable model', () => {
  it('has a JSON parse error that quotes the model', () => {
    expect(String(jsonParseError())).toContain(SECRET)
  })

  it.each([
    ['JSON', jsonParseError],
    ['moddle', moddleError],
  ])('keep the %s parse error text out of the issue URL', (_kind, failure) => {
    const err = failure()

    for (const url of reportedUrls(err)) {
      expect(decodeURIComponent(url)).not.toContain(SECRET)
      expect(new URL(url).searchParams.get('console')).toMatch(/^\w+ while parsing the model/)
    }
  })
})
