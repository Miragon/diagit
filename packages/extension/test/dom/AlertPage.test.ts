import { describe, expect, it, vi } from 'vitest'
import { AlertPage } from '../../src/views/alert/AlertPage'

function mountWithQuery(search: string, closeWindow = vi.fn()): HTMLElement {
  const app = document.createElement('div')
  new AlertPage(new URLSearchParams(search), closeWindow).mount(app)
  return app
}

describe('AlertPage', () => {
  it('shows the message from the query string as plain text', () => {
    const message = 'Could not enable <img src=x onerror=alert(1)> on https://git.example.com'
    const app = mountWithQuery(`?${new URLSearchParams({ message, title: 'Diagit' })}`)
    expect(app.querySelector('.message')!.textContent).toBe(message)
    expect(app.querySelector('img')).toBeNull()
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
})
