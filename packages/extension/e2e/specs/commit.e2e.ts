import { browser, $, $$, expect } from '@wdio/globals'

/**
 * The GitHub single-commit content script: on a `/commit/<sha>` diff view it
 * should read the commit metadata (parent/commit SHAs + file list) from
 * `/api/v3`, fetch the changed `.bpmn` file's XML, and mount the diff panel with
 * a rendered diagram above the file's code box. Runs identically on Chrome, Edge
 * and Firefox.
 */
describe('GitHub commit diff (content script)', () => {
  const sha = 'c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00'

  it('mounts a diff panel with a rendered diagram for a changed .bpmn file', async () => {
    await browser.url(`/octo/flows/commit/${sha}`)

    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })

    // The default "Plain" view renders the head model — a diagram-js canvas.
    const shape = host.shadow$('.djs-element')
    await expect(shape).toBeExisting()

    // Additive: the host's own diff table stays in the page.
    await expect($('table[data-diff-anchor]')).toBeExisting()
  })

  it('does not stack a second panel when the file is re-rendered (Viewed toggle)', async () => {
    await browser.url(`/octo/flows/commit/${sha}`)

    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })

    await browser.execute(() => {
      const body = document.querySelector('#diff-order-bpmn .diff-body')
      body?.replaceWith(body.cloneNode(true))
    })

    await browser.pause(1_000)
    const panels = await $$('diagit-diff')
    await expect(panels).toBeElementsArrayOfSize(1)
  })
})
