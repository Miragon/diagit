import { browser } from 'wxt/browser'

export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(key: string): Promise<void>
}

type StorageChanges = Record<string, { newValue?: unknown }>
type StorageChangeListener = (changes: StorageChanges, areaName: string) => void

export interface StorageChangeEvents {
  addListener(listener: StorageChangeListener): void
  removeListener(listener: StorageChangeListener): void
}

const LOCAL_AREA = 'local'

export class SettingsStore {
  constructor(
    private readonly area: () => StorageArea = () => browser.storage.local,
    private readonly changeEvents: () => StorageChangeEvents = () => browser.storage.onChanged,
  ) {}

  onChange(key: string, listener: (newValue: unknown) => void): () => void {
    const onStorageChange: StorageChangeListener = (changes, areaName) => {
      if (areaName === LOCAL_AREA && key in changes) listener(changes[key]!.newValue)
    }
    this.changeEvents().addListener(onStorageChange)
    return () => this.changeEvents().removeListener(onStorageChange)
  }

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
