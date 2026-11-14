import { describe, expect, it, vi } from 'vitest'
import { GithubDeviceFlow } from '../src/git-hosts/github/GithubDeviceFlow'
import { GithubTokenRefresher } from '../src/git-hosts/github/GithubTokenRefresher'
import { GithubTokenStore, type GithubTokenSet } from '../src/git-hosts/github/GithubTokenStore'
import { SettingsStore } from '../src/platform/settings/SettingsStore'
import { MemoryStorageArea } from './fakes/MemoryStorageArea'
import { SerialLocks } from './fakes/SerialLocks'

const NOW = 1_000_000_000
const HOUR_MS = 3_600_000

const expiringTokens: GithubTokenSet = {
  accessToken: 'ghu_old',
  accessTokenExpiresAt: NOW + 30_000,
  refreshToken: 'ghr_old',
  refreshTokenExpiresAt: NOW + HOUR_MS,
}

const validTokens: GithubTokenSet = { ...expiringTokens, accessTokenExpiresAt: NOW + HOUR_MS }

const renewedTokens = {
  access_token: 'ghu_new',
  expires_in: 28800,
  refresh_token: 'ghr_new',
  refresh_token_expires_in: 15897600,
}

const otherAccountTokens: GithubTokenSet = {
  accessToken: 'ghu_other',
  accessTokenExpiresAt: NOW + HOUR_MS,
  refreshToken: 'ghr_other',
  refreshTokenExpiresAt: NOW + HOUR_MS,
}

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 300, status, json: async () => body } as unknown as Response
}

function deferredFetch() {
  let answer: (response: Response) => void = () => undefined
  const fetch = vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)))
  return { fetch, answer: (response: Response) => answer(response) }
}

async function refresherFor(
  stored: GithubTokenSet,
  fetch = vi.fn().mockResolvedValue(jsonResponse(renewedTokens)),
) {
  const area = new MemoryStorageArea()
  const store = new GithubTokenStore(new SettingsStore(() => area))
  await store.connect(stored, 'octocat')
  const now = () => NOW
  const locks = new SerialLocks()
  const refresher = new GithubTokenRefresher(store, new GithubDeviceFlow(fetch, now), now, locks)
  return { fetch, store, locks, refresher }
}

