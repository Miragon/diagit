import { beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { localWebExtAlertHtml } from 'webext-alert'
import addPermissionToggle from 'webext-permission-toggle'
import { BackgroundWorker } from '../src/background/BackgroundWorker'

vi.mock('webext-alert', () => ({ localWebExtAlertHtml: vi.fn() }))
vi.mock('webext-permission-toggle', () => ({ default: vi.fn() }))
vi.mock('wxt/browser', () => {
  const listenable = () => ({ addListener: vi.fn() })
  return {
    browser: {
      runtime: {
        getURL: (path: string) => `chrome-extension://diagit${path}`,
        onMessage: listenable(),
        onInstalled: listenable(),
        openOptionsPage: vi.fn(() => Promise.resolve()),
      },
      tabs: { create: vi.fn(() => Promise.resolve({})) },
      action: { onClicked: listenable() },
      permissions: {
        onAdded: listenable(),
        onRemoved: listenable(),
        contains: vi.fn(),
        request: vi.fn(() => Promise.resolve(true)),
      },
    },
  }
})

const SELF_HOSTED_FILE = 'https://git.example.com/group/repo/-/blob/main/order.bpmn'

const TRUSTED_TAB = { tabId: 1, origin: 'https://github.com', incognito: false }

const OPEN_TAB_IDS = [3, 4]
const PUBLIC_PATTERNS = ['https://github.com/*', 'https://gitlab.com/*']

const access = {
  restoreOnStartup: () => Promise.resolve(),
  openTabIds: vi.fn(async (_publicPatterns: string[]) => OPEN_TAB_IDS),
}
const injector = { injectRouter: vi.fn(async (_tabId: number) => undefined) }

function startedWorker(browserReinjectsOnUpdate = false): void {
  const hosts = {
    isSupportedUrl: (url: string) => url === SELF_HOSTED_FILE,
    publicMatchPatterns: () => PUBLIC_PATTERNS,
  }
  const senders = {
    pageOf: (sender: { trusted?: boolean; incognito?: boolean }) =>
      sender.trusted ? { ...TRUSTED_TAB, incognito: sender.incognito === true } : undefined,
  }
  new BackgroundWorker(
    access as never,
    hosts as never,
    {} as never,
    injector as never,
    senders as never,
    browserReinjectsOnUpdate,
  ).start()
}

function sendMessage(
  message: unknown,
  sender: { trusted?: boolean; incognito?: boolean },
): Promise<unknown> {
  const [onMessage] = vi.mocked(browser.runtime.onMessage.addListener).mock.lastCall!
  const handle = onMessage as (m: unknown, s: unknown, respond: (r: unknown) => void) => boolean
  return new Promise((respond) => handle(message, sender, respond))
}

function clickToolbar(url: string): void {
  const [onClick] = vi.mocked(browser.action.onClicked.addListener).mock.lastCall!
  ;(onClick as (tab: { url: string }) => void)({ url })
}

function domainAllowedBeforeClick(allowed: boolean): void {
  const contains = browser.permissions.contains as unknown as () => Promise<boolean>
  vi.mocked(contains).mockResolvedValue(allowed)
}

function installed(reason: string): void {
  const [onInstalled] = vi.mocked(browser.runtime.onInstalled.addListener).mock.lastCall!
  ;(onInstalled as (details: { reason: string }) => void)({ reason })
}

async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve))
}

describe('BackgroundWorker.start', () => {
  it('points webext-alert at the bundled alert page before the permission toggle can alert', () => {
    startedWorker()

    expect(localWebExtAlertHtml).toHaveBeenCalledWith('chrome-extension://diagit/alert.html')
    const [alertPageOrder] = vi.mocked(localWebExtAlertHtml).mock.invocationCallOrder
    const [toggleOrder] = vi.mocked(addPermissionToggle).mock.invocationCallOrder
    expect(alertPageOrder).toBeLessThan(toggleOrder!)
  })
})

