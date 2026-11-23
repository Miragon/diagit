import { browser } from 'wxt/browser'
import { FetchError } from '../../platform/messaging/HttpClient'
import type { FetchTextResponse } from '../../platform/messaging/messages'
import { originToPattern, webOrigin } from '../../platform/utils/origin'
import { WebOrigin } from '../../platform/WebOrigin'
import type { LinkedModelSource } from './StandaloneViewerPage'

export interface SameOriginFetcher {
  fetchText(url: string, pageOrigin: WebOrigin): Promise<FetchTextResponse>
}

interface HostPermissions {
  contains(permissions: { origins: string[] }): Promise<boolean>
}

export class LinkedModelReader implements LinkedModelSource {
  constructor(
    private readonly fetcher: SameOriginFetcher,
    private readonly permissions: () => HostPermissions = () => browser.permissions,
  ) {}

  async mayRead(url: string): Promise<boolean> {
    const origin = webOrigin(url)
    if (!origin) {
      return false
    }
    const { protocol, hostname } = new URL(origin)
    return (
      (await this.grants(originToPattern(origin))) ||
      (await this.grants(originToPattern(`${protocol}//${hostname}`)))
    )
  }

  async fetchText(url: string): Promise<string> {
    const origin = WebOrigin.of(url)
    if (!origin) {
      throw new FetchError(`Refused to fetch ${url} for this page`)
    }
    const response = await this.fetcher.fetchText(url, origin)
    if (!response.ok) {
      throw new FetchError(response.error, response.status)
    }
    return response.text
  }

  private grants(pattern: string): Promise<boolean> {
    return this.permissions()
      .contains({ origins: [pattern] })
      .catch(() => false)
  }
}
