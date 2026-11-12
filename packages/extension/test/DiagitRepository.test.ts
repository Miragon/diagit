import { describe, expect, it } from 'vitest'
import { diagitRepository } from '../src/platform/DiagitRepository'

describe('DiagitRepository', () => {
  it('links the feature request form', () => {
    expect(diagitRepository.featureRequestUrl()).toBe(
      'https://github.com/Miragon/diagit/issues/new?template=feat.yml',
    )
  })

  it('links the bug report form with the environment filled in', () => {
    expect(diagitRepository.bugReportUrl('Chrome 142, extension 0.3.1')).toBe(
      'https://github.com/Miragon/diagit/issues/new?template=fix.yml&env=Chrome+142%2C+extension+0.3.1',
    )
  })

  it('links the bug report form with title, description, place and environment filled in', () => {
    const url = diagitRepository.problemReportUrl(
      'BPMN diff not shown',
      'Diagit showed a notice.',
      {
        where: 'github.com, pull request',
        environment: 'Chrome 142, extension 0.3.1',
      },
    )

    expect(url).toBe(
      'https://github.com/Miragon/diagit/issues/new?template=fix.yml&title=%5BFix%5D%3A+BPMN+diff+not+shown&description=Diagit+showed+a+notice.&where=github.com%2C+pull+request&env=Chrome+142%2C+extension+0.3.1',
    )
  })

  it('fills the console field with the error, its URLs redacted and capped', () => {
    const context = { where: 'github.com, file page', environment: 'Chrome 142' }
    const reportedConsole = (error: unknown) =>
      new URL(
        diagitRepository.problemReportUrl('BPMN file not loaded', 'A notice.', context, error),
      ).searchParams.get('console')

    expect(
      reportedConsole(new Error('HTTP 404 for https://git.acme.internal/team/private/order.bpmn')),
    ).toBe('HTTP 404 for <url>')
    expect(reportedConsole(new Error('HTTP 403 for https://github.com/o/private/raw/x'))).toBe(
      'HTTP 403 for https://github.com',
    )
    expect(reportedConsole(new Error('y'.repeat(3_000)))).toHaveLength(1_000)
  })

  it('leaves the console field out when there is no error', () => {
    const url = diagitRepository.problemReportUrl('BPMN view not added', 'A notice.', {
      where: 'github.com',
      environment: 'Chrome 142',
    })

    expect(new URL(url).searchParams.has('console')).toBe(false)
  })
})
