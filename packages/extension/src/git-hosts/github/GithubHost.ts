import { CachedDiffSource } from '../CachedDiffSource'
import { FileHeaderLocator } from '../FileHeaderLocator'
import type { DiffSource } from '../DiffSource'
import type { HttpClient } from '../../platform/messaging/HttpClient'
import { BlobPage } from '../BlobPage'
import type { GitHost, PageView } from '../GitHost'
import { GithubApiAuth } from './GithubApiAuth'
import { GithubCommitPage } from './GithubCommitPage'
import { GithubDeviceFlow } from './GithubDeviceFlow'
import { GithubDiffScanner } from './GithubDiffScanner'
import { GithubPullRequestPage } from './GithubPullRequestPage'
import { GithubRestApi } from './GithubRestApi'
import { GITHUB_PUBLIC_ORIGIN, GithubRoutes } from './GithubRoutes'
import { githubSelectors } from './githubSelectors'
import { GithubTokenRefresher } from './GithubTokenRefresher'
import type { GithubTokenStore } from './GithubTokenStore'

export class GithubHost implements GitHost {
  readonly id = 'github'
  readonly label = 'GitHub'
  readonly publicOrigin = GITHUB_PUBLIC_ORIGIN
  readonly routes = new GithubRoutes()
  readonly authPolicy: GithubApiAuth
  readonly blobPage: BlobPage
  readonly pullRequestDiff: DiffSource
  readonly commitDiff: DiffSource
  readonly views: readonly PageView[]

  constructor(http: HttpClient, tokens: GithubTokenStore) {
    const api = new GithubRestApi(http, this.routes)
    const scanner = new GithubDiffScanner()
    const fileHeaders = new FileHeaderLocator(githubSelectors.diff.regionsThatOnlyMentionFiles)
    this.authPolicy = new GithubApiAuth(
      new GithubTokenRefresher(tokens, new GithubDeviceFlow()),
      tokens,
      this.routes,
    )
    this.blobPage = new BlobPage(
      {
        blobSegment: '/blob/',
        rawSegment: '/raw/',
        contentSelectors: githubSelectors.blob.content,
        insertClimb: githubSelectors.blob.insertClimb,
      },
      http,
    )
    this.pullRequestDiff = new CachedDiffSource(
      new GithubPullRequestPage(this.routes, api, scanner, this.authPolicy),
      fileHeaders,
    )
    this.commitDiff = new CachedDiffSource(
      new GithubCommitPage(this.routes, api, scanner, this.authPolicy),
      fileHeaders,
    )
    this.views = [
      { script: 'github-blob', rendersOn: (url) => this.blobPage.showsDiagram(url) },
      { script: 'github-pr', rendersOn: (url) => this.routes.pullRequest(url) !== null },
      { script: 'github-commit', rendersOn: (url) => this.routes.commit(url) !== null },
    ]
  }

  recognizesSelfHosted(): boolean {
    return false
  }
}
