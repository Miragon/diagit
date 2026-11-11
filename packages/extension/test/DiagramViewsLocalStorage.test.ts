import { describe, expect, it } from 'vitest'
import { DiagramViewsLocalStorage } from '../src/platform/settings/DiagramViewsLocalStorage'
import { SettingsStore } from '../src/platform/settings/SettingsStore'
import { MemoryStorageArea } from './fakes/MemoryStorageArea'

function diagramViewsOn(storage: MemoryStorageArea): DiagramViewsLocalStorage {
  return new DiagramViewsLocalStorage(new SettingsStore(() => storage))
}

describe('DiagramViewsLocalStorage', () => {
  it('counts every page that shows a diagram and remembers the last one', async () => {
    const storage = new MemoryStorageArea()
    const diagramViews = diagramViewsOn(storage)

    await diagramViews.save('/o/r/blob/main/a.bpmn')
    await diagramViews.save('/o/r/blob/main/b.dmn')

    expect(storage.items.diagramViews).toEqual({
      pageCount: 2,
      lastPage: '/o/r/blob/main/b.dmn',
    })
  })

  it('counts a page once, however many diagrams it renders', async () => {
    const storage = new MemoryStorageArea()
    const diagramViews = diagramViewsOn(storage)

    for (let file = 0; file < 5; file++) await diagramViews.save('/o/r/pull/1/files')

    expect(storage.items.diagramViews).toEqual({ pageCount: 1, lastPage: '/o/r/pull/1/files' })
  })
})
