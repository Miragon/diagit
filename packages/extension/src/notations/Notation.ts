import type { NotationDescriptor } from './NotationDescriptor'

export interface DiagramDiff {
  added: string[]
  removed: string[]
  changed: string[]
  moved: string[]
}

export interface DiagramViewer {
  fit(): void
  zoomBy(factor: number): void
  zoomLevel(): number | null
  onViewChange(listener: () => void): () => void
  setInteractive(active: boolean): void
  destroy(): void
}

export interface DiffableViewer extends DiagramViewer {
  hasElement(id: string): boolean
  addMarker(id: string, marker: string): void
  removeMarker(id: string, marker: string): void
  focusElement(id: string, zoom: number): void
}

export interface DiagramDiffer {
  readonly css: string
  diff(oldXml: string, newXml: string): Promise<DiagramDiff>
  createViewer(canvas: HTMLElement, xml: string): Promise<DiffableViewer>
}

export interface Notation {
  readonly descriptor: NotationDescriptor
  readonly css: string
  readonly assetCss: string
  readonly differ: DiagramDiffer | null
  createViewer(canvas: HTMLElement, source: string): Promise<DiagramViewer>
}

export interface NotationLookup {
  detect(path: string | null | undefined): Notation | null
}
