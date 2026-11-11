import { describe, expect, it } from 'vitest'
import { DiagramViewLog } from '../src/platform/settings/DiagramViewLog'
import { SettingsStore } from '../src/platform/settings/SettingsStore'
import { MemoryStorageArea } from './fakes/MemoryStorageArea'

function logOn(storage: MemoryStorageArea): DiagramViewLog {
  return new DiagramViewLog(new SettingsStore(() => storage))
}

describe('DiagramViewLog', () => {
  it('counts every page that shows a diagram and remembers the last one', async () => {
    const storage = new MemoryStorageArea()
    const log = logOn(storage)

    await log.record('/o/r/blob/main/a.bpmn')
    await log.record('/o/r/blob/main/b.dmn')

    expect(storage.items.diagramViews).toEqual({
      pageCount: 2,
      lastPage: '/o/r/blob/main/b.dmn',
    })
  })

  it('counts a page once, however many diagrams it renders', async () => {
    const storage = new MemoryStorageArea()
    const log = logOn(storage)

    for (let file = 0; file < 5; file++) await log.record('/o/r/pull/1/files')

    expect(storage.items.diagramViews).toEqual({ pageCount: 1, lastPage: '/o/r/pull/1/files' })
  })
})
