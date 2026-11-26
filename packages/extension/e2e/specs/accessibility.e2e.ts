import { browser, $, expect } from '@wdio/globals'
import { AccessibilityAudit } from '../AccessibilityAudit'
import { ExtensionTab } from '../ExtensionTab'

const OPTIONS_LINK_SHOWN = `String(!!document.querySelector('.page-header a[href="/options.html"]'))`

const CODE_START_SHOWN = `String(!!document.querySelector('input[name="code-start"]:checked'))`

const PANELS = [
  { name: 'blob viewer', url: '/octo/flows/blob/main/order.bpmn', host: 'diagit-viewer' },
  { name: 'PR diff', url: '/octo/flows/pull/1/files', host: 'diagit-diff' },
]

describe('accessibility (axe, WCAG 2.2 AA)', () => {
  for (const panel of PANELS) {
    for (const theme of ['light', 'dark'] as const) {
      it(`finds no violations in the ${panel.name} panel (${theme})`, async () => {
        await browser.url(panel.url)
        const host = $(panel.host)
        await host.waitForExist({ timeout: 20_000 })
        await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })
        await AccessibilityAudit.useTheme(panel.host, theme)

        await expect(await AccessibilityAudit.violationsIn(panel.host)).toEqual([])
      })

      it(`finds no violations in the ${panel.name} panel with the code hidden (${theme})`, async () => {
        await browser.url(panel.url)
        const host = $(panel.host)
        await host.waitForExist({ timeout: 20_000 })
        await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })
        await AccessibilityAudit.useTheme(panel.host, theme)
        await host.shadow$('.diagit-code-toggle').click()
        await expect(host.shadow$('.diagit-code-toggle')).toHaveAttribute('aria-pressed', 'false')

        await expect(await AccessibilityAudit.violationsIn(panel.host)).toEqual([])
      })
    }
  }

  it('finds no violations on the options page', async () => {
    await browser.url('/octo/relayout/pull/1/files')
    const notice = $('diagit-diff-error')
    await notice.waitForExist({ timeout: 20_000 })
    await notice.shadow$('button').click()
    const viewer = await ExtensionTab.opened('/viewer.html?page=')
    await viewer.waitForText(OPTIONS_LINK_SHOWN, 'true')
    await viewer.click('.page-header a[href="/options.html"]')
    await viewer.waitForText('location.pathname', '/options.html')
    await viewer.waitForText(CODE_START_SHOWN, 'true')

    await expect(await AccessibilityAudit.violationsInTab(viewer)).toEqual([])
  })

  it('finds no violations on the standalone viewer page', async () => {
    await browser.url('/viewer.html')
    await $('body').waitForExist()

    await expect(await AccessibilityAudit.violationsIn('body')).toEqual([])
  })
})
