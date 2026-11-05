import type { AuthPolicy } from '../git-hosts/GitHost'
import type { FetchTextResponse } from '../platform/messaging/messages'
import { errorMessage } from '../platform/utils/errorMessage'
import type { FetchScope } from './FetchScope'

type Fetch = typeof fetch

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
      const response = await this.fetch(url, {
        credentials: 'include',
        headers: grant.withAuth ? await this.authHeadersFor(url) : undefined,
      })
      if (!this.scope.allowsResponseFrom(pageOrigin, response.url)) {
        return { ok: false, error: `Refused the redirect of ${url} for this page` }
      }
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status} for ${url}`, status: response.status }
      }
      return { ok: true, text: await response.text() }
    } catch (err) {
      return { ok: false, error: errorMessage(err) }
    }
  }

  private async authHeadersFor(url: string): Promise<HeadersInit | undefined> {
    for (const policy of this.authPolicies) {
      const headers = await policy.headersFor(url)
      if (headers) return headers
    }
    return undefined
  }
}
