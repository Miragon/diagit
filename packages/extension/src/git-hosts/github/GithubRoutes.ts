export interface PullRequestRef {
  owner: string
  repo: string
  number: string
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
const ENTERPRISE_API_PATH = '/api/v3'

const PULL_REQUEST_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/
const COMMIT_PATH = /^\/([^/]+)\/([^/]+)\/commit\/([0-9a-fA-F]{7,64})/

export class GithubRoutes {
  pullRequest(location: Pick<Location, 'pathname'>): PullRequestRef | null {
    const match = location.pathname.match(PULL_REQUEST_PATH)
    if (!match) return null
    const [, owner, repo, number] = match
    return { owner: owner!, repo: repo!, number: number!, key: `${owner}/${repo}!${number}` }
  }

  commit(location: Pick<Location, 'pathname'>): CommitRef | null {
    const match = location.pathname.match(COMMIT_PATH)
    if (!match) return null
    const [, owner, repo, sha] = match
    return { owner: owner!, repo: repo!, sha: sha!, key: `${owner}/${repo}@${sha}` }
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
