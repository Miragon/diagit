import { defineContentScript } from 'wxt/utils/define-content-script'
import { githubHost } from '../src/git-hosts/hosts'
import { reportContextOn } from '../src/git-hosts/utils/reportContextOn'
import { ExtensionEnvironment } from '../src/platform/ExtensionEnvironment'
import { HostPage } from '../src/platform/page/HostPage'
import { DiffController } from '../src/views/diff-viewer/DiffController'

export default defineContentScript({
  registration: 'runtime',
  cssInjectionMode: 'manual',
  main(ctx) {
    const reportContext = reportContextOn(
      githubHost,
      location,
      'commit',
      ExtensionEnvironment.current(),
    )
    new DiffController(new HostPage(ctx), githubHost.commitDiff, reportContext).start()
  },
})
