import { browser } from 'wxt/browser'
import { originToPattern } from '../../platform/utils/origin'

const VIEW_ROUTER = 'view-router'

interface RegisteredScript {
  id: string
}

interface ContentScriptRegistration {
  id: string
  matches: string[]
  js: string[]
  runAt: 'document_idle'
}

export interface ScriptingApi {
  getRegisteredContentScripts(filter: { ids: string[] }): Promise<RegisteredScript[]>
  registerContentScripts(scripts: ContentScriptRegistration[]): Promise<void>
  unregisterContentScripts(filter: { ids: string[] }): Promise<void>
}

export class ScriptRegistrar {
  constructor(
    private readonly scriptsRegisteredByEarlierVersions: readonly string[],
    private readonly scripting: () => ScriptingApi = () => browser.scripting as ScriptingApi,
  ) {}

  async register(origin: string): Promise<void> {
    const ids = await this.registeredScriptIds(origin)
    if (ids.length) {
      await this.scripting().unregisterContentScripts({ ids })
    }
    await this.scripting().registerContentScripts([this.viewRouterFor(origin)])
  }

  async unregister(origin: string): Promise<void> {
    const ids = await this.registeredScriptIds(origin)
    if (ids.length) {
      await this.scripting()
        .unregisterContentScripts({ ids })
        .catch(() => undefined)
    }
  }

  private viewRouterFor(origin: string): ContentScriptRegistration {
    return {
      id: this.scriptId(origin, VIEW_ROUTER),
      matches: [originToPattern(origin)],
      js: [`content-scripts/${VIEW_ROUTER}.js`],
      runAt: 'document_idle',
    }
  }

  private async registeredScriptIds(origin: string): Promise<string[]> {
    const ids = [VIEW_ROUTER, ...this.scriptsRegisteredByEarlierVersions].map((script) =>
      this.scriptId(origin, script),
    )
    const registered = await this.scripting()
      .getRegisteredContentScripts({ ids })
      .catch(() => [])
    return registered.map((script) => script.id)
  }

  private scriptId(origin: string, script: string): string {
    return `bpmn-io-browser-plugin:${origin}:${script}`
  }
}
