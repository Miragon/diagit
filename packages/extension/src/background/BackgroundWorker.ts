import { browser } from 'wxt/browser'
import { localWebExtAlertHtml } from 'webext-alert'
import addPermissionToggle from 'webext-permission-toggle'
import type { HostRegistry } from '../git-hosts/HostRegistry'
import { hostRegistry } from '../git-hosts/hosts'
import { HostAccess } from '../git-hosts/self-hosted/HostAccess'
import type {
  BackgroundRequest,
  FetchTextResponse,
  OpenOptionsRequest,
} from '../platform/messaging/messages'
import { originToPattern, webOrigin } from '../platform/utils/origin'
import { FetchProxy } from './FetchProxy'
import { FetchScope } from './FetchScope'
import { TrustedSender, type MessageSender, type SenderPage } from './TrustedSender'
import { ViewScriptInjector } from './ViewScriptInjector'

const ENABLE_ON_DOMAIN_TITLE = 'Enable Diagit on this domain'
const KEEP_CHANNEL_OPEN_FOR_ASYNC_RESPONSE = true
const HANDLED_REQUESTS = new Set<unknown>([
  'fetchText',
  'injectViewScript',
  'openOptions',
  'openViewer',
  'openDiffViewer',
])

interface Tab {
  id?: number
  url?: string
}

export class BackgroundWorker {
  static create(): BackgroundWorker {
    return new BackgroundWorker(
      HostAccess.forHosts(hostRegistry),
      hostRegistry,
      new FetchProxy(hostRegistry.authPolicies(), new FetchScope()),
      new ViewScriptInjector(hostRegistry.allViewScripts()),
      new TrustedSender(browser.runtime.id),
      import.meta.env.FIREFOX,
    )
  }

  constructor(
    private readonly access: HostAccess,
    private readonly hosts: HostRegistry,
    private readonly fetchProxy: FetchProxy,
    private readonly injector: ViewScriptInjector,
    private readonly senders: TrustedSender,
    private readonly browserReinjectsOnUpdate: boolean,
  ) {}

  start(): void {
    this.access
      .restoreOnStartup()
      .catch((err) => console.error('[diagit] host registration failed', err))
    localWebExtAlertHtml(browser.runtime.getURL('/alert.html'))
    addPermissionToggle({ title: ENABLE_ON_DOMAIN_TITLE })
    browser.action?.onClicked.addListener((tab) => void this.onToolbarClick(tab))
    browser.permissions.onAdded.addListener((perms) => void this.access.grant(perms.origins ?? []))
    browser.permissions.onRemoved.addListener(
      (perms) => void this.access.revoke(perms.origins ?? []),
    )
    browser.runtime.onInstalled.addListener(({ reason }) => {
      if (reason !== 'update' || this.browserReinjectsOnUpdate) {
        return
      }
      this.restoreViewsInOpenTabs().catch((err) =>
        console.error('[diagit] could not restore views in open tabs', err),
      )
    })
    browser.runtime.onMessage.addListener((message: BackgroundRequest, sender, sendResponse) =>
      this.handle(message, sender, sendResponse),
    )
  }

  private handle(
    message: BackgroundRequest,
    sender: MessageSender,
    sendResponse: (response: unknown) => void,
  ): boolean {
    if (!HANDLED_REQUESTS.has(message?.type)) {
      return false
    }
    this.respond(message, sender).then(sendResponse)
    return KEEP_CHANNEL_OPEN_FOR_ASYNC_RESPONSE
  }

  private respond(
    message: BackgroundRequest,
    sender: MessageSender,
  ): Promise<FetchTextResponse | boolean> {
    if (message.type === 'openOptions') {
      return this.senders.isOwn(sender)
        ? this.openOptionsPage().then(() => true)
        : this.refuse(message)
    }
    const page = this.senders.pageOf(sender)
    return page ? this.serve(message, page) : this.refuse(message)
  }

  private serve(
    message: Exclude<BackgroundRequest, OpenOptionsRequest>,
    page: SenderPage,
  ): Promise<FetchTextResponse | boolean> {
    switch (message.type) {
      case 'fetchText':
        return this.fetchProxy.fetchText(message.url, page.origin)
      case 'injectViewScript':
        return this.injector.inject(page.tabId, message.script)
      case 'openViewer':
        return this.openViewer(message.url, { src: message.url }, page)
      case 'openDiffViewer':
        return this.openDiffViewer(message.pageUrl, message.path, page)
    }
  }

  private async refuse(message: BackgroundRequest): Promise<FetchTextResponse | boolean> {
    if (message.type === 'fetchText') {
      return { ok: false, error: `Refused to fetch ${message.url} for an untrusted sender` }
    }
    return false
  }

  private async restoreViewsInOpenTabs(): Promise<void> {
    const tabIds = await this.access.openTabIds(this.hosts.publicMatchPatterns())
    await Promise.all(tabIds.map((tabId) => this.injector.injectRouter(tabId)))
  }

  private async onToolbarClick(tab: Tab): Promise<void> {
    if (!tab.url || !this.hosts.isSupportedUrl(tab.url)) {
      await this.openOptionsPage()
      return
    }
    const origins = [originToPattern(new URL(tab.url).origin)]
    const allowedBeforeClick = browser.permissions.contains({ origins }).catch(() => false)
    const requestWithinUserGesture = browser.permissions.request({ origins }).catch(() => false)
    if (await allowedBeforeClick) {
      await this.openOptionsPage()
    }
    await requestWithinUserGesture
  }

  private async openViewer(
    url: string,
    params: Record<string, string>,
    page: SenderPage,
  ): Promise<boolean> {
    if (page.incognito || webOrigin(url) !== page.origin) {
      return false
    }
    const viewer = `${browser.runtime.getURL('/viewer.html')}?${new URLSearchParams(params)}`
    await browser.tabs.create({ url: viewer })
    return true
  }

  private async openDiffViewer(pageUrl: string, path: unknown, page: SenderPage): Promise<boolean> {
    if (typeof path !== 'string' || !path) {
      return false
    }
    return this.openViewer(pageUrl, { page: pageUrl, path }, page)
  }

  private async openOptionsPage(): Promise<void> {
    await browser.runtime.openOptionsPage().catch(() => undefined)
  }
}
