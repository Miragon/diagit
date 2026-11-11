import { describe, expect, it } from 'vitest'
import type { GitlabDiffScanner } from '../src/git-hosts/gitlab/GitlabDiffScanner'
import { GitlabMergeRequestPage } from '../src/git-hosts/gitlab/GitlabMergeRequestPage'
import type { GitlabRestApi } from '../src/git-hosts/gitlab/GitlabRestApi'
import { GitlabRoutes } from '../src/git-hosts/gitlab/GitlabRoutes'
import { FetchError } from '../src/platform/messaging/HttpClient'

const page = new GitlabMergeRequestPage(
  new GitlabRoutes(),
  {} as GitlabRestApi,
  {} as GitlabDiffScanner,
)
const gitlabCom = { origin: 'https://gitlab.com' } as Location

describe('GitlabMergeRequestPage.errorHelp', () => {
  it('says when an exhausted rate limit resets', async () => {
    const resetsAt = new Date(2030, 0, 1, 14, 32).getTime()
    const resetTime = new Date(resetsAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })

    const help = await page.errorHelp(gitlabCom, new FetchError('HTTP 429', 429, resetsAt))

    expect(help.hint).toBe(`GitLab's API rate limit is reached. It resets at ${resetTime}.`)
  })

  it('leaves out a reset time that has already passed', async () => {
    const help = await page.errorHelp(gitlabCom, new FetchError('HTTP 429', 429, Date.now() - 1))

    expect(help.hint).toBe("GitLab's API rate limit is reached.")
  })

  it('says the rate limit is reached for a 429 without a reset time', async () => {
    const help = await page.errorHelp(gitlabCom, new FetchError('HTTP 429', 429))

    expect(help.hint).toBe("GitLab's API rate limit is reached.")
  })

  it('asks to check the sign-in for any other failure', async () => {
    const help = await page.errorHelp(gitlabCom, new FetchError('HTTP 403', 403))

    expect(help.hint).toMatch(/Check that you are signed in/)
  })
})
