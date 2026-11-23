import { CachedDiffSource } from '../CachedDiffSource'
import { FileHeaderLocator } from '../FileHeaderLocator'
import { FirstMatchingDiffSource } from '../FirstMatchingDiffSource'
import type { DiffSource } from '../DiffSource'
import type { HttpClient } from '../../platform/messaging/HttpClient'
import { BlobPage } from '../BlobPage'
import type { GitHost, PageUrl, PageView } from '../GitHost'
import { GitlabCommitPage } from './GitlabCommitPage'
import { GitlabDiffScanner } from './GitlabDiffScanner'
import { GitlabMergeRequestPage } from './GitlabMergeRequestPage'
import { GitlabRestApi } from './GitlabRestApi'
import { GITLAB_PUBLIC_ORIGIN, GITLAB_ROUTE_MARKER, GitlabRoutes } from './GitlabRoutes'
import { gitlabSelectors } from './gitlabSelectors'

export class GitlabHost implements GitHost {
  readonly id = 'gitlab'
  readonly label = 'GitLab'
  readonly publicOrigin = GITLAB_PUBLIC_ORIGIN
  readonly authPolicy = null
  readonly fetchRules = null
  readonly routes = new GitlabRoutes()
  readonly blobPage: BlobPage
  readonly diff: DiffSource
  readonly views: readonly PageView[]

  constructor(http: HttpClient) {
    const api = new GitlabRestApi(http, this.routes)
    const scanner = new GitlabDiffScanner()
    const fileHeaders = new FileHeaderLocator(gitlabSelectors.diff.regionsThatOnlyMentionFiles)
    this.blobPage = new BlobPage(
      {
        blobSegment: '/-/blob/',
        rawSegment: '/-/raw/',
        contentSelectors: gitlabSelectors.blob.content,
        insertClimb: gitlabSelectors.blob.insertClimb,
      },
      http,
    )
    this.diff = new FirstMatchingDiffSource([
      new CachedDiffSource(new GitlabMergeRequestPage(this.routes, api, scanner), fileHeaders),
      new CachedDiffSource(new GitlabCommitPage(this.routes, api, scanner), fileHeaders),
    ])
    this.views = [
      { script: 'gitlab-blob', rendersOn: (url) => this.blobPage.showsDiagram(url) },
      { script: 'gitlab-diff', rendersOn: (url) => this.diff.pageKey(url) !== null },
    ]
  }

  recognizesSelfHosted(url: PageUrl): boolean {
    return url.pathname.includes(GITLAB_ROUTE_MARKER)
  }
}
