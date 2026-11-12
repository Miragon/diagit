// Renders every e2e fixture in Diagit's standalone viewer (built Chrome extension) and
// writes one PNG per notation to docs/public/shots/notations/, cropped to the drawn content and
// padded to 16:9 in the canvas colour, so every render fills the same frame on the landing page.
// Run from the repo root after `npm run build -w @diagit/extension`:
//   node docs/shots/render-notations.mjs
/* global URL, console */
import { chromium } from 'playwright'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { cropToContent } from './crop.mjs'

const extension = resolve('packages/extension/.output/chrome-mv3')
const fixtures = resolve('packages/extension/e2e/fixtures')
const out = resolve('docs/public/shots/notations')
const files = {
  bpmn: 'sample.bpmn',
  dmn: 'sample.dmn',
  wardley: 'sample.owm',
  'team-topologies': 'sample.tt',
  'event-storming': 'sample.storm',
  'context-map': 'sample.cm',
  'value-chain': 'sample.vc.json',
  excalidraw: 'sample.excalidraw',
}

mkdirSync(out, { recursive: true })
const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'diagit-')), {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1200, height: 750 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
})
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
const extensionId = new URL(worker.url()).host
const page = await context.newPage()
for (const [name, file] of Object.entries(files)) {
  await page.goto(`chrome-extension://${extensionId}/viewer.html`)
  await page.setInputFiles('input[type=file]', join(fixtures, file))
  await page.waitForTimeout(2500)
  const stage = await page.locator('.stage').screenshot()
  writeFileSync(join(out, `${name}.png`), await cropToContent(page, stage))
  console.log(`${name}.png`)
}
await context.close()
