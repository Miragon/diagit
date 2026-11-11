import { describe, expect, it } from 'vitest'
import { GithubRestApi } from '../src/git-hosts/github/GithubRestApi'
import { GithubRoutes } from '../src/git-hosts/github/GithubRoutes'
import { FakeHttpClient } from './fakes/FakeHttpClient'

const location = { hostname: 'github.com', origin: 'https://github.com' } as Location
const api = 'https://api.github.com/repos/o/r'

const pullRequest = {
  base: { sha: 'base-tip', repo: { full_name: 'o/r' } },
  head: { sha: 'head-tip', repo: { full_name: 'fork/r' } },
}

function apiWith(responses: Record<string, unknown>): GithubRestApi {
  return new GithubRestApi(new FakeHttpClient().respondWith(responses), new GithubRoutes())
}

describe('GithubRestApi.loadPullRequest', () => {
  const pr = { owner: 'o', repo: 'r', number: '1', revisions: null, key: 'o/r!1' }

  it('diffs against the merge base, not the tip of the base branch', async () => {
    const data = await apiWith({
      [`${api}/pulls/1`]: pullRequest,
      [`${api}/compare/base-tip...head-tip?per_page=1`]: {
        merge_base_commit: { sha: 'fork-point' },
      },
      [`${api}/pulls/1/files?per_page=100&page=1`]: [],
    }).loadPullRequest(location, pr)

    expect(data.baseSha).toBe('fork-point')
    expect(data.headSha).toBe('head-tip')
    expect(data.headRepo).toBe('fork/r')
  })

  it('falls back to the base branch tip when the merge base cannot be resolved', async () => {
    const data = await apiWith({
      [`${api}/pulls/1`]: pullRequest,
      [`${api}/pulls/1/files?per_page=100&page=1`]: [],
    }).loadPullRequest(location, pr)

    expect(data.baseSha).toBe('base-tip')
  })
})

describe('GithubRestApi.loadCommit', () => {
  const commit = { owner: 'o', repo: 'r', sha: 'c0ffee0', key: 'o/r@c0ffee0' }

  it('diffs a commit against its first parent and indexes renamed files by both paths', async () => {
    const renamed = { filename: 'new.bpmn', previous_filename: 'old.bpmn', status: 'renamed' }
    const data = await apiWith({
      [`${api}/commits/c0ffee0`]: {
        sha: 'c0ffee0full',
        parents: [{ sha: 'parent' }, { sha: 'merged-in' }],
        files: [renamed],
      },
    }).loadCommit(location, commit)

    expect(data).toMatchObject({ baseSha: 'parent', headSha: 'c0ffee0full', baseRepo: 'o/r' })
    expect(data.fileByPath.get('old.bpmn')).toBe(renamed)
    expect(data.fileByPath.get('new.bpmn')).toBe(renamed)
  })

  it('leaves the base empty for a root commit', async () => {
    const data = await apiWith({
      [`${api}/commits/c0ffee0`]: { sha: 'c0ffee0', parents: [] },
    }).loadCommit(location, commit)

    expect(data.baseSha).toBe('')
  })
})
