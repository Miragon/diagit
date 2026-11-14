import { describe, expect, it, vi } from 'vitest'
import { FetchProxy } from '../src/background/FetchProxy'
import { FetchScope } from '../src/background/FetchScope'
import type { AuthPolicy } from '../src/git-hosts/GitHost'
import { FetchError } from '../src/platform/messaging/HttpClient'
import { PageHttpClient } from '../src/platform/messaging/PageHttpClient'

const tokenForApi: AuthPolicy = {
  headersFor: async (url) =>
    url.startsWith('https://api.github.com') ? { Authorization: 'Bearer t' } : undefined,
  headersAfterUnauthorized: async () => undefined,
}

function answering(status: number, text = '{"sha":"abc"}') {
  return vi.fn(
    async (url: RequestInfo | URL, _init?: RequestInit) =>
      ({
        ok: status < 400,
        status,
        url: String(url),
        headers: new Headers(),
        text: async () => text,
      }) as Response,
  )
}

function clientOn(pageOrigin: string, fetch: typeof globalThis.fetch): PageHttpClient {
  return new PageHttpClient(new FetchProxy([tokenForApi], new FetchScope(), fetch), pageOrigin)
}

describe('PageHttpClient', () => {
  it('reads the GitHub API with the token on behalf of a github.com page', async () => {
    const fetch = answering(200)

    const commit = await clientOn('https://github.com', fetch).fetchJson(
      'https://api.github.com/repos/o/r/commits/abc',
    )

    expect(commit).toEqual({ sha: 'abc' })
    expect(new Headers(fetch.mock.calls[0]![1]!.headers).get('Authorization')).toBe('Bearer t')
  })

  it('refuses an origin outside the page and its API', async () => {
    const fetch = answering(200)

    await expect(
      clientOn('https://gitlab.com', fetch).fetchText('https://api.github.com/repos/o/r'),
    ).rejects.toBeInstanceOf(FetchError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws the status of a failed request', async () => {
    const failure = clientOn('https://github.com', answering(404)).fetchText(
      'https://api.github.com/repos/o/r/pulls/1',
    )

    await expect(failure).rejects.toMatchObject({ name: 'FetchError', status: 404 })
  })
})
