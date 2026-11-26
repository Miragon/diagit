import { browser, $, expect } from '@wdio/globals'

/**
 * The GitLab diff content script on a single commit page (`/-/commit/<sha>`): the
 * fixture server stands in for a self-hosted GitLab, so the script should read the
 * parent and the changed files from `/api/v4`, fetch both versions of the `.bpmn`
 * file and mount the diff panel in the Rapid Diffs file body.
 */
describe('GitLab commit diff (content script)', () => {
  const sha = 'c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00'

  it('mounts a diff panel with a rendered diagram for a changed .bpmn file', async () => {
    await browser.url(`/octo/flows/-/commit/${sha}`)

    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()

    await expect(host.shadow$('.djs-element')).toBeExisting()
    await expect($('[data-testid="rd-diff-file-body"] diagit-diff')).toBeExisting()
    await expect($('table.rd-text-view-root')).toBeExisting()
  })
})

describe('GitLab commit diff: the Code button', () => {
  it('hides the diff table in the file body and keeps the panel and the header', async () => {
    await browser.url('/octo/flows/-/commit/c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00')
    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })

    await host.shadow$('.diagit-code-toggle').click()

    await expect($('table.rd-text-view-root')).not.toBeDisplayed()
    await expect($('.rd-diff-file-header')).toBeDisplayed()
    await expect(host).toBeDisplayed()
    await expect(host).not.toHaveAttribute('data-collapsed')
  })
})
