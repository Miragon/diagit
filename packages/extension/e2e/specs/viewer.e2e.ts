import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browser, $, $$, expect } from '@wdio/globals'

/**
 * The standalone viewer page (`viewer.html`) uses no extension APIs, so we drive
 * it directly over HTTP from the built output — it exercises the real bundled
 * bpmn-js / dmn-js render path via file upload. Runs on all three browsers.
 */
const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

async function openFixture(fixture: string): Promise<void> {
  await browser.url('/viewer.html')
  const input = await $('input[type=file]')
  await input.waitForExist()
  // The input is `display:none` by design; reveal it so WebDriver treats it as
  // interactable, then hand it the fixture path (the page reads `input.files`).
  await browser.execute((el) => {
    ;(el as HTMLElement).style.display = 'block'
  }, input)
  await input.setValue(join(fixtures, fixture))
}

async function expectRenders(fixture: string): Promise<void> {
  await openFixture(fixture)
  await expect($$('.canvas svg')).toBeElementsArrayOfSize({ gte: 1 })
  await expect($$('.djs-element')).toBeElementsArrayOfSize({ gte: 1 })
}

describe('standalone viewer page', () => {
  it('renders a .bpmn file with bpmn-js', async () => {
    await expectRenders('sample.bpmn')
  })

  it('links to the options page from its header', async () => {
    await browser.url('/viewer.html')
    const optionsLink = $('.page-header a[href="/options.html"]')
    await expect(optionsLink).toHaveText('Options')
  })

  it('marks Camunda 7 transaction boundaries', async () => {
    await expectRenders('c7-async.bpmn')
    await expect($$('.diagit-transaction-boundary')).toBeElementsArrayOfSize(1)
  })

  it('renders a .dmn file with dmn-js', async () => {
    await expectRenders('sample.dmn')
  })

  for (const fixture of [
    'sample.owm',
    'sample.tt',
    'sample.storm',
    'sample.cm',
    'sample.vc.json',
  ]) {
    it(`renders a ${fixture} file with its Miragon renderer`, async () => {
      await expectRenders(fixture)
    })
  }

  it('renders a .excalidraw file as an image', async () => {
    await openFixture('sample.excalidraw')
    await expect($('.canvas img.excalidraw-image')).toBeDisplayed()
  })
})
