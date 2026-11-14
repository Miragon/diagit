import type { ChangedFile } from '../DiffSource'
import { notationDetector, type NotationDetector } from '../../notations/NotationDetector'
import { isRendered } from '../../platform/utils/isRendered'
import { githubSelectors } from './githubSelectors'
import { stripBidiMarks } from '../../platform/utils/stripBidiMarks'

const RENAME_ARROW = '→'

export class GithubDiffScanner {
  constructor(private readonly notations: NotationDetector = notationDetector) {}

  scan(doc: Document): ChangedFile[] {
    return this.diagramFileRoots(doc).flatMap(({ root, path }) => {
      const code = this.codeOf(root)
      if (!code) {
        return []
      }
      return {
        path,
        anchor: code,
        append: this.hasFramedCode(root) ? ('first' as const) : ('before' as const),
        fileRoot: root,
        isCollapsed: () => !isRendered(this.codeOf(root)),
      }
    })
  }

  recognizedPaths(doc: Document): string[] {
    return this.diagramFileRoots(doc).map(({ path }) => path)
  }

  private diagramFileRoots(doc: Document): { root: HTMLElement; path: string }[] {
    return [...new Set(this.fileRoots(doc))].flatMap((root) => {
      const path = this.filePathOf(root)
      return path && this.notations.isDiffable(path) ? { root, path } : []
    })
  }

  private fileRoots(doc: Document): HTMLElement[] {
    const legacy = [...doc.querySelectorAll<HTMLElement>(githubSelectors.diff.fileRootLegacy)]
    const modern = [...doc.querySelectorAll<HTMLElement>(githubSelectors.diff.diffHeaderWrapper)]
      .map((header) => header.closest<HTMLElement>(githubSelectors.diff.modernRootClimb))
      .filter((el): el is HTMLElement => el !== null)
    const regions = [...doc.querySelectorAll<HTMLElement>(githubSelectors.diff.fileRegion)].filter(
      (region) => !modern.some((root) => root.contains(region) || region.contains(root)),
    )
    return [...legacy, ...modern, ...regions]
  }

  private filePathOf(root: HTMLElement): string | null {
    const attribute = githubSelectors.diff.pathAttrs
      .map((name) => root.getAttribute(name))
      .find((value): value is string => !!value)
    if (attribute) {
      return attribute
    }
    const modern = this.modernFilePath(root)
    if (modern) {
      return modern
    }
    const info = root.querySelector(githubSelectors.diff.legacyPathEl)
    return info?.getAttribute('title') || info?.textContent?.trim() || null
  }

  private modernFilePath(root: HTMLElement): string | null {
    const headingId = root.getAttribute('aria-labelledby')
    const heading = headingId ? root.ownerDocument.getElementById(headingId) : null
    const raw =
      heading?.textContent ?? root.querySelector(githubSelectors.diff.modernHeading)?.textContent
    return raw ? this.headSidePath(raw) || null : null
  }

  private headSidePath(headerText: string): string {
    const clean = stripBidiMarks(headerText).trim()
    return (clean.split(RENAME_ARROW).pop() ?? clean).trim()
  }

  private hasFramedCode(root: HTMLElement): boolean {
    return root.querySelector(githubSelectors.diff.modernCode) !== null
  }

  private codeOf(root: HTMLElement): HTMLElement | null {
    const modern = root.querySelector<HTMLElement>(githubSelectors.diff.modernCode)
    if (modern) {
      return modern.parentElement ?? modern
    }
    return root.querySelector<HTMLElement>(githubSelectors.diff.legacyCode)
  }
}
