import { describe, expect, it } from 'vitest'
import { GitlabRoutes } from '../src/git-hosts/gitlab/GitlabRoutes'

const routes = new GitlabRoutes()
const diffs = '/g/p/-/merge_requests/42/diffs'

function mergeRequestAt(path: string) {
  const { pathname, search } = new URL(path, 'https://gitlab.com')
  return routes.mergeRequest({ pathname, search })
}

describe('GitlabRoutes', () => {
  it('parses project path and iid from an MR url', () => {
    expect(mergeRequestAt('/group/sub/proj/-/merge_requests/42/diffs')).toEqual({
      projectPath: 'group/sub/proj',
      iid: '42',
      commit: null,
      key: 'group/sub/proj!42',
    })
    expect(mergeRequestAt('/group/proj/-/issues/1')).toBeNull()
  })

  it('takes a single commit from commit_id', () => {
    expect(mergeRequestAt(`${diffs}?commit_id=c0ffee0`)).toMatchObject({
      commit: 'c0ffee0',
      key: 'g/p!42@c0ffee0',
    })
    expect(mergeRequestAt(`${diffs}?diff_id=3&commit_id=c0ffee0`)?.commit).toBe('c0ffee0')
  })

  it('resolves no merge request for older versions and commit ranges', () => {
    expect(mergeRequestAt(`${diffs}?diff_id=3`)).toBeNull()
    expect(mergeRequestAt(`${diffs}?diff_id=3&start_sha=aaaaaaa`)).toBeNull()
    expect(mergeRequestAt(`${diffs}?commit_id=c0ffee0&start_sha=aaaaaaa`)).toBeNull()
  })

  it('builds an encoded raw-file API url', () => {
    expect(routes.rawFileUrl('https://gitlab.com', 'group/proj', 'a/b.bpmn', 'abc123')).toBe(
      'https://gitlab.com/api/v4/projects/group%2Fproj/repository/files/a%2Fb.bpmn/raw?ref=abc123',
    )
  })
})
