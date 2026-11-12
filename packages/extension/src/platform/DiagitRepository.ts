import { reportableErrorMessage } from './utils/errorMessage'

export interface ReportContext {
  where: string
  environment: string
}

class DiagitRepository {
  readonly url = 'https://github.com/Miragon/diagit'

  bugReportUrl(environment: string): string {
    return this.newIssueUrl('fix.yml', { env: environment })
  }

  featureRequestUrl(): string {
    return this.newIssueUrl('feat.yml')
  }

  problemReportUrl(
    title: string,
    description: string,
    context: ReportContext,
    error?: unknown,
  ): string {
    return this.newIssueUrl('fix.yml', {
      title: `[Fix]: ${title}`,
      description,
      where: context.where,
      env: context.environment,
      ...(error === undefined ? {} : { console: reportableErrorMessage(error) }),
    })
  }

  private newIssueUrl(template: string, fields: Record<string, string> = {}): string {
    const query = new URLSearchParams({ template, ...fields })
    return `${this.url}/issues/new?${query}`
  }
}

export const diagitRepository = new DiagitRepository()
