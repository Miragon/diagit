import type { PageUrl } from '../GitHost'
import { GithubDiffPage } from './GithubDiffPage'
import type { GithubDiffData } from './GithubRestApi'
import type { CommitRef } from './GithubRoutes'

export class GithubCommitPage extends GithubDiffPage<CommitRef> {
  identify(location: PageUrl): CommitRef | null {
    return this.routes.commit(location)
  }

  showsDiffs(): boolean {
    return true
  }

  load(location: PageUrl, page: CommitRef): Promise<GithubDiffData> {
    return this.api.loadCommit(location, page)
  }
}
