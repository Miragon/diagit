import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browser, $, expect } from '@wdio/globals'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

interface FullScreenState {
  panelInFullScreen: boolean
  pageInFullScreen: boolean
  panelHeight: number
  viewportHeight: number
  scrollY: number
}

function fullScreenStateOf(hostTag: string | null, panelSelector: string) {
  return browser.execute(
    (tag, selector): FullScreenState => {
      const root = tag ? document.querySelector(tag)!.shadowRoot! : document
      const panel = root.querySelector<HTMLElement>(selector)!
      return {
        panelInFullScreen: root.fullscreenElement === panel,
        pageInFullScreen: document.fullscreenElement !== null,
        panelHeight: panel.getBoundingClientRect().height,
        viewportHeight: window.innerHeight,
        scrollY: window.scrollY,
      }
    },
    hostTag,
    panelSelector,
  )
}

async function enterAndLeaveFullScreen(
  host: ReturnType<typeof $> | null,
  hostTag: string | null,
  panelSelector: string,
): Promise<void> {
  const button = host
    ? host.shadow$('button[aria-label="Full screen"]')
    : $('button[aria-label="Full screen"]')
  await button.waitForDisplayed({ timeout: 20_000 })
  await browser.execute(() => {
    document.body.style.paddingBottom = '200vh'
  })
  await button.scrollIntoView({ block: 'center' })
  const before = await fullScreenStateOf(hostTag, panelSelector)
  expect(before.scrollY).toBeGreaterThan(0)

  await button.click()
  await browser.waitUntil(
    async () => (await fullScreenStateOf(hostTag, panelSelector)).panelInFullScreen,
    { timeout: 10_000, timeoutMsg: 'the panel never entered full screen' },
  )
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(button).toHaveAttribute('title', 'Exit full screen')
  const inFullScreen = await fullScreenStateOf(hostTag, panelSelector)
  expect(inFullScreen.panelHeight).toBe(inFullScreen.viewportHeight)

  await browser.execute(() => document.exitFullscreen())
  await browser.waitUntil(
    async () => !(await fullScreenStateOf(hostTag, panelSelector)).pageInFullScreen,
    { timeout: 10_000, timeoutMsg: 'the page never left full screen' },
  )
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await browser.waitUntil(
    async () =>
      (await fullScreenStateOf(hostTag, panelSelector)).panelHeight === before.panelHeight,
    { timeout: 5_000, timeoutMsg: 'the panel did not return to its normal height' },
  )
  expect((await fullScreenStateOf(hostTag, panelSelector)).scrollY).toBe(before.scrollY)
}

describe('full screen', () => {
  it('opens the diff panel of a PR in full screen with its file path', async () => {
    await browser.url('/octo/flows/pull/1/files')
    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })

    await enterAndLeaveFullScreen(host, 'diagit-diff', '.diagit-diff-root')
  })

  it('shows the file path in the diff toolbar only in full screen', async () => {
    await browser.url('/octo/flows/pull/1/files')
    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })
    const path = host.shadow$('.diagit-file-path')
    await expect(path).not.toBeDisplayed()

    await host.shadow$('button[aria-label="Full screen"]').click()

    await expect(path).toBeDisplayed()
    await browser.execute(() => document.exitFullscreen())
  })

  it('opens the file panel of a blob page in full screen', async () => {
    await browser.url('/octo/flows/blob/main/order.bpmn')
    const host = $('diagit-viewer')
    await host.waitForExist({ timeout: 20_000 })
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })

    await enterAndLeaveFullScreen(host, 'diagit-viewer', '.diagit-wrap')
  })

  it('opens the standalone viewer panel in full screen', async () => {
    await browser.url('/viewer.html')
    const input = await $('input[type=file]')
    await input.waitForExist()
    await browser.execute((el) => {
      ;(el as HTMLElement).style.display = 'block'
    }, input)
    await input.setValue(join(fixtures, 'sample.dmn'))
    await $('.djs-element').waitForExist({ timeout: 20_000 })

    await enterAndLeaveFullScreen(null, null, 'section.diagit-wrap')
  })
})
