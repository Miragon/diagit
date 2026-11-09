import { DIFF_ERROR_TAG } from '../../platform/injectedElements'
import type {
  HostPage,
  PanelHandle,
  ShadowPanel,
  ShadowPanelOptions,
} from '../../platform/page/HostPage'
import { h } from '../../platform/utils/dom'
import { detectHostTheme } from '../../platform/utils/hostTheme'
import diffCss from './diff.css?inline'

export interface DiffErrorDetails {
  title: string
  message: string
  hint: string
  reportUrl?: string
}

export interface DiffErrorPlacement {
  anchor: HTMLElement
  append: ShadowPanelOptions<DiffErrorNotice>['append']
  css: string
  details: DiffErrorDetails
}

export class DiffErrorNotice implements PanelHandle {
  private readonly root: HTMLElement

  static async mountOn(
    page: HostPage,
    { anchor, append, css, details }: DiffErrorPlacement,
  ): Promise<ShadowPanel<DiffErrorNotice>> {
    const panel = await page.mountPanel({
      name: DIFF_ERROR_TAG,
      anchor,
      append,
      css: [css, diffCss].join('\n'),
      render: (container) => new DiffErrorNotice(details).mount(container),
    })
    page.onInvalidated(() => panel.remove())
    return panel
  }

  constructor(details: DiffErrorDetails) {
    this.root = h('div', { class: 'git-diagram-wrap git-diagram-di-root git-diagram-error' }, [
      h('div', { class: 'git-diagram-error-title', text: details.title }),
      h('div', { class: 'git-diagram-error-hint', text: details.hint }),
      h('div', { class: 'git-diagram-error-detail', text: details.message }),
      ...(details.reportUrl ? [this.reportLink(details.reportUrl)] : []),
    ])
  }

  private reportLink(url: string): HTMLElement {
    return h('a', {
      class: 'git-diagram-error-report',
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'Report this problem',
    })
  }

  mount(container: HTMLElement): this {
    container.append(this.root)
    this.root.dataset.cdTheme = detectHostTheme(this.root)
    return this
  }

  destroy(): void {
    this.root.remove()
  }
}
