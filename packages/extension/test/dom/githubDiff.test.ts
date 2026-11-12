import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DiffDataError } from '../../src/git-hosts/DiffSource'
import { GithubHost } from '../../src/git-hosts/github/GithubHost'
import { GithubTokenStore } from '../../src/git-hosts/github/GithubTokenStore'
import { FetchError } from '../../src/platform/messaging/HttpClient'
import { SettingsStore } from '../../src/platform/settings/SettingsStore'
import { FakeHttpClient } from '../fakes/FakeHttpClient'
import { MemoryStorageArea } from '../fakes/MemoryStorageArea'

const location = {
  hostname: 'github.com',
  origin: 'https://github.com',
  pathname: '/o/r/pull/1/files',
  search: '',
} as Location

const api = 'https://api.github.com/repos/o/r'

const pullRequestMetadata = {
  [`${api}/pulls/1`]: {
    base: { sha: 'aaa', repo: { full_name: 'o/r' } },
    head: { sha: 'bbb', repo: { full_name: 'o/r' } },
  },
  [`${api}/compare/aaa...bbb?per_page=1`]: { merge_base_commit: { sha: 'aaa' } },
  [`${api}/pulls/1/files?per_page=100&page=1`]: [
    { filename: 'flows/order.bpmn', status: 'modified' },
  ],
}

function pullRequestDiff(http: FakeHttpClient) {
  const tokens = new GithubTokenStore(new SettingsStore(() => new MemoryStorageArea()))
  return new GithubHost(http, tokens).pullRequestDiff
}

function withFileBoxes(html: string): Document {
  document.body.innerHTML = html
  return document
}

const legacyBpmnBox = `
  <div class="file" data-tagsearch-path="flows/order.bpmn">
    <div class="js-file-content"></div>
  </div>`

const metadataRequests = (http: FakeHttpClient) =>
  http.requests.filter((url) => url === `${api}/pulls/1`).length

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('GitHub pull-request diff', () => {
  it('wires each changed BPMN file to its base and head raw files', async () => {
    const http = new FakeHttpClient().respondWith({
      ...pullRequestMetadata,
      'https://github.com/o/r/raw/aaa/flows/order.bpmn': '<old/>',
      'https://github.com/o/r/raw/bbb/flows/order.bpmn': '<new/>',
    })

    const [block] = await pullRequestDiff(http).collect(location, withFileBoxes(legacyBpmnBox))

    expect(block).toMatchObject({ path: 'flows/order.bpmn', append: 'before' })
    expect(await block!.loadOld()).toBe('<old/>')
    expect(await block!.loadNew()).toBe('<new/>')
  })

  it('reads the head-side path from the React header, without bidi marks', async () => {
    const http = new FakeHttpClient().respondWith(pullRequestMetadata)
    const doc = withFileBoxes(`
      <div id="diff-1" aria-labelledby="heading-1">
        <div data-diff-header-wrapper><h3 id="heading-1">\u200eflows/old.bpmn → flows/\u2066order\u2069.bpmn</h3></div>
        <div><table data-diff-anchor></table></div>
      </div>`)

    const blocks = await pullRequestDiff(http).collect(location, doc)

    expect(blocks.map((block) => block.path)).toEqual(['flows/order.bpmn'])
  })

  it('skips notations without diff support and fetches nothing for them', async () => {
    const http = new FakeHttpClient().respondWith(pullRequestMetadata)
    const doc = withFileBoxes(`
      <div class="file" data-tagsearch-path="rules/decide.dmn">
        <div class="js-file-content"></div>
      </div>`)

    expect(await pullRequestDiff(http).collect(location, doc)).toEqual([])
    expect(http.requests).toEqual([])
  })
})

