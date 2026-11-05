import { describe, expect, it, vi } from 'vitest'
import { FetchProxy } from '../src/background/FetchProxy'
import { FetchScope } from '../src/background/FetchScope'
import type { AuthPolicy } from '../src/git-hosts/GitHost'

const tokenForApi: AuthPolicy = {
  headersFor: async (url) =>
    url.startsWith('https://api.github.com') ? { Authorization: 'Bearer t' } : undefined,
}

const githubPage = 'https://github.com/o/r/pull/1/files'
const gitlabPage = 'https://gitlab.com/g/p/-/merge_requests/2'

function textResponse(text: string, status = 200): Response {
  return { ok: status < 400, status, text: async () => text } as unknown as Response
}

function proxyWith(fetch: typeof globalThis.fetch, policies: AuthPolicy[] = []): FetchProxy {
  return new FetchProxy(policies, new FetchScope(), fetch)
}

describe('FetchProxy', () => {
  it('sends cookies and the auth headers of the policy that claims the url', async () => {
    const fetch = vi.fn().mockResolvedValue(textResponse('<xml/>'))

    const response = await proxyWith(fetch, [tokenForApi]).fetchText(
      'https://api.github.com/x',
      githubPage,
    )

    expect(response).toEqual({ ok: true, text: '<xml/>' })
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/x', {
      credentials: 'include',
      headers: { Authorization: 'Bearer t' },
    })
  })

  it('sends no auth header for a same-origin fetch', async () => {
    const fetch = vi.fn().mockResolvedValue(textResponse(''))

    await proxyWith(fetch, [tokenForApi]).fetchText('https://github.com/o/r/raw/a.bpmn', githubPage)

    expect(fetch.mock.calls[0]![1].headers).toBeUndefined()
  })

  it('refuses urls outside the scope of the sender page without fetching', async () => {
    const fetch = vi.fn()

    expect(await proxyWith(fetch).fetchText('https://api.github.com/x', gitlabPage)).toEqual({
      ok: false,
      error: 'Refused to fetch https://api.github.com/x for this page',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses every url when the sender page is unknown', async () => {
    const fetch = vi.fn()

    const response = await proxyWith(fetch).fetchText('https://gitlab.com/x', undefined)

    expect(response.ok).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports HTTP failures with their status', async () => {
    const fetch = vi.fn().mockResolvedValue(textResponse('', 404))

    expect(await proxyWith(fetch).fetchText('https://gitlab.com/a', gitlabPage)).toEqual({
      ok: false,
      error: 'HTTP 404 for https://gitlab.com/a',
      status: 404,
    })
  })

  it('reports network failures', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline'))

    expect(await proxyWith(fetch).fetchText('https://gitlab.com/a', gitlabPage)).toEqual({
      ok: false,
      error: 'offline',
    })
  })
})
