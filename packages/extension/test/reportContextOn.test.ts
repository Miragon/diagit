import { describe, expect, it } from 'vitest'
import { githubHost, gitlabHost } from '../src/git-hosts/hosts'
import { reportContextOn } from '../src/git-hosts/utils/reportContextOn'
import { ExtensionEnvironment } from '../src/platform/ExtensionEnvironment'

const environment = new ExtensionEnvironment('0.3.1', 'Mozilla/5.0 Chrome/142.0.0.0 Safari/537.36')

describe('reportContextOn', () => {
  it('names the public host, the page type and the environment', () => {
    expect(
      reportContextOn(
        githubHost,
        new URL('https://github.com/o/r/pull/12/files'),
        'pull request',
        environment,
      ),
    ).toEqual({ where: 'github.com, pull request', environment: 'Chrome 142, extension 0.3.1' })
  })

  it('names a self-hosted instance only by its host type', () => {
    const fileUrl = new URL('https://git.acme.internal/team/repo/-/blob/main/order.bpmn')

    const { where } = reportContextOn(gitlabHost, fileUrl, 'file page', environment)

    expect(where).toBe('Self-hosted GitLab, file page')
    for (const privateDetail of ['acme', 'team', 'repo', 'order.bpmn']) {
      expect(where).not.toContain(privateDetail)
    }
  })
})
