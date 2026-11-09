import type { VisibleFileHeader } from './FileHeaderLocator'

interface DiffPanelSlot {
  anchor: HTMLElement
  append: 'first' | 'before'
  fileRoot: HTMLElement
}

export interface ChangedFile extends DiffPanelSlot {
  path: string
  isCollapsed(): boolean
}

export interface DiffLoaders {
  loadOld(): Promise<string | null>
  loadNew(): Promise<string | null>
}

export interface DiffFileBlock extends ChangedFile, DiffLoaders {}

export class DiffDataError extends Error {
  constructor(
    message: string,
    readonly hint: string,
    readonly files: ChangedFile[],
  ) {
    super(message)
    this.name = 'DiffDataError'
  }
}

export interface DiffSource {
  pageKey(location: Location): string | null
  collect(location: Location, doc: Document): Promise<DiffFileBlock[]>
  unrecognizedFiles(location: Location, doc: Document): Promise<VisibleFileHeader[]>
}

export interface DiffPage<Page extends { key: string }, Data> {
  identify(location: Location): Page | null
  showsDiffs(location: Location): boolean
  scan(doc: Document): ChangedFile[]
  recognizedPaths(doc: Document): string[]
  load(location: Location, page: Page): Promise<Data>
  changedPaths(data: Data): string[]
  loaders(location: Location, file: ChangedFile, data: Data): DiffLoaders
  errorHint(location: Location, err: unknown): string
}
