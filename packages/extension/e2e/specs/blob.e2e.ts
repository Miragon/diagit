import { browser, $, expect } from '@wdio/globals'

/**
 * The GitHub blob content script: on a `.bpmn` file view it should fetch the raw
 * file (via the background worker) and mount a bpmn-js diagram inside its shadow
 * root, above the host's code. Runs identically on Chrome, Edge and Firefox.
 */
describe('GitHub blob viewer (content script)', () => {
  it('renders a BPMN diagram above the file view', async () => {
    await browser.url('/octo/flows/blob/main/order.bpmn')

    // The viewer mounts under our custom host element as a shadow-root UI.
    const host = $('diagit-viewer')
    await host.waitForExist({ timeout: 20_000 })

    // bpmn-js renders diagram-js shape elements once the XML has loaded.
    const shape = host.shadow$('.djs-element')
    await expect(shape).toBeExisting()

    // Additive injection: the host's own code container must still be present.
    await expect($('[data-testid="code-lines-container"]')).toBeExisting()
  })

  it('renders a Wardley Map with its Miragon renderer inside the shadow root', async () => {
    await browser.url('/octo/strategy/blob/main/tea.owm')

    const host = $('diagit-viewer')
    await host.waitForExist({ timeout: 20_000 })

    await expect(host.shadow$('.djs-element')).toBeExisting()
  })

  it('renders an Excalidraw scene as an image inside the shadow root', async () => {
    await browser.url('/octo/sketches/blob/main/board.excalidraw')

    const host = $('diagit-viewer')
    await host.waitForExist({ timeout: 20_000 })

    await expect(host.shadow$('img.excalidraw-image')).toBeDisplayed()
  })
})

describe('GitHub blob viewer: the Code button', () => {
  const codeButton = () => $('diagit-viewer').shadow$('.diagit-code-toggle')

  it('hides the code under the diagram and shows it again, keeping the file header', async () => {
    await browser.url('/octo/flows/blob/main/order.bpmn')
    await $('diagit-viewer').shadow$('.djs-element').waitForExist({ timeout: 20_000 })
    await expect(codeButton()).toHaveAttribute('aria-pressed', 'true')
    await expect($('[data-testid="code-lines-container"]')).toBeDisplayed()

    await codeButton().click()

    await expect(codeButton()).toHaveAttribute('aria-pressed', 'false')
    await expect($('[data-testid="code-lines-container"]')).not.toBeDisplayed()
    await expect($('.file-header')).toBeDisplayed()

    await codeButton().click()

    await expect($('[data-testid="code-lines-container"]')).toBeDisplayed()
  })

  it('hides code that the host renders late', async () => {
    await browser.url('/octo/late/blob/main/order.bpmn')
    await codeButton().waitForExist({ timeout: 20_000 })

    await codeButton().click()

    await expect($('[data-testid="code-lines-container"]')).not.toBeDisplayed()
  })

  it('keeps the code of a page it cannot place the diagram on', async () => {
    await browser.url('/octo/relayout/blob/main/order.bpmn')
    await $('diagit-placement-notice').waitForExist({ timeout: 20_000 })

    await expect($('pre')).toBeDisplayed()
  })
})
