import { describe, expect, it, vi } from 'vitest'
import { ViewScriptInjector, type ScriptExecutor } from '../src/background/ViewScriptInjector'

function injectorWith(executeScript: ReturnType<typeof vi.fn>) {
  return new ViewScriptInjector(['github-pr'], () => ({ executeScript }) as ScriptExecutor)
}

describe('ViewScriptInjector', () => {
  it('loads a known view script into the requesting tab', async () => {
    const executeScript = vi.fn().mockResolvedValue([])

    expect(await injectorWith(executeScript).inject(7, 'github-pr')).toBe(true)
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ['/content-scripts/github-pr.js'],
    })
  })

  it('refuses unknown scripts and requests without a tab', async () => {
    const executeScript = vi.fn()
    const injector = injectorWith(executeScript)

    expect(await injector.inject(7, '../../evil')).toBe(false)
    expect(await injector.inject(undefined, 'github-pr')).toBe(false)
    expect(executeScript).not.toHaveBeenCalled()
  })
})

describe('ViewScriptInjector.injectRouter', () => {
  it('loads the view router into the tab', async () => {
    const executeScript = vi.fn().mockResolvedValue([])

    await injectorWith(executeScript).injectRouter(7)

    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ['/content-scripts/view-router.js'],
    })
  })

  it('settles quietly when the tab refuses the script', async () => {
    const executeScript = vi.fn().mockRejectedValue(new Error('Frame with ID 0 was removed.'))

    await expect(injectorWith(executeScript).injectRouter(7)).resolves.toBeUndefined()
  })
})
