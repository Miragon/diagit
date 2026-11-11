class DiagitRepository {
  readonly url = 'https://github.com/Miragon/diagit'

  bugReportUrl(environment: string): string {
    return this.newIssueUrl('fix.yml', { env: environment })
  }

  featureRequestUrl(): string {
    return this.newIssueUrl('feat.yml')
  }

  private newIssueUrl(template: string, fields: Record<string, string> = {}): string {
    const query = new URLSearchParams({ template, ...fields })
    return `${this.url}/issues/new?${query}`
  }
}

export const diagitRepository = new DiagitRepository()
