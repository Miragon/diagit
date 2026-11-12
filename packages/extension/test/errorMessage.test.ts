import { describe, expect, it } from 'vitest'
import { errorMessage, reportableErrorMessage } from '../src/platform/utils/errorMessage'

describe('errorMessage', () => {
  it('reads the message of an Error and stringifies anything else', () => {
    expect(errorMessage(new Error('offline'))).toBe('offline')
    expect(errorMessage(404)).toBe('404')
  })
})

describe('reportableErrorMessage', () => {
  it('keeps a message without URLs as it is', () => {
    expect(reportableErrorMessage(new Error('unclosed tag'))).toBe('unclosed tag')
  })

  it('keeps only the origin of a URL on github.com, api.github.com or gitlab.com', () => {
    const err = new Error(
      'HTTP 404 for https://api.github.com/repos/acme/private-repo/pulls/1 and https://gitlab.com/acme/secret/-/raw/main/a.bpmn',
    )

    expect(reportableErrorMessage(err)).toBe(
      'HTTP 404 for https://api.github.com and https://gitlab.com',
    )
  })

  it('hides every other URL completely', () => {
    const err = new Error(
      'HTTP 500 for https://git.acme.internal/team/flows/raw/main/order.bpmn (https://raw.githubusercontent.com/acme/x/main/a.bpmn)',
    )

    const reported = reportableErrorMessage(err)

    expect(reported).toBe('HTTP 500 for <url> (<url>)')
    expect(reported).not.toContain('acme')
  })

  it('caps the message at 1,000 characters', () => {
    const reported = reportableErrorMessage(new Error('x'.repeat(5_000)))

    expect(reported).toHaveLength(1_000)
    expect(reported.endsWith('…')).toBe(true)
  })
})
