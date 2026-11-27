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

  it('returns both panes from a collapsed subprocess to the process on "Show all"', async () => {
    await browser.url('/octo/flows/pull/2/files')

    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })
    const panesInsideASubprocess = host.shadow$$('.bjs-breadcrumbs-shown')

    await host.shadow$('button[aria-label="Next change"]').click()
    await expect(panesInsideASubprocess).toBeElementsArrayOfSize(2)

    await host.shadow$('.diagit-diff-nav .btn-ghost').click()
    await expect(panesInsideASubprocess).toBeElementsArrayOfSize(0)
  })
})

describe('GitHub PR diff: the Code button', () => {
  it('hides the diff table under the panel and keeps the panel and the file collapse working', async () => {
    await browser.url('/octo/flows/pull/1/files')
    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })

    await host.shadow$('.diagit-code-toggle').click()

    await expect($('table[data-diff-anchor]')).not.toBeDisplayed()
    await expect(host).toBeDisplayed()
    await expect(host).not.toHaveAttribute('data-collapsed')

    await browser.execute(() => {
      document.querySelector<HTMLElement>('#diff-order-bpmn .diff-body')!.style.display = 'none'
    })

    await expect(host).toHaveAttribute('data-collapsed')
  })
})

describe('GitHub PR diff: the code of the selected change', () => {
  const diagramHeight = () =>
    browser.execute(
      () =>
        document
          .querySelector('diagit-diff')!
          .shadowRoot!.querySelector('.diagit-diff-area')!
          .getBoundingClientRect().height,
    )

  it('shows only the XML of the selected change and keeps the diagram at its size', async () => {
    await browser.url('/octo/flows/pull/2/files')
    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })
    const bar = host.shadow$('.diagit-change-code-bar')
    await expect(bar).toHaveText(expect.stringContaining('All changes'))
    const heightWithWholeFile = await diagramHeight()

    await host.shadow$('button[aria-label="Next change"]').click()

    await expect(bar).toHaveText(expect.stringContaining('Check the order'))
    await expect(host.shadow$('.diagit-xml-line[data-line="removed"]')).toHaveText(
      expect.stringContaining('name="Check order"'),
    )
    await expect(host.shadow$('.diagit-xml-line[data-line="added"]')).toHaveText(
      expect.stringContaining('name="Check the order"'),
    )
    await expect($('table[data-diff-anchor]')).not.toBeDisplayed()
    expect(await diagramHeight()).toBe(heightWithWholeFile)

    await browser.keys(['Escape'])

    await expect(bar).toHaveText(expect.stringContaining('All changes'))
    await expect($('table[data-diff-anchor]')).toBeDisplayed()
    expect(await diagramHeight()).toBe(heightWithWholeFile)
  })
})
