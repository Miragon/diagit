import type { DiagramViewer } from '../../notations/Notation'
import { FileX } from 'lucide'
import { h } from '../../platform/utils/dom'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import { Notice, type NoticeDetails } from '../../platform/ui/Notice'

const LOADING_LABEL = 'Loading diagram…'

export type CreateViewer<Viewer extends DiagramViewer> = (
  canvas: HTMLElement,
  xml: string,
) => Promise<Viewer>

export class ViewerCanvas<Viewer extends DiagramViewer> {
  private readonly loadingLabel = h('div', {
    class: 'diagit-diff-empty diagit-diff-loading',
    text: LOADING_LABEL,
  })
  readonly element = h('div', { class: 'diagit-diff-canvas' }, [this.loadingLabel])
  private current: Viewer | null = null

  get viewer(): Viewer | null {
    return this.current
  }

  async render(
    createViewer: CreateViewer<Viewer>,
    xml: string | null,
    emptyLabel: string,
    unreadable: (err: unknown) => NoticeDetails,
  ): Promise<Viewer | null> {
    if (!xml) {
      this.element.replaceChildren(this.label(emptyLabel))
      return null
    }
    try {
      this.current = await createViewer(this.element, xml)
    } catch (err) {
      this.showFailure(unreadable(err))
    }
    return this.current
  }

  reveal(): void {
    this.loadingLabel.remove()
  }

  showFailure(failure: NoticeDetails): void {
    this.element.replaceChildren(
      new Notice(failure, 'bar').element,
      h('div', { class: 'diagit-diff-empty diagit-diff-no-diagram' }, [
        lucideIcon(FileX),
        h('span', { text: 'No diagram for this version' }),
      ]),
    )
  }

  destroy(): void {
    this.current?.destroy()
    this.current = null
  }

  private label(text: string): HTMLElement {
    return h('div', { class: 'diagit-diff-empty', text })
  }
}
