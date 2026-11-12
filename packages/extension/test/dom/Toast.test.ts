import { afterEach, describe, expect, it, vi } from 'vitest'
import { Star } from 'lucide'
import { Toast, type ToastOptions } from '../../src/platform/ui/Toast'

function mountedToast(overrides: Partial<ToastOptions> = {}) {
  const options: ToastOptions = {
    tone: 'info',
    title: 'Thanks for using Diagit',
    body: 'A star helps other teams find it.',
    actions: [
      { label: 'Star on GitHub', icon: Star, variant: 'secondary', url: 'https://github.com/x' },
      { label: 'Later', variant: 'primary', onClick: vi.fn() },
    ],
    onClose: vi.fn(),
    ...overrides,
  }
  const container = document.createElement('div')
  document.body.append(container)
  new Toast(options).mount(container)
  return { options, root: container.querySelector<HTMLElement>('.diagit-toast')! }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('Toast', () => {
  it('draws the tone bar of its tone like a notice', () => {
    const { root } = mountedToast({ tone: 'success' })

    expect(root.classList).toContain('diagit-notice')
    expect(root.dataset.tone).toBe('success')
    expect(root.dataset.layout).toBe('toast')
    expect(root.querySelector('svg.diagit-notice-icon')).not.toBeNull()
  })

  it('announces its body politely after it is shown', () => {
    vi.useFakeTimers()
    const { root } = mountedToast()
    const announcement = root.querySelector<HTMLElement>('[role="status"]')!

    expect(announcement.getAttribute('aria-live')).toBe('polite')
    expect(announcement.textContent).toBe('')
    vi.runAllTimers()
    expect(announcement.textContent).toBe('A star helps other teams find it.')
  })

  it('boxes every action as a small button in one action row', () => {
    const { root } = mountedToast()

    const buttons = [...root.querySelectorAll<HTMLButtonElement>('.diagit-notice-actions button')]
    expect(buttons.map((button) => button.className)).toEqual([
      'btn btn-small btn-secondary',
      'btn btn-small btn-primary',
    ])
    expect(buttons[0]!.querySelector('svg')).not.toBeNull()
    expect(buttons.map((button) => button.textContent)).toEqual(['Star on GitHub', 'Later'])
  })

  it('opens a url action in a new tab and closes', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const { options, root } = mountedToast()

    root.querySelector<HTMLButtonElement>('.diagit-notice-actions button')!.click()

    expect(open).toHaveBeenCalledWith('https://github.com/x', '_blank', 'noopener')
    expect(options.onClose).toHaveBeenCalledOnce()
  })

  it('closes from its close button', () => {
    const { options, root } = mountedToast()

    root.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click()

    expect(options.onClose).toHaveBeenCalledOnce()
  })
})
