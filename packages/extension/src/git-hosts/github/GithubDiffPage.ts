import type { ChangedFile, DiffLoaders, DiffPage, ErrorHelp } from '../DiffSource'
import type { PageUrl } from '../GitHost'
import { sideLoader } from '../utils/sideLoader'
import type { GithubApiAuth } from './GithubApiAuth'
import type { GithubDiffScanner } from './GithubDiffScanner'
import type { GithubDiffData, GithubDiffFile, GithubRestApi } from './GithubRestApi'
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

  abstract identify(location: PageUrl): Page | null

  abstract showsDiffs(location: PageUrl): boolean

  abstract load(location: PageUrl, page: Page): Promise<GithubDiffData>

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

  loaders(location: PageUrl, path: string, data: GithubDiffData): DiffLoaders {
    const change = data.fileByPath.get(path)
    const oldPath = change?.previous_filename || path
    const hasOldSide = change?.status !== 'added' && !!data.baseSha
    const hasNewSide = change?.status !== 'removed'
    return {
      loadOld: sideLoader(hasOldSide, () =>
        this.api.rawFile(location, data.baseRepo, data.baseSha, oldPath),
      ),
      loadNew: sideLoader(hasNewSide, () =>
        this.api.rawFile(location, data.headRepo, data.headSha, path),
      ),
      renamedFrom: this.renamedFrom(change),
    }
  }

  private renamedFrom(change: GithubDiffFile | undefined): string | undefined {
    const onlyRenamed = change?.status === 'renamed' && change.changes === 0
    return onlyRenamed ? change.previous_filename : undefined
  }

  errorHelp(location: PageUrl, err: unknown): Promise<ErrorHelp> {
    return this.auth.errorHelp(location, err)
  }
}
