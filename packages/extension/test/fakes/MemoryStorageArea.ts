import type { StorageArea, StorageChangeEvents } from '../../src/platform/settings/SettingsStore'

type ChangeListener = Parameters<StorageChangeEvents['addListener']>[0]

export class MemoryStorageArea implements StorageArea {
  readonly items: Record<string, unknown> = {}
  private readonly listeners = new Set<ChangeListener>()

  readonly onChanged: StorageChangeEvents = {
    addListener: (listener) => this.listeners.add(listener),
    removeListener: (listener) => this.listeners.delete(listener),
  }

  async get(key: string): Promise<Record<string, unknown>> {
    return key in this.items ? { [key]: this.items[key] } : {}
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.items, items)
    const changes = Object.fromEntries(
      Object.entries(items).map(([key, newValue]) => [key, { newValue }]),
    )
    this.listeners.forEach((listener) => listener(changes, 'local'))
  }

  async remove(key: string): Promise<void> {
    delete this.items[key]
  }
}
