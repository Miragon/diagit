import { browser } from 'wxt/browser'

const BROWSER_SIGNATURES: readonly { name: string; pattern: RegExp }[] = [
  { name: 'Edge', pattern: /Edg\/(\d+)/ },
  { name: 'Firefox', pattern: /Firefox\/(\d+)/ },
  { name: 'Chrome', pattern: /Chrome\/(\d+)/ },
]

export class ExtensionEnvironment {
  constructor(
    readonly extensionVersion: string,
    private readonly userAgent: string,
  ) {}

  static current(): ExtensionEnvironment {
    return new ExtensionEnvironment(browser.runtime.getManifest().version, navigator.userAgent)
  }

  describe(): string {
    return `${this.browser()}, extension ${this.extensionVersion}`
  }

  browser(): string {
    for (const { name, pattern } of BROWSER_SIGNATURES) {
      const majorVersion = pattern.exec(this.userAgent)?.[1]
      if (majorVersion) return `${name} ${majorVersion}`
    }
    return 'Unknown browser'
  }
}
