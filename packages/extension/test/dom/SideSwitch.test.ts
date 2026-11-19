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

  it('picks a side that is not shown alone', () => {
    const { onPick, button } = sideSwitch()

    button('After').click()

    expect(onPick).toHaveBeenCalledWith('new')
  })

  it('picks both sides when the pressed side is clicked again', () => {
    const { control, onPick, button } = sideSwitch()
    control.show('new')

    button('After').click()

    expect(onPick).toHaveBeenCalledWith('both')
  })

  it('switches straight to the other side', () => {
    const { control, onPick, button } = sideSwitch()
    control.show('new')

    button('Before').click()

    expect(onPick).toHaveBeenCalledWith('old')
  })

  it('presses the shown side and offers both sides on it', () => {
    const { control, button } = sideSwitch()

    control.show('old')

    expect(button('Before').getAttribute('aria-pressed')).toBe('true')
    expect(button('Before').title).toBe('Show both sides')
    expect(button('After').getAttribute('aria-pressed')).toBe('false')
    expect(button('After').title).toBe('Show After only')
  })

  it('focuses the pressed side only', () => {
    const { control, button } = sideSwitch()
    document.body.append(control.element)

    control.focusPressed()
    expect(document.activeElement).toBe(document.body)

    control.show('new')
    control.focusPressed()
    expect(document.activeElement).toBe(button('After'))
    control.element.remove()
  })
})
