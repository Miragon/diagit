import { browser, $, expect } from '@wdio/globals'
import { DIFF_PANEL_TAG } from '../../src/platform/injectedElements'

/**
 * DRIFT CANARY (run with `WDIO_LIVE=1`) — drives the REAL github.com PR "Files
 * changed" view. If GitHub changes its diff DOM (file boxes, headers, code
 * tables) so `githubSelectors.ts` no longer matches, this fails: the early
 * warning to update the adapter + fixtures. Scheduled + non-blocking.
 *
 * Target: the repo's frozen demo PR #12 (a permanently-closed PR that changes a
 * `.bpmn` file — "do not merge/delete", see wxt.config.ts).
 */
const PR_URL = 'https://github.com/Miragon/diagit/pull/12/files'

describe('LIVE: GitHub PR diff on real github.com', () => {
  it('injects a diff panel with a rendered diagram on the real PR', async () => {
    await browser.url(PR_URL)
    const host = $(DIFF_PANEL_TAG)
    await host.waitForExist({ timeout: 45_000 })
    await host.scrollIntoView()
    await expect(host.shadow$('.djs-element')).toBeExisting()
  })
})
