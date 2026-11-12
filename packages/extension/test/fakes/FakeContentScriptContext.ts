import type { ContentScriptContext } from 'wxt/utils/content-script-context'

export class FakeContentScriptContext {
  private readonly invalidationListeners: Array<() => void> = []
  private extensionContextLost = false
  private readonly navigationListeners: Array<(event: { newUrl: URL }) => void> = []

  readonly ctx = {
    addEventListener: (
      _target: unknown,
      _type: string,
      listener: (event: { newUrl: URL }) => void,
    ) => this.navigationListeners.push(listener),
    onInvalidated: (listener: () => void) => {
      this.invalidationListeners.push(listener)
      return () => {
        const index = this.invalidationListeners.indexOf(listener)
        if (index >= 0) {
          this.invalidationListeners.splice(index, 1)
        }
      }
    },
  } as unknown as ContentScriptContext

  constructor() {
    Object.defineProperty(this.ctx, 'isInvalid', { get: () => this.checkExtensionContext() })
  }

  loseExtensionContext(): void {
    this.extensionContextLost = true
  }

  private checkExtensionContext(): boolean {
    if (this.extensionContextLost) {
      this.notifyInvalidated()
    }
    return this.extensionContextLost
  }

  navigate(url = 'https://github.com/'): void {
    this.navigationListeners.forEach((listener) => listener({ newUrl: new URL(url) }))
  }

  get pendingInvalidationListeners(): number {
    return this.invalidationListeners.length
  }

  invalidate(): void {
    this.notifyInvalidated()
    this.extensionContextLost = false
  }

  private notifyInvalidated(): void {
    this.invalidationListeners.splice(0).forEach((listener) => listener())
    this.navigationListeners.length = 0
  }
}
