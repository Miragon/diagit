import type { PanelHandle } from '../../platform/page/HostPage'
import { h } from '../../platform/utils/dom'
import { detectHostTheme } from '../../platform/utils/hostTheme'
import { externalLink } from '../../platform/utils/externalLink'
import { diagitRepository } from '../../platform/DiagitRepository'

export interface PlacementNoticeOptions {
  label: string
  onDismiss: () => void
}

export class PlacementNotice implements PanelHandle {
  private readonly root: HTMLElement

  constructor({ label, onDismiss }: PlacementNoticeOptions) {
    this.root = h('div', { class: 'diagit-placement-notice', role: 'status' }, [
      h('div', {
        class: 'diagit-placement-notice-title',
        text: `${label} view could not be added`,
      }),
      h('div', {
        class: 'diagit-placement-notice-hint',
        text: `This file is a ${label} model, but Diagit cannot find where to show it on this page. The page layout has probably changed.`,
      }),
      h('div', { class: 'diagit-placement-notice-actions' }, [
        externalLink(
          diagitRepository.problemReportUrl(
            `${label} view not added to a file page`,
            `Diagit showed "${label} view could not be added" on a file page.`,
          ),
          { class: 'diagit-placement-notice-report', text: 'Report this problem' },
        ),
        h('button', {
          class: 'diagit-placement-notice-dismiss',
          type: 'button',
          text: 'Dismiss',
          onClick: onDismiss,
        }),
      ]),
    ])
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
