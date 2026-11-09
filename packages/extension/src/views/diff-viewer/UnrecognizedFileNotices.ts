import type { VisibleFileHeader } from '../../git-hosts/FileHeaderLocator'
import type { NotationLookup } from '../../notations/Notation'
import type { HostPage, ShadowPanel } from '../../platform/page/HostPage'
import { reportIssueUrl } from '../../platform/utils/reportIssueUrl'
import { DiffErrorNotice } from './DiffErrorNotice'

const UNRECOGNIZED_HINT =
  'This file changed and is shown on the page, but Diagit does not recognise this diff view. The page layout has probably changed.'

export class UnrecognizedFileNotices {
  private readonly shown = new Map<string, ShadowPanel<DiffErrorNotice>>()
  private readonly mounting = new Set<string>()

  constructor(
    private readonly page: HostPage,
    private readonly notations: NotationLookup,
  ) {}

  showOnly(files: VisibleFileHeader[]): void {
    this.removeAllExcept(new Set(files.map((file) => file.path)))
    for (const file of files) {
      if (this.shown.has(file.path) || this.mounting.has(file.path)) continue
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
      if (keptPaths.has(path) && panel.shadowHost.isConnected) continue
      panel.remove()
      this.shown.delete(path)
    }
  }

  private mount({ path, header }: VisibleFileHeader): Promise<ShadowPanel<DiffErrorNotice>> {
    const notation = this.notations.detect(path)
    const label = notation?.descriptor.label ?? 'Diagram'
    return DiffErrorNotice.mountOn(this.page, {
      anchor: header,
      append: 'after',
      css: notation?.differ?.css ?? '',
      details: {
        title: `${label} diff could not be shown`,
        message: path,
        hint: UNRECOGNIZED_HINT,
        reportUrl: reportIssueUrl(
          `${label} diff not shown, diff view not recognised`,
          `Diagit showed "${label} diff could not be shown" for a changed file whose diff it did not recognise.`,
        ),
      },
    })
  }
}
