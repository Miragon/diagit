import { diagitRepository, type ReportContext } from '../platform/DiagitRepository'
import type { NoticeDetails } from '../platform/ui/Notice'
import type { VisibleFileHeader } from './FileHeaderLocator'
import type { PageUrl } from './GitHost'

export type ErrorHelp = Pick<NoticeDetails, 'tone' | 'body' | 'action'> & { title?: string }

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
    readonly help: ErrorHelp,
    readonly files: ChangedFile[],
  ) {
    super(message)
    this.name = 'DiffDataError'
  }

  noticeDetails(label: string, reportContext: ReportContext): NoticeDetails {
    const { title = `${label} diff data could not be loaded`, ...help } = this.help
    return {
      title,
      ...help,
      reportUrl: diagitRepository.problemReportUrl(
        `${label} diff data not loaded`,
        `Diagit showed "${title}" in a diff.`,
        reportContext,
        this.message,
      ),
    }
  }
}

export interface DiffSource {
  pageKey(location: PageUrl): string | null
  collect(location: PageUrl, doc: Document): Promise<DiffFileBlock[]>
  unrecognizedFiles(location: PageUrl, doc: Document): Promise<VisibleFileHeader[]>
  loadersFor(location: PageUrl, path: string): Promise<DiffLoaders | null>
}

export interface DiffPage<Page extends { key: string }, Data> {
  identify(location: PageUrl): Page | null
  showsDiffs(location: PageUrl): boolean
  scan(doc: Document): ChangedFile[]
  recognizedPaths(doc: Document): string[]
  load(location: PageUrl, page: Page): Promise<Data>
  changedPaths(data: Data): string[]
  loaders(location: PageUrl, path: string, data: Data): DiffLoaders
  errorHelp(location: PageUrl, err: unknown): Promise<ErrorHelp>
}
