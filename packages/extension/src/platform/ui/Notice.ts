import { CircleCheck, CircleX, Flag, Info, TriangleAlert, type IconNode } from 'lucide'
import type { HostPage, PanelHandle, ShadowPanel, ShadowPanelOptions } from '../page/HostPage'
import { diagitRepository, type ReportContext } from '../DiagitRepository'
import { ModelRejected, type ModelRejection } from '../ModelRejected'
import { BackgroundClient } from '../messaging/BackgroundClient'
import { h } from '../utils/dom'
import { unreadableModelReason } from '../utils/errorMessage'
import { externalLink } from '../utils/externalLink'
import { detectHostTheme } from '../utils/hostTheme'
import { lucideIcon } from '../utils/lucideIcon'

export type NoticeTone = 'danger' | 'warning' | 'info' | 'success'
export type NoticeLayout = 'block' | 'pane' | 'row' | 'bar'

export type NoticeAction = { label: string; icon?: IconNode } & (
  { url: string } | { opensOptions: true } | { onClick: () => void }
)

export interface NoticeDetails {
  tone: NoticeTone
  title: string
  meta?: string
  body?: string
  action?: NoticeAction
  reportUrl?: string
  followsUserAction?: boolean
}

export interface NoticePanel {
  name: string
  anchor: HTMLElement
  append: ShadowPanelOptions<Notice>['append']
  css?: string
  fileLabel?: HTMLElement
}

const TONE_ICON: Record<NoticeTone, IconNode> = {
  danger: CircleX,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck,
}

const REJECTED_MODEL_NOTICE: Record<
  ModelRejection,
  (label: string, subject: string) => NoticeDetails
> = {
  'no-layout': (label, subject) => ({
    tone: 'info',
    title: `${subject} has no diagram layout`,
    body: `It holds the model but no ${label} DI to draw it from.`,
  }),
  'no-content': (label, subject) => ({
    tone: 'info',
    title: `${subject} has nothing to draw`,
    body: `It has no ${label} elements Diagit can show.`,
  }),
  malformed: (_label, subject) => ({
    tone: 'warning',
    title: `${subject} has syntax errors`,
    body: 'Check it for merge conflict markers or cut-off content.',
  }),
  unsupported: (label, subject) => ({
    tone: 'warning',
    title: `${subject} uses a format Diagit cannot read`,
    body: `It is not a ${label} model in a version Diagit supports.`,
  }),
}

export class Notice implements PanelHandle {
  readonly element: HTMLElement

  static mountOn(
    page: HostPage,
    { name, anchor, append, css = '', fileLabel }: NoticePanel,
    details: NoticeDetails,
  ): Promise<ShadowPanel<Notice>> {
    return page.mountPanel({
      name,
      anchor,
      append,
      css,
      render: (container) =>
        new Notice(details, fileLabel ? 'pane' : 'block').mountIn(container, fileLabel),
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
    subject = `${label} file`,
  ): NoticeDetails {
    if (err instanceof ModelRejected) {
      return REJECTED_MODEL_NOTICE[err.reason](label, subject)
    }
    const title = `${subject} could not be read`
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
        role: details.followsUserAction ? 'alert' : 'status',
      },
      [
        lucideIcon(Notice.toneIcon(details.tone), 'diagit-notice-icon'),
        h('div', { class: 'diagit-notice-title' }, [details.title, ...this.meta(details)]),
        ...(details.body ? [h('div', { class: 'diagit-notice-body', text: details.body })] : []),
        ...this.actionRow(details),
      ],
    )
  }

  destroy(): void {
    this.element.remove()
  }

  private mountIn(container: HTMLElement, fileLabel?: HTMLElement): this {
    const root = fileLabel
      ? h('div', { class: 'diagit-wrap' }, [
          h('div', { class: 'diagit-toolbar' }, [fileLabel]),
          this.element,
        ])
      : this.element
    container.append(root)
    root.dataset.cdTheme = detectHostTheme(root)
    return this
  }

  private meta({ meta }: NoticeDetails): (string | HTMLElement)[] {
    return meta ? [' ', h('span', { class: 'diagit-notice-meta', text: meta })] : []
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
    const content = this.controlContent(action.icon, action.label)
    if ('url' in action) {
      return this.named(externalLink(action.url, { class: className }, content), action.label)
    }
    const onClick =
      'onClick' in action ? action.onClick : () => void new BackgroundClient().openOptions()
    return this.named(
      h('button', { class: className, type: 'button', onClick }, content),
      action.label,
    )
  }

  private reportLink(reportUrl: string): HTMLAnchorElement {
    const text = this.layout === 'bar' ? 'Report' : 'Report problem'
    const link = externalLink(
      reportUrl,
      { class: `${this.buttonClass} btn-secondary diagit-notice-report` },
      this.controlContent(Flag, text),
    )
    return this.named(link, 'Report problem')
  }

  private controlContent(icon: IconNode | undefined, label: string): Node[] {
    const text =
      this.layout === 'bar'
        ? h('span', { class: 'diagit-notice-action-label', text: label })
        : document.createTextNode(label)
    return [...(icon ? [lucideIcon(icon)] : []), text]
  }

  private named<Control extends HTMLElement>(control: Control, name: string): Control {
    if (this.layout === 'bar') {
      control.setAttribute('aria-label', name)
    }
    return control
  }

  private get buttonClass(): string {
    return this.layout === 'pane' ? 'btn' : 'btn btn-small'
  }
}
