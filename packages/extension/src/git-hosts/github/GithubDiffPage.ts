import type { ChangedFile, DiffLoaders, DiffPage } from '../DiffSource'
import type { GithubApiAuth } from './GithubApiAuth'
import type { GithubDiffScanner } from './GithubDiffScanner'
import type { GithubDiffData, GithubRestApi } from './GithubRestApi'
import type { GithubRoutes } from './GithubRoutes'

export abstract class GithubDiffPage<Page extends { key: string }> implements DiffPage<
  Page,
  GithubDiffData
> {
  constructor(
    protected readonly routes: GithubRoutes,
    protected readonly api: GithubRestApi,
    private readonly scanner: GithubDiffScanner,
    private readonly auth: GithubApiAuth,
  ) {}

  abstract identify(location: Location): Page | null

  abstract showsDiffs(location: Location): boolean

  abstract load(location: Location, page: Page): Promise<GithubDiffData>

  scan(doc: Document): ChangedFile[] {
    return this.scanner.scan(doc)
  }

  recognizedPaths(doc: Document): string[] {
    return this.scanner.recognizedPaths(doc)
  }

  changedPaths(data: GithubDiffData): string[] {
    const files = new Set(data.fileByPath.values())
    return [...files].map((file) => file.filename)
  }

  loaders(location: Location, file: ChangedFile, data: GithubDiffData): DiffLoaders {
    const change = data.fileByPath.get(file.path)
    const oldPath = change?.previous_filename || file.path
    const hasNoOldSide = change?.status === 'added' || !data.baseSha
    const hasNoNewSide = change?.status === 'removed'
    return {
      loadOld: () =>
        hasNoOldSide
          ? Promise.resolve(null)
          : this.api.rawFile(location, data.baseRepo, data.baseSha, oldPath),
      loadNew: () =>
        hasNoNewSide
          ? Promise.resolve(null)
          : this.api.rawFile(location, data.headRepo, data.headSha, file.path),
    }
  }

  errorHint(location: Location, err: unknown): string {
    return this.auth.errorHint(location, err)
  }
}
