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

    const notice = $('diagit-diff-error')
    await notice.waitForExist({ timeout: 20_000 })

    await expect(notice.shadow$('.diagit-notice-title')).toHaveText(
      'BPMN diff data could not be loaded',
    )
    const report = await notice.shadow$('.diagit-notice-report').getAttribute('href')
    expect(new URL(report).searchParams.get('console')).toContain('Refused the redirect')
    await expect($('diagit-diff')).not.toBeExisting()
  })
})
