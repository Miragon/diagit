import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExpandDialog } from '../../src/platform/ui/ExpandDialog'

function expandablePanel() {
  const page = document.createElement('main')
  const panel = document.createElement('section')
  panel.dataset.cdTheme = 'dark'
  page.append(panel)
  document.body.append(page)
  const onToggle = vi.fn()
  const expandDialog = new ExpandDialog(panel, onToggle)
  return { page, panel, onToggle, expandDialog }
}

function press(target: Element, type: 'pointerdown' | 'click'): void {
  target.dispatchEvent(new Event(type, { bubbles: true }))
}

describe('ExpandDialog', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('moves the panel into an open modal dialog and keeps its place in the page', () => {
    const { page, panel, onToggle, expandDialog } = expandablePanel()
    vi.spyOn(panel, 'offsetHeight', 'get').mockReturnValue(640)

    expandDialog.toggle()

    const dialog = panel.parentElement as HTMLDialogElement
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog.open).toBe(true)
    expect(dialog.dataset.cdTheme).toBe('dark')
    expect((page.firstElementChild as HTMLElement).style.height).toBe('640px')
    expect(expandDialog.isOpen).toBe(true)
    expect(onToggle).toHaveBeenLastCalledWith(true)
  })

  it('puts the panel back in its place and removes the dialog when it closes', () => {
    const { page, panel, onToggle, expandDialog } = expandablePanel()
    expandDialog.toggle()

    expandDialog.close()

    expect([...page.children]).toEqual([panel])
    expect(document.querySelector('dialog')).toBeNull()
    expect(expandDialog.isOpen).toBe(false)
    expect(onToggle).toHaveBeenLastCalledWith(false)
  })

  it('puts the panel back at once on Esc', () => {
    const { page, panel, expandDialog } = expandablePanel()
    expandDialog.toggle()

    panel.parentElement!.dispatchEvent(new Event('cancel', { cancelable: true }))

    expect([...page.children]).toEqual([panel])
  })

  it('puts the panel back when the browser closes the dialog by itself', () => {
    const { page, panel, expandDialog } = expandablePanel()
    expandDialog.toggle()
    const dialog = panel.parentElement as HTMLDialogElement
    dialog.removeAttribute('open')

    dialog.dispatchEvent(new Event('close'))

    expect([...page.children]).toEqual([panel])
  })

  it('stays open when a late close event arrives after reopening', () => {
    const { panel, expandDialog } = expandablePanel()
    expandDialog.toggle()
    expandDialog.toggle()
    expandDialog.toggle()

    panel.parentElement!.dispatchEvent(new Event('close'))

    expect(expandDialog.isOpen).toBe(true)
  })

  it('closes on a click on the backdrop', () => {
    const { panel, expandDialog } = expandablePanel()
    expandDialog.toggle()
    const dialog = panel.parentElement!

    press(dialog, 'pointerdown')
    press(dialog, 'click')

    expect(expandDialog.isOpen).toBe(false)
  })

  it('stays open when a drag that started on the panel ends on the backdrop', () => {
    const { panel, expandDialog } = expandablePanel()
    expandDialog.toggle()

    press(panel, 'pointerdown')
    press(panel.parentElement!, 'click')

    expect(expandDialog.isOpen).toBe(true)
  })

  it('stays open on a click inside the panel', () => {
    const { panel, expandDialog } = expandablePanel()
    expandDialog.toggle()

    press(panel, 'pointerdown')
    press(panel, 'click')

    expect(expandDialog.isOpen).toBe(true)
  })
})
