import type { SettingsStore } from '../../platform/settings/SettingsStore'

const STORAGE_KEY = 'selfHostedHosts'

export interface SelfHostedHost {
  origin: string
}

export class SelfHostedHostStore {
  constructor(private readonly settings: SettingsStore) {}

  list(): Promise<SelfHostedHost[]> {
    return this.settings.readList<SelfHostedHost>(STORAGE_KEY)
  }

  async save(host: SelfHostedHost): Promise<void> {
    const hosts = await this.list()
    const others = hosts.filter((saved) => saved.origin !== host.origin)
    await this.write([...others, host])
  }

  async remove(origin: string): Promise<void> {
    await this.write((await this.list()).filter((saved) => saved.origin !== origin))
  }

  private async write(hosts: SelfHostedHost[]): Promise<void> {
    const sorted = [...hosts].sort((a, b) => a.origin.localeCompare(b.origin))
    await this.settings.writeList(STORAGE_KEY, sorted)
  }
}
