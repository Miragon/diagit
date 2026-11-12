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
  return new GithubApiAuth(refresher, store, new GithubRoutes())
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

describe('GithubApiAuth.errorHelp', () => {
  const notFound = new FetchError('HTTP 404', 404)
  const forbidden = new FetchError('HTTP 403', 403)
  const resetsAt = new Date(2030, 0, 1, 14, 32).getTime()
  const resetTime = new Date(resetsAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const rateLimited = (status: number) => new FetchError(`HTTP ${status}`, status, resetsAt)
  const connectGithub = expect.objectContaining({ label: 'Connect GitHub', opensOptions: true })
  const installApp = expect.objectContaining({
    label: 'Install on this repository',
    url: 'https://github.com/apps/miragon-diagit/installations/new',
  })

  it('offers to connect GitHub for a private github.com repo while not connected', async () => {
    const help = await (await authWithToken('')).errorHelp(githubCom, notFound)
    expect(help.tone).toBe('warning')
    expect(help.title).toBe('This repository looks private')
    expect(help.body).toMatch(/may have expired/)
    expect(help.action).toEqual(connectGithub)
  })

  it('offers to connect GitHub for a 403 while not connected', async () => {
    const help = await (await authWithToken('')).errorHelp(githubCom, forbidden)
    expect(help.tone).toBe('warning')
    expect(help.title).toBe('GitHub denied access')
    expect(help.body).toBe('Your organisation may require SSO. Connect GitHub to continue.')
    expect(help.action).toEqual(connectGithub)
  })

  it('says when an exhausted rate limit resets and offers to connect GitHub to raise it', async () => {
    const help = await (await authWithToken('')).errorHelp(githubCom, rateLimited(403))
    expect(help.tone).toBe('warning')
    expect(help.title).toBe('GitHub rate limit reached')
    expect(help.body).toBe(`It resets at ${resetTime}. Connect GitHub to raise the limit.`)
    expect(help.action).toEqual(connectGithub)
  })

  it('says the rate limit is reached for a 429 without a reset time', async () => {
    const help = await (
      await authWithToken('')
    ).errorHelp(githubCom, new FetchError('HTTP 429', 429))
    expect(help.title).toBe('GitHub rate limit reached')
    expect(help.body).toBe('Try again later. Connect GitHub to raise the limit.')
  })

  it('offers no action for an exhausted rate limit while connected', async () => {
    const help = await (await authWithToken('secret')).errorHelp(githubCom, rateLimited(429))
    expect(help).toEqual({
      tone: 'warning',
      title: 'GitHub rate limit reached',
      body: `It resets at ${resetTime}.`,
    })
  })

  it('links to the app installation for a 404 or 403 while connected', async () => {
    const auth = await authWithToken('secret')
    const notFoundHelp = await auth.errorHelp(githubCom, notFound)
    expect(notFoundHelp.title).toBe('Diagit GitHub App is not installed here')
    expect(notFoundHelp.action).toEqual(installApp)
    const forbiddenHelp = await auth.errorHelp(githubCom, forbidden)
    expect(forbiddenHelp.title).toBe('Diagit GitHub App has no access here')
    expect(forbiddenHelp.tone).toBe('warning')
    expect(forbiddenHelp.action).toEqual(installApp)
  })

  it('offers to connect GitHub again for an expired connection', async () => {
    const help = await (
      await authWithToken('secret')
    ).errorHelp(githubCom, new FetchError('HTTP 401', 401))
    expect(help.tone).toBe('warning')
    expect(help.title).toBe('GitHub login expired')
    expect(help.action).toEqual(connectGithub)
  })

  it('leaves the title to the caller and offers no action for another failure while connected', async () => {
    const help = await (
      await authWithToken('secret')
    ).errorHelp(githubCom, new FetchError('HTTP 500', 500))
    expect(help).toEqual({ tone: 'danger', body: 'Reload the page to try again.' })
  })

  it('offers to connect GitHub for another failure while not connected', async () => {
    const help = await (
      await authWithToken('')
    ).errorHelp(githubCom, new FetchError('HTTP 500', 500))
    expect(help.tone).toBe('danger')
    expect(help.action).toEqual(connectGithub)
  })

  it('treats an unreadable connection as not connected', async () => {
    const area = new MemoryStorageArea()
    area.get = () => Promise.reject(new Error('Extension context invalidated.'))
    const help = await authOn(area).errorHelp(githubCom, notFound)
    expect(help.action).toEqual(connectGithub)
  })

  it('never offers a GitHub action on Enterprise, where the token cannot help', async () => {
    const auth = await authWithToken('secret')
    expect(await auth.errorHelp(enterprise, notFound)).toEqual({
      tone: 'warning',
      title: 'This repository looks private',
      body: 'The page login cannot reach it through the API.',
    })
    expect(await auth.errorHelp(enterprise, new FetchError('HTTP 401', 401))).toEqual({
      tone: 'warning',
      title: 'GitHub login expired',
      body: 'Sign in to ghe.corp.example again.',
    })
  })

  it('says when the rate limit resets on Enterprise, without offering to connect', async () => {
    const help = await (await authWithToken('')).errorHelp(enterprise, rateLimited(403))
    expect(help).toEqual({
      tone: 'warning',
      title: 'GitHub rate limit reached',
      body: `It resets at ${resetTime}.`,
    })
  })
})
