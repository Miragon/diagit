import { browser, $, expect } from '@wdio/globals'
import { RAW_LATENCY_SETTING, RAW_STATUS_SETTING } from '../server'

const FILE_PAGE = {
  path: '/octo/flows/blob/main/order.bpmn',
  host: 'diagit-viewer',
  rendered: '.djs-element',
}
const PR_DIFF = {
  path: '/octo/flows/pull/1/files',
  host: 'diagit-diff',
  rendered: '.diagit-diff-legend',
}
type PanelPage = typeof FILE_PAGE
const FILE_PAGE_WITH_LATE_CODE = '/octo/late/blob/main/order.bpmn'

const SLOW_DOWNLOAD_MS = 1_500
const SETTLE_AFTER_RENDER_MS = 500
const NARROW_COLUMN = { width: 800, height: 1000 }
const WIDE_COLUMN = { width: 1400, height: 1000 }
const LAYOUT_SHIFT_BUDGET = 0.01
const TIME_TO_DIAGRAM_BUDGET_MS = 1_000
const PANEL_AFTER_CODE_BUDGET_MS = 100
const TIMING_SAMPLES = 5
const DOWNLOAD_FAILED = 500

interface PanelMovement {
  panelGrewBy: number
  diagramAreaMovedBy: number
  layoutShift: number
}

async function setRawLatency(ms: number): Promise<void> {
  await fetch(`${browser.options.baseUrl}${RAW_LATENCY_SETTING}?ms=${ms}`)
}

async function setRawStatus(code: number): Promise<void> {
  await fetch(`${browser.options.baseUrl}${RAW_STATUS_SETTING}?code=${code}`)
}

async function p75Of(metric: string, sample: () => Promise<number>): Promise<number> {
  const samples: number[] = []
  for (let run = 0; run < TIMING_SAMPLES; run++) {
    samples.push(await sample())
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const p75 = sorted[Math.ceil(sorted.length * 0.75) - 1]!
  console.log(`[loading] ${metric}: p75 ${p75} ms of ${samples.join(', ')}`)
  return p75
}

async function movementWhileLoading(page: PanelPage): Promise<PanelMovement> {
  await setRawLatency(SLOW_DOWNLOAD_MS)
  await browser.url(page.path)
  await $(page.host).waitForExist({ timeout: 20_000 })
  return browser.execute(
    async (hostTag, renderedSelector, settleMs) => {
      const host = document.querySelector(hostTag)!
      const root = host.shadowRoot!
      const diagramArea = () => root.querySelector('.diagit-diff-area, .diagit-canvas')!
      const top = (element: Element) => element.getBoundingClientRect().top
      const startHeight = host.getBoundingClientRect().height
      const startAreaOffset = top(diagramArea()) - top(host)
      let layoutShift = 0
      const addShifts = (entries: PerformanceEntryList) => {
        for (const entry of entries as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!entry.hadRecentInput) {
            layoutShift += entry.value
          }
        }
      }
      const observer = new PerformanceObserver((list) => addShifts(list.getEntries()))
      observer.observe({ type: 'layout-shift' })
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      while (!root.querySelector(renderedSelector)) {
        await wait(50)
      }
      await wait(settleMs)
      addShifts(observer.takeRecords())
      observer.disconnect()
      return {
        panelGrewBy: Math.round(host.getBoundingClientRect().height - startHeight),
        diagramAreaMovedBy: Math.round(top(diagramArea()) - top(host) - startAreaOffset),
        layoutShift: Number(layoutShift.toFixed(4)),
      }
    },
    page.host,
    page.rendered,
    SETTLE_AFTER_RENDER_MS,
  )
}

async function timeToDiagram(page: PanelPage): Promise<number> {
  await browser.url(page.path)
  return browser.execute(
    async (hostTag, renderedSelector) => {
      const isRendered = () =>
        !!document.querySelector(hostTag)?.shadowRoot?.querySelector(renderedSelector)
      while (!isRendered()) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      return Math.round(performance.now())
    },
    page.host,
    page.rendered,
  )
}

async function panelDelayAfterCode(): Promise<number> {
  await browser.url(FILE_PAGE_WITH_LATE_CODE)
  return browser.execute(async (hostTag) => {
    while (!document.querySelector(hostTag)) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    return Math.round(performance.now() - Number(document.body.dataset.codeRenderedAt))
  }, FILE_PAGE.host)
}

function expectStill(movement: PanelMovement): void {
  console.log(`[loading] movement after insertion: ${JSON.stringify(movement)}`)
  expect(movement.panelGrewBy).toBe(0)
  expect(movement.diagramAreaMovedBy).toBe(0)
  expect(movement.layoutShift).toBeLessThanOrEqual(LAYOUT_SHIFT_BUDGET)
}

describe('Loading stability (Chromium only, Firefox reports no layout shifts)', function () {
  before(function () {
    if ((browser.capabilities as WebdriverIO.Capabilities).browserName === 'firefox') {
      this.skip()
    }
  })

  afterEach(async () => {
    await setRawLatency(0)
    await setRawStatus(200)
    await browser.setWindowSize(WIDE_COLUMN.width, WIDE_COLUMN.height)
  })

  it('keeps the file page panel still while the diagram loads', async () => {
    await browser.setWindowSize(WIDE_COLUMN.width, WIDE_COLUMN.height)
    expectStill(await movementWhileLoading(FILE_PAGE))
  })

  it('keeps the file page panel still when the download fails', async () => {
    await browser.setWindowSize(WIDE_COLUMN.width, WIDE_COLUMN.height)
    await setRawStatus(DOWNLOAD_FAILED)
    expectStill(await movementWhileLoading({ ...FILE_PAGE, rendered: '.diagit-notice' }))
  })

  it('keeps the diff panel still while the diagrams load in a wide column', async () => {
    await browser.setWindowSize(WIDE_COLUMN.width, WIDE_COLUMN.height)
    expectStill(await movementWhileLoading(PR_DIFF))
  })

  it('keeps the diff panel still while the diagrams load in a narrow column', async () => {
    await browser.setWindowSize(NARROW_COLUMN.width, NARROW_COLUMN.height)
    expectStill(await movementWhileLoading(PR_DIFF))
  })
})

describe('Loading speed', () => {
  it('shows the file page diagram within the time budget', async () => {
    const p75 = await p75Of(`time to diagram on ${FILE_PAGE.path}`, () => timeToDiagram(FILE_PAGE))
    expect(p75).toBeLessThanOrEqual(TIME_TO_DIAGRAM_BUDGET_MS)
  })

  it('shows the diff within the time budget', async () => {
    const p75 = await p75Of(`time to diagram on ${PR_DIFF.path}`, () => timeToDiagram(PR_DIFF))
    expect(p75).toBeLessThanOrEqual(TIME_TO_DIAGRAM_BUDGET_MS)
  })

  it('adds the panel right after the host renders the code', async () => {
    const p75 = await p75Of('panel after the code', panelDelayAfterCode)
    expect(p75).toBeLessThanOrEqual(PANEL_AFTER_CODE_BUDGET_MS)
  })
})
