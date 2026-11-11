import type { AuthPolicy } from '../git-hosts/GitHost'
import type { FetchTextResponse } from '../platform/messaging/messages'
import { errorMessage } from '../platform/utils/errorMessage'
import type { FetchGrant, FetchScope } from './FetchScope'

type Fetch = typeof fetch

const UNAUTHORIZED = 401
const RATE_LIMIT_STATUSES = [403, 429]

export class FetchProxy {
  constructor(
    private readonly authPolicies: readonly AuthPolicy[],
    private readonly scope: FetchScope,
    private readonly fetch: Fetch = (...args) => globalThis.fetch(...args),
  ) {}

  async fetchText(url: string, pageOrigin: string): Promise<FetchTextResponse> {
    const grant = this.scope.grantFor(pageOrigin, url)
    if (!grant) return { ok: false, error: `Refused to fetch ${url} for this page` }
    try {
      const response = await this.fetchAuthorized(url, grant)
      if (
        response.type === 'opaqueredirect' ||
        !this.scope.allowsResponseFrom(pageOrigin, response.url)
      ) {
        return { ok: false, error: `Refused the redirect of ${url} for this page` }
      }
      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP ${response.status} for ${url}`,
          status: response.status,
          rateLimitResetsAt: this.rateLimitResetsAt(response),
        }
      }
      return { ok: true, text: await response.text() }
    } catch (err) {
      return { ok: false, error: errorMessage(err) }
    }
  }

  private rateLimitResetsAt(response: Response): number | undefined {
    if (!RATE_LIMIT_STATUSES.includes(response.status)) return undefined
    const headers = response.headers
    const retryAfterSeconds = this.secondsIn(headers.get('retry-after'))
    if (retryAfterSeconds !== undefined) return Date.now() + retryAfterSeconds * 1000
    const resetEpochSeconds =
      headers.get('x-ratelimit-remaining') === '0'
        ? this.secondsIn(headers.get('x-ratelimit-reset'))
        : headers.get('ratelimit-remaining') === '0'
          ? this.secondsIn(headers.get('ratelimit-reset'))
          : undefined
    return resetEpochSeconds === undefined ? undefined : resetEpochSeconds * 1000
  }

  private secondsIn(header: string | null): number | undefined {
    const seconds = Number(header || NaN)
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
  }

  private async fetchAuthorized(url: string, grant: FetchGrant): Promise<Response> {
    const redirect = grant.followsRedirects ? 'follow' : 'manual'
    const headers = grant.withAuth ? await this.authHeadersFor(url) : undefined
    const response = await this.send(url, redirect, headers)
    if (response.status !== UNAUTHORIZED || !headers) return response
    const renewedHeaders = await this.renewedAuthHeadersFor(url, headers)
    return renewedHeaders ? this.send(url, redirect, renewedHeaders) : response
  }

  private send(
    url: string,
    redirect: RequestRedirect,
    headers: HeadersInit | undefined,
  ): Promise<Response> {
    return this.fetch(url, { credentials: 'include', headers, redirect })
  }

  private async authHeadersFor(url: string): Promise<HeadersInit | undefined> {
    for (const policy of this.authPolicies) {
      const headers = await policy.headersFor(url)
      if (headers) return headers
    }
    return undefined
  }

  private async renewedAuthHeadersFor(
    url: string,
    rejected: HeadersInit,
  ): Promise<HeadersInit | undefined> {
    for (const policy of this.authPolicies) {
      const headers = await policy.headersAfterUnauthorized(url, rejected)
      if (headers) return headers
    }
    return undefined
  }
}
