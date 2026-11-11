import { browser, $, expect } from '@wdio/globals'
import { DIFF_PANEL_TAG } from '../../src/platform/injectedElements'

const COMMIT_URL =
  'https://github.com/Miragon/diagit/commit/6c2e3bfcae092e1929cafb0a2c7a9f1479468fe5'

describe('LIVE: GitHub commit diff on real github.com', () => {
  it('injects a diff panel with a rendered diagram on the real commit', async () => {
    await browser.url(COMMIT_URL)
    const host = $(DIFF_PANEL_TAG)
    await host.waitForExist({ timeout: 45_000 })
    await expect(host.shadow$('.djs-element')).toBeExisting()
  })
})
