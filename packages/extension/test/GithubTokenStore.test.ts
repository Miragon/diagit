import { describe, expect, it } from 'vitest'
import { GithubTokenStore } from '../src/git-hosts/github/GithubTokenStore'
import { SettingsStore } from '../src/platform/settings/SettingsStore'
import { MemoryStorageArea } from './fakes/MemoryStorageArea'

const tokens = {
  accessToken: 'ghu_abc',
  accessTokenExpiresAt: 1_000,
  refreshToken: 'ghr_abc',
  refreshTokenExpiresAt: 2_000,
}

function legacyConnection() {
  const area = new MemoryStorageArea()
  Object.assign(area.items, { githubApiToken: ' gho_legacy ', githubLogin: 'octocat' })
  return { area, store: new GithubTokenStore(new SettingsStore(() => area)) }
}

describe('GithubTokenStore', () => {
  it('reads a connection stored before tokens could expire', async () => {
    const { store } = legacyConnection()

    expect(await store.tokenSet()).toEqual({ accessToken: 'gho_legacy', refreshToken: '' })
    expect(await store.login()).toBe('octocat')
  })

  it('keeps the whole connection under one key and drops the legacy keys', async () => {
    const { area, store } = legacyConnection()

    await store.connect(tokens, 'hubot')

    expect(area.items).toEqual({ githubConnection: { tokens, login: 'hubot' } })
  })

  it('forgets every key on disconnect', async () => {
    const { area, store } = legacyConnection()

    await store.disconnect()

    expect(area.items).toEqual({})
    expect(await store.token()).toBe('')
  })

  it('remembers that an expired connection was removed, legacy keys included', async () => {
    const { area, store } = legacyConnection()

    await store.expire()

    expect(area.items).toEqual({ githubDisconnectReason: 'expired' })
    expect(await store.connectionExpired()).toBe(true)
  })

  it('forgets the expiry once the user connects again or disconnects', async () => {
    const { store } = legacyConnection()

    await store.expire()
    await store.connect(tokens, 'hubot')
    expect(await store.connectionExpired()).toBe(false)

    await store.expire()
    await store.disconnect()
    expect(await store.connectionExpired()).toBe(false)
  })
})
