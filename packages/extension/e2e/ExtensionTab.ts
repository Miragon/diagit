import { browser } from '@wdio/globals'

export class ExtensionTab {
  private constructor(private readonly context: string) {}

  static async opened(urlPart: string): Promise<ExtensionTab> {
    const context = await browser.waitUntil(async () => {
      const { contexts } = await browser.browsingContextGetTree({})
      return contexts.find((candidate) => candidate.url.includes(urlPart))?.context
    })
    return new ExtensionTab(context)
  }

  async text(expression: string): Promise<string> {
    const result = await browser.scriptEvaluate({
      expression,
      target: { context: this.context },
      awaitPromise: false,
    })
    return result.type === 'success' && result.result.type === 'string' ? result.result.value : ''
  }

  async waitForText(expression: string, expected: string): Promise<void> {
    await browser.waitUntil(async () => (await this.text(expression)) === expected, {
      timeout: 20_000,
    })
  }

  async navigate(url: string): Promise<void> {
    await browser.browsingContextNavigate({ context: this.context, url, wait: 'complete' })
  }
}
