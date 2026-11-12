import type { VisibleFileHeader } from '../../git-hosts/FileHeaderLocator'
import type { NotationLookup } from '../../notations/Notation'
import type { HostPage, ShadowPanel } from '../../platform/page/HostPage'
import { diagitRepository, type ReportContext } from '../../platform/DiagitRepository'
import { DIFF_ERROR_TAG } from '../../platform/injectedElements'
import { Notice } from '../../platform/ui/Notice'

const UNRECOGNIZED_BODY =
  "The page layout has probably changed. The file's changes are still shown below."

export class UnrecognizedFileNotices {
  private readonly shown = new Map<string, ShadowPanel<Notice>>()
  private readonly mounting = new Set<string>()

  constructor(
    private readonly page: HostPage,
    private readonly notations: NotationLookup,
    private readonly reportContext: ReportContext,
  ) {}

  showOnly(files: VisibleFileHeader[]): void {
    this.removeAllExcept(new Set(files.map((file) => file.path)))
    for (const file of files) {
      if (this.shown.has(file.path) || this.mounting.has(file.path)) {
        continue
      }
      this.mounting.add(file.path)
      void this.mount(file)
        .then((panel) => this.shown.set(file.path, panel))
        .catch((err) => console.error('[diagit] could not show the notice', err))
        .finally(() => this.mounting.delete(file.path))
    }
  }

  removeAll(): void {
    this.removeAllExcept(new Set())
  }

  private removeAllExcept(keptPaths: Set<string>): void {
    for (const [path, panel] of this.shown) {
      if (keptPaths.has(path) && panel.shadowHost.isConnected) {
        continue
      }
      panel.remove()
      this.shown.delete(path)
    }
  }

  private mount({ path, header }: VisibleFileHeader): Promise<ShadowPanel<Notice>> {
    const label = this.notations.detect(path)?.descriptor.label ?? 'Diagram'
    const title = `${label} diff view not recognised`
    return Notice.mountOn(
      this.page,
      { name: DIFF_ERROR_TAG, anchor: header, append: 'after' },
      {
        tone: 'danger',
        title,
        body: UNRECOGNIZED_BODY,
        reportUrl: diagitRepository.problemReportUrl(
          `${label} diff not shown, diff view not recognised`,
          `Diagit showed "${title}" for a changed file whose diff it did not recognise.`,
          this.reportContext,
        ),
      },
    )
  }
}