describe('GitHub pull-request diff limited to commits', () => {
  const at = (pathname: string) => ({ ...location, pathname }) as Location

  it('compares a single commit with its parent instead of the whole pull request', async () => {
    const http = new FakeHttpClient().respondWith({
      [`${api}/commits/ccccccc`]: {
        sha: 'ccccccc',
        parents: [{ sha: 'ppppppp' }],
        files: [{ filename: 'flows/order.bpmn', status: 'modified' }],
      },
      'https://github.com/o/r/raw/ppppppp/flows/order.bpmn': '<parent/>',
      'https://github.com/o/r/raw/ccccccc/flows/order.bpmn': '<commit/>',
    })

    const [block] = await pullRequestDiff(http).collect(
      at('/o/r/pull/1/commits/ccccccc'),
      withFileBoxes(legacyBpmnBox),
    )

    expect(await block!.loadOld()).toBe('<parent/>')
    expect(await block!.loadNew()).toBe('<commit/>')
    expect(metadataRequests(http)).toBe(0)
  })

  it('compares a commit range from its base to its head', async () => {
    const http = new FakeHttpClient().respondWith({
      [`${api}/compare/aaaaaaa...ccccccc`]: {
        merge_base_commit: { sha: 'elsewhere' },
        files: [{ filename: 'flows/order.bpmn', status: 'modified' }],
      },
      'https://github.com/o/r/raw/aaaaaaa/flows/order.bpmn': '<range-base/>',
      'https://github.com/o/r/raw/ccccccc/flows/order.bpmn': '<range-head/>',
    })

    const [block] = await pullRequestDiff(http).collect(
      at('/o/r/pull/1/files/aaaaaaa..ccccccc'),
      withFileBoxes(legacyBpmnBox),
    )

    expect(await block!.loadOld()).toBe('<range-base/>')
    expect(await block!.loadNew()).toBe('<range-head/>')
  })

  it('loads again when the view moves from the whole pull request to one commit', async () => {
    const http = new FakeHttpClient().respondWith({
      ...pullRequestMetadata,
      [`${api}/commits/ccccccc`]: { sha: 'ccccccc', parents: [{ sha: 'ppppppp' }], files: [] },
    })
    const diff = pullRequestDiff(http)
    const doc = withFileBoxes(legacyBpmnBox)

    await diff.collect(location, doc)
    await diff.collect(at('/o/r/pull/1/commits/ccccccc'), doc)

    expect(http.requests).toContain(`${api}/commits/ccccccc`)
  })

  it('shows no panel for a revision it cannot read', async () => {
    const http = new FakeHttpClient()
    const unreadable = at('/o/r/pull/1/files/not-a-sha')

    expect(pullRequestDiff(http).pageKey(unreadable)).toBeNull()
    expect(await pullRequestDiff(http).collect(unreadable, withFileBoxes(legacyBpmnBox))).toEqual(
      [],
    )
    expect(http.requests).toEqual([])
  })
})

describe('GitHub pull-request diff after a new push', () => {
  const pushedMetadata = {
    ...pullRequestMetadata,
    [`${api}/pulls/1`]: {
      base: { sha: 'aaa', repo: { full_name: 'o/r' } },
      head: { sha: 'ccc', repo: { full_name: 'o/r' } },
    },
    [`${api}/compare/aaa...ccc?per_page=1`]: { merge_base_commit: { sha: 'aaa' } },
    'https://github.com/o/r/raw/ccc/flows/order.bpmn': '<pushed/>',
  }

  it('keeps a successful load for a minute and then loads the new head', async () => {
    const http = new FakeHttpClient().respondWith(pullRequestMetadata)
    const diff = pullRequestDiff(http)
    const doc = withFileBoxes(legacyBpmnBox)
    await diff.collect(location, doc)
    http.respondWith(pushedMetadata)

    vi.spyOn(Date, 'now').mockReturnValue(1_000_000 + 59_000)
    await diff.collect(location, doc)
    expect(metadataRequests(http)).toBe(1)

    vi.spyOn(Date, 'now').mockReturnValue(1_000_000 + 61_000)
    const [block] = await diff.collect(location, doc)

    expect(metadataRequests(http)).toBe(2)
    expect(await block!.loadNew()).toBe('<pushed/>')
  })
})

