import { defineContentScript } from 'wxt/utils/define-content-script'
import { githubHost } from '../src/git-hosts/hosts'
import { reportContextOn } from '../src/git-hosts/utils/reportContextOn'
import { ExtensionEnvironment } from '../src/platform/ExtensionEnvironment'
import { HostPage } from '../src/platform/page/HostPage'
import { BlobViewerController } from '../src/views/blob-viewer/BlobViewerController'

export default defineContentScript({
  registration: 'runtime',
  cssInjectionMode: 'manual',
  main(ctx) {
    const reportContext = reportContextOn(
      githubHost,
      location,
      'file page',
      ExtensionEnvironment.current(),
    )
    new BlobViewerController(new HostPage(ctx), githubHost.blobPage, reportContext).start()
  },
})
