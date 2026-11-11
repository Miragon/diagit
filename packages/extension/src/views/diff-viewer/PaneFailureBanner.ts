import { CircleX, Flag, RotateCw, type IconNode } from 'lucide'
import { h } from '../../platform/utils/dom'
import { externalLink } from '../../platform/utils/externalLink'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import type { PaneFailure } from './DiffNotices'

const ACTION_CLASS = 'btn btn-small diagit-diff-failure-action'

export class PaneFailureBanner {
  readonly element: HTMLElement

  constructor({ title, hint, message, reportUrl, offersReload }: PaneFailure) {
    this.element = h(
      'div',
      { class: 'diagit-diff-failure', role: 'alert', title: `${hint}\n${message}` },
      [
        lucideIcon(CircleX, 'diagit-diff-failure-icon'),
        h('span', { class: 'diagit-diff-failure-title', text: title }),
        h('span', { class: 'diagit-diff-failure-detail', text: `${hint} ${message}` }),
        ...(offersReload ? [this.reloadButton()] : []),
        ...(reportUrl ? [this.reportLink(reportUrl)] : []),
      ],
    )
  }

  private reloadButton(): HTMLButtonElement {
    return h(
      'button',
      {
        class: ACTION_CLASS,
        type: 'button',
        'aria-label': 'Reload page',
        onClick: () => location.reload(),
      },
      this.actionContent(RotateCw, 'Reload'),
    )
  }

  private reportLink(reportUrl: string): HTMLAnchorElement {
    const link = externalLink(
      reportUrl,
      { class: ACTION_CLASS },
      this.actionContent(Flag, 'Report'),
    )
    link.setAttribute('aria-label', 'Report this problem')
    return link
  }

  private actionContent(icon: IconNode, text: string): Node[] {
    return [lucideIcon(icon), h('span', { class: 'diagit-diff-failure-label', text })]
  }
}
