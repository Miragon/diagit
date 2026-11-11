import { notationDetector, type NotationDetector } from '../notations/NotationDetector'
import { errorMessage } from '../platform/utils/errorMessage'
import type { FileHeaderLocator, VisibleFileHeader } from './FileHeaderLocator'
import { DiffDataError, type DiffFileBlock, type DiffPage, type DiffSource } from './DiffSource'

const RELOAD_AFTER_MS = 60_000

interface CachedLoad<Data> {
  key: string
  promise: Promise<Data>
  loadedAt: number | null
  failedAt: number | null
}

export class CachedDiffSource<Page extends { key: string }, Data> implements DiffSource {
  private cached: CachedLoad<Data> | null = null

  constructor(
    private readonly page: DiffPage<Page, Data>,
    private readonly fileHeaders: FileHeaderLocator,
    private readonly now: () => number = () => Date.now(),
    private readonly notations: NotationDetector = notationDetector,
  ) {}

  pageKey(location: Location): string | null {
    return this.page.identify(location)?.key ?? null
  }

  async collect(location: Location, doc: Document): Promise<DiffFileBlock[]> {
    const page = this.page.identify(location)
    if (!page) return []
    const files = this.page.scan(doc)
    if (!files.length) return []
    let data: Data
    try {
      data = await this.load(location, page)
    } catch (err) {
      const help = await this.page.errorHelp(location, err)
      throw new DiffDataError(errorMessage(err), help, files)
    }
    return files.map((file) => ({ ...file, ...this.page.loaders(location, file, data) }))
  }

  async unrecognizedFiles(location: Location, doc: Document): Promise<VisibleFileHeader[]> {
    const page = this.page.identify(location)
    if (!page || !this.page.showsDiffs(location)) return []
    const cached = this.cachedFor(page)
    if (cached?.failedAt != null) return []
    const recognizedPaths = new Set(this.page.recognizedPaths(doc))
    if (!cached && !recognizedPaths.size && !this.fileHeaders.mentionsDiagram(doc)) return []
    const missedPaths = this.page
      .changedPaths(await this.load(location, page))
      .filter((path) => this.notations.isDiffable(path) && !recognizedPaths.has(path))
    return this.fileHeaders.findVisible(doc, missedPaths)
  }

  private cachedFor(page: Page): CachedLoad<Data> | null {
    return this.cached?.key === page.key ? this.cached : null
  }

  private load(location: Location, page: Page): Promise<Data> {
    const cached = this.cachedFor(page)
    if (cached && !this.isStale(cached)) return cached.promise
    const entry: CachedLoad<Data> = {
      key: page.key,
      loadedAt: null,
      failedAt: null,
      promise: this.page.load(location, page).then(
        (data) => {
          entry.loadedAt = this.now()
          return data
        },
        (err) => {
          entry.failedAt = this.now()
          throw err
        },
      ),
    }
    this.cached = entry
    return entry.promise
  }

  private isStale(entry: CachedLoad<Data>): boolean {
    const settledAt = entry.failedAt ?? entry.loadedAt
    return settledAt != null && this.now() - settledAt >= RELOAD_AFTER_MS
  }
}