describe('GitHub pull-request diff — failed metadata', () => {
  it('does not re-fetch while a failure is cooling down', async () => {
    const http = new FakeHttpClient().failEverythingWith(new FetchError('HTTP 404 for x', 404))
    const diff = pullRequestDiff(http)
    const doc = withFileBoxes(legacyBpmnBox)

    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(diff.collect(location, doc)).rejects.toBeInstanceOf(DiffDataError)
    }

    expect(metadataRequests(http)).toBe(1)
  })

  it('retries once the cooldown has elapsed, and then caches success', async () => {
    const http = new FakeHttpClient().failEverythingWith(new FetchError('HTTP 404 for x', 404))
    const diff = pullRequestDiff(http)
    const doc = withFileBoxes(legacyBpmnBox)
    await expect(diff.collect(location, doc)).rejects.toBeInstanceOf(DiffDataError)

    http.respondWith(pullRequestMetadata)
    await expect(diff.collect(location, doc)).rejects.toBeInstanceOf(DiffDataError)
    expect(metadataRequests(http)).toBe(1)

    vi.spyOn(Date, 'now').mockReturnValue(1_000_000 + 61_000)
    expect(await diff.collect(location, doc)).toHaveLength(1)
    await diff.collect(location, doc)
    expect(metadataRequests(http)).toBe(2)
  })

  it('carries every changed file and a status-specific hint', async () => {
    const http = new FakeHttpClient().failEverythingWith(new FetchError('HTTP 404 for x', 404))

    const err = await pullRequestDiff(http)
      .collect(location, withFileBoxes(legacyBpmnBox))
      .then(
        () => expect.unreachable(),
        (e: DiffDataError) => e,
      )

    expect(err).toBeInstanceOf(DiffDataError)
    expect(err.files.map((file) => file.path)).toEqual(['flows/order.bpmn'])
    expect(err.help.hint).toMatch(/private repository/i)
  })

  it('lists a changed diagram file the scanner did not recognise', async () => {
    const http = new FakeHttpClient().respondWith(pullRequestMetadata)
    const doc = withFileBoxes('<div class="unknown"><h3>flows/order.bpmn</h3></div>')

    const files = await pullRequestDiff(http).unrecognizedFiles(location, doc)

    expect(files.map((file) => file.path)).toEqual(['flows/order.bpmn'])
  })

  it('does not treat a file whose large diff is not loaded yet as unrecognised', async () => {
    const http = new FakeHttpClient().respondWith(pullRequestMetadata)
    const largeDiffBehindLoadButton = `
      <div class="file" data-tagsearch-path="flows/order.bpmn">
        <div class="file-header"><a>flows/order.bpmn</a></div>
        <button>Load diff</button>
      </div>`

    const paths = await pullRequestDiff(http).unrecognizedFiles(
      location,
      withFileBoxes(largeDiffBehindLoadButton),
    )

    expect(paths).toEqual([])
  })

  it('does not call the API when the page mentions no diagram at all', async () => {
    const http = new FakeHttpClient().respondWith(pullRequestMetadata)
    const doc = withFileBoxes('<div class="unknown"><h3>src/Order.kt</h3></div>')

    expect(await pullRequestDiff(http).unrecognizedFiles(location, doc)).toEqual([])
    expect(http.requests).toEqual([])
  })

  it('does not look for unrecognised files on the conversation tab', async () => {
    const http = new FakeHttpClient().respondWith(pullRequestMetadata)
    const conversation = { ...location, pathname: '/o/r/pull/1' }
    const doc = withFileBoxes('<div class="unknown"><h3>flows/order.bpmn</h3></div>')

    expect(await pullRequestDiff(http).unrecognizedFiles(conversation, doc)).toEqual([])
    expect(http.requests).toEqual([])
  })
})

