import { FetchError, type HttpClient } from '../../src/platform/messaging/HttpClient'

type Response = unknown | Error

export class FakeHttpClient implements HttpClient {
  readonly requests: string[] = []
  private responses: Record<string, Response> = {}
  private fallback: Response = null

  respondWith(responses: Record<string, Response>): this {
    this.responses = responses
    return this
  }

  failEverythingWith(error: Error): this {
    this.fallback = error
    return this
  }

  async fetchText(url: string): Promise<string> {
    const response = await this.respond(url)
    return typeof response === 'string' ? response : JSON.stringify(response)
  }

  async fetchJson<T>(url: string): Promise<T> {
    return (await this.respond(url)) as T
  }

  private async respond(url: string): Promise<unknown> {
    this.requests.push(url)
    const response = url in this.responses ? this.responses[url] : this.fallback
    if (response instanceof Error) {
      throw response
    }
    if (response === null) {
      throw new FetchError(`HTTP 404 for ${url}`, 404)
    }
    return response
  }
}
