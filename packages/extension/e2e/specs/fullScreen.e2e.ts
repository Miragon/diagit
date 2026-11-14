import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browser, $, expect } from '@wdio/globals'

const DIALOG_MARGINS = 2 * 32 + 2
const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

interface FullScreenState {
  panelInFullScreen: boolean
  panelInOpenDialog: boolean
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
        panelInOpenDialog:
          panel.parentElement instanceof HTMLDialogElement && panel.parentElement.open,
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

async function enterAndLeaveFullScreen(panelSelector: string): Promise<void> {
  const button = $('button[aria-label="Full screen"]')
  await button.waitForDisplayed({ timeout: 20_000 })
  await browser.execute(() => {
    document.body.style.paddingBottom = '200vh'
  })
  await button.scrollIntoView({ block: 'center' })
  const before = await fullScreenStateOf(null, panelSelector)
  expect(before.scrollY).toBeGreaterThan(0)

  await button.click()
  await browser.waitUntil(
    async () => (await fullScreenStateOf(null, panelSelector)).panelInFullScreen,
    { timeout: 10_000, timeoutMsg: 'the panel never entered full screen' },
  )
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(button).toHaveAttribute('title', 'Exit full screen')
  await browser.waitUntil(
    async () => {
      const inFullScreen = await fullScreenStateOf(null, panelSelector)
      return inFullScreen.panelHeight === inFullScreen.viewportHeight
    },
    { timeout: 5_000, timeoutMsg: 'the panel never filled the screen' },
  )

  await browser.execute(() => document.exitFullscreen())
  await browser.waitUntil(
    async () => !(await fullScreenStateOf(null, panelSelector)).pageInFullScreen,
    { timeout: 10_000, timeoutMsg: 'the page never left full screen' },
  )
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await browser.waitUntil(
    async () => (await fullScreenStateOf(null, panelSelector)).panelHeight === before.panelHeight,
    { timeout: 5_000, timeoutMsg: 'the panel did not return to its normal height' },
  )
  expect((await fullScreenStateOf(null, panelSelector)).scrollY).toBe(before.scrollY)
}

async function expandToFullScreenAndBack(
  host: ReturnType<typeof $>,
  hostTag: string,
  panelSelector: string,
): Promise<void> {
  const expand = host.shadow$('button[aria-label="Expand"]')
  const fullScreen = host.shadow$('button[aria-label="Full screen"]')
  await expand.waitForDisplayed({ timeout: 20_000 })
  await expect(fullScreen).not.toBeDisplayed()
  await browser.execute(() => {
    document.body.style.paddingBottom = '200vh'
  })
  await expand.scrollIntoView({ block: 'center' })
  const before = await fullScreenStateOf(hostTag, panelSelector)
  expect(before.scrollY).toBeGreaterThan(0)

  await expand.click()
  await browser.waitUntil(
    async () => {
      const expanded = await fullScreenStateOf(hostTag, panelSelector)
      return (
        expanded.panelInOpenDialog &&
        expanded.viewportHeight - expanded.panelHeight <= DIALOG_MARGINS
      )
    },
    { timeout: 5_000, timeoutMsg: 'the panel never filled the tab in the dialog' },
  )
  await expect(expand).toHaveAttribute('aria-pressed', 'true')

  await fullScreen.click()
  await browser.waitUntil(
    async () => (await fullScreenStateOf(hostTag, panelSelector)).panelInFullScreen,
    { timeout: 10_000, timeoutMsg: 'the panel never entered full screen' },
  )
  await browser.execute(() => document.exitFullscreen())
  await browser.waitUntil(
    async () => {
      const back = await fullScreenStateOf(hostTag, panelSelector)
      return !back.pageInFullScreen && back.panelInOpenDialog
    },
    { timeout: 10_000, timeoutMsg: 'leaving full screen did not return to the dialog' },
  )

  await browser.keys('Escape')
  await browser.waitUntil(
    async () => {
      const collapsed = await fullScreenStateOf(hostTag, panelSelector)
      return !collapsed.panelInOpenDialog && collapsed.panelHeight === before.panelHeight
    },
    { timeout: 5_000, timeoutMsg: 'Esc did not put the panel back in the page' },
  )
  expect((await fullScreenStateOf(hostTag, panelSelector)).scrollY).toBe(before.scrollY)
}

describe('expanding', () => {
  it('expands the file panel of a blob page, goes to full screen and back to the page', async () => {
    await browser.url('/octo/flows/blob/main/order.bpmn')
    const host = $('diagit-viewer')
    await host.waitForExist({ timeout: 20_000 })
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })

    await expandToFullScreenAndBack(host, 'diagit-viewer', '.diagit-wrap')
  })

  it('expands the diff panel of a PR, goes to full screen and back to the page', async () => {
    await browser.url('/octo/flows/pull/1/files')
    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.scrollIntoView()
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })

    await expandToFullScreenAndBack(host, 'diagit-diff', '.diagit-diff-root')
  })

  it('shows the file path in the diff toolbar only when expanded', async () => {
    await browser.url('/octo/flows/pull/1/files')
    const host = $('diagit-diff')
    await host.waitForExist({ timeout: 20_000 })
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })
    const path = host.shadow$('.diagit-file-path')
    await expect(path).not.toBeDisplayed()

    await host.shadow$('button[aria-label="Expand"]').click()

    await expect(path).toBeDisplayed()
    await browser.keys('Escape')
    await expect(path).not.toBeDisplayed()
  })

  it('stays expanded when a pan of the diagram ends on the dimmed page', async () => {
    await browser.url('/octo/flows/blob/main/order.bpmn')
    const host = $('diagit-viewer')
    await host.shadow$('.djs-element').waitForExist({ timeout: 20_000 })
    await host.shadow$('button[aria-label="Expand"]').click()
    const canvas = host.shadow$('.diagit-canvas')
    await canvas.waitForDisplayed()

    await canvas.click()
    await browser
      .action('pointer')
      .move({ origin: canvas })
      .down()
      .move({ x: 4, y: 4 })
      .up()
      .perform()

    await expect(host.shadow$('dialog[open] .diagit-wrap')).toBeExisting()
    await browser.keys('Escape')
  })
})

describe('full screen', () => {
  it('opens the standalone viewer panel in full screen', async () => {
    await browser.url('/viewer.html')
    const input = await $('input[type=file]')
    await input.waitForExist()
    await browser.execute((el) => {
      ;(el as HTMLElement).style.display = 'block'
    }, input)
    await input.setValue(join(fixtures, 'sample.dmn'))
    await $('.djs-element').waitForExist({ timeout: 20_000 })

    await enterAndLeaveFullScreen('section.diagit-wrap')
  })
})
