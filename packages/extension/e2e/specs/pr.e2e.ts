import { browser, $, $$, expect } from '@wdio/globals'

/**
 * The GitHub pull-request content script: on the "Files changed" view it should
 * read the PR metadata (base/head SHAs + file list) from `/api/v3`, fetch the
 * changed `.bpmn` file's XML, and mount the diff panel with a rendered diagram
 * above the file's code box. Runs identically on Chrome, Edge and Firefox.
 */
describe('GitHub PR diff (content script)', () => {
  it('mounts a diff panel with a rendered diagram for a changed .bpmn file', async () => {
    await browser.url('/octo/flows/pull/1/files')

    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()

    // A modified file opens on "Diff", which renders both models on diagram-js canvases.
    const shape = host.shadow$('.djs-element')
    await expect(shape).toBeExisting()

    // Additive: the host's own diff table stays in the page.
    await expect($('table[data-diff-anchor]')).toBeExisting()
  })

  it('shows one legend and one change navigator for the panel', async () => {
    await browser.url('/octo/flows/pull/1/files')

    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })

    await expect(host.shadow$$('.diagit-diff-legend')).toBeElementsArrayOfSize(1)
    await expect(host.shadow$$('.diagit-diff-nav')).toBeElementsArrayOfSize(1)
    await expect(host.shadow$('.diagit-diff-total')).toHaveText('No changes')
  })

  it('does not stack a second panel when the file is re-rendered (Viewed toggle)', async () => {
    await browser.url('/octo/flows/pull/1/files')

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
