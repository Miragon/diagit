import { afterEach, describe, expect, it, vi } from 'vitest'
import { GithubDeviceFlow } from '../../src/git-hosts/github/GithubDeviceFlow'
import { GithubTokenStore } from '../../src/git-hosts/github/GithubTokenStore'
import { SettingsStore } from '../../src/platform/settings/SettingsStore'
import { GithubAccessSection } from '../../src/views/options/GithubAccessSection'
import { MemoryStorageArea } from '../fakes/MemoryStorageArea'

vi.mock('wxt/browser', () => ({ browser: { tabs: { create: () => Promise.resolve() } } }))

const EXPIRED_TEXT =
  'Your GitHub connection expired. Connect again to see diffs in private repositories.'

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountedSection(store: GithubTokenStore, fetch = vi.fn()): Promise<HTMLElement> {
  new GithubAccessSection(new GithubDeviceFlow(fetch), store).mount(document.body)
  await vi.waitFor(() => expect(connectButton()).not.toBeNull())
  return document.querySelector<HTMLElement>('.auth-body')!
}

function connectButton(): HTMLButtonElement | null {
  return (
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Connect GitHub') ?? null
  )
}

function emptyStore(): GithubTokenStore {
  const area = new MemoryStorageArea()
  return new GithubTokenStore(new SettingsStore(() => area))
}

describe('GithubAccessSection', () => {
  it('only offers to connect when GitHub was never connected', async () => {
    const body = await mountedSection(emptyStore())

    expect(body.textContent).not.toContain('expired')
  })

  it('says that an expired connection has to be connected again', async () => {
    const store = emptyStore()
    await store.expire()

    const body = await mountedSection(store)

    expect(body.textContent).toContain(EXPIRED_TEXT)
  })

  it('keeps the expiry and the error when connecting again fails', async () => {
    const store = emptyStore()
    await store.expire()
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response)
    await mountedSection(store, fetch)

    connectButton()!.click()

    await vi.waitFor(() => expect(document.querySelector('.status')!.className).toContain('error'))
    expect(document.querySelector('.auth-body')!.textContent).toContain(EXPIRED_TEXT)
  })
})
