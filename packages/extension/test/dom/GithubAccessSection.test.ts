import { afterEach, describe, expect, it, vi } from 'vitest'
import { GithubDeviceFlow } from '../../src/git-hosts/github/GithubDeviceFlow'
import { GithubTokenStore } from '../../src/git-hosts/github/GithubTokenStore'
import { SettingsStore } from '../../src/platform/settings/SettingsStore'
import { GithubAccessSection } from '../../src/views/options/GithubAccessSection'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'
import { MemoryStorageArea } from '../fakes/MemoryStorageArea'

vi.mock('wxt/browser', () => ({ browser: { tabs: { create: () => Promise.resolve() } } }))

const EXPIRED_TEXT = /connection expired\. Connect again/

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountedSection(store: GithubTokenStore, fetch = vi.fn()): Promise<HTMLElement> {
  new GithubAccessSection(new GithubDeviceFlow(fetch), store, FAKE_REPORT_CONTEXT).mount(
    document.body,
  )
  await vi.waitFor(() => expect(connectButton()).not.toBeNull())
  return document.querySelector<HTMLElement>('section.card')!
}

function connectButton(): HTMLButtonElement | null {
  return (
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Connect GitHub') ?? null
  )
}

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response
}

function emptyStore(): GithubTokenStore {
  const area = new MemoryStorageArea()
  return new GithubTokenStore(new SettingsStore(() => area))
}

describe('GithubAccessSection', () => {
  it('only offers to connect when GitHub was never connected', async () => {
    const card = await mountedSection(emptyStore())

    expect(card.querySelector('.count')!.textContent).toBe('Not connected')
    expect(card.textContent).not.toMatch(EXPIRED_TEXT)
  })

  it('says that an expired connection has to be connected again', async () => {
    const store = emptyStore()
    await store.expire()

    const card = await mountedSection(store)

    expect(card.textContent).toMatch(EXPIRED_TEXT)
  })

  it('shows a notice row with a report link when the authorisation cannot start', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response)
    const card = await mountedSection(emptyStore(), fetch)

    connectButton()!.click()

    await vi.waitFor(() => expect(card.querySelector('.diagit-notice')).not.toBeNull())
    const notice = card.querySelector<HTMLElement>('.diagit-notice')!
    expect(notice.dataset.layout).toBe('row')
    expect(notice.dataset.tone).toBe('danger')
    expect(notice.getAttribute('role')).toBe('alert')
    expect(notice.querySelector('.diagit-notice-title')!.textContent).toBe(
      'GitHub authorisation could not start',
    )
    const report = notice.querySelector<HTMLAnchorElement>('.diagit-notice-report')!
    expect(new URL(report.href).searchParams.get('console')).toBe('GitHub returned HTTP 500.')
    expect(connectButton()!.classList).toContain('btn-secondary')
  })

  it('shows a warning row when the code expires before it is confirmed', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          device_code: 'dc',
          user_code: 'ABCD-1234',
          verification_uri: 'https://github.com/login/device',
          interval: 0,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: 'expired_token' }))
    const card = await mountedSection(emptyStore(), fetch)

    connectButton()!.click()

    await vi.waitFor(() =>
      expect(
        card.querySelector('.diagit-notice[data-layout="row"][data-tone="warning"]'),
      ).not.toBeNull(),
    )
    expect(card.querySelector('.diagit-notice-title')!.textContent).toBe(
      'The code expired before you confirmed it',
    )
    expect(card.querySelector('.status')!.textContent).toBe('')
  })

  it('says GitHub could not be connected when it fails after the code was shown', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          device_code: 'dc',
          user_code: 'ABCD-1234',
          verification_uri: 'https://github.com/login/device',
          interval: 0,
        }),
      )
      .mockResolvedValueOnce({ ok: false, status: 502 } as Response)
    const card = await mountedSection(emptyStore(), fetch)

    connectButton()!.click()

    await vi.waitFor(() => expect(card.querySelector('.diagit-notice')).not.toBeNull())
    expect(card.querySelector('.diagit-notice-title')!.textContent).toBe(
      'GitHub could not be connected',
    )
  })
})
