import { browser } from 'wxt/browser'
import { originToPattern, patternToOrigin } from '../../platform/utils/origin'
import { SettingsStore } from '../../platform/settings/SettingsStore'
import { ScriptRegistrar } from './ScriptRegistrar'
import { SelfHostedHostStore, type SelfHostedHost } from './SelfHostedHostStore'

interface Tab {
  id?: number
  url?: string
}

export interface BrowserAccessApi {
  permissions: { contains(permissions: { origins: string[] }): Promise<boolean> }
  tabs: {
    query(filter: { url: string }): Promise<Tab[]>
    reload(tabId: number): Promise<void>
  }
}

export interface HostCatalog {
  isSupportedUrl(url: string): boolean
  allViewScripts(): string[]
}

export class HostAccess {
  static forHosts(hosts: HostCatalog): HostAccess {
    return new HostAccess(
      new SelfHostedHostStore(new SettingsStore()),
      new ScriptRegistrar(hosts.allViewScripts()),
      hosts,
    )
  }

  constructor(
    private readonly store: SelfHostedHostStore,
    private readonly registrar: ScriptRegistrar,
    private readonly hosts: Pick<HostCatalog, 'isSupportedUrl'>,
    private readonly browserApi: () => BrowserAccessApi = () => browser as BrowserAccessApi,
  ) {}

  list(): Promise<SelfHostedHost[]> {
    return this.store.list()
  }

  async add(origin: string): Promise<void> {
    await this.store.save({ origin })
  }

  async grant(patterns: string[]): Promise<void> {
    for (const origin of this.originsOf(patterns)) {
      await this.store.save({ origin })
      try {
        await this.registrar.register(origin)
      } catch (err) {
        console.error('[diagit] register failed for', origin, err)
        continue
      }
      await this.reloadSupportedTabs(origin)
    }
  }

  async revoke(patterns: string[]): Promise<void> {
    for (const origin of this.originsOf(patterns)) {
      await this.registrar.unregister(origin).catch(() => undefined)
      await this.store.remove(origin)
    }
  }

  async restoreOnStartup(): Promise<void> {
    for (const origin of await this.grantedOrigins()) {
      try {
        await this.registrar.register(origin)
      } catch (err) {
        console.error(`[diagit] could not register ${origin}`, err)
      }
    }
  }

  async openTabIds(publicPatterns: string[]): Promise<number[]> {
    const selfHostedPatterns = (await this.grantedOrigins()).map(originToPattern)
    const tabsPerPattern = await Promise.all(
      [...publicPatterns, ...selfHostedPatterns].map((url) =>
        this.browserApi()
          .tabs.query({ url })
          .catch(() => []),
      ),
    )
    const tabIds = tabsPerPattern.flat().flatMap((tab) => (tab.id == null ? [] : [tab.id]))
    return [...new Set(tabIds)]
  }

  private async grantedOrigins(): Promise<string[]> {
    const granted: string[] = []
    for (const host of await this.store.list()) {
      const origins = [originToPattern(host.origin)]
      if (await this.browserApi().permissions.contains({ origins })) {
        granted.push(host.origin)
      }
    }
    return granted
  }

  private originsOf(patterns: string[]): string[] {
    return patterns.flatMap((pattern) => patternToOrigin(pattern) ?? [])
  }

  private async reloadSupportedTabs(origin: string): Promise<void> {
    const tabs = await this.browserApi()
      .tabs.query({ url: originToPattern(origin) })
      .catch(() => [])
    for (const tab of tabs) {
      if (tab.id != null && tab.url && this.hosts.isSupportedUrl(tab.url)) {
        this.browserApi()
          .tabs.reload(tab.id)
          .catch(() => undefined)
      }
    }
  }
}
