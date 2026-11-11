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
