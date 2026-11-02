import { browser, $, $$, expect } from '@wdio/globals'
import { HOST_TAG } from '../../src/platform/injectedElements'

const REPO = 'https://github.com/Miragon/diagit'
const FIXTURES_DIRECTORY = `${REPO}/tree/main/packages/extension/e2e/fixtures`
const BPMN_FILE = `${REPO}/blob/main/packages/extension/e2e/fixtures/sample.bpmn`

const BPMN_FILE_PATH = 'packages/extension/e2e/fixtures/sample.bpmn'
const FILE_WITHOUT_DIAGRAM_PATH = 'packages/extension/e2e/server.ts'

const fileTreeItem = (path: string) => $(`[id="${path}-item"]`)

describe('LIVE: client-side navigation on real github.com', () => {
  it('renders the diagram when the file is opened from the directory listing', async () => {
    await browser.url(FIXTURES_DIRECTORY)

    const fileLinks = $$('a[title="sample.bpmn"]')
    await fileLinks[0]!.waitForExist({ timeout: 45_000 })
    const visibleFileLink = await fileLinks.find((link) => link.isDisplayed())
    await visibleFileLink!.click()

    const host = $(HOST_TAG)
    await host.waitForExist({ timeout: 45_000 })
    await expect(host.shadow$('.djs-element')).toBeExisting()
  })

  it('keeps the diagram in step with the file opened from the file tree', async () => {
    await browser.url(BPMN_FILE)
    const host = $(HOST_TAG)
    await host.waitForExist({ timeout: 45_000 })

    await fileTreeItem(FILE_WITHOUT_DIAGRAM_PATH).click()
    await host.waitForExist({ timeout: 45_000, reverse: true })

    await fileTreeItem(BPMN_FILE_PATH).click()
    await host.waitForExist({ timeout: 45_000 })
    await expect(host.shadow$('.djs-element')).toBeExisting()
  })
})
