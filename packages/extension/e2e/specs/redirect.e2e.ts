import { browser, $, expect } from '@wdio/globals'

describe('Redirects of the background fetch', () => {
  it('follows a raw file of a renamed repository to its new path', async () => {
    await browser.url('/octo/renamed/blob/main/order.bpmn')

    const host = $('diagit-viewer')
    await host.waitForExist({ timeout: 20_000 })

    await expect(host.shadow$('.djs-element')).toBeExisting()
  })

  it('refuses an api redirect of a renamed repository', async () => {
    await browser.url('/octo/renamed/pull/1/files')

    const notice = $('git-diagram-diff-error')
    await notice.waitForExist({ timeout: 20_000 })

    await expect(notice.shadow$('.git-diagram-error-detail')).toHaveText(
      expect.stringContaining('Refused the redirect'),
    )
    await expect($('git-diagram-diff')).not.toBeExisting()
  })
})
