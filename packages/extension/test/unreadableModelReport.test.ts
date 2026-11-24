import { describe, expect, it } from 'vitest'
import { ModelRejected, type ModelRejection } from '../src/platform/ModelRejected'
import { Notice, type NoticeTone } from '../src/platform/ui/Notice'
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

describe('notices for a model the file itself cannot provide', () => {
  const rejected = (reason: ModelRejection) =>
    new ModelRejected(reason, { cause: new Error(`${SECRET} quoted by the parser`) })

  it.each<[ModelRejection, NoticeTone, string, string]>([
    [
      'no-layout',
      'info',
      'BPMN file has no diagram layout',
      'It holds the model but no BPMN DI to draw it from.',
    ],
    [
      'no-content',
      'info',
      'BPMN file has nothing to draw',
      'It has no BPMN elements Diagit can show.',
    ],
    [
      'malformed',
      'warning',
      'BPMN file has syntax errors',
      'Check it for merge conflict markers or cut-off content.',
    ],
    [
      'unsupported',
      'warning',
      'BPMN file uses a format Diagit cannot read',
      'It is not a BPMN model in a version Diagit supports.',
    ],
  ])('explain %s on a file page without a report link', (reason, tone, title, body) => {
    const notice = Notice.unreadableModel(
      'BPMN',
      'on a file page',
      rejected(reason),
      FAKE_REPORT_CONTEXT,
    )

    expect(notice).toEqual({ tone, title, body })
  })

  it('name the version in a diff and leave the body out of the bar', () => {
    const notice = new DiffNotices('BPMN', FAKE_REPORT_CONTEXT).notRendered(
      'new',
      rejected('no-layout'),
    )

    expect(notice).toEqual({ tone: 'info', title: 'New version has no diagram layout' })
  })

  it('keep the danger notice with a report link for any other error', () => {
    const notice = new DiffNotices('BPMN', FAKE_REPORT_CONTEXT).notRendered(
      'old',
      new TypeError('transformList.consolidate is not a function'),
    )

    expect(notice.tone).toBe('danger')
    expect(notice.title).toBe('Old version could not be read')
    expect(notice.reportUrl).toContain('https://github.com/Miragon/diagit/issues/new')
  })
})
