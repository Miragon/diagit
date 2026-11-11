import { diagitRepository, type ReportContext } from '../../platform/DiagitRepository'
import { ErrorNotice, type ErrorNoticeDetails } from '../../platform/ui/ErrorNotice'
import { errorMessage } from '../../platform/utils/errorMessage'

export type DiffSide = 'old' | 'new'

const VERSION_NAME: Record<DiffSide, string> = { old: 'Old', new: 'New' }
const PLACE = 'in a diff'

export class DiffNotices {
  constructor(
    private readonly label: string,
    private readonly reportContext: ReportContext,
  ) {}

  notLoaded(side: DiffSide, err: unknown): ErrorNoticeDetails {
    const title = `${VERSION_NAME[side]} version could not be loaded`
    return {
      title,
      hint: 'Diagit could not download this version of the file. Reload the page to try again.',
      message: errorMessage(err),
      reportUrl: diagitRepository.problemReportUrl(
        `${this.label} file not loaded ${PLACE}`,
        `Diagit showed "${title}" ${PLACE}.`,
        this.reportContext,
      ),
    }
  }

  notRendered(err: unknown): ErrorNoticeDetails {
    return ErrorNotice.unreadableModel(this.label, PLACE, err, this.reportContext)
  }
}
