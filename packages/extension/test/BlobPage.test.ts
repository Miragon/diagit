import { describe, expect, it } from 'vitest'
import { githubHost, gitlabHost } from '../src/git-hosts/hosts'

function loc(pathname: string, origin = 'https://gitlab.com', search = ''): Location {
  return { pathname, origin, search, hostname: new URL(origin).hostname } as Location
}

describe('GitLab blob page', () => {
  const blobPage = gitlabHost.blobPage

  it('recognises blob pages by the blob segment and diagrams by their notation', () => {
    expect(blobPage.isBlob(loc('/g/p/-/blob/main/order.bpmn'))).toBe(true)
    expect(blobPage.isBlob(loc('/g/p/-/blob/main/readme.md'))).toBe(true)
    expect(blobPage.showsDiagram(loc('/g/p/-/blob/main/readme.md'))).toBe(false)
    expect(blobPage.isBlob(loc('/g/p/-/tree/main'))).toBe(false)
  })

  it('derives the raw URL and file path', () => {
    const location = loc('/g/p/-/blob/main/flows/order.bpmn')
    expect(blobPage.rawUrl(location)).toBe('https://gitlab.com/g/p/-/raw/main/flows/order.bpmn')
    expect(blobPage.filePath(location)).toBe('flows/order.bpmn')
  })
})

describe('GitHub blob page', () => {
  it('recognises blob pages and derives the raw URL', () => {
    const location = loc('/org/repo/blob/main/dir/flow.bpmn', 'https://github.com')
    expect(githubHost.blobPage.showsDiagram(location)).toBe(true)
    expect(githubHost.blobPage.rawUrl(location)).toBe(
      'https://github.com/org/repo/raw/main/dir/flow.bpmn',
    )
    expect(githubHost.blobPage.filePath(location)).toBe('dir/flow.bpmn')
  })
})

describe('blob page links', () => {
  it('knows a link to a line or a range of lines', () => {
    expect(githubHost.blobPage.isLinkedFrom('#L42')).toBe(true)
    expect(githubHost.blobPage.isLinkedFrom('#L42-L50')).toBe(true)
    expect(gitlabHost.blobPage.isLinkedFrom('#L7')).toBe(true)
    expect(githubHost.blobPage.isLinkedFrom('#readme')).toBe(false)
    expect(githubHost.blobPage.isLinkedFrom('')).toBe(false)
  })
})
