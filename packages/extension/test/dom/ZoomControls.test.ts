import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZoomControls } from '../../src/platform/ui/ZoomControls'
import { FakeFullScreen } from '../fakes/FakeFullScreen'

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

  describe('full screen', () => {
    afterEach(() => {
      vi.restoreAllMocks()
      FakeFullScreen.uninstall()
      document.body.replaceChildren()
    })

    function fullScreenControls() {
      FakeFullScreen.install()
      const panel = document.createElement('div')
      document.body.append(panel)
      const parts = controlsFor()
      parts.controls.allowFullScreen(panel)
      panel.append(parts.controls.element)
      return { ...parts, panel, fullScreenButton: () => parts.button('Full screen') }
    }

    it('offers no full screen button where the browser does not allow full screen', () => {
      const { controls } = controlsFor()

      controls.allowFullScreen(document.createElement('div'))

      expect(controls.element.querySelector('.diagit-zoom-full-screen')).toBeNull()
    })

    it('adds an unpressed full screen button after Fit', () => {
      const { controls, fullScreenButton } = fullScreenControls()

      const labels = [...controls.element.querySelectorAll('button')].map((button) =>
        button.getAttribute('aria-label'),
      )
      expect(labels).toEqual(['Zoom out', 'Reset zoom', 'Zoom in', 'Fit to view', 'Full screen'])
      expect(fullScreenButton().getAttribute('aria-pressed')).toBe('false')
      expect(fullScreenButton().title).toBe('Full screen')
    })

    it('puts the panel in full screen, presses the button and fits once', async () => {
      const { target, panel, fullScreenButton } = fullScreenControls()

      fullScreenButton().click()
      await Promise.resolve()

      expect(document.fullscreenElement).toBe(panel)
      expect(fullScreenButton().getAttribute('aria-pressed')).toBe('true')
      expect(fullScreenButton().title).toBe('Exit full screen')
      expect(fullScreenButton().getAttribute('aria-label')).toBe('Full screen')
      expect(target.fit).toHaveBeenCalledOnce()
    })

    it('leaves full screen through the button and fits again', async () => {
      const { target, fullScreenButton } = fullScreenControls()
      fullScreenButton().click()
      await Promise.resolve()

      fullScreenButton().click()
      await Promise.resolve()

      expect(document.fullscreenElement).toBeNull()
      expect(fullScreenButton().getAttribute('aria-pressed')).toBe('false')
      expect(fullScreenButton().title).toBe('Full screen')
      expect(target.fit).toHaveBeenCalledTimes(2)
    })

    it('follows the browser when Esc leaves full screen', async () => {
      const { target, fullScreenButton } = fullScreenControls()
      fullScreenButton().click()
      await Promise.resolve()

      FakeFullScreen.exit()

      expect(fullScreenButton().getAttribute('aria-pressed')).toBe('false')
      expect(target.fit).toHaveBeenCalledTimes(2)
    })

    it('brings the page back to where it was scrolled when full screen ends', async () => {
      const { fullScreenButton } = fullScreenControls()
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(840)
      fullScreenButton().click()
      await Promise.resolve()
      expect(scrollTo).not.toHaveBeenCalled()

      FakeFullScreen.exit()

      expect(scrollTo).toHaveBeenCalledWith({ top: 840, behavior: 'instant' })
    })

    it('keeps only the full screen button while there is no zoomable canvas', () => {
      const { controls, fullScreenButton } = fullScreenControls()

      controls.showLevel(null)

      expect(controls.element.hidden).toBe(false)
      expect(fullScreenButton().hidden).toBe(false)
      expect(controls.element.querySelector<HTMLElement>('.diagit-zoom-fit')!.hidden).toBe(true)
      expect(controls.element.querySelector<HTMLElement>('.diagit-zoom-divider')!.hidden).toBe(true)
      controls.showLevel(1)
      expect(controls.element.querySelector<HTMLElement>('.diagit-zoom-fit')!.hidden).toBe(false)
    })

    it('hides the whole island on request', () => {
      const { controls } = fullScreenControls()
      controls.showLevel(1)

      controls.hide()

      expect(controls.element.hidden).toBe(true)
    })

    it('stays unpressed when the browser refuses full screen', async () => {
      const { target, fullScreenButton } = fullScreenControls()
      FakeFullScreen.refuse()

      fullScreenButton().click()
      await Promise.resolve()
      await Promise.resolve()

      expect(fullScreenButton().getAttribute('aria-pressed')).toBe('false')
      expect(target.fit).not.toHaveBeenCalled()
    })
  })
})
