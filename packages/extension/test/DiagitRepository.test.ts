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
})
