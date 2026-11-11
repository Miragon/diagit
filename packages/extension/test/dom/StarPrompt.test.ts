import { afterEach, describe, expect, it, vi } from 'vitest'
import { HostPage } from '../../src/platform/page/HostPage'
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

function promptFor(storage: MemoryStorageArea, extensionId = CHROME_ID): StarPrompt {
  const win = { location, document } as unknown as Window
  return new StarPrompt(
    new HostPage(context.ctx, win),
    new SettingsStore(() => storage),
    () => extensionId,
  )
}

async function visitPagesWithDiagram(prompt: StarPrompt, pages: number): Promise<void> {
  for (let page = 0; page < pages; page++) {
    visitedPages += 1
    location.pathname = `/o/r/blob/main/diagram-${visitedPages}.bpmn`
    await prompt.recordRender()
  }
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

describe('StarPrompt', () => {
  it('stays hidden before the fifth page with a diagram', async () => {
    const storage = new MemoryStorageArea()

    await visitPagesWithDiagram(promptFor(storage), PAGES_BEFORE_PROMPT - 1)

    expect(toast()).toBeNull()
    expect(storage.items.reviewPromptPagesWithDiagram).toEqual({ count: 4 })
  })

  it('counts a page once, however many diagrams it renders', async () => {
    const storage = new MemoryStorageArea()
    const prompt = promptFor(storage)
    location.pathname = '/o/r/pull/1/files'

    for (let file = 0; file < PAGES_BEFORE_PROMPT; file++) await prompt.recordRender()

    expect(toast()).toBeNull()
    expect(storage.items.reviewPromptPagesWithDiagram).toEqual({ count: 1 })
  })

  it('shows the toast on the fifth page, counted across content scripts', async () => {
    const storage = new MemoryStorageArea()
    await visitPagesWithDiagram(promptFor(storage), 2)

    await visitPagesWithDiagram(promptFor(storage), 3)

    expect(button('Star on GitHub')).toBeDefined()
  })

  it('announces its message once it is mounted', async () => {
    await visitPagesWithDiagram(promptFor(new MemoryStorageArea()), PAGES_BEFORE_PROMPT)

    const status = toast()!.querySelector('[role="status"]')!
    await vi.waitFor(() => expect(status.textContent).toContain('A star on GitHub'))
  })

  it('offers the GitHub star first and the store rating second', async () => {
    await visitPagesWithDiagram(promptFor(new MemoryStorageArea()), PAGES_BEFORE_PROMPT)

    const labels = [...toast()!.querySelectorAll('button')].map(labelOf)
    expect(labels).toEqual(['Star on GitHub', 'Rate Diagit', 'Close'])
  })

  it('opens the GitHub repository from the star button', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await visitPagesWithDiagram(promptFor(new MemoryStorageArea()), PAGES_BEFORE_PROMPT)

    button('Star on GitHub')!.click()

    expect(open).toHaveBeenCalledWith('https://github.com/Miragon/diagit', '_blank', 'noopener')
  })

  it.each([
    [CHROME_ID, 'https://chromewebstore.google.com/detail/diagit/'],
    [EDGE_ID, 'https://microsoftedge.microsoft.com/addons/detail/'],
    [FIREFOX_ID, 'https://addons.mozilla.org/firefox/addon/diagit/'],
  ])('opens the store listing of the browser for %s', async (extensionId, listingPrefix) => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await visitPagesWithDiagram(
      promptFor(new MemoryStorageArea(), extensionId),
      PAGES_BEFORE_PROMPT,
    )

    button('Rate Diagit')!.click()

    expect(open).toHaveBeenCalledWith(expect.stringContaining(listingPrefix), '_blank', 'noopener')
  })

  it('leaves out the rating for an unpacked build with an unknown ID', async () => {
    await visitPagesWithDiagram(
      promptFor(new MemoryStorageArea(), 'unpacked-dev-id'),
      PAGES_BEFORE_PROMPT,
    )

    expect(button('Star on GitHub')).toBeDefined()
    expect(button('Rate Diagit')).toBeUndefined()
  })

  it.each(['Star on GitHub', 'Rate Diagit', 'Close'])(
    'never shows again after "%s"',
    async (label) => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      const storage = new MemoryStorageArea()
      await visitPagesWithDiagram(promptFor(storage), PAGES_BEFORE_PROMPT)

      button(label)!.click()

      await vi.waitFor(() => expect(storage.items.reviewPromptDismissedAt).toBeTruthy())
      expect(document.querySelector(STAR_PROMPT_TAG)).toBeNull()
      await visitPagesWithDiagram(promptFor(storage), PAGES_BEFORE_PROMPT)
      expect(document.querySelector(STAR_PROMPT_TAG)).toBeNull()
    },
  )

  it('keeps a dismissal when another tab counts a page at the same time', async () => {
    const storage = new MemoryStorageArea()
    await visitPagesWithDiagram(promptFor(storage), PAGES_BEFORE_PROMPT)

    const otherTab = visitPagesWithDiagram(promptFor(storage), 1)
    button('Close')!.click()
    await otherTab

    await vi.waitFor(() => expect(storage.items.reviewPromptDismissedAt).toBeTruthy())
  })

  it('stays hidden when it was dismissed before', async () => {
    const storage = new MemoryStorageArea()
    storage.items.reviewPromptDismissedAt = '2026-11-01T00:00:00.000Z'

    await visitPagesWithDiagram(promptFor(storage), PAGES_BEFORE_PROMPT)

    expect(toast()).toBeNull()
  })

  it('shows a single toast when the blob and diff scripts both run on a page', async () => {
    const storage = new MemoryStorageArea()
    const blobScript = promptFor(storage)
    const diffScript = promptFor(storage)

    await visitPagesWithDiagram(blobScript, PAGES_BEFORE_PROMPT)
    await visitPagesWithDiagram(diffScript, 1)

    expect(document.querySelectorAll(STAR_PROMPT_TAG)).toHaveLength(1)
  })
})
