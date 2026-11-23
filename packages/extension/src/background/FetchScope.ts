import type { FetchRules } from '../git-hosts/GitHost'
import { WebOrigin } from '../platform/WebOrigin'

export interface FetchGrant {
  withAuth: boolean
  followsRedirects: boolean
}

export class FetchScope {
  constructor(private readonly rules: readonly FetchRules[]) {}

  grantFor(pageOrigin: WebOrigin, targetUrl: string): FetchGrant | null {
    const targetOrigin = WebOrigin.of(targetUrl)
    if (!targetOrigin) {
      return null
    }
    if (targetOrigin.equals(this.rulesFor(pageOrigin)?.authenticatedApiOrigin)) {
      return { withAuth: true, followsRedirects: false }
    }
    if (targetOrigin.equals(pageOrigin)) {
      return { withAuth: false, followsRedirects: this.isRawFile(targetUrl) }
    }
    return null
  }

  allowsResponseFrom(pageOrigin: WebOrigin, responseUrl: string): boolean {
    if (this.grantFor(pageOrigin, responseUrl)) {
      return true
    }
    const responseOrigin = WebOrigin.of(responseUrl)
    return responseOrigin?.equals(this.rulesFor(pageOrigin)?.redirectTargetOrigin) ?? false
  }

  private rulesFor(pageOrigin: WebOrigin): FetchRules | undefined {
    return this.rules.find((rules) => rules.pageOrigin.equals(pageOrigin))
  }

  private isRawFile(targetUrl: string): boolean {
    const path = new URL(targetUrl).pathname
    return this.rules.some((rules) => rules.rawFilePath.test(path))
  }
}
