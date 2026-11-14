import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browser, $, expect } from '@wdio/globals'
import { ExtensionTab } from '../ExtensionTab'

const output = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.output')

const RENDERED_SHAPES = `String(document.querySelectorAll('.canvas .djs-element').length > 0)`
const FILE_NAME = `document.querySelector('.file-name')?.textContent ?? ''`
const ERROR_TITLE = `document.querySelector('.diagit-notice-title')?.textContent ?? ''`

describe('placement notice on a file page Diagit cannot place its view in', () => {
  let viewer: ExtensionTab

  it('opens the model in the standalone viewer', async () => {
    await browser.url('/octo/relayout/blob/main/order.bpmn')
    const notice = $('diagit-placement-notice')
    await notice.waitForExist({ timeout: 20_000 })

    const openButton = notice.shadow$('.btn-primary')
    await expect(openButton).toHaveText('Open in Diagit')
    await openButton.click()
    viewer = await ExtensionTab.opened('/viewer.html?src=')

    await viewer.waitForText(RENDERED_SHAPES, 'true')
    expect(await viewer.text(FILE_NAME)).toBe('order.bpmn')
  })

  it('refuses a model from a domain Diagit may not read', async () => {
    const refused = new URL(await viewer.text('location.href'))
    refused.search = `?src=${encodeURIComponent('https://example.com/order.bpmn')}`

    await viewer.navigate(refused.href)

    await viewer.waitForText(ERROR_TITLE, "Can't open order.bpmn")
    expect(await viewer.text(RENDERED_SHAPES)).toBe('false')
  })

  it('keeps the viewer away from web pages, so only Diagit opens it with a src', () => {
    for (const build of ['chrome-mv3', 'firefox-mv3']) {
      const manifest = JSON.parse(readFileSync(join(output, build, 'manifest.json'), 'utf8'))
      expect(JSON.stringify(manifest.web_accessible_resources ?? [])).not.toContain('viewer')
    }
  })
})
