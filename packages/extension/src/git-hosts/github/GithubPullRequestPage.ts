import { GithubDiffPage } from './GithubDiffPage'
import type { GithubDiffData } from './GithubRestApi'
import type { PullRequestRef } from './GithubRoutes'

export class GithubPullRequestPage extends GithubDiffPage<PullRequestRef> {
  identify(location: Location): PullRequestRef | null {
    return this.routes.pullRequest(location)
  }

  showsDiffs(location: Location): boolean {
    return this.routes.pullRequestDiffs(location)
  }

  load(location: Location, page: PullRequestRef): Promise<GithubDiffData> {
    return this.api.loadPullRequest(location, page)
  }
}
