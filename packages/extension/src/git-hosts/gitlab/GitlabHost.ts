import { CachedDiffSource } from '../CachedDiffSource'
import { FileHeaderLocator } from '../FileHeaderLocator'
import type { DiffSource } from '../DiffSource'
import type { HttpClient } from '../../platform/messaging/HttpClient'
import { BlobPage } from '../BlobPage'
import type { GitHost, PageUrl, PageView } from '../GitHost'
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
  readonly routes = new GitlabRoutes()
  readonly blobPage: BlobPage
  readonly mergeRequestDiff: DiffSource
  readonly views: readonly PageView[]

  constructor(http: HttpClient) {
    const api = new GitlabRestApi(http, this.routes)
    this.blobPage = new BlobPage(
      {
        blobSegment: '/-/blob/',
        rawSegment: '/-/raw/',
        contentSelectors: gitlabSelectors.blob.content,
        insertClimb: gitlabSelectors.blob.insertClimb,
      },
      http,
    )
    this.mergeRequestDiff = new CachedDiffSource(
      new GitlabMergeRequestPage(this.routes, api, new GitlabDiffScanner()),
      new FileHeaderLocator(gitlabSelectors.diff.regionsThatOnlyMentionFiles),
    )
    this.views = [
      { script: 'gitlab-blob', rendersOn: (url) => this.blobPage.showsDiagram(url) },
      { script: 'gitlab-mr', rendersOn: (url) => this.routes.mergeRequest(url) !== null },
    ]
  }

  recognizesSelfHosted(url: PageUrl): boolean {
    return url.pathname.includes(GITLAB_ROUTE_MARKER)
  }
}
