import type { HttpClient } from '../../platform/messaging/HttpClient'
import { fetchAllPages } from '../../platform/utils/fetchAllPages'
import type { PageUrl } from '../GitHost'
import type { GitlabRoutes, MergeRequestRef } from './GitlabRoutes'

export interface MergeRequestChange {
  new_path?: string
  old_path?: string
  new_file?: boolean
  deleted_file?: boolean
  renamed_file?: boolean
}

export interface MergeRequestData {
  origin: string
  projectPath: string
  baseSha: string
  headSha: string
  changeByPath: Map<string, MergeRequestChange>
}

interface MergeRequestResponse {
  diff_refs: { base_sha: string; head_sha: string }
}

interface CommitResponse {
  id: string
  parent_ids: string[]
}

export class GitlabRestApi {
  constructor(
    private readonly http: HttpClient,
    private readonly routes: GitlabRoutes,
  ) {}

  async loadMergeRequest(location: PageUrl, ref: MergeRequestRef): Promise<MergeRequestData> {
    const mergeRequestApi = this.routes.mergeRequestApi(location.origin, ref)
    const mergeRequest = await this.http.fetchJson<MergeRequestResponse>(mergeRequestApi)
    const changes = await fetchAllPages<MergeRequestChange>(this.http, `${mergeRequestApi}/diffs`)
    return {
      origin: location.origin,
      projectPath: ref.projectPath,
      baseSha: mergeRequest.diff_refs.base_sha,
      headSha: mergeRequest.diff_refs.head_sha,
      changeByPath: this.indexByPath(changes),
    }
  }

  async loadCommit(
    location: PageUrl,
    ref: Pick<MergeRequestRef, 'projectPath'>,
    sha: string,
  ): Promise<MergeRequestData> {
    const commitApi = this.routes.commitApi(location.origin, ref.projectPath, sha)
    const commit = await this.http.fetchJson<CommitResponse>(commitApi)
    const changes = await fetchAllPages<MergeRequestChange>(this.http, `${commitApi}/diff`)
    const rootCommitHasNoBase = ''
    return {
      origin: location.origin,
      projectPath: ref.projectPath,
      baseSha: commit.parent_ids[0] ?? rootCommitHasNoBase,
      headSha: commit.id,
      changeByPath: this.indexByPath(changes),
    }
  }

  rawFile(data: MergeRequestData, path: string, ref: string): Promise<string> {
    return this.http.fetchText(this.routes.rawFileUrl(data.origin, data.projectPath, path, ref))
  }

  private indexByPath(changes: MergeRequestChange[]): Map<string, MergeRequestChange> {
    const changeByPath = new Map<string, MergeRequestChange>()
    for (const change of changes) {
      if (change.new_path) {
        changeByPath.set(change.new_path, change)
      }
      if (change.old_path) {
        changeByPath.set(change.old_path, change)
      }
    }
    return changeByPath
  }
}
