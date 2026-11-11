import { describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { ErrorNotice } from '../../src/platform/ui/ErrorNotice'

vi.mock('wxt/browser', () => ({
  browser: { runtime: { sendMessage: vi.fn(() => Promise.resolve(true)) } },
}))

const details = { title: 'BPMN diff could not be loaded', message: 'HTTP 404', hint: 'Private.' }

describe('ErrorNotice action', () => {
  it('asks the background to open the options page', () => {
    const notice = new ErrorNotice({
      ...details,
      action: { label: 'Connect GitHub', opensOptions: true },
    })

    notice.element.querySelector<HTMLButtonElement>('.diagit-error-actions button')!.click()

    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'openOptions' })
  })

  it('links a url action to a new tab', () => {
    const notice = new ErrorNotice({
      ...details,
      action: { label: 'Install on this repository', url: 'https://github.com/apps/x' },
    })

    const link = notice.element.querySelector('.diagit-error-actions a.btn')!
    expect(link.getAttribute('href')).toBe('https://github.com/apps/x')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('renders no action row without an action', () => {
    expect(new ErrorNotice(details).element.querySelector('.diagit-error-actions')).toBeNull()
  })
})
