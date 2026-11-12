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
  it.each<NoticeTone>(['danger', 'warning', 'info', 'success'])(
    'marks the %s tone and announces it politely',
    (tone) => {
      const notice = new Notice({ ...details, tone })

      expect(notice.element.dataset.tone).toBe(tone)
      expect(notice.element.getAttribute('role')).toBe('status')
      expect(notice.element.querySelector('svg.diagit-notice-icon')).not.toBeNull()
    },
  )

  it('announces a notice that follows a user action as an alert', () => {
    const notice = new Notice({ ...details, followsUserAction: true })

    expect(notice.element.getAttribute('role')).toBe('alert')
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

  it('renders a bar with the title, its meta and compact named buttons, but no body', () => {
    const onClick = vi.fn()
    const notice = new Notice(
      {
        tone: 'danger',
        title: 'Old version could not be loaded',
        meta: '· HTTP 404',
        action: { label: 'Reload', onClick },
        reportUrl: 'https://github.com/Miragon/diagit/issues/new',
      },
      'bar',
    )

    expect(notice.element.dataset.layout).toBe('bar')
    expect(notice.element.querySelector('.diagit-notice-title')!.textContent).toBe(
      'Old version could not be loaded · HTTP 404',
    )
    expect(notice.element.querySelector('.diagit-notice-meta')!.textContent).toBe('· HTTP 404')
    expect(notice.element.querySelector('.diagit-notice-body')).toBeNull()
    const [reload, report] = notice.element.querySelectorAll<HTMLElement>(
      '.diagit-notice-actions .btn',
    )
    expect(reload!.className).toBe('btn btn-small btn-secondary')
    expect(reload!.getAttribute('aria-label')).toBe('Reload')
    expect(report!.getAttribute('aria-label')).toBe('Report problem')
    expect(report!.querySelector('.diagit-notice-action-label')!.textContent).toBe('Report')
    reload!.click()
    expect(onClick).toHaveBeenCalledOnce()
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
