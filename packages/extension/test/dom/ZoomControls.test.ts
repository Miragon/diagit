import { describe, expect, it, vi } from 'vitest'
import { ZoomControls } from '../../src/platform/ui/ZoomControls'

function controlsFor() {
  const target = { zoomBy: vi.fn(), resetZoom: vi.fn(), fit: vi.fn() }
  const controls = new ZoomControls(target)
  const button = (label: string) =>
    controls.element.querySelector<HTMLButtonElement>(`[aria-label^="${label}"]`)!
  return { target, controls, button }
}

describe('ZoomControls', () => {
  it('shows the zoom level as a percentage on the reset button', () => {
    const { controls, button } = controlsFor()

    controls.showLevel(0.856)

    expect(button('Reset zoom').textContent).toBe('86%')
    expect(button('Reset zoom').getAttribute('aria-label')).toBe('Reset zoom, 86%')
  })

  it('hides itself while there is no zoomable canvas', () => {
    const { controls } = controlsFor()

    expect(controls.element.hidden).toBe(true)
    controls.showLevel(1)
    expect(controls.element.hidden).toBe(false)
    controls.showLevel(null)
    expect(controls.element.hidden).toBe(true)
  })

  it('resets, fits and zooms the target', () => {
    const { target, controls, button } = controlsFor()
    controls.showLevel(1)

    button('Reset zoom').click()
    button('Fit to view').click()
    button('Zoom in').click()
    button('Zoom out').click()

    expect(target.resetZoom).toHaveBeenCalledOnce()
    expect(target.fit).toHaveBeenCalledOnce()
    expect(target.zoomBy).toHaveBeenNthCalledWith(1, 1.2)
    expect(target.zoomBy).toHaveBeenNthCalledWith(2, 1 / 1.2)
  })

  it('names the group and every control', () => {
    const { controls } = controlsFor()

    expect(controls.element.getAttribute('role')).toBe('group')
    expect(controls.element.getAttribute('aria-label')).toBe('Zoom')
    const labels = [...controls.element.querySelectorAll('button')].map((button) =>
      button.getAttribute('aria-label'),
    )
    expect(labels).toEqual(['Zoom out', 'Reset zoom', 'Zoom in', 'Fit to view'])
    expect(controls.element.querySelector('.diagit-zoom-fit')!.textContent).toBe('Fit')
  })
})
