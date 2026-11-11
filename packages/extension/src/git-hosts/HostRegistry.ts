import { originToPattern } from '../platform/utils/origin'
import type { AuthPolicy, GitHost, PageUrl } from './GitHost'

export class HostRegistry {
  constructor(
    private readonly hosts: readonly GitHost[],
    private readonly selfHostedFallback: GitHost,
  ) {}

  hostFor(url: PageUrl): GitHost {
    const publicHost = this.hosts.find(
      (host) => new URL(host.publicOrigin).hostname === url.hostname,
    )
    if (publicHost) return publicHost
    return this.hosts.find((host) => host.recognizesSelfHosted(url)) ?? this.selfHostedFallback
  }

  viewScriptsFor(url: PageUrl): string[] {
    return this.hostFor(url)
      .views.filter((view) => view.rendersOn(url))
      .map((view) => view.script)
  }

  isSupportedUrl(url: string): boolean {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return false
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return this.viewScriptsFor(parsed).length > 0
  }

  allViewScripts(): string[] {
    return this.hosts.flatMap((host) => host.views.map((view) => view.script))
  }

  publicMatchPatterns(): string[] {
    return this.hosts.map((host) => originToPattern(host.publicOrigin))
  }

  authPolicies(): AuthPolicy[] {
    return this.hosts.flatMap((host) => (host.authPolicy ? [host.authPolicy] : []))
  }
}
