import type { ErrorHelp } from '../DiffSource'
import type { PageUrl } from '../GitHost'
import { GitlabDiffPage } from './GitlabDiffPage'
import type { GitlabDiffData } from './GitlabRestApi'
import type { MergeRequestRef } from './GitlabRoutes'

export class GitlabMergeRequestPage extends GitlabDiffPage<MergeRequestRef> {
  protected readonly metadataErrorHelp: ErrorHelp = {
    tone: 'danger',
    title: 'Merge request data could not be loaded',
    body: 'Check that you are signed in and can open this merge request.',
  }

  identify(location: PageUrl): MergeRequestRef | null {
    return this.routes.mergeRequest(location)
  }

  showsDiffs(location: PageUrl): boolean {
    return this.routes.mergeRequestDiffs(location)
  }

  load(location: PageUrl, page: MergeRequestRef): Promise<GitlabDiffData> {
    return page.commit
      ? this.api.loadCommit(location, page, page.commit)
      : this.api.loadMergeRequest(location, page)
  }
}
