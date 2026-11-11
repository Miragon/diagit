import type { HttpClient } from '../../platform/messaging/HttpClient'
import { fetchAllPages } from '../../platform/utils/fetchAllPages'
import type { CommitRange, CommitRef, GithubRoutes, PullRequestRef } from './GithubRoutes'

export interface GithubDiffFile {
  filename: string
  previous_filename?: string
  status: string
}

export interface GithubDiffData {
  baseRepo: string
  baseSha: string
  headRepo: string
  headSha: string
  fileByPath: Map<string, GithubDiffFile>
}

interface PullRequestResponse {
  base: { sha: string; repo: { full_name: string } | null }
  head: { sha: string; repo: { full_name: string } | null }
}

interface CompareResponse {
  merge_base_commit: { sha: string }
  files?: GithubDiffFile[]
}

interface CommitResponse {
  sha: string
  parents: { sha: string }[]
  files?: GithubDiffFile[]
}

export class GithubRestApi {
  constructor(
    private readonly http: HttpClient,
    private readonly routes: GithubRoutes,
  ) {}

  async loadPullRequest(location: Location, ref: PullRequestRef): Promise<GithubDiffData> {
    const repo = `${ref.owner}/${ref.repo}`
    const repoApi = `${this.routes.apiBase(location)}/repos/${repo}`
    const pullRequest = await this.http.fetchJson<PullRequestResponse>(
      `${repoApi}/pulls/${ref.number}`,
    )
    const files = await fetchAllPages<GithubDiffFile>(
      this.http,
      `${repoApi}/pulls/${ref.number}/files`,
    )
    return {
      baseRepo: pullRequest.base.repo?.full_name ?? repo,
      baseSha: await this.mergeBaseSha(repoApi, pullRequest),
      headRepo: pullRequest.head.repo?.full_name ?? repo,
      headSha: pullRequest.head.sha,
      fileByPath: this.indexByPath(files),
    }
  }

  async loadCommit(
    location: Location,
    ref: Pick<CommitRef, 'owner' | 'repo' | 'sha'>,
  ): Promise<GithubDiffData> {
    const repo = `${ref.owner}/${ref.repo}`
    const commit = await this.http.fetchJson<CommitResponse>(
      `${this.routes.apiBase(location)}/repos/${repo}/commits/${ref.sha}`,
    )
    const rootCommitHasNoBase = ''
    return {
      baseRepo: repo,
      baseSha: commit.parents[0]?.sha ?? rootCommitHasNoBase,
      headRepo: repo,
      headSha: commit.sha,
      fileByPath: this.indexByPath(commit.files ?? []),
    }
  }

  async loadComparison(
    location: Location,
    ref: Pick<PullRequestRef, 'owner' | 'repo'>,
    range: CommitRange,
  ): Promise<GithubDiffData> {
    const repo = `${ref.owner}/${ref.repo}`
    const comparison = await this.http.fetchJson<CompareResponse>(
      `${this.routes.apiBase(location)}/repos/${repo}/compare/${range.base}...${range.head}`,
    )
    return {
      baseRepo: repo,
      baseSha: range.base,
      headRepo: repo,
      headSha: range.head,
      fileByPath: this.indexByPath(comparison.files ?? []),
    }
  }

  rawFile(location: Location, repoFullName: string, ref: string, path: string): Promise<string> {
    return this.http.fetchText(this.routes.rawFileUrl(location, repoFullName, ref, path))
  }

  private async mergeBaseSha(repoApi: string, pullRequest: PullRequestResponse): Promise<string> {
    const tipOfBaseBranch = pullRequest.base.sha
    try {
      const comparison = await this.http.fetchJson<CompareResponse>(
        `${repoApi}/compare/${tipOfBaseBranch}...${pullRequest.head.sha}?per_page=1`,
      )
      return comparison.merge_base_commit.sha
    } catch {
      return tipOfBaseBranch
    }
  }

  private indexByPath(files: GithubDiffFile[]): Map<string, GithubDiffFile> {
    const fileByPath = new Map<string, GithubDiffFile>()
    for (const file of files) {
      fileByPath.set(file.filename, file)
      if (file.previous_filename) fileByPath.set(file.previous_filename, file)
    }
    return fileByPath
  }
}
