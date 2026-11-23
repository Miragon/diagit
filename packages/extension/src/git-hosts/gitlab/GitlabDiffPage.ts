import type { ChangedFile, DiffLoaders, DiffPage, ErrorHelp } from '../DiffSource'
import { rateLimitHelp } from '../utils/rateLimitHelp'
import type { PageUrl } from '../GitHost'
import type { GitlabDiffScanner } from './GitlabDiffScanner'
import type { GitlabDiffData, GitlabRestApi } from './GitlabRestApi'
import type { GitlabRoutes } from './GitlabRoutes'

export abstract class GitlabDiffPage<Page extends { key: string }> implements DiffPage<
  Page,
  GitlabDiffData
> {
  constructor(
    protected readonly routes: GitlabRoutes,
    protected readonly api: GitlabRestApi,
    private readonly scanner: GitlabDiffScanner,
  ) {}

  protected abstract readonly metadataErrorHelp: ErrorHelp

  abstract identify(location: PageUrl): Page | null

  abstract showsDiffs(location: PageUrl): boolean

  abstract load(location: PageUrl, page: Page): Promise<GitlabDiffData>

  scan(doc: Document): ChangedFile[] {
    return this.scanner.scan(doc)
  }

  recognizedPaths(doc: Document): string[] {
    return this.scanner.scan(doc).map((file) => file.path)
  }

  changedPaths(data: GitlabDiffData): string[] {
    const changes = new Set(data.changeByPath.values())
    return [...changes]
      .map((change) => change.new_path || change.old_path)
      .filter((path): path is string => !!path)
  }

  loaders(_location: PageUrl, path: string, data: GitlabDiffData): DiffLoaders {
    const change = data.changeByPath.get(path)
    const oldPath = change?.old_path || path
    return {
      hasNoOldVersion: change?.new_file === true,
      loadOld: () =>
        change?.new_file ? Promise.resolve(null) : this.api.rawFile(data, oldPath, data.baseSha),
      loadNew: () =>
        change?.deleted_file ? Promise.resolve(null) : this.api.rawFile(data, path, data.headSha),
    }
  }

  async errorHelp(_location: PageUrl, err: unknown): Promise<ErrorHelp> {
    const rateLimit = rateLimitHelp('GitLab', err)
    return rateLimit ? { tone: 'warning', ...rateLimit } : this.metadataErrorHelp
  }
}
