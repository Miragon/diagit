import { afterEach, describe, expect, it, vi } from 'vitest'
import { HostPage } from '../../src/platform/page/HostPage'
import { DiagramViewsLocalStorage } from '../../src/platform/settings/DiagramViewsLocalStorage'
import { SettingsStore } from '../../src/platform/settings/SettingsStore'
import {
  PAGES_BEFORE_PROMPT,
  STAR_PROMPT_TAG,
  StarPrompt,
} from '../../src/platform/star-prompt/StarPrompt'
import { FakeContentScriptContext } from '../fakes/FakeContentScriptContext'
import { MemoryStorageArea } from '../fakes/MemoryStorageArea'

const CHROME_ID = 'bjphfmmlciflmdcnpfpbnkmgnkiabfdh'
const EDGE_ID = 'pphcelcgicmpdkkbginmkdogceepigen'
const FIREFOX_ID = 'diagit@miragon.io'

const context = new FakeContentScriptContext()
const location = { pathname: '/' }
let visitedPages = 0

afterEach(() => {
  context.invalidate()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function storeOn(storage: MemoryStorageArea): SettingsStore {
  return new SettingsStore(
    () => storage,
    () => storage.onChanged,
  )
}

function startPrompt(storage: MemoryStorageArea, extensionId = CHROME_ID): void {
  const win = { location, document } as unknown as Window
  new StarPrompt(new HostPage(context.ctx, win), storeOn(storage), () => extensionId).start()
}

async function visitPagesWithDiagram(storage: MemoryStorageArea, pages: number): Promise<void> {
  const diagramViews = new DiagramViewsLocalStorage(storeOn(storage))
  for (let page = 0; page < pages; page++) {
    visitedPages += 1
    location.pathname = `/o/r/blob/main/diagram-${visitedPages}.bpmn`
    await diagramViews.save(location.pathname)
  }
}

async function promptAfterFivePages(extensionId = CHROME_ID): Promise<MemoryStorageArea> {
  const storage = new MemoryStorageArea()
  startPrompt(storage, extensionId)
  await visitPagesWithDiagram(storage, PAGES_BEFORE_PROMPT)
  await vi.waitFor(() => expect(toast()).not.toBeNull())
  return storage
}

function toast(): ShadowRoot | null {
  return document.querySelector(STAR_PROMPT_TAG)?.shadowRoot ?? null
}

function labelOf(candidate: HTMLButtonElement): string | null {
  return candidate.getAttribute('aria-label') ?? candidate.textContent
}

function button(label: string): HTMLButtonElement | undefined {
  return [...(toast()?.querySelectorAll('button') ?? [])].find(
    (candidate) => labelOf(candidate) === label,
  )
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('StarPrompt', () => {
  it('stays hidden before the fifth page with a diagram', async () => {
    const storage = new MemoryStorageArea()
    startPrompt(storage)

    await visitPagesWithDiagram(storage, PAGES_BEFORE_PROMPT - 1)
    await settle()

    expect(toast()).toBeNull()
  })

  it('shows the toast on the fifth page with a diagram', async () => {
    await promptAfterFivePages()

    expect(button('Star on GitHub')).toBeDefined()
  })

  it('shows the toast only in the tab whose page was counted', async () => {
    const storage = new MemoryStorageArea()
    startPrompt(storage)
    await visitPagesWithDiagram(storage, PAGES_BEFORE_PROMPT - 1)
    location.pathname = '/o/r/blob/main/open-in-this-tab.bpmn'

    await new DiagramViewsLocalStorage(storeOn(storage)).save('/o/r/blob/main/other-tab.bpmn')
    await settle()

    expect(toast()).toBeNull()
  })

  it('thanks the user and announces why a star helps once mounted', async () => {
    await promptAfterFivePages()

    expect(toast()!.querySelector('.diagit-notice-title')!.textContent).toBe(
      'Thanks for using Diagit.',
    )
    expect(toast()!.querySelector<HTMLElement>('.diagit-toast')!.dataset.tone).toBe('info')
    const status = toast()!.querySelector('[role="status"]')!
    await vi.waitFor(() => expect(status.textContent).toBe('A star helps other teams find it.'))
  })

  it('offers the GitHub star first and the store rating second', async () => {
    await promptAfterFivePages()

    const labels = [...toast()!.querySelectorAll('button')].map(labelOf)
    expect(labels).toEqual(['Star on GitHub', 'Rate Diagit', 'Close'])
    expect(button('Star on GitHub')!.classList).toContain('btn-secondary')
    expect(button('Rate Diagit')!.classList).toContain('btn-secondary')
  })

  it('opens the GitHub repository from the star button', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await promptAfterFivePages()

    button('Star on GitHub')!.click()

    expect(open).toHaveBeenCalledWith('https://github.com/Miragon/diagit', '_blank', 'noopener')
  })

  it.each([
    [CHROME_ID, 'https://chromewebstore.google.com/detail/diagit/'],
    [EDGE_ID, 'https://microsoftedge.microsoft.com/addons/detail/'],
    [FIREFOX_ID, 'https://addons.mozilla.org/firefox/addon/diagit/'],
  ])('opens the store listing of the browser for %s', async (extensionId, listingPrefix) => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await promptAfterFivePages(extensionId)

    button('Rate Diagit')!.click()

    expect(open).toHaveBeenCalledWith(expect.stringContaining(listingPrefix), '_blank', 'noopener')
  })

  it('leaves out the rating for an unpacked build with an unknown ID', async () => {
    await promptAfterFivePages('unpacked-dev-id')

    expect(button('Star on GitHub')).toBeDefined()
    expect(button('Rate Diagit')).toBeUndefined()
  })

  it.each(['Star on GitHub', 'Rate Diagit', 'Close'])(
    'never shows again after "%s"',
    async (label) => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      const storage = await promptAfterFivePages()

      button(label)!.click()

      await vi.waitFor(() => expect(storage.items.reviewPromptDismissedAt).toBeTruthy())
      expect(document.querySelector(STAR_PROMPT_TAG)).toBeNull()
      await visitPagesWithDiagram(storage, PAGES_BEFORE_PROMPT)
      await settle()
      expect(document.querySelector(STAR_PROMPT_TAG)).toBeNull()
    },
  )

  it('closes the toast when it is dismissed in another tab', async () => {
    const storage = await promptAfterFivePages()

    await storeOn(storage).writeString('reviewPromptDismissedAt', '2026-11-11T00:00:00.000Z')

    expect(document.querySelector(STAR_PROMPT_TAG)).toBeNull()
  })

  it('stays hidden when it was dismissed before', async () => {
    const storage = new MemoryStorageArea()
    storage.items.reviewPromptDismissedAt = '2026-11-01T00:00:00.000Z'
    startPrompt(storage)

    await visitPagesWithDiagram(storage, PAGES_BEFORE_PROMPT)
    await settle()

    expect(toast()).toBeNull()
  })

  it('stops listening once the content script is invalidated', async () => {
    const storage = new MemoryStorageArea()
    startPrompt(storage)

    context.invalidate()
    await visitPagesWithDiagram(storage, PAGES_BEFORE_PROMPT)
    await settle()

    expect(toast()).toBeNull()
  })
})
