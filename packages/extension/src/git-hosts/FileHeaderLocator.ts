import { notationDetector, type NotationDetector } from '../notations/NotationDetector'
import { isRendered } from '../platform/utils/isRendered'
import { stripBidiMarks } from '../platform/utils/stripBidiMarks'

const REGIONS_THAT_ONLY_MENTION_FILES =
  '[role="tree"], [role="dialog"], [role="listbox"], [role="menu"], [role="tooltip"], [popover], nav, [contenteditable="true"]'
const HEADER_LIKE =
  'header, [class*="header" i], [class*="title" i], [data-testid*="header" i], [data-testid*="title" i]'
const MAX_HEADER_CLIMB = 4

export interface VisibleFileHeader {
  path: string
  header: HTMLElement
}

export class FileHeaderLocator {
  private readonly regionsThatOnlyMentionFiles: string

  constructor(
    hostRegionsThatOnlyMentionFiles: string,
    private readonly notations: NotationDetector = notationDetector,
  ) {
    this.regionsThatOnlyMentionFiles = `${REGIONS_THAT_ONLY_MENTION_FILES}, ${hostRegionsThatOnlyMentionFiles}`
  }

  mentionsDiagram(doc: Document): boolean {
    return this.notations.mentionsDiffable(doc.body.textContent ?? '')
  }

  findVisible(doc: Document, paths: string[]): VisibleFileHeader[] {
    const wanted = new Set(paths)
    const headerByPath = new Map<string, HTMLElement>()
    if (!wanted.size) return []
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const path = stripBidiMarks(node.textContent ?? '').trim()
      const label = node.parentElement
      if (!wanted.has(path) || headerByPath.has(path) || !label) continue
      if (!isRendered(label) || label.closest(this.regionsThatOnlyMentionFiles)) continue
      headerByPath.set(path, this.headerAround(label))
    }
    return [...headerByPath].map(([path, header]) => ({ path, header }))
  }

  private headerAround(label: HTMLElement): HTMLElement {
    let header = label
    let ancestor: HTMLElement | null = label
    for (let level = 0; level < MAX_HEADER_CLIMB && ancestor; level++) {
      if (ancestor.matches(HEADER_LIKE)) header = ancestor
      ancestor = ancestor.parentElement
    }
    return header
  }
}
