import { describe, expect, it, vi } from 'vitest'
import { SideSwitch } from '../../src/views/diff-viewer/SideSwitch'

function sideSwitch() {
  const onPick = vi.fn()
  const control = new SideSwitch(onPick)
  const button = (name: string) =>
    [...control.element.querySelectorAll('button')].find((b) => b.textContent === name)!
  return { control, onPick, button }
}

describe('SideSwitch', () => {
  it('names the group and both sides, with neither pressed', () => {
    const { control, button } = sideSwitch()

    expect(control.element.getAttribute('role')).toBe('group')
    expect(control.element.getAttribute('aria-label')).toBe('Side')
    expect(button('Before').getAttribute('aria-pressed')).toBe('false')
    expect(button('After').getAttribute('aria-pressed')).toBe('false')
    expect(button('Before').title).toBe('Show Before only')
    expect(button('After').title).toBe('Show After only')
  })

  it('tells which side was clicked', () => {
    const { onPick, button } = sideSwitch()

    button('After').click()
    button('Before').click()

    expect(onPick).toHaveBeenNthCalledWith(1, 'new')
    expect(onPick).toHaveBeenNthCalledWith(2, 'old')
  })

  it('presses the shown side and offers both sides on it', () => {
    const { control, button } = sideSwitch()

    control.show('old')

    expect(button('Before').getAttribute('aria-pressed')).toBe('true')
    expect(button('Before').title).toBe('Show both sides')
    expect(button('After').getAttribute('aria-pressed')).toBe('false')
    expect(button('After').title).toBe('Show After only')
  })

  it('presses neither side when both are shown again', () => {
    const { control, button } = sideSwitch()
    control.show('new')

    control.show('both')

    expect(button('Before').getAttribute('aria-pressed')).toBe('false')
    expect(button('After').getAttribute('aria-pressed')).toBe('false')
  })

  it('focuses a side', () => {
    const { control, button } = sideSwitch()
    document.body.append(control.element)

    control.focus('new')

    expect(document.activeElement).toBe(button('After'))
    control.element.remove()
  })
})
