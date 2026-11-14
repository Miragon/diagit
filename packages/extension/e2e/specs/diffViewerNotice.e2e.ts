import { browser, $, expect } from '@wdio/globals'
import { ExtensionTab } from '../ExtensionTab'

const RENDERED_PANES = `String(document.querySelectorAll('.diagit-diff-pane .djs-element').length > 0)`
const FILE_PATH = `document.querySelector('.diagit-file-path')?.textContent ?? ''`

describe('diff notice on a pull request whose diff view Diagit does not recognise', () => {
  it('opens the diagram diff of the file in the standalone viewer', async () => {
    await browser.url('/octo/relayout/pull/1/files')
    const notice = $('diagit-diff-error')
    await notice.waitForExist({ timeout: 20_000 })

    const openButton = notice.shadow$('button')
    await expect(openButton).toHaveText('Open in Diagit')
    await openButton.click()
    const viewer = await ExtensionTab.opened('/viewer.html?page=')

    await viewer.waitForText(RENDERED_PANES, 'true')
    expect(await viewer.text(FILE_PATH)).toBe('flows/order.bpmn')
  })
})
