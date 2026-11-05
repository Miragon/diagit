import { describe, expect, it, vi } from 'vitest'
import { FetchProxy } from '../src/background/FetchProxy'
import { FetchScope } from '../src/background/FetchScope'
import type { AuthPolicy } from '../src/git-hosts/GitHost'

const tokenForApi: AuthPolicy = {
  headersFor: async (url) =>
    url.startsWith('https://api.github.com') ? { Authorization: 'Bearer t' } : undefined,
  headersAfterUnauthorized: async (url) =>
    url.startsWith('https://api.github.com') ? { Authorization: 'Bearer renewed' } : undefined,
}

const githubPage = 'https://github.com'
const gitlabPage = 'https://gitlab.com'

function textResponse(url: string, text: string, status = 200): Response {
  return { ok: status < 400, status, url, text: async () => text } as unknown as Response
}

function proxyWith(fetch: typeof globalThis.fetch, policies: AuthPolicy[] = []): FetchProxy {
  return new FetchProxy(policies, new FetchScope(), fetch)
}

describe('FetchProxy', () => {
  it('sends cookies and the auth headers of the policy that claims the url', async () => {
    const url = 'https://api.github.com/x'
    const fetch = vi.fn().mockResolvedValue(textResponse(url, '<xml/>'))

    const response = await proxyWith(fetch, [tokenForApi]).fetchText(url, githubPage)

    expect(response).toEqual({ ok: true, text: '<xml/>' })
    expect(fetch).toHaveBeenCalledWith(url, {
      credentials: 'include',
      headers: { Authorization: 'Bearer t' },
    })
  })

  it('sends no auth header for a same-origin fetch', async () => {
    const url = 'https://github.com/o/r/raw/a.bpmn'
    const fetch = vi.fn().mockResolvedValue(textResponse(url, ''))

    await proxyWith(fetch, [tokenForApi]).fetchText(url, githubPage)

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

  it('returns the body of a same-origin redirect', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(textResponse('https://gitlab.com/g/renamed/-/raw/main/a.bpmn', '<xml/>'))

    const response = await proxyWith(fetch).fetchText(
      'https://gitlab.com/g/p/-/raw/main/a.bpmn',
      gitlabPage,
    )

    expect(response).toEqual({ ok: true, text: '<xml/>' })
  })

  it('returns the body of a github.com raw file served from raw.githubusercontent.com', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        textResponse('https://raw.githubusercontent.com/o/r/main/a.bpmn?token=abc', '<xml/>'),
      )

    const response = await proxyWith(fetch).fetchText(
      'https://github.com/o/r/raw/main/a.bpmn',
      githubPage,
    )

    expect(response).toEqual({ ok: true, text: '<xml/>' })
  })

  it('refuses the body of a redirect to another origin', async () => {
    const text = vi.fn()
    const redirected = { ok: true, status: 200, url: 'https://evil.example/x', text }
    const fetch = vi.fn().mockResolvedValue(redirected)

    expect(await proxyWith(fetch).fetchText('https://gitlab.com/a', gitlabPage)).toEqual({
      ok: false,
      error: 'Refused the redirect of https://gitlab.com/a for this page',
    })
    expect(text).not.toHaveBeenCalled()
  })

  it('retries a 401 once with the renewed auth headers', async () => {
    const url = 'https://api.github.com/x'
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(textResponse(url, '', 401))
      .mockResolvedValueOnce(textResponse(url, '<xml/>'))

    const response = await proxyWith(fetch, [tokenForApi]).fetchText(url, githubPage)

    expect(response).toEqual({ ok: true, text: '<xml/>' })
    expect(fetch).toHaveBeenNthCalledWith(1, url, {
      credentials: 'include',
      headers: { Authorization: 'Bearer t' },
    })
    expect(fetch).toHaveBeenNthCalledWith(2, url, {
      credentials: 'include',
      headers: { Authorization: 'Bearer renewed' },
    })
  })

  it('reports the 401 when the renewed headers are rejected too', async () => {
    const url = 'https://api.github.com/x'
    const fetch = vi.fn().mockResolvedValue(textResponse(url, '', 401))

    const response = await proxyWith(fetch, [tokenForApi]).fetchText(url, githubPage)

    expect(response).toMatchObject({ ok: false, status: 401 })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 401 for a request that carried no auth headers', async () => {
    const url = 'https://github.com/o/r/raw/main/a.bpmn'
    const fetch = vi.fn().mockResolvedValue(textResponse(url, '', 401))

    await proxyWith(fetch, [tokenForApi]).fetchText(url, githubPage)

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reports HTTP failures with their status', async () => {
    const fetch = vi.fn().mockResolvedValue(textResponse('https://gitlab.com/a', '', 404))

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
