import { diagitRepository } from '../../platform/DiagitRepository'

export interface ExtensionSetup {
  selfHostedInstances: number
  githubConnected: boolean
}

const BROWSER_SIGNATURES: readonly { name: string; pattern: RegExp }[] = [
  { name: 'Edge', pattern: /Edg\/(\d+)/ },
  { name: 'Firefox', pattern: /Firefox\/(\d+)/ },
  { name: 'Chrome', pattern: /Chrome\/(\d+)/ },
]

export class DebugInfo {
  constructor(
    private readonly extensionVersion: string,
    private readonly userAgent: string,
  ) {}

  environment(): string {
    return `${this.browser()}, extension ${this.extensionVersion}`
  }

  bugReportUrl(): string {
    return diagitRepository.bugReportUrl(this.environment())
  }

  text(setup: ExtensionSetup): string {
    return [
      `Diagit ${this.extensionVersion}`,
      `Browser: ${this.browser()}`,
      `Self-hosted instances: ${setup.selfHostedInstances}`,
      `GitHub access: ${setup.githubConnected ? 'connected' : 'not connected'}`,
    ].join('\n')
  }

  private browser(): string {
    for (const { name, pattern } of BROWSER_SIGNATURES) {
      const majorVersion = pattern.exec(this.userAgent)?.[1]
      if (majorVersion) return `${name} ${majorVersion}`
    }
    return 'Unknown browser'
  }
}
