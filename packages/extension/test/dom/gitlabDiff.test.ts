import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DiffDataError } from '../../src/git-hosts/DiffSource'
import { GitlabHost } from '../../src/git-hosts/gitlab/GitlabHost'
import { DIFF_PANEL_TAG } from '../../src/platform/injectedElements'
import { FetchError } from '../../src/platform/messaging/HttpClient'
import { FakeHttpClient } from '../fakes/FakeHttpClient'

const location = {
  hostname: 'gitlab.com',
  origin: 'https://gitlab.com',
  pathname: '/group/project/-/merge_requests/7/diffs',
  search: '',
} as Location

const api = 'https://gitlab.com/api/v4/projects/group%2Fproject/merge_requests/7'
const rawFiles = 'https://gitlab.com/api/v4/projects/group%2Fproject/repository/files'

function withFileBox(path = 'flows/order.bpmn', content = ''): Document {
  document.body.innerHTML = `
    <div class="diff-file" data-path="${path}">
      <div class="diff-content">${content}</div>
    </div>`
  return document
}

function rapidDiffFileMarkup(fileData: string, isOpen = true, header = ''): string {
  return `
    <diff-file data-testid="rd-diff-file" data-file-data='${fileData}'>
      <article class="rd-diff-file">
        <header data-testid="rd-diff-file-header">${header}</header>
        <details class="rd-diff-file-details" data-file-body ${isOpen ? 'open' : ''}>
          <summary></summary>
          <div data-testid="rd-diff-file-body"><table></table></div>
        </details>
      </article>
    </diff-file>`
}

function withRapidDiffFile(path = 'flows/order.bpmn', isOpen = true): Document {
  const fileData = JSON.stringify({ old_path: path, new_path: path })
  document.body.innerHTML = rapidDiffFileMarkup(fileData, isOpen)
  return document
}

