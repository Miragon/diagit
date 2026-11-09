const NEW_ISSUE_URL = 'https://github.com/Miragon/diagit/issues/new'

export function reportIssueUrl(title: string, description: string): string {
  const query = new URLSearchParams({ template: 'fix.yml', title: `[Fix]: ${title}`, description })
  return `${NEW_ISSUE_URL}?${query}`
}
