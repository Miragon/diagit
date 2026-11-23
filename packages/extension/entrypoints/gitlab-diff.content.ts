import { defineContentScript } from 'wxt/utils/define-content-script'
import { gitlabHost } from '../src/git-hosts/hosts'
import { reportContextOn } from '../src/git-hosts/utils/reportContextOn'
import { ExtensionEnvironment } from '../src/platform/ExtensionEnvironment'
import { HostPage } from '../src/platform/page/HostPage'
import { DiffController } from '../src/views/diff-viewer/DiffController'

export default defineContentScript({
  registration: 'runtime',
  cssInjectionMode: 'manual',
  main(ctx) {
    const pageType = gitlabHost.routes.commit(location) ? 'commit' : 'merge request'
    const reportContext = reportContextOn(
      gitlabHost,
      location,
      pageType,
      ExtensionEnvironment.current(),
    )
    new DiffController(new HostPage(ctx), gitlabHost.diff, reportContext).start()
  },
})
