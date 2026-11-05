import {
  GITHUB_PUBLIC_API,
  GITHUB_PUBLIC_ORIGIN,
  GITHUB_RAW_CONTENT_ORIGIN,
} from '../git-hosts/github/GithubRoutes'
import { webOrigin } from '../platform/utils/origin'

export interface FetchGrant {
  withAuth: boolean
}

const AUTHENTICATED_API_BY_PAGE_ORIGIN: ReadonlyMap<string, string> = new Map([
  [GITHUB_PUBLIC_ORIGIN, GITHUB_PUBLIC_API],
])

const REDIRECT_TARGET_BY_PAGE_ORIGIN: ReadonlyMap<string, string> = new Map([
  [GITHUB_PUBLIC_ORIGIN, GITHUB_RAW_CONTENT_ORIGIN],
])

export class FetchScope {
  grantFor(pageOrigin: string, targetUrl: string): FetchGrant | null {
    const targetOrigin = webOrigin(targetUrl)
    if (!targetOrigin) return null
    if (targetOrigin === AUTHENTICATED_API_BY_PAGE_ORIGIN.get(pageOrigin)) return { withAuth: true }
    if (targetOrigin === pageOrigin) return { withAuth: false }
    return null
  }

  allowsResponseFrom(pageOrigin: string, responseUrl: string): boolean {
    if (this.grantFor(pageOrigin, responseUrl)) return true
    return webOrigin(responseUrl) === REDIRECT_TARGET_BY_PAGE_ORIGIN.get(pageOrigin)
  }
}
