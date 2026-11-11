import { FetchError } from '../../platform/messaging/HttpClient'
import type { AuthPolicy } from '../GitHost'
import type { GithubRoutes } from './GithubRoutes'
import type { GithubTokenRefresher } from './GithubTokenRefresher'

const GITHUB_API_HOST = 'api.github.com'
const BEARER_PREFIX = 'Bearer '

const CONNECT_APP_HINT =
  ' Connect the GitHub App in the extension options and install it on this repository (authorise it for the organisation if it uses SSO).'
const MAYBE_EXPIRED_HINT = ' If you connected GitHub before, the connection may have expired.'
const RECONNECT_APP_HINT = ' Reconnect the GitHub App in the extension options.'

export class GithubApiAuth implements AuthPolicy {
  constructor(
    private readonly tokens: GithubTokenRefresher,
    private readonly routes: GithubRoutes,
  ) {}

  targets(url: string): boolean {
    try {
      return new URL(url).host === GITHUB_API_HOST
    } catch {
      return false
    }
  }

  async headersFor(url: string): Promise<HeadersInit | undefined> {
    if (!this.targets(url)) return undefined
    return this.bearer(await this.tokens.validToken())
  }

  async headersAfterUnauthorized(
    url: string,
    rejected: HeadersInit,
  ): Promise<HeadersInit | undefined> {
    if (!this.targets(url)) return undefined
    const rejectedToken = new Headers(rejected).get('Authorization')?.slice(BEARER_PREFIX.length)
    return rejectedToken ? this.bearer(await this.tokens.replacementFor(rejectedToken)) : undefined
  }

  private bearer(token: string): HeadersInit | undefined {
    return token ? { Authorization: `${BEARER_PREFIX}${token}` } : undefined
  }

  errorHint(location: Location, err: unknown): string {
    const status = err instanceof FetchError ? err.status : undefined
    const tokenCanHelp = this.targets(this.routes.apiBase(location))
    const connectApp = tokenCanHelp ? CONNECT_APP_HINT : ''
    switch (status) {
      case 401:
        return `Your GitHub connection looks expired or revoked.${tokenCanHelp ? RECONNECT_APP_HINT : ''}`
      case 403:
        return `GitHub returned 403: the anonymous rate limit is exhausted, or the app is not authorised for this organisation (SSO).${connectApp}`
      case 404:
        return `This looks like a private repository the page login cannot reach from api.github.com.${connectApp}${tokenCanHelp ? MAYBE_EXPIRED_HINT : ''}`
      default:
        return `Could not load the diff metadata${tokenCanHelp ? ' from api.github.com' : ''}.${connectApp}`
    }
  }
}
