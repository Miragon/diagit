import { browser } from 'wxt/browser'
import { FetchError, type HttpClient } from './HttpClient'
import type {
  FetchTextRequest,
  FetchTextResponse,
  InjectViewScriptRequest,
  OpenOptionsRequest,
  OpenViewerRequest,
} from './messages'

export class BackgroundClient implements HttpClient {
  async fetchText(url: string): Promise<string> {
    const request: FetchTextRequest = { type: 'fetchText', url }
    const response = (await browser.runtime.sendMessage(request)) as FetchTextResponse | undefined
    if (!response) {
      throw new Error('No response from background worker')
    }
    if (!response.ok) {
      throw new FetchError(response.error, response.status, response.rateLimitResetsAt)
    }
    return response.text
  }

  async fetchJson<T = unknown>(url: string): Promise<T> {
    return JSON.parse(await this.fetchText(url)) as T
  }

  async injectViewScript(script: string): Promise<boolean> {
    const request: InjectViewScriptRequest = { type: 'injectViewScript', script }
    return Boolean(await browser.runtime.sendMessage(request).catch(() => false))
  }

  async openOptions(): Promise<void> {
    const request: OpenOptionsRequest = { type: 'openOptions' }
    await browser.runtime.sendMessage(request).catch(() => undefined)
  }

  async openViewer(url: string): Promise<void> {
    const request: OpenViewerRequest = { type: 'openViewer', url }
    await browser.runtime.sendMessage(request).catch(() => undefined)
  }
}