function giveBox(el: Element): void {
  const box = new DOMRect(0, 0, 100, 100)
  vi.spyOn(el, 'getClientRects').mockReturnValue([box] as unknown as DOMRectList)
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(box)
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('GitLab merge-request diff', () => {
  it('wires a renamed BPMN file to its old path on the base and its new path on the head', async () => {
    const http = new FakeHttpClient().respondWith({
      [api]: { diff_refs: { base_sha: 'aaa', head_sha: 'bbb' } },
      [`${api}/diffs?per_page=100&page=1`]: [
        { old_path: 'flows/old.bpmn', new_path: 'flows/order.bpmn', renamed_file: true },
      ],
      [`${rawFiles}/flows%2Fold.bpmn/raw?ref=aaa`]: '<old/>',
      [`${rawFiles}/flows%2Forder.bpmn/raw?ref=bbb`]: '<new/>',
    })

    const [block] = await new GitlabHost(http).mergeRequestDiff.collect(location, withFileBox())

    expect(block).toMatchObject({ path: 'flows/order.bpmn', append: 'first' })
    expect(await block!.loadOld()).toBe('<old/>')
    expect(await block!.loadNew()).toBe('<new/>')
  })

  it('compares a single commit with its parent when the view is limited to one commit', async () => {
    const commitApi = 'https://gitlab.com/api/v4/projects/group%2Fproject/repository/commits/ccc'
    const http = new FakeHttpClient().respondWith({
      [commitApi]: { id: 'ccc', parent_ids: ['ppp'] },
      [`${commitApi}/diff?per_page=100&page=1`]: [
        { old_path: 'flows/order.bpmn', new_path: 'flows/order.bpmn' },
      ],
      [`${rawFiles}/flows%2Forder.bpmn/raw?ref=ppp`]: '<parent/>',
      [`${rawFiles}/flows%2Forder.bpmn/raw?ref=ccc`]: '<commit/>',
    })
    const commitView = { ...location, search: '?commit_id=ccc' } as Location

    const [block] = await new GitlabHost(http).mergeRequestDiff.collect(commitView, withFileBox())

    expect(await block!.loadOld()).toBe('<parent/>')
    expect(await block!.loadNew()).toBe('<commit/>')
    expect(http.requests).not.toContain(api)
  })

  it('ignores files that are not diffable diagrams', async () => {
    const http = new FakeHttpClient()

    const blocks = await new GitlabHost(http).mergeRequestDiff.collect(
      location,
      withFileBox('README.md'),
    )

    expect(blocks).toEqual([])
    expect(http.requests).toEqual([])
  })

  it('surfaces a failed load as a DiffDataError and backs off before retrying', async () => {
    const http = new FakeHttpClient().failEverythingWith(new FetchError('HTTP 401', 401))
    const diff = new GitlabHost(http).mergeRequestDiff
    const doc = withFileBox()

    const err = await diff.collect(location, doc).catch((e: unknown) => e)
    await diff.collect(location, doc).catch(() => undefined)

    expect(err).toBeInstanceOf(DiffDataError)
    expect((err as DiffDataError).files).toHaveLength(1)
    expect((err as DiffDataError).help.action).toBeUndefined()
    expect(http.requests).toHaveLength(1)
  })

  it('treats a file whose content area only holds our own panel as collapsed', async () => {
    const http = new FakeHttpClient().respondWith({
      [api]: { diff_refs: { base_sha: 'aaa', head_sha: 'bbb' } },
      [`${api}/diffs?per_page=100&page=1`]: [],
    })
    const doc = withFileBox('flows/order.bpmn', `<${DIFF_PANEL_TAG}></${DIFF_PANEL_TAG}>`)

    const [block] = await new GitlabHost(http).mergeRequestDiff.collect(location, doc)

    expect(block!.isCollapsed()).toBe(true)
  })

  it('finds a BPMN file in the Rapid Diffs view and anchors the panel in its body', async () => {
    const http = new FakeHttpClient().respondWith({
      [api]: { diff_refs: { base_sha: 'aaa', head_sha: 'bbb' } },
      [`${api}/diffs?per_page=100&page=1`]: [],
    })

    const [block] = await new GitlabHost(http).mergeRequestDiff.collect(
      location,
      withRapidDiffFile(),
    )

    expect(block).toMatchObject({ path: 'flows/order.bpmn', append: 'first' })
    expect(block!.anchor.dataset.testid).toBe('rd-diff-file-body')
  })

  it('keeps finding Rapid Diffs files when one carries unreadable file data', async () => {
    const http = new FakeHttpClient().respondWith({
      [api]: { diff_refs: { base_sha: 'aaa', head_sha: 'bbb' } },
      [`${api}/diffs?per_page=100&page=1`]: [],
    })
    const validFileData = JSON.stringify({
      old_path: 'flows/order.bpmn',
      new_path: 'flows/order.bpmn',
    })
    document.body.innerHTML = [
      rapidDiffFileMarkup('{'),
      rapidDiffFileMarkup('null', true, '<span data-path="flows/fallback.bpmn"></span>'),
      rapidDiffFileMarkup(validFileData),
    ].join('')

    const blocks = await new GitlabHost(http).mergeRequestDiff.collect(location, document)

    expect(blocks.map((block) => block.path)).toEqual(['flows/fallback.bpmn', 'flows/order.bpmn'])
  })

  it('treats a closed Rapid Diffs file as collapsed although its hidden content keeps a box', async () => {
    const http = new FakeHttpClient().respondWith({
      [api]: { diff_refs: { base_sha: 'aaa', head_sha: 'bbb' } },
      [`${api}/diffs?per_page=100&page=1`]: [],
    })
    const doc = withRapidDiffFile('flows/order.bpmn', false)
    giveBox(doc.querySelector('table')!)

    const [block] = await new GitlabHost(http).mergeRequestDiff.collect(location, doc)

    expect(block!.isCollapsed()).toBe(true)
  })

  it('treats an open Rapid Diffs file with rendered content as expanded', async () => {
    const http = new FakeHttpClient().respondWith({
      [api]: { diff_refs: { base_sha: 'aaa', head_sha: 'bbb' } },
      [`${api}/diffs?per_page=100&page=1`]: [],
    })
    const doc = withRapidDiffFile('flows/order.bpmn', true)
    giveBox(doc.querySelector('table')!)

    const [block] = await new GitlabHost(http).mergeRequestDiff.collect(location, doc)

    expect(block!.isCollapsed()).toBe(false)
  })

  describe('changed diagram files the scanner did not recognise', () => {
    const metadataWithOrderAndReadme = {
      [api]: { diff_refs: { base_sha: 'aaa', head_sha: 'bbb' } },
      [`${api}/diffs?per_page=100&page=1`]: [
        { old_path: 'flows/order.bpmn', new_path: 'flows/order.bpmn' },
        { old_path: 'README.md', new_path: 'README.md' },
      ],
    }

    function withUnknownFileMarkup(path: string): Document {
      document.body.innerHTML = `<section class="unknown"><h3>${path}</h3><pre></pre></section>`
      return document
    }

    it('lists them when the page shows a diagram path the scanner missed', async () => {
      const http = new FakeHttpClient().respondWith(metadataWithOrderAndReadme)

      const paths = await new GitlabHost(http).mergeRequestDiff.unrecognizedFiles(
        location,
        withUnknownFileMarkup('flows/order.bpmn'),
      )

      expect(paths.map((file) => file.path)).toEqual(['flows/order.bpmn'])
    })

    it('leaves out the files the scanner recognised', async () => {
      const http = new FakeHttpClient().respondWith(metadataWithOrderAndReadme)

      const paths = await new GitlabHost(http).mergeRequestDiff.unrecognizedFiles(
        location,
        withFileBox('flows/order.bpmn'),
      )

      expect(paths).toEqual([])
    })

    it('does not call the API when the page mentions no diagram at all', async () => {
      const http = new FakeHttpClient().respondWith(metadataWithOrderAndReadme)

      const paths = await new GitlabHost(http).mergeRequestDiff.unrecognizedFiles(
        location,
        withUnknownFileMarkup('README.md'),
      )

      expect(paths).toEqual([])
      expect(http.requests).toEqual([])
    })

    it('does not retry a failed load just to look for unrecognised files', async () => {
      const http = new FakeHttpClient().failEverythingWith(new FetchError('HTTP 403', 403))
      const diff = new GitlabHost(http).mergeRequestDiff
      const doc = withUnknownFileMarkup('flows/order.bpmn')
      await diff.unrecognizedFiles(location, doc).catch(() => undefined)
      vi.spyOn(Date, 'now').mockReturnValue(1_000_000 + 3_600_000)

      expect(await diff.unrecognizedFiles(location, doc)).toEqual([])
      expect(http.requests).toHaveLength(1)
    })

    it('does not look outside the changes tab', async () => {
      const http = new FakeHttpClient().respondWith(metadataWithOrderAndReadme)
      const overview = { ...location, pathname: '/group/project/-/merge_requests/7' }

      const paths = await new GitlabHost(http).mergeRequestDiff.unrecognizedFiles(
        overview,
        withUnknownFileMarkup('flows/order.bpmn'),
      )

      expect(paths).toEqual([])
      expect(http.requests).toEqual([])
    })
  })
})
