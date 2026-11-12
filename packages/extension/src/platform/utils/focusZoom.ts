export function enableFocusZoom(
  pane: HTMLElement,
  setActive: (active: boolean) => void,
): () => void {
  let active = false
  const set = (next: boolean): void => {
    if (next === active) {
      return
    }
    active = next
    setActive(next)
    pane.classList.toggle('is-active', next)
  }

  const onPointerDown = (): void => set(true)
  const onLeave = (): void => set(false)
  const onPointerDownElsewhere = (event: Event): void => {
    if (!event.composedPath().includes(pane)) {
      set(false)
    }
  }

  pane.addEventListener('pointerdown', onPointerDown)
  pane.addEventListener('mouseleave', onLeave)
  document.addEventListener('pointerdown', onPointerDownElsewhere, true)

  return () => {
    set(false)
    pane.removeEventListener('pointerdown', onPointerDown)
    pane.removeEventListener('mouseleave', onLeave)
    document.removeEventListener('pointerdown', onPointerDownElsewhere, true)
  }
}
