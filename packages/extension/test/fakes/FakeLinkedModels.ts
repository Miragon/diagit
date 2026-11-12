import type { LinkedModelSource } from '../../src/views/standalone-viewer/StandaloneViewerPage'

export class FakeLinkedModels implements LinkedModelSource {
  readonly fetched: string[] = []

  constructor(private readonly respond: (url: string) => Promise<string>) {}

  async mayRead(url: string): Promise<boolean> {
    return url.startsWith('https://github.com/')
  }

  fetchText(url: string): Promise<string> {
    this.fetched.push(url)
    return this.respond(url)
  }
}
