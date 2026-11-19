import { browser, $, expect } from '@wdio/globals'
import { AccessibilityAudit } from '../AccessibilityAudit'

const PANELS = [
  { name: 'blob viewer', url: '/octo/flows/blob/main/order.bpmn', host: 'diagit-viewer' },
  { name: 'PR diff', url: '/octo/flows/pull/1/files', host: 'diagit-diff' },
  { name: 'renamed-only PR diff', url: '/octo/flows/pull/3/files', host: 'diagit-diff' },
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
    }
  }

  it('finds no violations on the standalone viewer page', async () => {
    await browser.url('/viewer.html')
    await $('body').waitForExist()

    await expect(await AccessibilityAudit.violationsIn('body')).toEqual([])
  })
})
