import { browser, $, expect } from '@wdio/globals'
import { DIFF_PANEL_TAG, HOST_TAG } from '../../src/platform/injectedElements'

const REPO_HOME = '/octo/flows'
const BPMN_FILE = '/octo/flows/blob/main/order.bpmn'
const README_FILE = '/octo/flows/blob/main/README.md'
const PULL_REQUEST_FILES = '/octo/flows/pull/1/files'

async function navigateWithoutDocumentLoad(path: string): Promise<void> {
  await browser.execute(async (target) => {
    const nextPage = new DOMParser().parseFromString(
      await (await fetch(target)).text(),
      'text/html',
    )
    history.pushState({}, '', target)
    document.head.append(...nextPage.head.querySelectorAll('style'))
    document.body.replaceChildren(...nextPage.body.childNodes)
  }, path)
}

describe('Client-side navigation (content scripts)', () => {
  it('renders the diagram when a file is reached from the repository home', async () => {
    await browser.url(REPO_HOME)
    await navigateWithoutDocumentLoad(BPMN_FILE)

    const host = $(HOST_TAG)
    await host.waitForExist({ timeout: 20_000 })
    await expect(host.shadow$('.djs-element')).toBeExisting()
  })

  it('mounts the diff panel when a pull request is reached from the repository home', async () => {
    await browser.url(REPO_HOME)
    await navigateWithoutDocumentLoad(PULL_REQUEST_FILES)

    const host = $(DIFF_PANEL_TAG)
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()
    await expect(host.shadow$('.djs-element')).toBeExisting()
  })

  it('removes the diagram when the file is left for one without a diagram', async () => {
    await browser.url(BPMN_FILE)
    const host = $(HOST_TAG)
    await host.waitForExist({ timeout: 20_000 })

    await browser.execute((target) => history.pushState({}, '', target), README_FILE)

    await host.waitForExist({ timeout: 5_000, reverse: true })
  })
})
