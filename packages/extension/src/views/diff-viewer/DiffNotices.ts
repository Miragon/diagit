import { diagitRepository, type ReportContext } from '../../platform/DiagitRepository'
import type { NoticeDetails } from '../../platform/ui/Notice'
import { FetchError } from '../../platform/messaging/HttpClient'
import { unreadableModelReason } from '../../platform/utils/errorMessage'

export type DiffSide = 'old' | 'new'

const VERSION_NAME: Record<DiffSide, string> = { old: 'Old', new: 'New' }
const PLACE = 'in a diff'

export interface PaneFailure extends Omit<NoticeDetails, 'body'> {
  offersReload: boolean
  meta?: string
}

export class DiffNotices {
  constructor(
    private readonly label: string,
    private readonly reportContext: ReportContext,
  ) {}

  notLoaded(side: DiffSide, err: unknown): PaneFailure {
    const title = `${VERSION_NAME[side]} version could not be loaded`
    return {
      tone: 'danger',
      title,
      meta: this.httpStatus(err),
      offersReload: true,
      reportUrl: diagitRepository.problemReportUrl(
        `${this.label} file not loaded ${PLACE}`,
        `Diagit showed "${title}" ${PLACE}.`,
        this.reportContext,
        err,
      ),
    }
  }

  notRendered(side: DiffSide, err: unknown): PaneFailure {
    const title = `${VERSION_NAME[side]} version could not be read`
    return {
      tone: 'danger',
      title,
      offersReload: false,
      reportUrl: diagitRepository.problemReportUrl(
        `${this.label} file not rendered ${PLACE}`,
        `Diagit showed "${title}" ${PLACE}.`,
        this.reportContext,
        unreadableModelReason(err),
      ),
    }
  }

  private httpStatus(err: unknown): string | undefined {
    return err instanceof FetchError && err.status ? `· HTTP ${err.status}` : undefined
  }
}
