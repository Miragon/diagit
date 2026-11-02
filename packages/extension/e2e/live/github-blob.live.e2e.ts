import { browser, $, expect } from '@wdio/globals'
import { HOST_TAG } from '../../src/platform/injectedElements'

/**
 * DRIFT CANARY (run with `WDIO_LIVE=1`) — drives the REAL github.com, not the
 * local fixtures. If GitHub changes its blob DOM so our selectors no longer
 * match, this fails: the early warning that the fixtures + `githubSelectors.ts`
 * need updating. Scheduled + non-blocking (see `.github/workflows/canary.yml`) —
 * never part of the PR gate, because real GitHub is A/B-tested and occasionally
 * flaky (hence the retries in `wdio.conf.ts`).
 *
 * Target: the repo's own `dev:example` blob URL — a public `.bpmn` on `main`.
 */
const BLOB_URL =
  'https://github.com/Miragon/diagit/blob/main/packages/extension/e2e/fixtures/sample.bpmn'

describe('LIVE: GitHub blob viewer on real github.com', () => {
  it('injects and renders a BPMN diagram above the file view', async () => {
    await browser.url(BLOB_URL)
    const host = $(HOST_TAG)
    await host.waitForExist({ timeout: 45_000 })
    await expect(host.shadow$('.djs-element')).toBeExisting()
  })
})
