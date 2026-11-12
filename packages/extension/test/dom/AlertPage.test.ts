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

  it('does not focus the OK button on load', () => {
    const app = mountWithQuery('?message=Failed')
    expect(document.activeElement).not.toBe(app.querySelector('button'))
  })

  it.each(['Enter', 'Escape'])('closes the window on %s', (key) => {
    const closeWindow = vi.fn()
    mountWithQuery('?message=Failed', closeWindow)
    document.dispatchEvent(new KeyboardEvent('keydown', { key }))
    expect(closeWindow).toHaveBeenCalledOnce()
  })
})
