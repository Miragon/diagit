import type { PanelHandle } from '../../platform/page/HostPage'
import { h } from '../../platform/utils/dom'
import { detectHostTheme } from '../../platform/utils/hostTheme'

export interface DiffErrorDetails {
  title: string
  message: string
  hint: string
}

export class DiffErrorNotice implements PanelHandle {
  private readonly root: HTMLElement

  constructor(details: DiffErrorDetails) {
    this.root = h('div', { class: 'git-diagram-wrap git-diagram-di-root git-diagram-error' }, [
      h('div', { class: 'git-diagram-error-title', text: details.title }),
      h('div', { class: 'git-diagram-error-hint', text: details.hint }),
      h('div', { class: 'git-diagram-error-detail', text: details.message }),
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
