import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browser, $, expect } from '@wdio/globals'

const output = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.output')

/**
 * WebDriver classic cannot switch to an extension tab, so the viewer tab is found
 * and read over WebDriver BiDi: its browsing context and a script evaluated in it.
 */
async function viewerTab(): Promise<string> {
  return browser.waitUntil(async () => {
    const { contexts } = await browser.browsingContextGetTree({})
    return contexts.find((context) => context.url.includes('/viewer.html?src='))?.context
  })
}

async function textIn(context: string, expression: string): Promise<string> {
  const result = await browser.scriptEvaluate({
    expression,
    target: { context },
    awaitPromise: false,
  })
  return result.type === 'success' && result.result.type === 'string' ? result.result.value : ''
}

async function waitForText(context: string, expression: string, expected: string): Promise<void> {
  await browser.waitUntil(async () => (await textIn(context, expression)) === expected)
}

const RENDERED_SHAPES = `String(document.querySelectorAll('.canvas .djs-element').length > 0)`
const FILE_NAME = `document.querySelector('.file-name')?.textContent ?? ''`
const ERROR_TITLE = `document.querySelector('.diagit-error-title')?.textContent ?? ''`

describe('placement notice on a file page Diagit cannot place its view in', () => {
  let viewer: string

  it('opens the model in the standalone viewer', async () => {
    await browser.url('/octo/relayout/blob/main/order.bpmn')
    const notice = $('diagit-placement-notice')
    await notice.waitForExist({ timeout: 20_000 })

    const openButton = notice.shadow$('.btn-primary')
    await expect(openButton).toHaveText('Open in Diagit')
    await openButton.click()
    viewer = await viewerTab()

    await waitForText(viewer, RENDERED_SHAPES, 'true')
    expect(await textIn(viewer, FILE_NAME)).toBe('order.bpmn')
  })

  it('refuses a model from a domain Diagit may not read', async () => {
    const refused = new URL(await textIn(viewer, 'location.href'))
    refused.search = `?src=${encodeURIComponent('https://example.com/order.bpmn')}`

    await browser.browsingContextNavigate({ context: viewer, url: refused.href, wait: 'complete' })

    await waitForText(viewer, ERROR_TITLE, 'Model could not be opened')
    expect(await textIn(viewer, RENDERED_SHAPES)).toBe('false')
  })

  it('keeps the viewer away from web pages, so only Diagit opens it with a src', () => {
    for (const build of ['chrome-mv3', 'firefox-mv3']) {
      const manifest = JSON.parse(readFileSync(join(output, build, 'manifest.json'), 'utf8'))
      expect(JSON.stringify(manifest.web_accessible_resources ?? [])).not.toContain('viewer')
    }
  })
})
