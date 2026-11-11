import { browser } from 'wxt/browser'

const VIEW_ROUTER = 'view-router'

export interface ScriptExecutor {
  executeScript(injection: { target: { tabId: number }; files: string[] }): Promise<unknown>
}

export class ViewScriptInjector {
  constructor(
    private readonly knownScripts: readonly string[],
    private readonly scripting: () => ScriptExecutor = () =>
      browser.scripting as unknown as ScriptExecutor,
  ) {}

  async inject(tabId: number | undefined, script: string): Promise<boolean> {
    if (tabId == null || !this.knownScripts.includes(script)) return false
    try {
      await this.load(tabId, script)
      return true
    } catch (err) {
      console.error(`[diagit] could not load ${script}`, err)
      return false
    }
  }

  async injectRouter(tabId: number): Promise<void> {
    await this.load(tabId, VIEW_ROUTER).catch(() => undefined)
  }

  private async load(tabId: number, script: string): Promise<void> {
    await this.scripting().executeScript({
      target: { tabId },
      files: [`/content-scripts/${script}.js`],
    })
  }
}
