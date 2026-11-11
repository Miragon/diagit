import { afterEach, describe, expect, it, vi } from 'vitest'
import { HostPage } from '../../src/platform/page/HostPage'
import { FakeContentScriptContext } from '../fakes/FakeContentScriptContext'

const context = new FakeContentScriptContext()
const page = new HostPage(context.ctx)

afterEach(() => {
  context.invalidate()
  document.body.innerHTML = ''
})

describe('HostPage.onChange', () => {
  it('collapses a burst of DOM changes and navigation into one call', async () => {
    const onChange = vi.fn()
    page.onChange(50, onChange)

    document.body.append(document.createElement('div'))
    document.body.append(document.createElement('div'))
    context.navigate()
    await new Promise((resolve) => setTimeout(resolve, 60))

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('stops reacting once the content script is invalidated', async () => {
    const onChange = vi.fn()
    page.onChange(10, onChange)

    context.invalidate()
    document.body.append(document.createElement('div'))
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('drops a change that is still waiting when the content script is invalidated', async () => {
    const onChange = vi.fn()
    page.onChange(10, onChange)

    document.body.append(document.createElement('div'))
    await Promise.resolve()
    context.invalidate()
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('HostPage.onElementChange', () => {
  it('stops reacting and drops a waiting change once stopped', async () => {
    const onChange = vi.fn()
    const target = document.body.appendChild(document.createElement('div'))
    const stop = page.onElementChange(target, { childList: true }, 10, onChange)

    target.append(document.createElement('span'))
    await Promise.resolve()
    stop()
    target.append(document.createElement('span'))
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('leaves no invalidation listener behind once stopped', () => {
    const before = context.pendingInvalidationListeners
    const stop = page.onElementChange(document.body, { childList: true }, 10, vi.fn())

    stop()

    expect(context.pendingInvalidationListeners).toBe(before)
  })
})

describe('HostPage.mountPanel', () => {
  it('leaves no invalidation listener behind once the panel is removed', async () => {
    const anchor = document.body.appendChild(document.createElement('div'))
    const destroy = vi.fn()
    const before = context.pendingInvalidationListeners

    const panel = await page.mountPanel({
      name: 'diagit-test-panel',
      anchor,
      append: 'first',
      css: '',
      render: () => ({ destroy }),
    })
    panel.remove()

    expect(destroy).toHaveBeenCalled()
    expect(context.pendingInvalidationListeners).toBe(before)
  })

  it('still removes the panel when the content script is invalidated', async () => {
    const anchor = document.body.appendChild(document.createElement('div'))
    const destroy = vi.fn()
    await page.mountPanel({
      name: 'diagit-test-panel',
      anchor,
      append: 'first',
      css: '',
      render: () => ({ destroy }),
    })

    context.invalidate()

    expect(destroy).toHaveBeenCalled()
    expect(anchor.querySelector('diagit-test-panel')).toBeNull()
  })
})
