import { webOrigin } from './utils/origin'

export class WebOrigin {
  private constructor(private readonly origin: string) {}

  static of(url: string): WebOrigin | null {
    const origin = webOrigin(url)
    return origin === null ? null : new WebOrigin(origin)
  }

  static known(url: string): WebOrigin {
    const origin = WebOrigin.of(url)
    if (!origin) {
      throw new Error(`Not an http(s) url: ${url}`)
    }
    return origin
  }

  equals(other: WebOrigin | null | undefined): boolean {
    return other?.origin === this.origin
  }

  toString(): string {
    return this.origin
  }
}
