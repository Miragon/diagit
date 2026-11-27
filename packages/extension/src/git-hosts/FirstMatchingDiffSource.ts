import type { VisibleFileHeader } from './FileHeaderLocator'
import type { DiffFileBlock, DiffLoaders, DiffSource } from './DiffSource'
import type { PageUrl } from './GitHost'

export class FirstMatchingDiffSource implements DiffSource {
  constructor(private readonly sources: readonly DiffSource[]) {}

  pageKey(location: PageUrl): string | null {
    return this.sourceFor(location)?.pageKey(location) ?? null
  }

  async collect(location: PageUrl, doc: Document): Promise<DiffFileBlock[]> {
    return (await this.sourceFor(location)?.collect(location, doc)) ?? []
  }

  async unrecognizedFiles(location: PageUrl, doc: Document): Promise<VisibleFileHeader[]> {
    return (await this.sourceFor(location)?.unrecognizedFiles(location, doc)) ?? []
  }

  async loadersFor(location: PageUrl, path: string): Promise<DiffLoaders | null> {
    return (await this.sourceFor(location)?.loadersFor(location, path)) ?? null
  }

  hiddenCodeCss(hiddenPanel: string): string {
    const rules = this.sources.map((source) => source.hiddenCodeCss(hiddenPanel))
    return [...new Set(rules)].join('\n')
  }

  private sourceFor(location: PageUrl): DiffSource | undefined {
    return this.sources.find((source) => source.pageKey(location) !== null)
  }
}
