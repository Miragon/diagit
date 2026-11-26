import type { NotationDescriptor } from './NotationDescriptor'

export interface DiagramDiff {
  added: string[]
  removed: string[]
  changed: string[]
  moved: string[]
}

export interface DiagramViewer {
  fit(): void
  resized(): void
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
  resetView(): void
}

/** One changed element as code, without layout: `null` on the side it is missing from. */
export interface ChangeDetail {
  type: string
  name: string | null
  before: string | null
  after: string | null
}

export interface DiagramComparison {
  readonly diff: DiagramDiff
  detail(id: string): ChangeDetail | null
}

export interface DiagramDiffer {
  readonly css: string
  readonly showsBpmnIoLogo: boolean
  compare(oldXml: string, newXml: string): Promise<DiagramComparison>
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
