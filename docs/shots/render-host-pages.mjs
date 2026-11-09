// Renders Diagit on GitHub-shaped pages and its own pages with the real extension:
// the file page and the Plain and Diff view of a pull request (the e2e fixture pages in
// packages/extension/e2e/fixtures/host-dom, base and head from docs/shots/models), the
// options page and the standalone viewer. Writes PNGs to docs/public/shots/.
// Run from the repo root after `WXT_E2E=1 npx wxt build` in packages/extension:
//   node docs/shots/render-pr-diff.mjs
/* global URL, console */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { cropToContent } from './crop.mjs'

const extension = resolve('packages/extension/.output/chrome-mv3')
const hostDom = resolve('packages/extension/e2e/fixtures/host-dom')
const fixtures = resolve('packages/extension/e2e/fixtures')
const models = resolve('docs/shots/models')
const out = resolve('docs/public/shots')
const port = 4317
const baseSha = 'base0000000000000000000000000000000000000'
const headSha = 'head1111111111111111111111111111111111111'
const api = '/api/v3/repos/octo/flows'

const json = (body) => ['application/json', JSON.stringify(body)]
const routes = {
  [`${api}/pulls/1`]: () =>
    json({
      base: { sha: baseSha, repo: { full_name: 'octo/flows' } },
      head: { sha: headSha, repo: { full_name: 'octo/flows' } },
    }),
  [`${api}/compare/${baseSha}...${headSha}`]: () => json({ merge_base_commit: { sha: baseSha } }),
  [`${api}/pulls/1/files`]: () => json([{ filename: 'flows/order.bpmn', status: 'modified' }]),
}

const server = createServer((request, response) => {
  const path = decodeURIComponent(request.url.split('?')[0])
  const route = routes[path]
  const [type, body] = route
    ? route()
    : path.includes('/raw/')
      ? [
          'application/xml',
          readFileSync(
            join(models, path.includes(baseSha) ? 'order-base.bpmn' : 'order-head.bpmn'),
          ),
        ]
      : [
          'text/html; charset=utf-8',
          readFileSync(join(hostDom, path.includes('/blob/') ? 'blob.html' : 'pr.html')),
        ]
  response.writeHead(200, { 'content-type': type })
  response.end(body)
})
await new Promise((done) => server.listen(port, done))

const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'diagit-')), {
  channel: 'chromium',
  viewport: { width: 1200, height: 900 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
})
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
const extensionPage = (name) => `chrome-extension://${new URL(worker.url()).host}/${name}`
const page = await context.newPage()

async function save(name, png) {
  writeFileSync(join(out, name), png)
  console.log(name)
}

await page.goto(`http://localhost:${port}/octo/flows/blob/main/flows/order.bpmn`)
await page.locator('.djs-element').first().waitFor({ state: 'attached', timeout: 20_000 })
await page.waitForTimeout(1000)
await save(
  'file-page.png',
  await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }),
)

await page.goto(`http://localhost:${port}/octo/flows/pull/1/files`)
const panel = page.locator('git-diagram-diff')
await panel.locator('.djs-element').first().waitFor({ state: 'attached', timeout: 20_000 })
await page.waitForTimeout(1000)
await save('notations/bpmn-plain.png', await cropToContent(page, await panel.screenshot()))
await panel.getByRole('button', { name: 'Diff' }).click()
await page.waitForTimeout(1500)
await save('notations/bpmn-diff.png', await cropToContent(page, await panel.screenshot()))
await save('pr-diff.png', await panel.screenshot())

await page.setViewportSize({ width: 900, height: 900 })
await page.goto(extensionPage('options.html'))
await page.waitForTimeout(800)
await save('options.png', await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 590 } }))

await page.setViewportSize({ width: 1200, height: 750 })
await page.goto(extensionPage('viewer.html'))
await page.setInputFiles('input[type=file]', join(fixtures, 'sample.storm'))
await page.waitForTimeout(2500)
await save('standalone-viewer.png', await page.screenshot())

await context.close()
server.close()
