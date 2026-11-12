/**
 * One WebdriverIO suite, the same specs across every browser we ship for:
 * Chrome, Edge (both use the unpacked `chrome-mv3` build) and Firefox (the
 * `firefox-mv3` build). Other Chromium forks (Brave, Opera, Vivaldi, Arc) share
 * Chrome's engine + build and are covered by it.
 *
 * The extension is loaded at runtime through the WebDriver-BiDi
 * `webExtension.install` command (see the `before` hook) — a single unified,
 * cross-browser mechanism. It sidesteps Chrome ≥129 having removed the
 * `--load-extension` CLI switch, and Firefox not accepting extensions via CLI at
 * all.
 *
 * The extension must be built with `WXT_E2E=1` first (so its GitHub content
 * scripts also match the local fixture server) — see `package.json`'s
 * `e2e:build`. Select a subset with `WDIO_BROWSERS=chrome,firefox`.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Options } from '@wdio/types'
import { startFixtureServer, type FixtureServer } from './e2e/server'

const dir = dirname(fileURLToPath(import.meta.url))
const chromeExtension = resolve(dir, '.output', 'chrome-mv3')
const firefoxExtension = resolve(dir, '.output', 'firefox-mv3')
const screenshotDir = resolve(dir, '.output', 'e2e-screenshots')

const PORT = Number(process.env.WDIO_PORT ?? 4599)
const selected = (process.env.WDIO_BROWSERS ?? 'chrome,edge,firefox')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// `WDIO_LIVE=1` runs the drift canary against the REAL github.com (see
// `e2e/live/`) instead of the local fixtures — no fixture server, real URLs,
// retries for GitHub's A/B-tested DOM. Build the extension normally first
// (`npm run build`), not `e2e:build`.
const live = Boolean(process.env.WDIO_LIVE)

// Firefox lets WebDriver BiDi read an extension tab (moz-extension://, the
// standalone viewer opened from the placement notice) only with system access.
// geckodriver refuses this variable as a capability, so Firefox inherits it.
if (selected.includes('firefox') && !live) {
  process.env.MOZ_REMOTE_ALLOW_SYSTEM_ACCESS = '1'
}

const chromiumArgs = (): string[] => [
  ...(process.env.WDIO_HEADED ? [] : ['--headless=new']),
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--window-size=1400,1000',
]

const CAPABILITIES: Record<string, WebdriverIO.Capabilities> = {
  chrome: {
    browserName: 'chrome',
    'goog:chromeOptions': { args: chromiumArgs() },
  },
  edge: {
    browserName: 'MicrosoftEdge',
    'ms:edgeOptions': { args: chromiumArgs() },
  },
  firefox: {
    browserName: 'firefox',
    'moz:firefoxOptions': {
      args: process.env.WDIO_HEADED ? [] : ['-headless'],
      // MV3 host permissions are opt-in in Firefox; pre-grant them so the
      // background worker may fetch the fixture files from localhost.
      prefs: { 'extensions.originControls.grantByDefault': true },
    },
  },
}

/** The unpacked extension directory to install for a given browser. */
function extensionPath(browserName: string | undefined): string {
  return browserName?.toLowerCase() === 'firefox' ? firefoxExtension : chromeExtension
}

let server: FixtureServer | undefined

export const config: Options.Testrunner = {
  runner: 'local',
  autoXvfb: false,

  specs: live ? ['./e2e/live/**/*.e2e.ts'] : ['./e2e/specs/**/*.e2e.ts'],
  maxInstances: 1, // one extension-loaded browser at a time keeps the SW/add-on state simple

  capabilities: selected.map((name) => {
    const cap = CAPABILITIES[name]
    if (!cap) {
      throw new Error(`Unknown WDIO_BROWSERS entry: ${name}`)
    }
    return cap
  }),

  logLevel: 'warn',
  baseUrl: `http://localhost:${PORT}`,
  waitforTimeout: 20_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 3,

  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { ui: 'bdd', timeout: 60_000, retries: live ? 2 : 0 },

  onPrepare: async () => {
    // The live canary drives real github.com, so it needs no fixture server.
    if (!live) {
      server = await startFixtureServer(PORT)
    }
  },
  before: async (_caps, _specs, browser) => {
    await browser.webExtensionInstall({
      extensionData: { type: 'path', path: extensionPath(browser.capabilities.browserName) },
    })
  },
  afterTest: async (test, _ctx, _result) => {
    if (!process.env.WDIO_SCREENSHOTS) {
      return
    }
    mkdirSync(screenshotDir, { recursive: true })
    const browserName = browser.capabilities.browserName ?? 'browser'
    const safe = `${browserName}--${test.title}`.replace(/[^\w.-]+/g, '_')
    const file = join(screenshotDir, `${safe}.png`)
    try {
      const context = await browser.getWindowHandle()
      const { data } = await browser.browsingContextCaptureScreenshot({
        context,
        origin: 'document',
      })
      writeFileSync(file, Buffer.from(data, 'base64'))
    } catch {
      // Fall back to a viewport screenshot if full-page capture is unavailable.
      await browser.saveScreenshot(file)
    }
  },
  onComplete: async () => {
    await server?.close()
  },
}
