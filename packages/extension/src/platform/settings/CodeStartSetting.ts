import { SettingsStore } from './SettingsStore'

const CODE_START_KEY = 'codeUnderDiagrams'

export type CodeStart = 'shown' | 'hidden'

const DEFAULT_START: CodeStart = 'shown'

/** How the code under a diagram starts: shown (the default) or hidden. */
export class CodeStartSetting {
  constructor(private readonly store: SettingsStore = new SettingsStore()) {}

  async read(): Promise<CodeStart> {
    try {
      return this.asCodeStart(await this.store.readString(CODE_START_KEY))
    } catch (err) {
      console.error('[diagit] could not read how the code under diagrams starts', err)
      return DEFAULT_START
    }
  }

  async write(start: CodeStart): Promise<void> {
    await this.store.writeString(CODE_START_KEY, start)
  }

  /**
   * Hands the start to `listener` once read and on every change after; returns the unsubscribe.
   * A change that arrives while reading wins over the value read.
   */
  async follow(listener: (start: CodeStart) => void): Promise<() => void> {
    let changedWhileReading = false
    const stopFollowing = this.onChange((start) => {
      changedWhileReading = true
      listener(start)
    })
    const start = await this.read()
    if (!changedWhileReading) {
      listener(start)
    }
    return stopFollowing
  }

  onChange(listener: (start: CodeStart) => void): () => void {
    try {
      return this.store.onChange(CODE_START_KEY, (value) => listener(this.asCodeStart(value)))
    } catch (err) {
      console.error('[diagit] cannot follow how the code under diagrams starts', err)
      return () => {}
    }
  }

  private asCodeStart(value: unknown): CodeStart {
    return value === 'hidden' ? 'hidden' : DEFAULT_START
  }
}
