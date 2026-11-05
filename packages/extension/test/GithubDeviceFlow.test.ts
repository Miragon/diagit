import { DeviceFlowError } from '../src/git-hosts/github/DeviceFlowError'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GithubDeviceFlow, type DeviceCode } from '../src/git-hosts/github/GithubDeviceFlow'
import { FetchError } from '../src/platform/messaging/HttpClient'

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response
}

function flowAnswering(...bodies: unknown[]) {
  const fetch = vi.fn()
  for (const body of bodies) fetch.mockResolvedValueOnce(jsonResponse(body))
  return { fetch, flow: new GithubDeviceFlow(fetch) }
}

const code: DeviceCode = {
  deviceCode: 'dc-123',
  userCode: 'ABCD-1234',
  verificationUri: 'https://github.com/login/device',
  interval: 0,
  expiresIn: 900,
}

afterEach(() => {
  vi.useRealTimers()
})

describe('GithubDeviceFlow.requestDeviceCode', () => {
  it('maps GitHub snake_case into the DeviceCode shape', async () => {
    const { flow } = flowAnswering({
      device_code: 'dc-123',
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
      interval: 5,
      expires_in: 900,
    })
    await expect(flow.requestDeviceCode()).resolves.toEqual({ ...code, interval: 5 })
  })

  it('throws a DeviceFlowError when GitHub returns no device code', async () => {
    const { flow } = flowAnswering({ error: 'bad', error_description: 'nope' })
    await expect(flow.requestDeviceCode()).rejects.toBeInstanceOf(DeviceFlowError)
  })
})

describe('GithubDeviceFlow.pollForToken', () => {
  it('keeps polling while pending, then returns the access token', async () => {
    const { fetch, flow } = flowAnswering(
      { error: 'authorization_pending' },
      { access_token: 'gho_abc' },
    )
    await expect(flow.pollForToken(code)).resolves.toEqual({
      accessToken: 'gho_abc',
      refreshToken: '',
    })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('turns the expiry durations of an expiring token into timestamps', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        access_token: 'ghu_abc',
        expires_in: 28800,
        refresh_token: 'ghr_abc',
        refresh_token_expires_in: 15897600,
      }),
    )
    const flow = new GithubDeviceFlow(fetch, () => 1_000)
    await expect(flow.pollForToken(code)).resolves.toEqual({
      accessToken: 'ghu_abc',
      accessTokenExpiresAt: 1_000 + 28_800_000,
      refreshToken: 'ghr_abc',
      refreshTokenExpiresAt: 1_000 + 15_897_600_000,
    })
  })

  it('backs off on slow_down and still succeeds', async () => {
    vi.useFakeTimers()
    const { flow } = flowAnswering({ error: 'slow_down' }, { access_token: 'gho_xyz' })
    const token = flow.pollForToken(code)
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(token).resolves.toMatchObject({ accessToken: 'gho_xyz' })
  })

  it('throws when the code expires', async () => {
    const { flow } = flowAnswering({ error: 'expired_token' })
    await expect(flow.pollForToken(code)).rejects.toBeInstanceOf(DeviceFlowError)
  })

  it('throws when authorisation is denied', async () => {
    const { flow } = flowAnswering({ error: 'access_denied' })
    await expect(flow.pollForToken(code)).rejects.toBeInstanceOf(DeviceFlowError)
  })
})

describe('GithubDeviceFlow.refresh', () => {
  it('exchanges the refresh token without a client secret', async () => {
    const { fetch, flow } = flowAnswering({ access_token: 'ghu_new', refresh_token: 'ghr_new' })
    await expect(flow.refresh('ghr_old')).resolves.toMatchObject({
      accessToken: 'ghu_new',
      refreshToken: 'ghr_new',
    })
    const body = new URLSearchParams(fetch.mock.calls[0]![1].body)
    expect(fetch.mock.calls[0]![0]).toBe('https://github.com/login/oauth/access_token')
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('ghr_old')
    expect(body.get('client_id')).toBeTruthy()
    expect(body.has('client_secret')).toBe(false)
  })

  it('throws a DeviceFlowError when GitHub rejects the refresh token', async () => {
    const { flow } = flowAnswering({ error: 'bad_refresh_token' })
    await expect(flow.refresh('ghr_old')).rejects.toBeInstanceOf(DeviceFlowError)
  })

  it('reports an HTTP failure of the token endpoint as a transport error', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response)
    const refresh = new GithubDeviceFlow(fetch).refresh('ghr_old')
    await expect(refresh).rejects.toBeInstanceOf(FetchError)
    await expect(refresh).rejects.not.toBeInstanceOf(DeviceFlowError)
  })
})

describe('GithubDeviceFlow.fetchViewerLogin', () => {
  it('returns the login on success', async () => {
    const { flow } = flowAnswering({ login: 'octocat' })
    await expect(flow.fetchViewerLogin('gho_abc')).resolves.toBe('octocat')
  })

  it('returns an empty string when the request fails', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({}, false))
    await expect(new GithubDeviceFlow(fetch).fetchViewerLogin('gho_abc')).resolves.toBe('')
  })
})
