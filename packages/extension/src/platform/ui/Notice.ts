import { CircleCheck, CircleX, Flag, Info, TriangleAlert, type IconNode } from 'lucide'
import type { HostPage, PanelHandle, ShadowPanel, ShadowPanelOptions } from '../page/HostPage'
import { diagitRepository, type ReportContext } from '../DiagitRepository'
import { BackgroundClient } from '../messaging/BackgroundClient'
import { h } from '../utils/dom'
import { unreadableModelReason } from '../utils/errorMessage'
import { externalLink } from '../utils/externalLink'
import { detectHostTheme } from '../utils/hostTheme'
import { lucideIcon } from '../utils/lucideIcon'

export type NoticeTone = 'danger' | 'warning' | 'info' | 'success'
export type NoticeLayout = 'block' | 'pane' | 'row'

export type NoticeAction = { label: string; icon?: IconNode } & (
  { url: string } | { opensOptions: true } | { onClick: () => void }
)

export interface NoticeDetails {
  tone: NoticeTone
  title: string
  body: string
  action?: NoticeAction
  reportUrl?: string
}

export interface NoticePanel {
  name: string
  anchor: HTMLElement
  append: ShadowPanelOptions<Notice>['append']
}

const TONE_ICON: Record<NoticeTone, IconNode> = {
  danger: CircleX,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck,
}

export class Notice implements PanelHandle {
  readonly element: HTMLElement

  static mountOn(
    page: HostPage,
    { name, anchor, append }: NoticePanel,
    details: NoticeDetails,
    layout?: NoticeLayout,
  ): Promise<ShadowPanel<Notice>> {
    return page.mountPanel({
      name,
      anchor,
      append,
      css: '',
      render: (container) => new Notice(details, layout).mountIn(container),
    })
  }

  static toneIcon(tone: NoticeTone): IconNode {
    return TONE_ICON[tone]
  }

  static unreadableModel(
    label: string,
    place: string,
    err: unknown,
    reportContext: ReportContext,
  ): NoticeDetails {
    const title = `${label} file could not be read`
    return {
      tone: 'danger',
      title,
      body: `It is not a valid ${label} model.`,
      reportUrl: diagitRepository.problemReportUrl(
        `${label} file not rendered ${place}`,
        `Diagit showed "${title}" ${place}.`,
        reportContext,
        unreadableModelReason(err),
      ),
    }
  }

  constructor(
    details: NoticeDetails,
    private readonly layout: NoticeLayout = 'block',
  ) {
    this.element = h(
      'div',
      {
        class: 'diagit-notice',
        'data-tone': details.tone,
        'data-layout': layout,
        role: details.tone === 'danger' ? 'alert' : 'status',
      },
      [
        lucideIcon(Notice.toneIcon(details.tone), 'diagit-notice-icon'),
        h('div', { class: 'diagit-notice-title', text: details.title }),
        h('div', { class: 'diagit-notice-body', text: details.body }),
        ...this.actionRow(details),
      ],
    )
  }

  destroy(): void {
    this.element.remove()
  }

  private mountIn(container: HTMLElement): this {
    container.append(this.element)
    this.element.dataset.cdTheme = detectHostTheme(this.element)
    return this
  }

  private actionRow({ action, reportUrl }: NoticeDetails): HTMLElement[] {
    if (!action && !reportUrl) {
      return []
    }
    return [
      h('div', { class: 'diagit-notice-actions' }, [
        ...(action ? [this.actionControl(action)] : []),
        ...(reportUrl ? [this.reportLink(reportUrl)] : []),
      ]),
    ]
  }

  private actionControl(action: NoticeAction): HTMLElement {
    const variant = this.layout === 'pane' ? 'btn-primary' : 'btn-secondary'
    const className = `${this.buttonClass} ${variant}`
    const content = [...(action.icon ? [lucideIcon(action.icon)] : []), action.label]
    if ('url' in action) {
      return externalLink(action.url, { class: className }, content)
    }
    const onClick =
      'onClick' in action ? action.onClick : () => void new BackgroundClient().openOptions()
    return h('button', { class: className, type: 'button', onClick }, content)
  }

  private reportLink(reportUrl: string): HTMLAnchorElement {
    return externalLink(
      reportUrl,
      { class: `${this.buttonClass} btn-secondary diagit-notice-report` },
      [lucideIcon(Flag), 'Report problem'],
    )
  }

  private get buttonClass(): string {
    return this.layout === 'pane' ? 'btn' : 'btn btn-small'
  }
}
