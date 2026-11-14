import type { DiffableViewer } from '../../src/notations/Notation'

export class FakeDiffableViewer implements DiffableViewer {
  readonly markers: Array<{ id: string; marker: string }> = []
  readonly focused: string[] = []
  fits = 0
  resets = 0
  destroyed = false
  level: number | null = 1
  private readonly viewChangeListeners = new Set<() => void>()

  constructor(private readonly knownIds: string[] = []) {}

  hasElement(id: string): boolean {
    return this.knownIds.includes(id)
  }

  addMarker(id: string, marker: string): void {
    this.markers.push({ id, marker })
  }

  removeMarker(id: string, marker: string): void {
    const index = this.markers.findIndex((entry) => entry.id === id && entry.marker === marker)
    if (index >= 0) {
      this.markers.splice(index, 1)
    }
  }

  focusElement(id: string): void {
    this.focused.push(id)
  }

  resetView(): void {
    this.resets += 1
  }

  fit(): void {
    this.fits += 1
  }

  zoomBy(factor: number): void {
    if (this.level !== null) {
      this.level *= factor
    }
    this.viewChangeListeners.forEach((listener) => listener())
  }

  zoomLevel(): number | null {
    return this.level
  }

  onViewChange(listener: () => void): () => void {
    this.viewChangeListeners.add(listener)
    return () => this.viewChangeListeners.delete(listener)
  }

  setInteractive(): void {}

  destroy(): void {
    this.destroyed = true
  }
}
