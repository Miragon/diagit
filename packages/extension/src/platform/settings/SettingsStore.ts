import { browser } from 'wxt/browser'

export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(key: string): Promise<void>
}

export class SettingsStore {
  constructor(private readonly area: () => StorageArea = () => browser.storage.local) {}

  async readString(key: string): Promise<string> {
    const value = (await this.area().get(key))[key]
    return typeof value === 'string' ? value : ''
  }

  async writeString(key: string, value: string): Promise<void> {
    const trimmed = value.trim()
    if (trimmed) await this.area().set({ [key]: trimmed })
    else await this.area().remove(key)
  }

  async readRecord<T>(key: string): Promise<T | undefined> {
    const value = (await this.area().get(key))[key]
    return typeof value === 'object' && value !== null ? (value as T) : undefined
  }

  async writeRecord<T>(key: string, record: T): Promise<void> {
    await this.area().set({ [key]: record })
  }

  async remove(key: string): Promise<void> {
    await this.area().remove(key)
  }

  async readList<T>(key: string): Promise<T[]> {
    const value = (await this.area().get(key))[key]
    return Array.isArray(value) ? (value as T[]) : []
  }

  async writeList<T>(key: string, items: T[]): Promise<void> {
    await this.area().set({ [key]: items })
  }
}
