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
        openOptionsPage: vi.fn(() => Promise.resolve()),
      },
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

const TRUSTED_TAB = { tabId: 1, origin: 'https://github.com' }

function startedWorker(): void {
  const access = { restoreOnStartup: () => Promise.resolve() }
  const hosts = { isSupportedUrl: (url: string) => url === SELF_HOSTED_FILE }
  const senders = {
    pageOf: (sender: { trusted?: boolean }) => (sender.trusted ? TRUSTED_TAB : undefined),
  }
  new BackgroundWorker(
    access as never,
    hosts as never,
    {} as never,
    {} as never,
    senders as never,
  ).start()
}

function sendMessage(message: unknown, sender: { trusted?: boolean }): Promise<unknown> {
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
