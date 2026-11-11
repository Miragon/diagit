import { FetchError } from '../../platform/messaging/HttpClient'
import type { ErrorNoticeAction } from '../../platform/ui/ErrorNotice'
import type { ErrorHelp } from '../DiffSource'
import type { AuthPolicy } from '../GitHost'
import { rateLimitHint } from '../utils/rateLimitHint'
import { GITHUB_APP_INSTALL_URL } from './GithubDeviceFlow'
import type { GithubRoutes } from './GithubRoutes'
import type { GithubTokenRefresher } from './GithubTokenRefresher'
import type { GithubTokenStore } from './GithubTokenStore'

const GITHUB_API_HOST = 'api.github.com'
const BEARER_PREFIX = 'Bearer '

const EXPIRED_CONNECTION_HINT = 'Your GitHub connection looks expired or revoked.'
const FORBIDDEN_HINT = 'GitHub returned 403. Your organisation may require SSO authorisation.'
const RAISE_RATE_LIMIT_HINT = 'Connect GitHub to raise the limit.'
const UNREACHABLE_REPOSITORY_HINT =
  'This looks like a private repository the page login cannot reach through the API.'
const PRIVATE_REPOSITORY_HINT =
  'This looks like a private repository. Diagit can read it once you connect GitHub. If you connected GitHub before, the connection may have expired.'
const APP_NOT_INSTALLED_HINT = 'The Diagit GitHub App is not installed on this repository.'
const APP_FORBIDDEN_HINT =
  'GitHub returned 403: the Diagit GitHub App is not installed on this repository or not authorised for its organisation (SSO).'
const METADATA_HINT = 'Could not load the diff metadata.'
const API_METADATA_HINT = 'Could not load the diff metadata from api.github.com.'

const CONNECT_GITHUB: ErrorNoticeAction = { label: 'Connect GitHub', opensOptions: true }
const INSTALL_APP: ErrorNoticeAction = {
  label: 'Install on this repository',
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

  async errorHelp(location: Location, err: unknown): Promise<ErrorHelp> {
    const status = err instanceof FetchError ? err.status : undefined
    const rateLimitReached = rateLimitHint('GitHub', err)
    if (!this.targets(this.routes.apiBase(location))) {
      return { hint: rateLimitReached ?? this.enterpriseHint(status) }
    }
    const connected = await this.store.token().then(Boolean, () => false)
    if (rateLimitReached) {
      return connected
        ? { hint: rateLimitReached }
        : { hint: `${rateLimitReached} ${RAISE_RATE_LIMIT_HINT}`, action: CONNECT_GITHUB }
    }
    switch (status) {
      case 401:
        return { hint: EXPIRED_CONNECTION_HINT, action: CONNECT_GITHUB }
      case 403:
        return connected
          ? { hint: APP_FORBIDDEN_HINT, action: INSTALL_APP }
          : { hint: FORBIDDEN_HINT, action: CONNECT_GITHUB }
      case 404:
        return connected
          ? { hint: APP_NOT_INSTALLED_HINT, action: INSTALL_APP }
          : { hint: PRIVATE_REPOSITORY_HINT, action: CONNECT_GITHUB }
      default:
        return { hint: API_METADATA_HINT, action: connected ? undefined : CONNECT_GITHUB }
    }
  }

  private enterpriseHint(status: number | undefined): string {
    switch (status) {
      case 401:
        return EXPIRED_CONNECTION_HINT
      case 403:
        return FORBIDDEN_HINT
      case 404:
        return UNREACHABLE_REPOSITORY_HINT
      default:
        return METADATA_HINT
    }
  }
}
