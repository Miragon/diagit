import type { ErrorHelp } from '../DiffSource'
import type { PageUrl } from '../GitHost'
import { GitlabDiffPage } from './GitlabDiffPage'
import type { GitlabDiffData } from './GitlabRestApi'
import type { CommitRef } from './GitlabRoutes'

export class GitlabCommitPage extends GitlabDiffPage<CommitRef> {
  protected readonly metadataErrorHelp: ErrorHelp = {
    tone: 'danger',
    title: 'Commit data could not be loaded',
    body: 'Check that you are signed in and can open this commit.',
  }

  identify(location: PageUrl): CommitRef | null {
    return this.routes.commit(location)
  }

  showsDiffs(): boolean {
    return true
  }

  load(location: PageUrl, page: CommitRef): Promise<GitlabDiffData> {
    return this.api.loadCommit(location, page, page.sha)
  }
}
