export interface MergeRequestRef {
  projectPath: string
  iid: string
  commit: string | null
  key: string
}

export interface CommitRef {
  projectPath: string
  sha: string
  key: string
}

export const GITLAB_PUBLIC_ORIGIN = 'https://gitlab.com'
export const GITLAB_ROUTE_MARKER = '/-/'

const MERGE_REQUEST_PATH = /^\/(.+?)\/-\/merge_requests\/(\d+)/
const MERGE_REQUEST_DIFFS_PATH = /^\/.+?\/-\/merge_requests\/\d+\/diffs/
const COMMIT_PATH = /^\/(.+?)\/-\/commit\/([0-9a-fA-F]{7,64})\/?$/

export class GitlabRoutes {
  mergeRequest(location: Pick<Location, 'pathname' | 'search'>): MergeRequestRef | null {
    const match = location.pathname.match(MERGE_REQUEST_PATH)
    if (!match) {
      return null
    }
    const [, projectPath, iid] = match
    const query = new URLSearchParams(location.search)
    const commit = query.get('commit_id')
    const comparesOtherVersions = query.has('start_sha') || (!commit && query.has('diff_id'))
    if (comparesOtherVersions) {
      return null
    }
    const mergeRequestKey = `${projectPath}!${iid}`
    return {
      projectPath: projectPath!,
      iid: iid!,
      commit,
      key: commit ? `${mergeRequestKey}@${commit}` : mergeRequestKey,
    }
  }

  mergeRequestDiffs(location: Pick<Location, 'pathname'>): boolean {
    return MERGE_REQUEST_DIFFS_PATH.test(location.pathname)
  }

  commit(location: Pick<Location, 'pathname'>): CommitRef | null {
    const match = location.pathname.match(COMMIT_PATH)
    if (!match) {
      return null
    }
    const [, projectPath, sha] = match
    return { projectPath: projectPath!, sha: sha!, key: `${projectPath}@${sha}` }
  }

  mergeRequestApi(origin: string, ref: MergeRequestRef): string {
    return `${this.projectApi(origin, ref.projectPath)}/merge_requests/${ref.iid}`
  }

  commitApi(origin: string, projectPath: string, sha: string): string {
    return `${this.projectApi(origin, projectPath)}/repository/commits/${encodeURIComponent(sha)}`
  }

  rawFileUrl(origin: string, projectPath: string, path: string, ref: string): string {
    return `${this.projectApi(origin, projectPath)}/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(ref)}&lfs=true`
  }

  private projectApi(origin: string, projectPath: string): string {
    return `${origin}/api/v4/projects/${encodeURIComponent(projectPath)}`
  }
}
