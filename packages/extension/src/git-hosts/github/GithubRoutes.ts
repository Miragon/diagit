export interface CommitRange {
  base: string
  head: string
}

type PullRequestRevisions = { commit: string } | CommitRange

export interface PullRequestRef {
  owner: string
  repo: string
  number: string
  revisions: PullRequestRevisions | null
  key: string
}

export interface CommitRef {
  owner: string
  repo: string
  sha: string
  key: string
}

export const GITHUB_PUBLIC_ORIGIN = 'https://github.com'
const GITHUB_PUBLIC_HOSTNAME = 'github.com'
export const GITHUB_PUBLIC_API = 'https://api.github.com'
export const GITHUB_RAW_CONTENT_ORIGIN = 'https://raw.githubusercontent.com'
export const GITHUB_RAW_FILE_PATH = /^\/[^/]+\/[^/]+\/raw\//
const ENTERPRISE_API_PATH = '/api/v3'

const PULL_REQUEST_PATH =
  /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/(?:files|changes|commits)\/([^/]+))?/
const PULL_REQUEST_DIFFS_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/(files|changes|commits\/[^/]+)/
const REVISIONS = /^(?:([0-9a-fA-F]{7,64})\.\.)?([0-9a-fA-F]{7,64})$/
const COMMIT_PATH = /^\/([^/]+)\/([^/]+)\/commit\/([0-9a-fA-F]{7,64})/

export class GithubRoutes {
  pullRequest(location: Pick<Location, 'pathname'>): PullRequestRef | null {
    const match = location.pathname.match(PULL_REQUEST_PATH)
    if (!match) return null
    const [, owner, repo, number, revisionPath] = match
    const pullRequestKey = `${owner}/${repo}!${number}`
    if (!revisionPath) {
      return { owner: owner!, repo: repo!, number: number!, revisions: null, key: pullRequestKey }
    }
    const revisions = this.revisions(revisionPath)
    if (!revisions) return null
    return {
      owner: owner!,
      repo: repo!,
      number: number!,
      revisions,
      key: `${pullRequestKey}@${revisionPath}`,
    }
  }

  pullRequestDiffs(location: Pick<Location, 'pathname'>): boolean {
    return PULL_REQUEST_DIFFS_PATH.test(location.pathname)
  }

  commit(location: Pick<Location, 'pathname'>): CommitRef | null {
    const match = location.pathname.match(COMMIT_PATH)
    if (!match) return null
    const [, owner, repo, sha] = match
    return { owner: owner!, repo: repo!, sha: sha!, key: `${owner}/${repo}@${sha}` }
  }

  private revisions(revisionPath: string): PullRequestRevisions | null {
    const match = revisionPath.match(REVISIONS)
    if (!match) return null
    const [, base, head] = match
    return base ? { base, head: head! } : { commit: head! }
  }

  apiBase(location: Pick<Location, 'hostname' | 'origin'>): string {
    return location.hostname === GITHUB_PUBLIC_HOSTNAME
      ? GITHUB_PUBLIC_API
      : `${location.origin}${ENTERPRISE_API_PATH}`
  }

  rawFileUrl(
    location: Pick<Location, 'origin'>,
    repoFullName: string,
    ref: string,
    path: string,
  ): string {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    return `${location.origin}/${repoFullName}/raw/${encodeURIComponent(ref)}/${encodedPath}`
  }
}
