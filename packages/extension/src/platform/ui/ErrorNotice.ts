import type { HostPage, PanelHandle, ShadowPanel, ShadowPanelOptions } from '../page/HostPage'
import { h } from '../utils/dom'
import { externalLink } from '../utils/externalLink'
import { detectHostTheme } from '../utils/hostTheme'

export interface ErrorNoticeDetails {
  title: string
  message: string
  hint: string
  reportUrl?: string
}

export interface ErrorNoticePlacement {
  anchor: HTMLElement
  append: ShadowPanelOptions<ErrorNotice>['append']
  details: ErrorNoticeDetails
}

export class ErrorNotice implements PanelHandle {
  readonly element: HTMLElement

  static async mountOn(
    page: HostPage,
    name: string,
    { anchor, append, details }: ErrorNoticePlacement,
  ): Promise<ShadowPanel<ErrorNotice>> {
    const panel = await page.mountPanel({
      name,
      anchor,
      append,
      css: '',
      render: (container) => new ErrorNotice(details).mount(container),
    })
    page.onInvalidated(() => panel.remove())
    return panel
  }

  constructor(details: ErrorNoticeDetails) {
    this.element = h('div', { class: 'git-diagram-error', role: 'alert' }, [
      h('div', { class: 'git-diagram-error-title', text: details.title }),
      h('div', { class: 'git-diagram-error-hint', text: details.hint }),
      h('div', { class: 'git-diagram-error-detail', text: details.message }),
      ...(details.reportUrl
        ? [
            externalLink(details.reportUrl, {
              class: 'git-diagram-error-report',
              text: 'Report this problem',
            }),
          ]
        : []),
    ])
  }

  mount(container: HTMLElement): this {
    container.append(this.element)
    this.element.dataset.cdTheme = detectHostTheme(this.element)
    return this
  }

  destroy(): void {
    this.element.remove()
  }
}
