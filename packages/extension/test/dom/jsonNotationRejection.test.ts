import { describe, expect, it } from 'vitest'
import { TeamTopologiesNotation } from '../../src/notations/team-topologies/TeamTopologiesNotation'
import { ValueChainNotation } from '../../src/notations/value-chain/ValueChainNotation'
import { ModelRejected } from '../../src/platform/ModelRejected'

const NOTATIONS = [new TeamTopologiesNotation(), new ValueChainNotation()]

async function reasonOf(
  notation: (typeof NOTATIONS)[number],
  source: string,
): Promise<string | undefined> {
  const err = await notation.createViewer(document.createElement('div'), source).then(
    () => expect.fail('expected the source to be rejected'),
    (err: unknown) => err,
  )
  return err instanceof ModelRejected ? err.reason : undefined
}

describe.each(NOTATIONS)('$descriptor.label import failures', (notation) => {
  it('rejects text that is not JSON as malformed', async () => {
    expect(await reasonOf(notation, '{"teams": [')).toBe('malformed')
  })

  it('rejects JSON that is no document as unsupported', async () => {
    expect(await reasonOf(notation, '42')).toBe('unsupported')
  })
})