describe('GitHub commit diff on the file-tree layout', () => {
  const commitLocation = { ...location, pathname: '/o/r/commit/ccccccc' } as Location

  const commitMetadata = {
    [`${api}/commits/ccccccc`]: {
      sha: 'ccccccc',
      parents: [{ sha: 'ppppppp' }],
      files: [{ filename: 'flows/order.bpmn', status: 'modified' }],
    },
  }

  const fileHeader = `
    <div class="diffHeaderWrapper__EHUZul">
      <div class="diff-file-header__CV6GPS">
        <div class="file-path-section__ZYYNNI">
          <h3 id="heading-_r_h_"><a href="#diff-1"><code>‎flows/order.bpmn‎</code></a></h3>
        </div>
      </div>
    </div>`

  const expandedRegion = `
    <div role="region" aria-labelledby="heading-_r_h_">
      ${fileHeader}
      <div class="border"><table data-diff-anchor="diff-1"></table></div>
    </div>`

  const collapsedRegion = `
    <div role="region" aria-labelledby="heading-_r_h_">
      ${fileHeader}
    </div>`

  function commitDiff(http: FakeHttpClient) {
    const tokens = new GithubTokenStore(new SettingsStore(() => new MemoryStorageArea()))
    return new GithubHost(http, tokens).commitDiff
  }

  it('anchors the panel above the code of a file region', async () => {
    const http = new FakeHttpClient().respondWith(commitMetadata)
    const doc = withFileBoxes(expandedRegion)

    const blocks = await commitDiff(http).collect(commitLocation, doc)

    expect(blocks.map((block) => block.path)).toEqual(['flows/order.bpmn'])
    expect(blocks[0]!.anchor).toBe(doc.querySelector('.border'))
    expect(blocks[0]!.fileRoot).toBe(doc.querySelector('[role="region"]'))
  })

  it('reads a file region as collapsed once its code is removed', async () => {
    const http = new FakeHttpClient().respondWith(commitMetadata)
    const doc = withFileBoxes(expandedRegion)
    const [block] = await commitDiff(http).collect(commitLocation, doc)
    expect(block!.isCollapsed()).toBe(false)

    doc.querySelector('.border')!.remove()

    expect(block!.isCollapsed()).toBe(true)
  })

  it('ignores a region that is not a file of the diff', async () => {
    const http = new FakeHttpClient().respondWith(commitMetadata)
    const doc = withFileBoxes(`
      <div role="region" aria-labelledby="notes"><h2 id="notes">flows/order.bpmn</h2>
        <table data-diff-anchor></table>
      </div>`)

    expect(await commitDiff(http).collect(commitLocation, doc)).toEqual([])
  })

  it('does not treat a collapsed file region as unrecognised', async () => {
    const http = new FakeHttpClient().respondWith(commitMetadata)

    const files = await commitDiff(http).unrecognizedFiles(
      commitLocation,
      withFileBoxes(collapsedRegion),
    )

    expect(files).toEqual([])
  })
})

describe('GitHub pull-request diff with file regions around the React header', () => {
  const reactHeader = `
    <div data-diff-header-wrapper><h3 id="heading-1">flows/order.bpmn</h3></div>`
  const code = '<div class="code"><table data-diff-anchor></table></div>'

  it.each([
    [
      'is the file root',
      `<div id="diff-1" role="region" aria-labelledby="heading-1">${reactHeader}${code}</div>`,
    ],
    [
      'sits inside the file root',
      `<div id="diff-1" aria-labelledby="heading-1"><div role="region" aria-labelledby="heading-1">${reactHeader}${code}</div></div>`,
    ],
    [
      'wraps the file root',
      `<div role="region" aria-labelledby="heading-1"><div id="diff-1" aria-labelledby="heading-1">${reactHeader}${code}</div></div>`,
    ],
  ])('mounts one panel when the region %s', async (_, html) => {
    const http = new FakeHttpClient().respondWith(pullRequestMetadata)

    const blocks = await pullRequestDiff(http).collect(location, withFileBoxes(html))

    expect(blocks.map((block) => block.fileRoot.id)).toEqual(['diff-1'])
  })
})
