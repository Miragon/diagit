import type { DiagramViewer } from '../../notations/Notation'
import { ErrorNotice, type ErrorNoticeDetails } from '../../platform/ui/ErrorNotice'
import { h } from '../../platform/utils/dom'
import type { DiffNotices } from './DiffNotices'

const LOADING_LABEL = 'Loading diagram…'

export type CreateViewer<Viewer extends DiagramViewer> = (
  canvas: HTMLElement,
  xml: string,
) => Promise<Viewer>

export class ViewerCanvas<Viewer extends DiagramViewer> {
  readonly element = h('div', { class: 'diagit-diff-canvas' }, [this.label(LOADING_LABEL)])
  viewer: Viewer | null = null

  async render(
    createViewer: CreateViewer<Viewer>,
    xml: string | null,
    emptyLabel: string,
    notices: DiffNotices,
  ): Promise<Viewer | null> {
    this.element.replaceChildren()
    if (!xml) {
      this.element.append(this.label(emptyLabel))
      return null
    }
    try {
      this.viewer = await createViewer(this.element, xml)
    } catch (err) {
      this.showError(notices.notRendered(err))
    }
    return this.viewer
  }

  showError(details: ErrorNoticeDetails): void {
    this.element.replaceChildren(
      h('div', { class: 'diagit-diff-empty' }, [new ErrorNotice(details).element]),
    )
  }

  destroy(): void {
    this.viewer?.destroy()
    this.viewer = null
  }

  private label(text: string): HTMLElement {
    return h('div', { class: 'diagit-diff-empty', text })
  }
}
