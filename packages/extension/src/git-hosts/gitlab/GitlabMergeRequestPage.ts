import type { ChangedFile, DiffLoaders, DiffPage, ErrorHelp } from '../DiffSource'
import { rateLimitHelp } from '../utils/rateLimitHelp'
import { sideLoader } from '../utils/sideLoader'
import type { PageUrl } from '../GitHost'
import type { GitlabDiffScanner } from './GitlabDiffScanner'
import type { GitlabRestApi, MergeRequestChange, MergeRequestData } from './GitlabRestApi'
import type { GitlabRoutes, MergeRequestRef } from './GitlabRoutes'

const METADATA_ERROR_HELP: ErrorHelp = {
  tone: 'danger',
  title: 'Merge request data could not be loaded',
  body: 'Check that you are signed in and can open this merge request.',
}

export class GitlabMergeRequestPage implements DiffPage<MergeRequestRef, MergeRequestData> {
  constructor(
    private readonly routes: GitlabRoutes,
    private readonly api: GitlabRestApi,
    private readonly scanner: GitlabDiffScanner,
  ) {}

  identify(location: PageUrl): MergeRequestRef | null {
    return this.routes.mergeRequest(location)
  }

  showsDiffs(location: PageUrl): boolean {
    return this.routes.mergeRequestDiffs(location)
  }

  scan(doc: Document): ChangedFile[] {
    return this.scanner.scan(doc)
  }

  recognizedPaths(doc: Document): string[] {
    return this.scanner.scan(doc).map((file) => file.path)
  }

  load(location: PageUrl, page: MergeRequestRef): Promise<MergeRequestData> {
    return page.commit
      ? this.api.loadCommit(location, page, page.commit)
      : this.api.loadMergeRequest(location, page)
  }

  changedPaths(data: MergeRequestData): string[] {
    const changes = new Set(data.changeByPath.values())
    return [...changes]
      .map((change) => change.new_path || change.old_path)
      .filter((path): path is string => !!path)
  }

  loaders(_location: PageUrl, path: string, data: MergeRequestData): DiffLoaders {
    const change = data.changeByPath.get(path)
    const oldPath = change?.old_path || path
    return {
      loadOld: sideLoader(!change?.new_file, () => this.api.rawFile(data, oldPath, data.baseSha)),
      loadNew: sideLoader(!change?.deleted_file, () => this.api.rawFile(data, path, data.headSha)),
      renamedFrom: this.renamedFrom(change),
    }
  }

  private renamedFrom(change: MergeRequestChange | undefined): string | undefined {
    const diffLeftOut = change?.too_large || change?.collapsed
    const onlyRenamed = change?.renamed_file && change.diff === '' && !diffLeftOut
    return onlyRenamed ? change.old_path : undefined
  }

  async errorHelp(_location: PageUrl, err: unknown): Promise<ErrorHelp> {
    const rateLimit = rateLimitHelp('GitLab', err)
    return rateLimit ? { tone: 'warning', ...rateLimit } : METADATA_ERROR_HELP
  }
}
