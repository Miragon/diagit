import { GITHUB_PUBLIC_API, GITHUB_PUBLIC_ORIGIN } from '../git-hosts/github/GithubRoutes'

export interface FetchGrant {
  withAuth: boolean
}

const AUTHENTICATED_API_BY_PAGE_ORIGIN: ReadonlyMap<string, string> = new Map([
  [GITHUB_PUBLIC_ORIGIN, GITHUB_PUBLIC_API],
])

export class FetchScope {
  grantFor(pageUrl: string, targetUrl: string): FetchGrant | null {
    const pageOrigin = this.webOrigin(pageUrl)
    const targetOrigin = this.webOrigin(targetUrl)
    if (!pageOrigin || !targetOrigin) return null
    const authenticatedApi = AUTHENTICATED_API_BY_PAGE_ORIGIN.get(pageOrigin)
    if (targetOrigin === authenticatedApi) return { withAuth: true }
    if (targetOrigin === pageOrigin) return { withAuth: false }
    return null
  }

  private webOrigin(url: string): string | null {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
      return parsed.origin
    } catch {
      return null
    }
  }
}