describe('GithubTokenRefresher.validToken', () => {
  it('returns the stored token while it is valid', async () => {
    const { fetch, refresher } = await refresherFor(validTokens)

    await expect(refresher.validToken()).resolves.toBe('ghu_old')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refreshes a token that is about to expire', async () => {
    const { fetch, refresher } = await refresherFor(expiringTokens)

    await expect(refresher.validToken()).resolves.toBe('ghu_new')
    expect(new URLSearchParams(fetch.mock.calls[0]![1].body).get('refresh_token')).toBe('ghr_old')
  })

  it('persists the rotated refresh token and the new expiries', async () => {
    const { fetch, store, refresher } = await refresherFor(expiringTokens)

    await refresher.validToken()

    expect(await store.tokenSet()).toEqual({
      accessToken: 'ghu_new',
      accessTokenExpiresAt: NOW + 28_800_000,
      refreshToken: 'ghr_new',
      refreshTokenExpiresAt: NOW + 15_897_600_000,
    })
    await expect(refresher.validToken()).resolves.toBe('ghu_new')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps the login when the tokens are rotated', async () => {
    const { store, refresher } = await refresherFor(expiringTokens)

    await refresher.validToken()

    expect(await store.login()).toBe('octocat')
  })

  it('lets parallel requests share one refresh', async () => {
    const { fetch, answer } = deferredFetch()
    const { refresher } = await refresherFor(expiringTokens, fetch)

    const tokens = Promise.all([refresher.validToken(), refresher.validToken()])
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    const lateToken = refresher.validToken()
    answer(jsonResponse(renewedTokens))

    await expect(tokens).resolves.toEqual(['ghu_new', 'ghu_new'])
    await expect(lateToken).resolves.toBe('ghu_new')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('lets a refresher in another extension page reuse the rotated token', async () => {
    const { fetch, answer } = deferredFetch()
    const { store, locks, refresher } = await refresherFor(expiringTokens, fetch)
    const now = () => NOW
    const otherPage = new GithubTokenRefresher(store, new GithubDeviceFlow(fetch, now), now, locks)

    const tokens = Promise.all([refresher.validToken(), otherPage.validToken()])
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    answer(jsonResponse(renewedTokens))

    await expect(tokens).resolves.toEqual(['ghu_new', 'ghu_new'])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('forgets the connection when GitHub rejects the refresh token', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'bad_refresh_token' }))
    const { store, refresher } = await refresherFor(expiringTokens, fetch)

    await expect(refresher.validToken()).resolves.toBe('')
    expect(await store.token()).toBe('')
    expect(await store.login()).toBe('')
    expect(await store.connectionExpired()).toBe(true)
  })

  it('forgets the connection without asking GitHub once the refresh token expired', async () => {
    const { fetch, store, refresher } = await refresherFor({
      ...expiringTokens,
      refreshTokenExpiresAt: NOW,
    })

    await expect(refresher.validToken()).resolves.toBe('')
    expect(fetch).not.toHaveBeenCalled()
    expect(await store.tokenSet()).toEqual({ accessToken: '', refreshToken: '' })
    expect(await store.connectionExpired()).toBe(true)
  })

  it('keeps using the still valid token when the refresh fails on the network', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline'))
    const { store, refresher } = await refresherFor(expiringTokens, fetch)

    await expect(refresher.validToken()).resolves.toBe('ghu_old')
    expect(await store.tokenSet()).toEqual(expiringTokens)
  })

  it('does not hand out the old token when the user disconnected during a failing refresh', async () => {
    const fetch = vi.fn()
    const { store, refresher } = await refresherFor(expiringTokens, fetch)
    fetch.mockImplementation(async () => {
      await store.disconnect()
      throw new Error('offline')
    })

    await expect(refresher.validToken()).resolves.toBe('')
  })

  it('fails on the network error once the token has expired, but keeps the connection', async () => {
    const expiredTokens = { ...expiringTokens, accessTokenExpiresAt: NOW }
    const fetch = vi.fn().mockRejectedValue(new Error('offline'))
    const { store, refresher } = await refresherFor(expiredTokens, fetch)

    await expect(refresher.validToken()).rejects.toThrow('offline')
    expect(await store.tokenSet()).toEqual(expiredTokens)
  })

  it('keeps the connection when GitHub answers the refresh with a server error', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({}, 502))
    const { store, refresher } = await refresherFor(expiringTokens, fetch)

    await expect(refresher.validToken()).resolves.toBe('ghu_old')
    expect(await store.tokenSet()).toEqual(expiringTokens)
    expect(await store.connectionExpired()).toBe(false)
  })

  it('does not bring back tokens the user disconnected during the refresh', async () => {
    const { fetch, answer } = deferredFetch()
    const { store, refresher } = await refresherFor(expiringTokens, fetch)

    const token = refresher.validToken()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    await store.disconnect()
    answer(jsonResponse(renewedTokens))

    await expect(token).resolves.toBe('')
    expect(await store.tokenSet()).toEqual({ accessToken: '', refreshToken: '' })
    expect(await store.connectionExpired()).toBe(false)
  })

  it('keeps a connection made during the refresh', async () => {
    const { fetch, answer } = deferredFetch()
    const { store, refresher } = await refresherFor(expiringTokens, fetch)

    const token = refresher.validToken()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    await store.connect(otherAccountTokens, 'hubot')
    answer(jsonResponse(renewedTokens))

    await expect(token).resolves.toBe('ghu_other')
    expect(await store.tokenSet()).toEqual(otherAccountTokens)
    expect(await store.login()).toBe('hubot')
  })

  it('does not forget a connection made during a refresh that GitHub rejects', async () => {
    const { fetch, answer } = deferredFetch()
    const { store, refresher } = await refresherFor(expiringTokens, fetch)

    const token = refresher.validToken()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    await store.connect(otherAccountTokens, 'hubot')
    answer(jsonResponse({ error: 'bad_refresh_token' }))

    await expect(token).resolves.toBe('ghu_other')
    expect(await store.tokenSet()).toEqual(otherAccountTokens)
    expect(await store.connectionExpired()).toBe(false)
  })

  it('uses a token that never expires as it is', async () => {
    const { fetch, refresher } = await refresherFor({
      accessToken: 'ghu_forever',
      refreshToken: '',
    })

    await expect(refresher.validToken()).resolves.toBe('ghu_forever')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('GithubTokenRefresher.replacementFor', () => {
  it('refreshes a rejected token even before its expiry', async () => {
    const { refresher } = await refresherFor(validTokens)

    await expect(refresher.replacementFor('ghu_old')).resolves.toBe('ghu_new')
  })

  it('hands out the already rotated token instead of refreshing again', async () => {
    const { fetch, refresher } = await refresherFor(expiringTokens)
    await refresher.validToken()

    await expect(refresher.replacementFor('ghu_old')).resolves.toBe('ghu_new')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('has no replacement when the refresh after a rejection fails on the network', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline'))
    const { store, refresher } = await refresherFor(validTokens, fetch)

    await expect(refresher.replacementFor('ghu_old')).resolves.toBe('')
    expect(await store.tokenSet()).toEqual(validTokens)
  })

  it('has no replacement for a token GitHub cannot refresh and keeps it stored', async () => {
    const { fetch, store, refresher } = await refresherFor({
      accessToken: 'ghu_forever',
      refreshToken: '',
    })

    await expect(refresher.replacementFor('ghu_forever')).resolves.toBe('')
    expect(fetch).not.toHaveBeenCalled()
    expect(await store.token()).toBe('ghu_forever')
  })
})
