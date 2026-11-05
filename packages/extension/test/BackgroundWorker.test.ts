import { describe, expect, it, vi } from 'vitest'
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
      },
      action: { onClicked: listenable() },
      permissions: { onAdded: listenable(), onRemoved: listenable() },
    },
  }
})

function startedWorker(): void {
  const access = { restoreOnStartup: () => Promise.resolve() }
  new BackgroundWorker(access as never, {} as never, {} as never, {} as never, {} as never).start()
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
