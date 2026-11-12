import { DeviceFlowError } from './DeviceFlowError'
import type { GithubDeviceFlow } from './GithubDeviceFlow'
import type { GithubConnection, GithubTokenSet, GithubTokenStore } from './GithubTokenStore'

const EXPIRY_MARGIN_MS = 60_000

export class GithubTokenRefresher {
  private refreshing: Promise<string> | undefined

  constructor(
    private readonly store: GithubTokenStore,
    private readonly deviceFlow: GithubDeviceFlow,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async validToken(): Promise<string> {
    const tokens = await this.store.tokenSet()
    return this.expiresSoon(tokens.accessTokenExpiresAt)
      ? this.refreshOnce(tokens.accessToken, tokens.accessToken)
      : tokens.accessToken
  }

  replacementFor(rejectedToken: string): Promise<string> {
    return this.refreshOnce(rejectedToken, '')
  }

  private refreshOnce(staleToken: string, offlineFallback: string): Promise<string> {
    this.refreshing ??= this.refresh(staleToken, offlineFallback).finally(() => {
      this.refreshing = undefined
    })
    return this.refreshing
  }

  private async refresh(staleToken: string, offlineFallback: string): Promise<string> {
    const tokens = await this.store.tokenSet()
    if (tokens.accessToken !== staleToken) {
      return tokens.accessToken
    }
    if (!tokens.refreshToken) {
      return ''
    }
    if (this.expiresSoon(tokens.refreshTokenExpiresAt)) {
      return this.forget(tokens)
    }
    try {
      return await this.rotate(tokens, await this.deviceFlow.refresh(tokens.refreshToken))
    } catch (err) {
      if (err instanceof DeviceFlowError) {
        return this.forget(tokens)
      }
      if (this.hasExpired(tokens.accessTokenExpiresAt)) {
        throw err
      }
      return this.unlessReplacedSince(tokens, async () => offlineFallback)
    }
  }

  private rotate(sent: GithubTokenSet, renewed: GithubTokenSet): Promise<string> {
    return this.unlessReplacedSince(sent, async (current) => {
      await this.store.connect(renewed, current.login)
      return renewed.accessToken
    })
  }

  private forget(sent: GithubTokenSet): Promise<string> {
    return this.unlessReplacedSince(sent, async () => {
      await this.store.expire()
      return ''
    })
  }

  private async unlessReplacedSince(
    sent: GithubTokenSet,
    write: (current: GithubConnection) => Promise<string>,
  ): Promise<string> {
    const current = await this.store.connection()
    return current.tokens.refreshToken === sent.refreshToken
      ? write(current)
      : current.tokens.accessToken
  }

  private expiresSoon(expiresAt: number | undefined): boolean {
    return expiresAt !== undefined && expiresAt - EXPIRY_MARGIN_MS <= this.now()
  }

  private hasExpired(expiresAt: number | undefined): boolean {
    return expiresAt !== undefined && expiresAt <= this.now()
  }
}
