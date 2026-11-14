import { FetchError, type HttpClient } from './HttpClient'
import type { FetchTextResponse } from './messages'

export interface PageFetcher {
  fetchText(url: string, pageOrigin: string): Promise<FetchTextResponse>
}

export class PageHttpClient implements HttpClient {
  constructor(
    private readonly fetcher: PageFetcher,
    private readonly pageOrigin: string,
  ) {}

  async fetchText(url: string): Promise<string> {
    const response = await this.fetcher.fetchText(url, this.pageOrigin)
    if (!response.ok) {
      throw new FetchError(response.error, response.status, response.rateLimitResetsAt)
    }
    return response.text
  }

  async fetchJson<T = unknown>(url: string): Promise<T> {
    return JSON.parse(await this.fetchText(url)) as T
  }
}
