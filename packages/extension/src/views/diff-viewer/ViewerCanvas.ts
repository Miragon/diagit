import type { DiagramViewer } from '../../notations/Notation'
import { FileX } from 'lucide'
import { h } from '../../platform/utils/dom'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import type { PaneFailure } from './DiffNotices'
import { PaneFailureBanner } from './PaneFailureBanner'

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
    unreadable: (err: unknown) => PaneFailure,
  ): Promise<Viewer | null> {
    this.element.replaceChildren()
    if (!xml) {
      this.element.append(this.label(emptyLabel))
      return null
    }
    try {
      this.viewer = await createViewer(this.element, xml)
    } catch (err) {
      this.showFailure(unreadable(err))
    }
    return this.viewer
  }

  showFailure(failure: PaneFailure): void {
    this.element.replaceChildren(
      new PaneFailureBanner(failure).element,
      h('div', { class: 'diagit-diff-empty diagit-diff-no-diagram' }, [
        lucideIcon(FileX),
        h('span', { text: 'No diagram for this version' }),
      ]),
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
