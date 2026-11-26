import type { ChangedFile } from '../DiffSource'
import { CODE_HIDDEN_ATTRIBUTE, DIFF_PANEL_TAG } from '../../platform/injectedElements'
import { notationDetector, type NotationDetector } from '../../notations/NotationDetector'
import { hasRenderedBox } from '../../platform/utils/isRendered'
import { gitlabSelectors } from './gitlabSelectors'
import { isLinkedInto } from '../utils/fileLink'

export class GitlabDiffScanner {
  constructor(private readonly notations: NotationDetector = notationDetector) {}

  hiddenCodeCss(hiddenPanel: string): string {
    return `${hiddenPanel} ~ * {\n  display: none !important;\n}`
  }

  scan(doc: Document): ChangedFile[] {
    const files: ChangedFile[] = []
    doc.querySelectorAll<HTMLElement>(gitlabSelectors.diff.fileRoot).forEach((root) => {
      const path = this.filePathOf(root)
      if (!path || !this.notations.isDiffable(path)) {
        return
      }
      const content = this.contentOf(root)
      files.push({
        path,
        anchor: content,
        append: 'first',
        fileRoot: root,
        isCollapsed: () => this.isCollapsed(root),
        showsOtherFile: () => this.showsOtherFile(root, path),
        hostCode: () => (content === root ? [] : this.hostContentOf(content)),
        reviewCommentCount: () => root.querySelectorAll(gitlabSelectors.diff.reviewNote).length,
        isLinkedFrom: (hash: string) => isLinkedInto(root, hash, [root.id]),
      })
    })
    return files
  }

  private showsOtherFile(root: HTMLElement, scannedPath: string): boolean {
    const currentPath = this.filePathOf(root)
    return currentPath !== null && currentPath !== scannedPath
  }

  private isCollapsed(root: HTMLElement): boolean {
    if (root.querySelector(gitlabSelectors.diff.rapidDiffClosedBody)) {
      return true
    }
    const content = root.querySelector<HTMLElement>(gitlabSelectors.diff.collapseContent)
    if (!content) {
      return true
    }
    if (content.querySelector(`:scope > ${DIFF_PANEL_TAG}[${CODE_HIDDEN_ATTRIBUTE}]`)) {
      return !hasRenderedBox(content)
    }
    return !this.hostContentOf(content).some(hasRenderedBox)
  }

  private hostContentOf(content: HTMLElement): HTMLElement[] {
    return Array.from(content.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.localName !== DIFF_PANEL_TAG,
    )
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
