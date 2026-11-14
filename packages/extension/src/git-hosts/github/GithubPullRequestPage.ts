import type { PageUrl } from '../GitHost'
import { GithubDiffPage } from './GithubDiffPage'
import type { GithubDiffData } from './GithubRestApi'
import type { PullRequestRef } from './GithubRoutes'

export class GithubPullRequestPage extends GithubDiffPage<PullRequestRef> {
  identify(location: PageUrl): PullRequestRef | null {
    return this.routes.pullRequest(location)
  }

  showsDiffs(location: PageUrl): boolean {
    return this.routes.pullRequestDiffs(location)
  }

  load(location: PageUrl, page: PullRequestRef): Promise<GithubDiffData> {
    const { revisions } = page
    if (!revisions) {
      return this.api.loadPullRequest(location, page)
    }
    if ('commit' in revisions) {
      return this.api.loadCommit(location, { ...page, sha: revisions.commit })
    }
    return this.api.loadComparison(location, page, revisions)
  }
}
