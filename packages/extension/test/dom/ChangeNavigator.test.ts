import { describe, expect, it } from 'vitest'
import { ChangeNavigator } from '../../src/views/diff-viewer/ChangeNavigator'
import { MARKER } from '../../src/views/diff-viewer/markers'
import { FakeDiffableViewer } from '../fakes/FakeDiffableViewer'

describe('ChangeNavigator', () => {
  it('visits every changed element once, in a stable order', () => {
    const navigator = ChangeNavigator.forDiff(
      { added: ['A'], removed: ['R'], changed: ['A'], moved: ['M'] },
      [],
    )

    expect(navigator.ids).toEqual(['A', 'R', 'M'])
  })

  it('focuses the next change on every viewer that shows it and moves the active marker', () => {
    const oldViewer = new FakeDiffableViewer(['R'])
    const newViewer = new FakeDiffableViewer(['A'])
    const navigator = new ChangeNavigator(['A', 'R'], [oldViewer, newViewer])

    navigator.next()
    expect(newViewer.focused).toEqual(['A'])
    expect(newViewer.markers).toEqual([{ id: 'A', marker: MARKER.active }])

    navigator.next()
    expect(oldViewer.focused).toEqual(['R'])
    expect(newViewer.markers).toEqual([])
  })

  it('tells the position of the selected change, and none after "All"', () => {
    const navigator = new ChangeNavigator(['A', 'B'], [])
    expect(navigator.position).toBeNull()

    navigator.next()
    navigator.next()
    expect(navigator.position).toBe(2)

    navigator.showAll()
    expect(navigator.position).toBeNull()
  })

  it('steps through the overview between the last and the first change, both ways', () => {
    const viewer = new FakeDiffableViewer(['A', 'B'])
    const navigator = new ChangeNavigator(['A', 'B'], [viewer])
    const positions: (number | null)[] = []
    const step = (move: () => void) => {
      move()
      positions.push(navigator.position)
    }

    step(() => navigator.next())
    step(() => navigator.next())
    step(() => navigator.next())
    step(() => navigator.next())
    step(() => navigator.previous())
    step(() => navigator.previous())

    expect(positions).toEqual([1, 2, null, 1, null, 2])
    expect(viewer.resets).toBe(2)
    expect(viewer.markers).toEqual([{ id: 'B', marker: MARKER.active }])
  })

  it('starts at the last change when stepping back with nothing selected', () => {
    const navigator = new ChangeNavigator(['A', 'B', 'C'], [])

    navigator.previous()

    expect(navigator.position).toBe(3)
  })

  it('steps back from the first change to the overview and resets every viewer on "All"', () => {
    const viewer = new FakeDiffableViewer(['A', 'B'])
    const navigator = new ChangeNavigator(['A', 'B'], [viewer, null])

    navigator.next()
    navigator.previous()
    expect(viewer.focused).toEqual(['A'])
    expect(navigator.position).toBeNull()

    expect(viewer.resets).toBe(1)

    navigator.previous()
    expect(viewer.focused).toEqual(['A', 'B'])

    navigator.showAll()
    expect(viewer.markers).toEqual([])
    expect(viewer.resets).toBe(2)
  })
})
