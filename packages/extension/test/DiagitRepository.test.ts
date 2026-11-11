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
})
