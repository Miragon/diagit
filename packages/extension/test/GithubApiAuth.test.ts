import { describe, expect, it } from 'vitest'
import { GithubApiAuth } from '../src/git-hosts/github/GithubApiAuth'
import { GithubDeviceFlow } from '../src/git-hosts/github/GithubDeviceFlow'
import { GithubRoutes } from '../src/git-hosts/github/GithubRoutes'
import { GithubTokenRefresher } from '../src/git-hosts/github/GithubTokenRefresher'
import { GithubTokenStore } from '../src/git-hosts/github/GithubTokenStore'
import { FetchError } from '../src/platform/messaging/HttpClient'
import { SettingsStore } from '../src/platform/settings/SettingsStore'
import { MemoryStorageArea } from './fakes/MemoryStorageArea'

function authOn(area: MemoryStorageArea): GithubApiAuth {
  const store = new GithubTokenStore(new SettingsStore(() => area))
  const renewingFetch = async () =>
    Response.json({ access_token: 'renewed', refresh_token: 'ghr_renewed' })
  const refresher = new GithubTokenRefresher(store, new GithubDeviceFlow(renewingFetch))
  return new GithubApiAuth(refresher, new GithubRoutes())
}

async function authWithToken(token: string, refreshToken = ''): Promise<GithubApiAuth> {
  const area = new MemoryStorageArea()
  await new GithubTokenStore(new SettingsStore(() => area)).connect(
    { accessToken: token, refreshToken },
    'octocat',
  )
  return authOn(area)
}

const githubCom = { hostname: 'github.com', origin: 'https://github.com' } as Location
const enterprise = { hostname: 'ghe.corp.example', origin: 'https://ghe.corp.example' } as Location

describe('GithubApiAuth.targets (where the token may be sent)', () => {
  it('is true only for the api.github.com host', async () => {
    const auth = await authWithToken('')
    expect(auth.targets('https://api.github.com/repos/o/r/pulls/1')).toBe(true)
    expect(auth.targets('https://github.com/o/r/raw/abc/flows/order.bpmn')).toBe(false)
    expect(auth.targets('https://ghe.corp.example/api/v3/repos/o/r/pulls/1')).toBe(false)
    expect(auth.targets('https://gitlab.com/api/v4/projects/1/merge_requests/2')).toBe(false)
  })

  it('is false for a lookalike host and for a garbage url', async () => {
    const auth = await authWithToken('')
    expect(auth.targets('https://api.github.com.evil.example/repos/o/r')).toBe(false)
    expect(auth.targets('not a url')).toBe(false)
  })
})

describe('GithubApiAuth.headersFor', () => {
  it('sends the stored token to api.github.com only', async () => {
    const auth = await authWithToken('secret')

    expect(await auth.headersFor('https://api.github.com/repos/o/r')).toEqual({
      Authorization: 'Bearer secret',
    })
    expect(await auth.headersFor('https://github.com/o/r/raw/abc/a.bpmn')).toBeUndefined()
  })

  it('sends no header when no token is stored', async () => {
    const auth = await authWithToken('')

    expect(await auth.headersFor('https://api.github.com/repos/o/r')).toBeUndefined()
  })

  it('still sends a token stored before expiring tokens were kept', async () => {
    const area = new MemoryStorageArea()
    Object.assign(area.items, { githubApiToken: 'legacy', githubLogin: 'octocat' })

    expect(await authOn(area).headersFor('https://api.github.com/repos/o/r')).toEqual({
      Authorization: 'Bearer legacy',
    })
  })
})

describe('GithubApiAuth.headersAfterUnauthorized', () => {
  const rejected = { Authorization: 'Bearer secret' }

  it('answers a rejected api.github.com token with a refreshed one', async () => {
    const auth = await authWithToken('secret', 'ghr_secret')

    expect(
      await auth.headersAfterUnauthorized('https://api.github.com/repos/o/r', rejected),
    ).toEqual({ Authorization: 'Bearer renewed' })
  })

  it('has nothing to retry with when the token cannot be refreshed', async () => {
    const auth = await authWithToken('secret')

    expect(
      await auth.headersAfterUnauthorized('https://api.github.com/repos/o/r', rejected),
    ).toBeUndefined()
  })

  it('has nothing to retry with for a url outside api.github.com', async () => {
    const auth = await authWithToken('secret', 'ghr_secret')

    expect(await auth.headersAfterUnauthorized('https://github.com/o/r', rejected)).toBeUndefined()
  })
})

describe('GithubApiAuth.errorHint', () => {
  it('points private github.com repos at the GitHub App', async () => {
    const auth = await authWithToken('')
    const hint = auth.errorHint(githubCom, new FetchError('HTTP 404', 404))
    expect(hint).toMatch(/private repository/i)
    expect(hint).toMatch(/GitHub App/i)
    expect(hint).toMatch(/may have expired/)
  })

  it('maps 403 to a rate-limit / SSO hint', async () => {
    const auth = await authWithToken('')
    expect(auth.errorHint(githubCom, new FetchError('HTTP 403', 403))).toMatch(/rate limit|SSO/i)
  })

  it('never suggests the GitHub App on Enterprise, where the token cannot help', async () => {
    const auth = await authWithToken('')
    const hint = auth.errorHint(enterprise, new FetchError('HTTP 404', 404))
    expect(hint).not.toMatch(/GitHub App/)
    expect(hint).not.toMatch(/expired/)
  })
})
