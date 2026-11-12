import { describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { Notice, type NoticeDetails, type NoticeTone } from '../../src/platform/ui/Notice'

vi.mock('wxt/browser', () => ({
  browser: { runtime: { sendMessage: vi.fn(() => Promise.resolve(true)) } },
}))

const details: NoticeDetails = {
  tone: 'danger',
  title: 'BPMN diff data could not be loaded',
  body: 'Reload the page to try again.',
}
const withAction: NoticeDetails = {
  ...details,
  action: { label: 'Install on this repository', url: 'https://github.com/apps/x' },
  reportUrl: 'https://github.com/Miragon/diagit/issues/new',
}

describe('Notice', () => {
  it.each<[NoticeTone, string]>([
    ['danger', 'alert'],
    ['warning', 'status'],
    ['info', 'status'],
    ['success', 'status'],
  ])('marks the %s tone and announces it as %s', (tone, role) => {
    const notice = new Notice({ ...details, tone })

    expect(notice.element.dataset.tone).toBe(tone)
    expect(notice.element.getAttribute('role')).toBe(role)
    expect(notice.element.querySelector('svg.diagit-notice-icon')).not.toBeNull()
  })

  it('shows the cause as title and the remedy as body, but no technical detail', () => {
    const notice = new Notice(details, 'pane')

    expect(notice.element.dataset.layout).toBe('pane')
    expect(notice.element.querySelector('.diagit-notice-title')!.textContent).toBe(details.title)
    expect(notice.element.querySelector('.diagit-notice-body')!.textContent).toBe(details.body)
    expect(notice.element.children).toHaveLength(3)
  })

  it.each([
    ['block', 'btn-secondary'],
    ['row', 'btn-secondary'],
    ['pane', 'btn-primary'],
  ] as const)('renders the action of a %s notice as %s', (layout, variant) => {
    const notice = new Notice(withAction, layout)

    const [action, report] = notice.element.querySelectorAll('.diagit-notice-actions .btn')
    expect(action!.classList).toContain(variant)
    expect(report!.classList).toContain('btn-secondary')
    expect(report!.classList).toContain('diagit-notice-report')
    expect(report!.textContent).toBe('Report problem')
  })

  it('links a url action to a new tab', () => {
    const link = new Notice(withAction).element.querySelector('.diagit-notice-actions a.btn')!

    expect(link.getAttribute('href')).toBe('https://github.com/apps/x')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('asks the background to open the options page', () => {
    const notice = new Notice({
      ...details,
      action: { label: 'Connect GitHub', opensOptions: true },
    })

    notice.element.querySelector<HTMLButtonElement>('.diagit-notice-actions button')!.click()

    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'openOptions' })
  })

  it('runs a click action', () => {
    const onClick = vi.fn()
    const notice = new Notice({ ...details, action: { label: 'Try again', onClick } })

    notice.element.querySelector<HTMLButtonElement>('.diagit-notice-actions button')!.click()

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders no action row without an action or a report link', () => {
    expect(new Notice(details).element.querySelector('.diagit-notice-actions')).toBeNull()
  })
})
