import { defineContentScript } from 'wxt/utils/define-content-script'
import { backgroundClient, hostRegistry } from '../src/git-hosts/hosts'
import { HostPage } from '../src/platform/page/HostPage'
import { StarPrompt } from '../src/platform/star-prompt/StarPrompt'
import { ViewRouter } from '../src/views/view-router/ViewRouter'
import { withE2eMatches } from '../src/platform/utils/e2eMatches'

export default defineContentScript({
  matches: withE2eMatches(hostRegistry.publicMatchPatterns(), ['http://localhost/*']),
  runAt: 'document_idle',
  main(ctx) {
    const page = new HostPage(ctx)
    new ViewRouter(page, hostRegistry, backgroundClient).start()
    new StarPrompt(page).start()
  },
})
