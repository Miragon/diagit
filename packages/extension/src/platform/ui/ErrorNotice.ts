import type { HostPage, PanelHandle, ShadowPanel, ShadowPanelOptions } from '../page/HostPage'
import { diagitRepository } from '../DiagitRepository'
import { h } from '../utils/dom'
import { errorMessage } from '../utils/errorMessage'
import { externalLink } from '../utils/externalLink'
import { detectHostTheme } from '../utils/hostTheme'

export interface ErrorNoticeDetails {
  title: string
  message: string
  hint: string
  reportUrl?: string
}

export interface ErrorNoticePanel {
  name: string
  anchor: HTMLElement
  append: ShadowPanelOptions<ErrorNotice>['append']
}

export class ErrorNotice implements PanelHandle {
  readonly element: HTMLElement

  static mountOn(
    page: HostPage,
    { name, anchor, append }: ErrorNoticePanel,
    details: ErrorNoticeDetails,
  ): Promise<ShadowPanel<ErrorNotice>> {
    return page.mountPanel({
      name,
      anchor,
      append,
      css: '',
      render: (container) => new ErrorNotice(details).mountIn(container),
    })
  }

  static unreadableModel(label: string, place: string, err: unknown): ErrorNoticeDetails {
    const title = `${label} view could not be rendered`
    return {
      title,
      hint: `Diagit could not read this file as a ${label} model. If it opens in other tools, report this problem.`,
      message: errorMessage(err),
      reportUrl: diagitRepository.problemReportUrl(
        `${label} file not rendered ${place}`,
        `Diagit showed "${title}" ${place}.`,
      ),
    }
  }

  constructor(details: ErrorNoticeDetails) {
    this.element = h('div', { class: 'diagit-error' }, [
      h('div', { class: 'diagit-error-title', text: details.title }),
      h('div', { class: 'diagit-error-hint', text: details.hint }),
      h('div', { class: 'diagit-error-detail', text: details.message }),
      ...(details.reportUrl
        ? [
            externalLink(details.reportUrl, {
              class: 'diagit-error-report',
              text: 'Report this problem',
            }),
          ]
        : []),
    ])
  }

  destroy(): void {
    this.element.remove()
  }

  private mountIn(container: HTMLElement): this {
    container.append(this.element)
    this.element.dataset.cdTheme = detectHostTheme(this.element)
    return this
  }
}
