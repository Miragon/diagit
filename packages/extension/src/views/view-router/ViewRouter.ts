import type { PageUrl } from '../../git-hosts/GitHost'
import type { HostPage } from '../../platform/page/HostPage'

export interface ViewScriptLoader {
  injectViewScript(script: string): Promise<boolean>
}

export interface ViewScriptCatalog {
  viewScriptsFor(url: PageUrl): string[]
}

export class ViewRouter {
  private readonly requestedScripts = new Set<string>()

  constructor(
    private readonly page: HostPage,
    private readonly catalog: ViewScriptCatalog,
    private readonly loader: ViewScriptLoader,
  ) {}

  start(): void {
    this.page.onNavigation((url) => this.loadMissingViewScripts(url))
    this.loadMissingViewScripts(this.page.location)
  }

  private loadMissingViewScripts(url: PageUrl): void {
    for (const script of this.catalog.viewScriptsFor(url)) {
      if (!this.requestedScripts.has(script)) {
        void this.load(script)
      }
    }
  }

  private async load(script: string): Promise<void> {
    this.requestedScripts.add(script)
    if (!(await this.loader.injectViewScript(script))) {
      this.requestedScripts.delete(script)
    }
  }
}
