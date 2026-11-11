import { describe, expect, it } from 'vitest'
import { githubHost, hostRegistry } from '../src/git-hosts/hosts'

const scriptsAt = (url: string) => hostRegistry.viewScriptsFor(new URL(url))

describe('HostRegistry.viewScriptsFor', () => {
  it('loads the GitHub blob viewer for diagram files only', () => {
    expect(scriptsAt('https://github.com/o/r/blob/main/flows/order.bpmn')).toEqual(['github-blob'])
    expect(scriptsAt('https://github.com/o/r/blob/main/rules.DMN')).toEqual(['github-blob'])
    expect(scriptsAt('https://github.com/o/r/blob/main/README.md')).toEqual([])
  })

  it('loads the GitHub diff scripts on pull requests and commits', () => {
    expect(scriptsAt('https://github.com/o/r/pull/12')).toEqual(['github-pr'])
    expect(scriptsAt('https://github.com/o/r/pull/12/files')).toEqual(['github-pr'])
    expect(scriptsAt('https://github.com/o/r/commit/c0ffee0')).toEqual(['github-commit'])
    expect(scriptsAt('https://github.com/o/r/pull/12/commits/c0ffee0')).toEqual(['github-pr'])
  })

  it('loads no diff script on merge request versions it cannot compare', () => {
    const mergeRequest = 'https://gitlab.com/g/p/-/merge_requests/1/diffs'
    expect(scriptsAt(`${mergeRequest}?commit_id=c0ffee0`)).toEqual(['gitlab-mr'])
    expect(scriptsAt(`${mergeRequest}?diff_id=3&start_sha=c0ffee0`)).toEqual([])
  })

  it('loads nothing on GitHub pages without a diagram view', () => {
    expect(scriptsAt('https://github.com/o/r')).toEqual([])
    expect(scriptsAt('https://github.com/o/r/tree/main/flows')).toEqual([])
    expect(scriptsAt('https://github.com/o/r/pulls')).toEqual([])
    expect(scriptsAt('https://github.com/o/r/commits/main')).toEqual([])
  })

  it('renders github.com files below a directory named "-"', () => {
    expect(scriptsAt('https://github.com/o/r/blob/main/-/order.bpmn')).toEqual(['github-blob'])
  })

  it('loads the GitLab scripts on gitlab.com', () => {
    expect(scriptsAt('https://gitlab.com/g/p/-/blob/main/order.bpmn')).toEqual(['gitlab-blob'])
    expect(scriptsAt('https://gitlab.com/g/sub/p/-/merge_requests/42/diffs')).toEqual(['gitlab-mr'])
    expect(scriptsAt('https://gitlab.com/g/p/-/blob/main/README.md')).toEqual([])
    expect(scriptsAt('https://gitlab.com/g/p/-/tree/main')).toEqual([])
    expect(scriptsAt('https://gitlab.com/g/p')).toEqual([])
  })

  it('never mixes the flavours on the public hosts', () => {
    expect(scriptsAt('https://gitlab.com/g/p/-/blob/main/pull/1/order.bpmn')).toEqual([
      'gitlab-blob',
    ])
    expect(scriptsAt('https://github.com/o/r/pull/1/-/merge_requests/2')).toEqual(['github-pr'])
  })

  it('tells the flavour of a self-hosted instance from its route shape', () => {
    expect(scriptsAt('https://git.example.com/g/p/-/blob/main/order.bpmn')).toEqual(['gitlab-blob'])
    expect(scriptsAt('https://git.example.com/g/p/-/merge_requests/3')).toEqual(['gitlab-mr'])
    expect(scriptsAt('https://git.example.com/g/p/-/tree/main')).toEqual([])
    expect(scriptsAt('https://ghe.example.com/o/r/blob/main/order.bpmn')).toEqual(['github-blob'])
    expect(scriptsAt('https://ghe.example.com/o/r/pull/3/files')).toEqual(['github-pr'])
    expect(scriptsAt('https://ghe.example.com/o/r/commit/c0ffee0')).toEqual(['github-commit'])
    expect(scriptsAt('http://localhost:4599/octo/flows')).toEqual([])
  })
})

describe('HostRegistry.isSupportedUrl', () => {
  it('matches diagram blobs on GitLab and GitHub (incl. self-hosted)', () => {
    expect(hostRegistry.isSupportedUrl('https://gitlab.com/group/repo/-/blob/main/flow.bpmn')).toBe(
      true,
    )
    expect(hostRegistry.isSupportedUrl('https://github.com/org/repo/blob/main/flow.bpmn')).toBe(
      true,
    )
    expect(
      hostRegistry.isSupportedUrl('https://ghe.example.com/org/repo/blob/main/rules.dmn'),
    ).toBe(true)
    expect(hostRegistry.isSupportedUrl('https://github.com/o/r/blob/main/a.bpmn?plain=1')).toBe(
      true,
    )
  })

  it('matches merge requests, pull requests and commits', () => {
    expect(
      hostRegistry.isSupportedUrl('https://gitlab.example.com/g/r/-/merge_requests/42/diffs'),
    ).toBe(true)
    expect(hostRegistry.isSupportedUrl('https://ghe.example.com/org/repo/pull/7/files')).toBe(true)
    expect(hostRegistry.isSupportedUrl('https://ghe.example.com/org/repo/commit/0123abc')).toBe(
      true,
    )
  })

  it('rejects non-diagram files, unrelated pages and non-http schemes', () => {
    expect(hostRegistry.isSupportedUrl('https://github.com/org/repo/blob/main/README.md')).toBe(
      false,
    )
    expect(hostRegistry.isSupportedUrl('https://gitlab.com/group/repo')).toBe(false)
    expect(hostRegistry.isSupportedUrl('chrome-extension://abc/options.html')).toBe(false)
    expect(hostRegistry.isSupportedUrl('not a url')).toBe(false)
  })
})

describe('HostRegistry contributions', () => {
  it('lists every view script once, matching the content-script entrypoints', () => {
    expect(hostRegistry.allViewScripts()).toEqual([
      'gitlab-blob',
      'gitlab-mr',
      'github-blob',
      'github-pr',
      'github-commit',
    ])
  })

  it('derives the public view-router matches from the hosts', () => {
    expect(hostRegistry.publicMatchPatterns()).toEqual([
      'https://gitlab.com/*',
      'https://github.com/*',
    ])
  })

  it('collects the auth policy of every host that has one', () => {
    expect(hostRegistry.authPolicies()).toEqual([githubHost.authPolicy])
  })
})
