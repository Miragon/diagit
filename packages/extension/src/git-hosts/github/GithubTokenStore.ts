import type { SettingsStore } from '../../platform/settings/SettingsStore'

const CONNECTION_KEY = 'githubConnection'
const LEGACY_TOKEN_KEY = 'githubApiToken'
const LEGACY_LOGIN_KEY = 'githubLogin'
const DISCONNECT_REASON_KEY = 'githubDisconnectReason'
const EXPIRED_REASON = 'expired'

export interface GithubTokenSet {
  accessToken: string
  accessTokenExpiresAt?: number
  refreshToken: string
  refreshTokenExpiresAt?: number
}

export interface GithubConnection {
  tokens: GithubTokenSet
  login: string
}

export class GithubTokenStore {
  constructor(private readonly settings: SettingsStore) {}

  async token(): Promise<string> {
    return (await this.tokenSet()).accessToken
  }

  async tokenSet(): Promise<GithubTokenSet> {
    return (await this.connection()).tokens
  }

  async login(): Promise<string> {
    return (await this.connection()).login
  }

  async connect(tokens: GithubTokenSet, login: string): Promise<void> {
    await this.settings.writeRecord<GithubConnection>(CONNECTION_KEY, { tokens, login })
    await this.forgetLegacyConnection()
    await this.settings.remove(DISCONNECT_REASON_KEY)
  }

  async disconnect(): Promise<void> {
    await this.settings.remove(DISCONNECT_REASON_KEY)
    await this.forgetConnection()
  }

  async expire(): Promise<void> {
    await this.settings.writeString(DISCONNECT_REASON_KEY, EXPIRED_REASON)
    await this.forgetConnection()
  }

  async connectionExpired(): Promise<boolean> {
    return (await this.settings.readString(DISCONNECT_REASON_KEY)) === EXPIRED_REASON
  }

  async connection(): Promise<GithubConnection> {
    const stored = await this.settings.readRecord<GithubConnection>(CONNECTION_KEY)
    return stored ?? this.legacyConnection()
  }

  private async legacyConnection(): Promise<GithubConnection> {
    const [accessToken, login] = await Promise.all([
      this.settings.readString(LEGACY_TOKEN_KEY),
      this.settings.readString(LEGACY_LOGIN_KEY),
    ])
    return { tokens: { accessToken: accessToken.trim(), refreshToken: '' }, login }
  }

  private async forgetConnection(): Promise<void> {
    await this.forgetLegacyConnection()
    await this.settings.remove(CONNECTION_KEY)
  }

  private async forgetLegacyConnection(): Promise<void> {
    await this.settings.remove(LEGACY_TOKEN_KEY)
    await this.settings.remove(LEGACY_LOGIN_KEY)
  }
}
