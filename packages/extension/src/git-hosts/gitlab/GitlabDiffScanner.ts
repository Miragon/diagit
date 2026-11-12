import type { ChangedFile } from '../DiffSource'
import { DIFF_PANEL_TAG } from '../../platform/injectedElements'
import { notationDetector, type NotationDetector } from '../../notations/NotationDetector'
import { hasRenderedBox } from '../../platform/utils/isRendered'
import { gitlabSelectors } from './gitlabSelectors'

export class GitlabDiffScanner {
  constructor(private readonly notations: NotationDetector = notationDetector) {}

  scan(doc: Document): ChangedFile[] {
    const files: ChangedFile[] = []
    doc.querySelectorAll<HTMLElement>(gitlabSelectors.diff.fileRoot).forEach((root) => {
      const path = this.filePathOf(root)
      if (!path || !this.notations.isDiffable(path)) {
        return
      }
      files.push({
        path,
        anchor: this.contentOf(root),
        append: 'first',
        fileRoot: root,
        isCollapsed: () => this.isCollapsed(root),
      })
    })
    return files
  }

  private isCollapsed(root: HTMLElement): boolean {
    if (root.querySelector(gitlabSelectors.diff.rapidDiffClosedBody)) {
      return true
    }
    const content = root.querySelector<HTMLElement>(gitlabSelectors.diff.collapseContent)
    if (!content) {
      return true
    }
    const hostContent = Array.from(content.children).filter(
      (child) => child.localName !== DIFF_PANEL_TAG,
    )
    return !hostContent.some(hasRenderedBox)
  }

  private filePathOf(root: HTMLElement): string | null {
    return this.rapidDiffPathOf(root) ?? this.legacyDiffPathOf(root)
  }

  private rapidDiffPathOf(root: HTMLElement): string | null {
    const fileData = root.getAttribute(gitlabSelectors.diff.rapidDiffFileData)
    if (!fileData) {
      return null
    }
    try {
      const { new_path, old_path } = JSON.parse(fileData) as {
        new_path?: string
        old_path?: string
      }
      return new_path || old_path || null
    } catch {
      return null
    }
  }

  private legacyDiffPathOf(root: HTMLElement): string | null {
    const attribute = gitlabSelectors.diff.pathAttr
    const withData = root.matches(attribute) ? root : root.querySelector(attribute)
    if (withData) {
      return withData.getAttribute('data-path')
    }
    const titleEl = root.querySelector(gitlabSelectors.diff.titleEl)
    if (titleEl) {
      return titleEl.getAttribute('title') || titleEl.textContent?.trim() || null
    }
    return null
  }

  private contentOf(root: HTMLElement): HTMLElement {
    const explicit = root.querySelector<HTMLElement>(gitlabSelectors.diff.contentExplicit)
    if (explicit) {
      return explicit
    }
    const title = root.querySelector<HTMLElement>(gitlabSelectors.diff.titleForSibling)
    const next = title?.nextElementSibling
    if (next instanceof HTMLElement) {
      return next
    }
    return root
  }
}
