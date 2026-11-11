import { diagitRepository } from '../../platform/DiagitRepository'
import type { ExtensionEnvironment } from '../../platform/ExtensionEnvironment'

export interface ExtensionSetup {
  selfHostedInstances: number
  githubConnected: boolean
}

export class DebugInfo {
  constructor(private readonly environment: ExtensionEnvironment) {}

  bugReportUrl(): string {
    return diagitRepository.bugReportUrl(this.environment.describe())
  }

  text(setup: ExtensionSetup): string {
    return [
      `Diagit ${this.environment.extensionVersion}`,
      `Browser: ${this.environment.browser()}`,
      `Self-hosted instances: ${setup.selfHostedInstances}`,
      `GitHub access: ${setup.githubConnected ? 'connected' : 'not connected'}`,
    ].join('\n')
  }
}
