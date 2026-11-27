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

/** One line of a file, numbered from 1. */
export interface CodeLine {
  readonly number: number
  readonly text: string
}

/** One changed element as the lines of its file, without layout: `null` where it is missing. */
export interface ChangeDetail {
  /** The kind of element for people, such as "Service task". */
  typeLabel: string
  name: string | null
  before: readonly CodeLine[] | null
  after: readonly CodeLine[] | null
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
