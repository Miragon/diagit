import type { ChangedFile, DiffLoaders, DiffPage, ErrorHelp } from '../DiffSource'
import { rateLimitHint } from '../utils/rateLimitHint'
import type { GitlabDiffScanner } from './GitlabDiffScanner'
import type { GitlabRestApi, MergeRequestData } from './GitlabRestApi'
import type { GitlabRoutes, MergeRequestRef } from './GitlabRoutes'

const METADATA_ERROR_HINT =
  'Could not load the merge request metadata from the GitLab API. Check that you are signed in and can open this merge request.'

export class GitlabMergeRequestPage implements DiffPage<MergeRequestRef, MergeRequestData> {
  constructor(
    private readonly routes: GitlabRoutes,
    private readonly api: GitlabRestApi,
    private readonly scanner: GitlabDiffScanner,
  ) {}

  identify(location: Location): MergeRequestRef | null {
    return this.routes.mergeRequest(location)
  }

  showsDiffs(location: Location): boolean {
    return this.routes.mergeRequestDiffs(location)
  }

  scan(doc: Document): ChangedFile[] {
    return this.scanner.scan(doc)
  }

  recognizedPaths(doc: Document): string[] {
    return this.scanner.scan(doc).map((file) => file.path)
  }

  load(location: Location, page: MergeRequestRef): Promise<MergeRequestData> {
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

  loaders(_location: Location, file: ChangedFile, data: MergeRequestData): DiffLoaders {
    const change = data.changeByPath.get(file.path)
    const oldPath = change?.old_path || file.path
    return {
      loadOld: () =>
        change?.new_file ? Promise.resolve(null) : this.api.rawFile(data, oldPath, data.baseSha),
      loadNew: () =>
        change?.deleted_file
          ? Promise.resolve(null)
          : this.api.rawFile(data, file.path, data.headSha),
    }
  }

  async errorHelp(_location: Location, err: unknown): Promise<ErrorHelp> {
    return { hint: rateLimitHint('GitLab', err) ?? METADATA_ERROR_HINT }
  }
}
