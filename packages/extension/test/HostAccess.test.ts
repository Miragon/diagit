import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HostAccess, type BrowserAccessApi } from '../src/git-hosts/self-hosted/HostAccess'
import { ScriptRegistrar, type ScriptingApi } from '../src/git-hosts/self-hosted/ScriptRegistrar'
import { SelfHostedHostStore } from '../src/git-hosts/self-hosted/SelfHostedHostStore'
import { SettingsStore } from '../src/platform/settings/SettingsStore'
import { hostRegistry } from '../src/git-hosts/hosts'
import { MemoryStorageArea } from './fakes/MemoryStorageArea'

const origin = 'https://gitlab.example.com'
const pattern = `${origin}/*`
const viewRouterId = `bpmn-io-browser-plugin:${origin}:view-router`

class FakeScripting implements ScriptingApi {
  readonly registered = new Set<string>()
  failRegistration = false

  async getRegisteredContentScripts({ ids }: { ids: string[] }) {
    return ids.filter((id) => this.registered.has(id)).map((id) => ({ id }))
  }

  async registerContentScripts(scripts: { id: string }[]) {
    if (this.failRegistration) throw new Error('boom')
    scripts.forEach((script) => this.registered.add(script.id))
  }

  async unregisterContentScripts({ ids }: { ids: string[] }) {
    ids.forEach((id) => this.registered.delete(id))
  }
}

let storage: MemoryStorageArea
let scripting: FakeScripting
let browserApi: BrowserAccessApi & { tabs: { reload: ReturnType<typeof vi.fn> } }
let store: SelfHostedHostStore
let access: HostAccess

beforeEach(() => {
  storage = new MemoryStorageArea()
  scripting = new FakeScripting()
  browserApi = {
    permissions: { contains: vi.fn().mockResolvedValue(true) },
    tabs: { query: vi.fn().mockResolvedValue([]), reload: vi.fn().mockResolvedValue(undefined) },
  }
  store = new SelfHostedHostStore(new SettingsStore(() => storage))
  access = new HostAccess(
    store,
    new ScriptRegistrar(hostRegistry.allViewScripts(), () => scripting),
    hostRegistry,
    () => browserApi,
  )
})

describe('HostAccess.grant', () => {
  it('saves and registers a granted origin, then reloads only its supported tabs', async () => {
    vi.mocked(browserApi.tabs.query).mockResolvedValue([
      { id: 1, url: `${origin}/group/project/-/merge_requests/7` },
      { id: 2, url: `${origin}/explore` },
    ])

    await access.grant([pattern])

    expect(await access.list()).toEqual([{ origin }])
    expect(scripting.registered).toEqual(new Set([viewRouterId]))
    expect(browserApi.tabs.reload).toHaveBeenCalledTimes(1)
    expect(browserApi.tabs.reload).toHaveBeenCalledWith(1)
  })

  it('lists an origin the options page added', async () => {
    await access.add(origin)

    await access.grant([pattern])

    expect(await access.list()).toEqual([{ origin }])
  })

  it('ignores patterns that are not a concrete origin', async () => {
    await access.grant(['<all_urls>'])

    expect(await access.list()).toEqual([])
  })

  it('does not reload tabs when registration fails', async () => {
    scripting.failRegistration = true
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await access.grant([pattern])

    expect(browserApi.tabs.query).not.toHaveBeenCalled()
  })
})

describe('HostAccess.revoke', () => {
  it('unregisters and forgets a revoked origin', async () => {
    await access.grant([pattern])

    await access.revoke([pattern])

    expect(await access.list()).toEqual([])
    expect(scripting.registered.size).toBe(0)
  })
})

describe('HostAccess.restoreOnStartup', () => {
  it('re-registers saved hosts whose permission is still granted', async () => {
    await store.save({ origin })
    await store.save({ origin: 'https://revoked.example.com' })
    vi.mocked(browserApi.permissions.contains).mockImplementation(
      async ({ origins }) => origins[0] === pattern,
    )

    await access.restoreOnStartup()

    expect(scripting.registered).toEqual(new Set([viewRouterId]))
  })
})

describe('HostAccess.openTabIds', () => {
  it('finds the open tabs of the public hosts and of granted self-hosted origins', async () => {
    await store.save({ origin })
    await store.save({ origin: 'https://revoked.example.com' })
    vi.mocked(browserApi.permissions.contains).mockImplementation(
      async ({ origins }) => origins[0] === pattern,
    )
    vi.mocked(browserApi.tabs.query).mockImplementation(async ({ url }) =>
      url === 'https://github.com/*' ? [{ id: 1 }, { url: 'tab without id' }] : [{ id: 2 }],
    )

    expect(await access.openTabIds(['https://github.com/*'])).toEqual([1, 2])
    expect(vi.mocked(browserApi.tabs.query).mock.calls).toEqual([
      [{ url: 'https://github.com/*' }],
      [{ url: pattern }],
    ])
  })

  it('skips a pattern the browser cannot query', async () => {
    vi.mocked(browserApi.tabs.query).mockImplementation(async ({ url }) => {
      if (url === 'https://broken/*') throw new Error('Invalid url pattern')
      return [{ id: 5 }]
    })

    expect(await access.openTabIds(['https://broken/*', 'https://github.com/*'])).toEqual([5])
  })
})
