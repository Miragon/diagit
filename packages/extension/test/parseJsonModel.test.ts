import { describe, expect, it } from 'vitest'
import { parseJsonModel } from '../src/platform/utils/parseJsonModel'
import { ModelRejected } from '../src/platform/ModelRejected'

const toCount = (data: unknown): number => {
  if (typeof data !== 'object' || data === null || !('count' in data)) {
    throw new Error('Not a counter')
  }
  return Number(data.count)
}

function rejectionOf(source: string): ModelRejected {
  try {
    parseJsonModel(source, toCount)
  } catch (err) {
    if (err instanceof ModelRejected) {
      return err
    }
    throw err
  }
  throw new Error('expected the source to be rejected')
}

describe('parseJsonModel', () => {
  it('returns the model the JSON describes', () => {
    expect(parseJsonModel('{"count":3}', toCount)).toBe(3)
  })

  it('rejects text that is not JSON as malformed', () => {
    const err = rejectionOf('{"count":3')

    expect(err.reason).toBe('malformed')
    expect(err.cause).toBeInstanceOf(SyntaxError)
  })

  it('rejects JSON the notation does not accept as unsupported', () => {
    const err = rejectionOf('{"total":3}')

    expect(err.reason).toBe('unsupported')
    expect(err.cause).toEqual(new Error('Not a counter'))
  })
})