describe('BackgroundWorker toolbar click', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startedWorker()
  })

  it('opens the options page on a page Diagit does not support', async () => {
    clickToolbar('https://example.com/')
    await settled()

    expect(browser.runtime.openOptionsPage).toHaveBeenCalled()
    expect(browser.permissions.request).not.toHaveBeenCalled()
  })

  it('asks for access to a supported domain within the user gesture', async () => {
    domainAllowedBeforeClick(false)

    clickToolbar(SELF_HOSTED_FILE)

    expect(browser.permissions.request).toHaveBeenCalledWith({
      origins: ['https://git.example.com/*'],
    })
    await settled()
    expect(browser.runtime.openOptionsPage).not.toHaveBeenCalled()
  })

  it('opens the options page when the supported domain is already allowed', async () => {
    domainAllowedBeforeClick(true)

    clickToolbar(SELF_HOSTED_FILE)
    await settled()

    expect(browser.runtime.openOptionsPage).toHaveBeenCalled()
  })
})

describe('BackgroundWorker openOptions message', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startedWorker()
  })

  it('opens the options page for a trusted sender', async () => {
    expect(await sendMessage({ type: 'openOptions' }, { trusted: true })).toBe(true)
    expect(browser.runtime.openOptionsPage).toHaveBeenCalled()
  })

  it('refuses an untrusted sender', async () => {
    expect(await sendMessage({ type: 'openOptions' }, {})).toBe(false)
    expect(browser.runtime.openOptionsPage).not.toHaveBeenCalled()
  })
})

describe('BackgroundWorker openViewer message', () => {
  const RAW_FILE = 'https://github.com/o/r/raw/main/order%20v2.bpmn'

  beforeEach(() => {
    vi.clearAllMocks()
    startedWorker()
  })

  it('opens the viewer with a file of the sender page origin', async () => {
    expect(await sendMessage({ type: 'openViewer', url: RAW_FILE }, { trusted: true })).toBe(true)

    expect(browser.tabs.create).toHaveBeenCalledWith({
      url: `chrome-extension://diagit/viewer.html?src=${encodeURIComponent(RAW_FILE)}`,
    })
  })

  it('refuses a file of another origin', async () => {
    for (const url of [
      'https://gitlab.com/o/r/-/raw/main/order.bpmn',
      'https://github.com.evil.example/o/r/raw/main/order.bpmn',
      'http://github.com/o/r/raw/main/order.bpmn',
      'javascript:alert(1)',
      'not a url',
    ]) {
      expect(await sendMessage({ type: 'openViewer', url }, { trusted: true })).toBe(false)
    }
    expect(browser.tabs.create).not.toHaveBeenCalled()
  })

  it('refuses an incognito tab, whose viewer would open in a normal window', async () => {
    const incognitoTab = { trusted: true, incognito: true }
    expect(await sendMessage({ type: 'openViewer', url: RAW_FILE }, incognitoTab)).toBe(false)
    expect(browser.tabs.create).not.toHaveBeenCalled()
  })

  it('refuses an untrusted sender', async () => {
    expect(await sendMessage({ type: 'openViewer', url: RAW_FILE }, {})).toBe(false)
    expect(browser.tabs.create).not.toHaveBeenCalled()
  })
})

describe('BackgroundWorker extension update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the view router into every open tab of a supported host', async () => {
    startedWorker()

    installed('update')
    await settled()

    expect(access.openTabIds).toHaveBeenCalledWith(PUBLIC_PATTERNS)
    expect(injector.injectRouter.mock.calls).toEqual([[3], [4]])
  })

  it('leaves open tabs alone on a fresh install or a browser update', async () => {
    startedWorker()

    installed('install')
    installed('browser_update')
    await settled()

    expect(injector.injectRouter).not.toHaveBeenCalled()
  })

  it('leaves open tabs alone where the browser injects the new version itself', async () => {
    startedWorker(true)

    installed('update')
    await settled()

    expect(injector.injectRouter).not.toHaveBeenCalled()
  })
})
