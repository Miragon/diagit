import type { FetchRules } from '../git-hosts/GitHost'
import { webOrigin } from '../platform/utils/origin'

export interface FetchGrant {
  withAuth: boolean
  followsRedirects: boolean
}

export class FetchScope {
  constructor(private readonly rules: readonly FetchRules[]) {}

  grantFor(pageOrigin: string, targetUrl: string): FetchGrant | null {
    const targetOrigin = webOrigin(targetUrl)
    if (!targetOrigin) {
      return null
    }
    if (targetOrigin === this.rulesFor(pageOrigin)?.authenticatedApiOrigin) {
      return { withAuth: true, followsRedirects: false }
    }
    if (targetOrigin === pageOrigin) {
      return { withAuth: false, followsRedirects: this.isRawFile(targetUrl) }
    }
    return null
  }

  allowsResponseFrom(pageOrigin: string, responseUrl: string): boolean {
    if (this.grantFor(pageOrigin, responseUrl)) {
      return true
    }
    return webOrigin(responseUrl) === this.rulesFor(pageOrigin)?.redirectTargetOrigin
  }

  private rulesFor(pageOrigin: string): FetchRules | undefined {
    return this.rules.find((rules) => rules.pageOrigin === pageOrigin)
  }

  private isRawFile(targetUrl: string): boolean {
    const path = new URL(targetUrl).pathname
    return this.rules.some((rules) => rules.rawFilePath.test(path))
  }
}
