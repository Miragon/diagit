import { Flag, RotateCw, type IconNode } from 'lucide'
import { Notice } from '../../platform/ui/Notice'
import { h } from '../../platform/utils/dom'
import { externalLink } from '../../platform/utils/externalLink'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import type { PaneFailure } from './DiffNotices'

const ACTION_CLASS = 'btn btn-small btn-secondary'

export class PaneFailureBanner {
  readonly element: HTMLElement

  constructor({ tone, title, meta, reportUrl, offersReload }: PaneFailure) {
    this.element = h(
      'div',
      { class: 'diagit-notice', 'data-tone': tone, 'data-layout': 'bar', role: 'status' },
      [
        lucideIcon(Notice.toneIcon(tone), 'diagit-notice-icon'),
        h('span', { class: 'diagit-notice-title' }, [
          title,
          ...(meta ? [' ', h('span', { class: 'diagit-notice-meta', text: meta })] : []),
        ]),
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
    link.setAttribute('aria-label', 'Report problem')
    return link
  }

  private actionContent(icon: IconNode, text: string): Node[] {
    return [lucideIcon(icon), h('span', { class: 'diagit-diff-failure-label', text })]
  }
}
