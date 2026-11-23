import '../../src/platform/ui/base.css'
import '../../src/platform/ui/viewer.css'
import './viewer.css'
import '../../src/platform/theme/cd-canvas.css'

import { FetchProxy } from '../../src/background/FetchProxy'
import { FetchScope } from '../../src/background/FetchScope'
import { GithubHost } from '../../src/git-hosts/github/GithubHost'
import { GitlabHost } from '../../src/git-hosts/gitlab/GitlabHost'
import { githubHost, githubTokens, hostRegistry } from '../../src/git-hosts/hosts'
import { notationDetector } from '../../src/notations/NotationDetector'
import { NOTATION_CATALOG } from '../../src/notations/notationCatalog'
import { allNotations } from '../../src/notations/allNotations'
import { ExtensionEnvironment } from '../../src/platform/ExtensionEnvironment'
import { PageHttpClient } from '../../src/platform/messaging/PageHttpClient'
import { ViewerHeader } from '../../src/platform/ui/ViewerHeader'
import { WebOrigin } from '../../src/platform/WebOrigin'
import { StandaloneDiffPage } from '../../src/views/diff-viewer/StandaloneDiffPage'
import { LinkedModelReader } from '../../src/views/standalone-viewer/LinkedModelReader'
import { StandaloneViewerPage } from '../../src/views/standalone-viewer/StandaloneViewerPage'

const app = document.querySelector<HTMLElement>('#app')!
const NO_AUTH_POLICIES = [] as const
const query = new URLSearchParams(location.search)
const linkedModel = query.get('src')
const diffPage = query.get('page')
const diffOrigin = diffPage ? WebOrigin.of(diffPage) : null
const diffPath = query.get('path')
const reportContext = {
  where: 'Standalone viewer',
  environment: ExtensionEnvironment.current().describe(),
}
const fetchScope = new FetchScope(hostRegistry.fetchRules())
const linkedModels = new LinkedModelReader(new FetchProxy(NO_AUTH_POLICIES, fetchScope))

app.append(new ViewerHeader().element)
if (diffPage && diffOrigin && diffPath) {
  const fetchProxy = new FetchProxy([githubHost.authPolicy], fetchScope)
  const http = new PageHttpClient(fetchProxy, diffOrigin)
  const gitlab = new GitlabHost(http)
  const github = new GithubHost(http, githubTokens)
  const page = new StandaloneDiffPage(
    [gitlab.diff, github.pullRequestDiff, github.commitDiff],
    allNotations,
    linkedModels,
    reportContext,
  )
  page.mount(app)
  void page.open(diffPage, diffPath)
} else {
  const page = new StandaloneViewerPage(
    allNotations,
    notationDetector.fileExtensions(),
    NOTATION_CATALOG.map((notation) => notation.label),
    reportContext,
    linkedModels,
  )
  page.mount(app)
  if (linkedModel) {
    void page.openLink(linkedModel)
  }
}
