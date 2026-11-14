import { ExternalLink, Link } from 'lucide'
import { FetchError } from '../../platform/messaging/HttpClient'
import type { NoticeAction } from '../../platform/ui/Notice'
import type { ErrorHelp } from '../DiffSource'
import type { AuthPolicy, PageUrl } from '../GitHost'
import { rateLimitHelp } from '../utils/rateLimitHelp'
import { GITHUB_APP_INSTALL_URL } from './GithubDeviceFlow'
import type { GithubRoutes } from './GithubRoutes'
import type { GithubTokenRefresher } from './GithubTokenRefresher'
import type { GithubTokenStore } from './GithubTokenStore'

const GITHUB_API_HOST = 'api.github.com'
const BEARER_PREFIX = 'Bearer '

const LOGIN_EXPIRED = 'GitHub login expired'
const ACCESS_DENIED = 'GitHub denied access'
const LOOKS_PRIVATE = 'This repository looks private'
const SSO_REQUIRED = 'Your organisation may require SSO.'
const RAISE_RATE_LIMIT = 'Connect GitHub to raise the limit.'
const RELOAD_TO_RETRY = 'Reload the page to try again.'

const CONNECT_GITHUB: NoticeAction = { label: 'Connect GitHub', icon: Link, opensOptions: true }
const INSTALL_APP: NoticeAction = {
  label: 'Install on this repository',
  icon: ExternalLink,
  url: GITHUB_APP_INSTALL_URL,
}

export class GithubApiAuth implements AuthPolicy {
  constructor(
    private readonly tokens: GithubTokenRefresher,
    private readonly store: GithubTokenStore,
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
    if (!this.targets(url)) {
      return undefined
    }
    return this.bearer(await this.tokens.validToken())
  }

  async headersAfterUnauthorized(
    url: string,
    rejected: HeadersInit,
  ): Promise<HeadersInit | undefined> {
    if (!this.targets(url)) {
      return undefined
    }
    const rejectedToken = new Headers(rejected).get('Authorization')?.slice(BEARER_PREFIX.length)
    return rejectedToken ? this.bearer(await this.tokens.replacementFor(rejectedToken)) : undefined
  }

  private bearer(token: string): HeadersInit | undefined {
    return token ? { Authorization: `${BEARER_PREFIX}${token}` } : undefined
  }

  async errorHelp(location: PageUrl, err: unknown): Promise<ErrorHelp> {
    const status = err instanceof FetchError ? err.status : undefined
    const rateLimit = rateLimitHelp('GitHub', err)
    if (!this.targets(this.routes.apiBase(location))) {
      return rateLimit ? { tone: 'warning', ...rateLimit } : this.enterpriseHelp(location, status)
    }
    const connected = await this.store.token().then(Boolean, () => false)
    if (rateLimit) {
      return connected
        ? { tone: 'warning', ...rateLimit }
        : {
            tone: 'warning',
            title: rateLimit.title,
            body: `${rateLimit.body} ${RAISE_RATE_LIMIT}`,
            action: CONNECT_GITHUB,
          }
    }
    switch (status) {
      case 401:
        return {
          tone: 'warning',
          title: LOGIN_EXPIRED,
          body: 'Connect GitHub again to see diagrams in private repositories.',
          action: CONNECT_GITHUB,
        }
      case 403:
        return connected
          ? {
              tone: 'warning',
              title: 'Diagit GitHub App has no access here',
              body: 'Install it on this repository or authorise it for the organisation (SSO).',
              action: INSTALL_APP,
            }
          : {
              tone: 'warning',
              title: ACCESS_DENIED,
              body: `${SSO_REQUIRED} Connect GitHub to continue.`,
              action: CONNECT_GITHUB,
            }
      case 404:
        return connected
          ? {
              tone: 'warning',
              title: 'Diagit GitHub App is not installed here',
              body: 'Install it on this repository to see its diagrams.',
              action: INSTALL_APP,
            }
          : {
              tone: 'warning',
              title: LOOKS_PRIVATE,
              body: 'Connect GitHub so Diagit can read it. If you connected before, the connection may have expired.',
              action: CONNECT_GITHUB,
            }
      default:
        return {
          tone: 'danger',
          body: RELOAD_TO_RETRY,
          action: connected ? undefined : CONNECT_GITHUB,
        }
    }
  }

  private enterpriseHelp(location: PageUrl, status: number | undefined): ErrorHelp {
    switch (status) {
      case 401:
        return {
          tone: 'warning',
          title: LOGIN_EXPIRED,
          body: `Sign in to ${location.hostname} again.`,
        }
      case 403:
        return { tone: 'warning', title: ACCESS_DENIED, body: SSO_REQUIRED }
      case 404:
        return {
          tone: 'warning',
          title: LOOKS_PRIVATE,
          body: 'The page login cannot reach it through the API.',
        }
      default:
        return { tone: 'danger', body: RELOAD_TO_RETRY }
    }
  }
}
