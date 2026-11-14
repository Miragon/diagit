import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DiffDataError, type DiffLoaders, type DiffSource } from '../../src/git-hosts/DiffSource'
import { StandaloneDiffPage } from '../../src/views/diff-viewer/StandaloneDiffPage'
import { FakeFullScreen } from '../fakes/FakeFullScreen'
import { FakeIntersectionObserver } from '../fakes/FakeIntersectionObserver'
import { FakeNotationLookup } from '../fakes/FakeNotationLookup'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'

const PULL_REQUEST = 'https://github.com/o/r/pull/1/files'
const PATH = 'flows/order.bpmn'

const bothVersions: DiffLoaders = {
  loadOld: async () => '<old/>',
  loadNew: async () => '<new/>',
}

function sourceFor(loadersFor: DiffSource['loadersFor']): DiffSource {
  return {
    pageKey: (location) => (location.pathname.includes('/pull/') ? 'o/r!1' : null),
    collect: async () => [],
    unrecognizedFiles: async () => [],
    loadersFor,
  }
}

async function openedPage(
  source: DiffSource,
  { pageUrl = PULL_REQUEST, path = PATH, mayRead = true } = {},
): Promise<HTMLElement> {
  const app = document.createElement('div')
  document.body.append(app)
  const page = new StandaloneDiffPage(
    [source],
    new FakeNotationLookup(),
    { mayRead: async () => mayRead },
    FAKE_REPORT_CONTEXT,
  )
  page.mount(app)
  await page.open(pageUrl, path)
  return app
}

const noticeTitle = (app: HTMLElement) => app.querySelector('.diagit-notice-title')?.textContent

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
})

afterEach(() => {
  FakeFullScreen.uninstall()
  FakeIntersectionObserver.reset()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('StandaloneDiffPage', () => {
  it('shows the diff of the file from the pull request', async () => {
    const app = await openedPage(sourceFor(async () => bothVersions))
    FakeIntersectionObserver.bringNear()

    await vi.waitFor(() => expect(app.querySelectorAll('.fake-diagram')).toHaveLength(2))
    expect(app.querySelector('.diagit-file-path')?.textContent).toBe(PATH)
  })

  it('explains a failed load with the help of the host', async () => {
    const failure = new DiffDataError(
      'HTTP 404',
      { tone: 'warning', title: 'This repository looks private', body: 'Connect GitHub.' },
      [],
    )

    const app = await openedPage(
      sourceFor(async () => {
        throw failure
      }),
    )

    expect(noticeTitle(app)).toBe('This repository looks private')
    expect(app.querySelector('.diagit-notice-report')).not.toBeNull()
  })

  it('refuses a page on a domain Diagit may not read', async () => {
    const loadersFor = vi.fn(async () => bothVersions)

    const app = await openedPage(sourceFor(loadersFor), { mayRead: false })

    expect(app.querySelector('.diagit-notice-body')?.textContent).toContain('github.com')
    expect(loadersFor).not.toHaveBeenCalled()
  })

  it.each([
    { case: 'a file that is no diagram', path: 'README.md' },
    { case: 'a page that is no diff', pageUrl: 'https://github.com/o/r' },
    { case: 'an address that is no web page', pageUrl: 'javascript:alert(1)' },
  ])('shows no diff for $case', async (options) => {
    const app = await openedPage(
      sourceFor(async () => bothVersions),
      options,
    )
    expect(noticeTitle(app)).toBe("Can't show this diff")
  })

  it('shows no diff for a file the pull request does not change', async () => {
    const app = await openedPage(sourceFor(async () => null))
    expect(noticeTitle(app)).toBe("Can't show this diff")
  })
})
