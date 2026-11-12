import { afterEach, describe, expect, it, vi } from 'vitest'
import { AlertPage } from '../../src/views/alert/AlertPage'

function mountWithQuery(search: string, closeWindow = vi.fn()): HTMLElement {
  const app = document.createElement('div')
  document.body.append(app)
  new AlertPage(new URLSearchParams(search), closeWindow).mount(app)
  return app
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AlertPage', () => {
  it('shows the message from the query string as plain text', () => {
    const message = 'Could not enable <img src=x onerror=alert(1)> on https://git.example.com'
    const app = mountWithQuery(`?${new URLSearchParams({ message })}`)
    expect(app.querySelector('.message')!.textContent).toBe(message)
    expect(app.querySelector('.message img')).toBeNull()
  })

  it('shows an empty message when the query string has none', () => {
    const app = mountWithQuery('')
    expect(app.querySelector('.message')!.textContent).toBe('')
  })

  it('closes the window when OK is clicked', () => {
    const closeWindow = vi.fn()
    const app = mountWithQuery('?message=Failed', closeWindow)
    app.querySelector('button')!.click()
    expect(closeWindow).toHaveBeenCalledOnce()
  })

  it('titles the dialog Diagit', () => {
    const app = mountWithQuery('?message=Failed')
    expect(app.querySelector('.dialog-head h1')!.textContent).toBe('Diagit')
  })

  it('focuses the dialog instead of the OK button on load', () => {
    const app = mountWithQuery('?message=Failed')
    expect(document.activeElement).toBe(app.querySelector('.dialog'))
    expect(document.activeElement).not.toBe(app.querySelector('button'))
  })

  it('is an alert dialog named by its title and described by the message', () => {
    const app = mountWithQuery('?message=Failed')
    const dialog = app.querySelector<HTMLElement>('.dialog')!

    expect(dialog.getAttribute('role')).toBe('alertdialog')
    expect(dialog.tabIndex).toBe(-1)
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe(
      'Diagit',
    )
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)!.textContent).toBe(
      'Failed',
    )
  })

  it('leaves Enter on the OK button to the button, so the window closes once', () => {
    const closeWindow = vi.fn()
    const app = mountWithQuery('?message=Failed', closeWindow)
    const ok = app.querySelector('button')!

    ok.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    ok.click()

    expect(closeWindow).toHaveBeenCalledOnce()
  })

  it.each(['Enter', 'Escape'])('closes the window on %s', (key) => {
    const closeWindow = vi.fn()
    mountWithQuery('?message=Failed', closeWindow)
    document.dispatchEvent(new KeyboardEvent('keydown', { key }))
    expect(closeWindow).toHaveBeenCalledOnce()
  })
})
