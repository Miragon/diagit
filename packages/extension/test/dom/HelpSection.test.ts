import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExtensionEnvironment } from '../../src/platform/ExtensionEnvironment'
import { DebugInfo } from '../../src/views/options/DebugInfo'
import { HelpSection } from '../../src/views/options/HelpSection'

const CHROME_UA =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mountedSection(): HTMLElement {
  const setup = () => Promise.resolve({ selfHostedInstances: 1, githubConnected: false })
  new HelpSection(new DebugInfo(new ExtensionEnvironment('0.3.1', CHROME_UA)), setup).mount(
    document.body,
  )
  return document.body
}

function link(page: HTMLElement, text: string): HTMLAnchorElement {
  return [...page.querySelectorAll('a')].find((a) => a.textContent?.includes(text))!
}

describe('HelpSection', () => {
  it('links the docs pages that solve the most common problems', () => {
    const page = mountedSection()

    expect(link(page, 'Private repositories').href).toBe(
      'https://miragon.github.io/diagit/private-repos.html',
    )
    expect(link(page, 'self-hosted').href).toBe('https://miragon.github.io/diagit/self-hosted.html')
    expect(link(page, 'file types').href).toBe('https://miragon.github.io/diagit/notations.html')
  })

  it('opens the bug report with browser and extension version filled in', () => {
    const report = new URL(link(mountedSection(), 'Report a bug').href)

    expect(report.searchParams.get('env')).toBe('Chrome 142, extension 0.3.1')
  })

  it('copies the debug info to the clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const page = mountedSection()

    page.querySelector<HTMLButtonElement>('button.copy-debug-info')!.click()
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled())

    expect(writeText).toHaveBeenCalledWith(
      'Diagit 0.3.1\nBrowser: Chrome 142\nSelf-hosted instances: 1\nGitHub access: not connected',
    )
  })
})
