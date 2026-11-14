import { Settings } from 'lucide'
import { DiffDataError, type DiffLoaders, type DiffSource } from '../../git-hosts/DiffSource'
import type { DiagramDiffer, NotationLookup } from '../../notations/Notation'
import type { ReportContext } from '../../platform/DiagitRepository'
import { h } from '../../platform/utils/dom'
import { fileLabel } from '../../platform/utils/fileLabel'
import { webOrigin } from '../../platform/utils/origin'
import { Notice, type NoticeDetails } from '../../platform/ui/Notice'
import { DiffPanel } from './DiffPanel'
import diffCss from './diff.css?inline'

export interface ReadPermission {
  mayRead(url: string): Promise<boolean>
}

const NO_DIAGRAM_CHANGE: NoticeDetails = {
  tone: 'warning',
  title: "Can't show this diff",
  body: 'Diagit found no diagram change of this file on this page.',
}

export class StandaloneDiffPage {
  private readonly body = h('main', { class: 'diff-page' })

  constructor(
    private readonly sources: readonly DiffSource[],
    private readonly notations: NotationLookup,
    private readonly permission: ReadPermission,
    private readonly reportContext: ReportContext,
  ) {}

  mount(app: HTMLElement): void {
    app.append(
      h('header', { class: 'page-header' }, [
        h('img', { class: 'app-icon', src: '/icon/icon.svg', alt: '' }),
        h('h1', { text: 'Diagit' }),
        h('span', { class: 'page-subtitle', text: 'Viewer' }),
      ]),
      this.body,
    )
  }

  async open(pageUrl: string, path: string): Promise<void> {
    const notation = this.notations.detect(path)
    const label = notation?.descriptor.label ?? 'Diagram'
    const differ = notation?.differ
    if (!differ) {
      this.showNotice(path, label, NO_DIAGRAM_CHANGE)
      return
    }
    const loaded = await this.loadersOrNotice(pageUrl, path, label)
    if ('loadOld' in loaded) {
      this.showDiff(path, label, differ, loaded)
    } else {
      this.showNotice(path, label, loaded)
    }
  }

  private async loadersOrNotice(
    pageUrl: string,
    path: string,
    label: string,
  ): Promise<DiffLoaders | NoticeDetails> {
    const page = webOrigin(pageUrl) ? new URL(pageUrl) : null
    const source = page && this.sources.find((candidate) => candidate.pageKey(page))
    if (!page || !source) {
      return NO_DIAGRAM_CHANGE
    }
    if (!(await this.permission.mayRead(pageUrl))) {
      return this.notAllowed(page.hostname)
    }
    try {
      return (await source.loadersFor(page, path)) ?? NO_DIAGRAM_CHANGE
    } catch (err) {
      if (!(err instanceof DiffDataError)) {
        throw err
      }
      return err.noticeDetails(label, this.reportContext)
    }
  }

  private showDiff(path: string, label: string, differ: DiagramDiffer, loaders: DiffLoaders): void {
    document.head.append(h('style', { text: [differ.css, diffCss].join('\n') }))
    new DiffPanel({
      differ,
      label,
      filePath: path,
      reportContext: this.reportContext,
      ...loaders,
    }).mount(this.body)
  }

  private showNotice(path: string, label: string, details: NoticeDetails): void {
    const notice = new Notice({ ...details, followsUserAction: true }, 'pane')
    this.body.append(
      h('section', { class: 'diagit-wrap has-error' }, [
        h('div', { class: 'diagit-toolbar' }, [fileLabel(path, label)]),
        h('div', { class: 'diagit-canvas' }, [h('div', { class: 'canvas' }, [notice.element])]),
      ]),
    )
  }

  private notAllowed(host: string): NoticeDetails {
    return {
      tone: 'warning',
      title: "Can't show this diff",
      body: `Diagit may not read files from ${host} yet. Add the domain in the options.`,
      action: { label: 'Open options', icon: Settings, opensOptions: true },
    }
  }
}
