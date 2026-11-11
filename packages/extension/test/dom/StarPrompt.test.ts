import { afterEach, describe, expect, it, vi } from 'vitest'
import { HostPage } from '../../src/platform/page/HostPage'
import { SettingsStore } from '../../src/platform/settings/SettingsStore'
import {
  RENDERS_BEFORE_PROMPT,
  STAR_PROMPT_TAG,
  StarPrompt,
} from '../../src/platform/star-prompt/StarPrompt'
import { FakeContentScriptContext } from '../fakes/FakeContentScriptContext'
import { MemoryStorageArea } from '../fakes/MemoryStorageArea'

const CHROME_ID = 'bjphfmmlciflmdcnpfpbnkmgnkiabfdh'
const EDGE_ID = 'pphcelcgicmpdkkbginmkdogceepigen'
const FIREFOX_ID = 'diagit@miragon.io'

const context = new FakeContentScriptContext()

afterEach(() => {
  context.invalidate()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function promptFor(storage: MemoryStorageArea, extensionId = CHROME_ID): StarPrompt {
  return new StarPrompt(
    new HostPage(context.ctx),
    new SettingsStore(() => storage),
    () => extensionId,
  )
}

async function recordRenders(prompt: StarPrompt, count: number): Promise<void> {
  const renders = Array.from({ length: count }, () => prompt.recordRender())
  await Promise.all(renders)
}

function toast(): ShadowRoot | null {
  return document.querySelector(STAR_PROMPT_TAG)?.shadowRoot ?? null
}

function button(label: string): HTMLButtonElement | undefined {
  return [...(toast()?.querySelectorAll('button') ?? [])].find(
    (candidate) => (candidate.getAttribute('aria-label') ?? candidate.textContent) === label,
  )
}

describe('StarPrompt', () => {
  it('stays hidden before the fifth rendered diagram', async () => {
    const storage = new MemoryStorageArea()

    await recordRenders(promptFor(storage), RENDERS_BEFORE_PROMPT - 1)

    expect(toast()).toBeNull()
    expect(storage.items.reviewPrompt).toEqual({ renderCount: 4, dismissed: false })
  })

  it('shows the toast on the fifth rendered diagram, counted across pages', async () => {
    const storage = new MemoryStorageArea()
    await recordRenders(promptFor(storage), 2)

    await recordRenders(promptFor(storage), 3)

    await vi.waitFor(() => expect(button('Star on GitHub')).toBeDefined())
  })

  it('offers the GitHub star first and the store rating second', async () => {
    await recordRenders(promptFor(new MemoryStorageArea()), RENDERS_BEFORE_PROMPT)

    await vi.waitFor(() => expect(toast()?.querySelectorAll('button')).toHaveLength(3))
    const labels = [...toast()!.querySelectorAll('button')].map(
      (candidate) => candidate.getAttribute('aria-label') ?? candidate.textContent,
    )
    expect(labels).toEqual(['Star on GitHub', 'Rate Diagit', 'Close'])
  })

  it.each([
    [CHROME_ID, 'https://chromewebstore.google.com/detail/diagit/'],
    [EDGE_ID, 'https://microsoftedge.microsoft.com/addons/detail/'],
    [FIREFOX_ID, 'https://addons.mozilla.org/firefox/addon/diagit/'],
  ])('opens the store listing of the browser for %s', async (extensionId, listingPrefix) => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await recordRenders(promptFor(new MemoryStorageArea(), extensionId), RENDERS_BEFORE_PROMPT)

    await vi.waitFor(() => expect(button('Rate Diagit')).toBeDefined())
    button('Rate Diagit')!.click()

    expect(open).toHaveBeenCalledWith(expect.stringContaining(listingPrefix), '_blank', 'noopener')
  })

  it('leaves out the rating for an unpacked build with an unknown ID', async () => {
    await recordRenders(
      promptFor(new MemoryStorageArea(), 'unpacked-dev-id'),
      RENDERS_BEFORE_PROMPT,
    )

    await vi.waitFor(() => expect(button('Star on GitHub')).toBeDefined())
    expect(button('Rate Diagit')).toBeUndefined()
  })

  it.each(['Star on GitHub', 'Rate Diagit', 'Close'])(
    'never shows again after "%s"',
    async (label) => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      const storage = new MemoryStorageArea()
      await recordRenders(promptFor(storage), RENDERS_BEFORE_PROMPT)
      await vi.waitFor(() => expect(button(label)).toBeDefined())

      button(label)!.click()

      await vi.waitFor(() => expect(storage.items.reviewPrompt).toMatchObject({ dismissed: true }))
      expect(document.querySelector(STAR_PROMPT_TAG)).toBeNull()
      await recordRenders(promptFor(storage), RENDERS_BEFORE_PROMPT)
      expect(document.querySelector(STAR_PROMPT_TAG)).toBeNull()
    },
  )

  it('opens GitHub when the star button is clicked', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await recordRenders(promptFor(new MemoryStorageArea()), RENDERS_BEFORE_PROMPT)
    await vi.waitFor(() => expect(button('Star on GitHub')).toBeDefined())

    button('Star on GitHub')!.click()

    expect(open).toHaveBeenCalledWith('https://github.com/Miragon/diagit', '_blank', 'noopener')
  })

  it('shows one toast per page, however many diagrams it renders', async () => {
    const prompt = promptFor(new MemoryStorageArea())

    await recordRenders(prompt, RENDERS_BEFORE_PROMPT + 3)

    await vi.waitFor(() => expect(document.querySelectorAll(STAR_PROMPT_TAG)).toHaveLength(1))
  })
})
