import { FetchError } from '../../platform/messaging/HttpClient'
import { DeviceFlowError } from './DeviceFlowError'
import type { GithubTokenSet } from './GithubTokenStore'

const GITHUB_APP_CLIENT_ID = 'Iv23liayyRyhjA7nIqfG'

export const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/miragon-diagit/installations/new'

export const GITHUB_INSTALLED_APPS_URL = 'https://github.com/settings/installations'

const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const VIEWER_URL = 'https://api.github.com/user'
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'
const REFRESH_GRANT_TYPE = 'refresh_token'
const DEFAULT_POLL_INTERVAL_S = 5
const DEFAULT_EXPIRES_IN_S = 900
const SLOW_DOWN_BACKOFF_MS = 5000

export interface DeviceCode {
  deviceCode: string
  userCode: string
  verificationUri: string
  interval: number
  expiresIn: number
}

type Fetch = typeof fetch

export class GithubDeviceFlow {
  constructor(
    private readonly fetch: Fetch = (...args) => globalThis.fetch(...args),
    private readonly now: () => number = () => Date.now(),
  ) {}

  async requestDeviceCode(): Promise<DeviceCode> {
    const data = await this.postForm(DEVICE_CODE_URL, { client_id: GITHUB_APP_CLIENT_ID })
    const deviceCode = this.readString(data, 'device_code')
    const userCode = this.readString(data, 'user_code')
    const verificationUri = this.readString(data, 'verification_uri')
    if (!deviceCode || !userCode || !verificationUri) {
      throw new DeviceFlowError(
        this.readString(data, 'error_description') || 'GitHub did not return a device code.',
      )
    }
    const interval = typeof data.interval === 'number' ? data.interval : DEFAULT_POLL_INTERVAL_S
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : DEFAULT_EXPIRES_IN_S
    return { deviceCode, userCode, verificationUri, interval, expiresIn }
  }

  async pollForToken(code: DeviceCode, signal?: AbortSignal): Promise<GithubTokenSet> {
    let intervalMs = code.interval * 1000
    const deadline = this.now() + code.expiresIn * 1000
    while (this.now() < deadline) {
      await this.delay(intervalMs, signal)
      const data = await this.postForm(ACCESS_TOKEN_URL, {
        client_id: GITHUB_APP_CLIENT_ID,
        device_code: code.deviceCode,
        grant_type: DEVICE_GRANT_TYPE,
      })
      if (this.readString(data, 'access_token')) {
        return this.tokenSetFrom(data)
      }
      switch (this.readString(data, 'error')) {
        case 'authorization_pending':
          break
        case 'slow_down':
          intervalMs += SLOW_DOWN_BACKOFF_MS
          break
        case 'expired_token':
          throw this.expired()
        case 'access_denied':
          throw new DeviceFlowError('Authorisation was denied.', 'denied')
        default:
          throw new DeviceFlowError(
            this.readString(data, 'error_description') ||
              'Could not complete the GitHub authorisation.',
          )
      }
    }
    throw this.expired()
  }

  async refresh(refreshToken: string): Promise<GithubTokenSet> {
    const response = await this.post(ACCESS_TOKEN_URL, {
      client_id: GITHUB_APP_CLIENT_ID,
      grant_type: REFRESH_GRANT_TYPE,
      refresh_token: refreshToken,
    })
    if (!response.ok) {
      throw new FetchError(`GitHub returned HTTP ${response.status}.`, response.status)
    }
    const data = (await response.json()) as Record<string, unknown>
    if (!this.readString(data, 'access_token')) {
      throw new DeviceFlowError(
        this.readString(data, 'error_description') || 'GitHub did not renew the access token.',
      )
    }
    return this.tokenSetFrom(data)
  }

  async fetchViewerLogin(token: string): Promise<string> {
    try {
      const response = await this.fetch(VIEWER_URL, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      })
      if (!response.ok) {
        return ''
      }
      return this.readString((await response.json()) as Record<string, unknown>, 'login')
    } catch {
      return ''
    }
  }

  private async postForm(
    url: string,
    params: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const response = await this.post(url, params)
    if (!response.ok) {
      throw new DeviceFlowError(`GitHub returned HTTP ${response.status}.`)
    }
    return (await response.json()) as Record<string, unknown>
  }

  private post(url: string, params: Record<string, string>): Promise<Response> {
    return this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(params).toString(),
    })
  }

  private tokenSetFrom(data: Record<string, unknown>): GithubTokenSet {
    return {
      accessToken: this.readString(data, 'access_token'),
      accessTokenExpiresAt: this.expiresAt(data, 'expires_in'),
      refreshToken: this.readString(data, 'refresh_token'),
      refreshTokenExpiresAt: this.expiresAt(data, 'refresh_token_expires_in'),
    }
  }

  private expiresAt(data: Record<string, unknown>, key: string): number | undefined {
    const seconds = data[key]
    return typeof seconds === 'number' ? this.now() + seconds * 1000 : undefined
  }

  private readString(data: Record<string, unknown>, key: string): string {
    const value = data[key]
    return typeof value === 'string' ? value : ''
  }

  private expired(): DeviceFlowError {
    return new DeviceFlowError(
      'The code expired before it was authorised. Please try again.',
      'expired',
    )
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const cancelled = () => new DeviceFlowError('Connecting was cancelled.', 'cancelled')
      if (signal?.aborted) {
        return reject(cancelled())
      }
      const timer = setTimeout(resolve, ms)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(cancelled())
        },
        { once: true },
      )
    })
  }
}
