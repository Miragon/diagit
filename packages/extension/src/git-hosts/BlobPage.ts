import type { HttpClient } from '../platform/messaging/HttpClient'
import { notationDetector, type NotationDetector } from '../notations/NotationDetector'

export interface BlobPageConfig {
  blobSegment: string
  rawSegment: string
  contentSelectors: string[]
  insertClimb: string | string[]
}

const LEADING_REF_SEGMENT = /^[^/]+\//

export class BlobPage {
  constructor(
    private readonly config: BlobPageConfig,
    private readonly http: HttpClient,
    private readonly notations: NotationDetector = notationDetector,
  ) {}

  isBlob(location: Pick<Location, 'pathname'>): boolean {
    return location.pathname.includes(this.config.blobSegment)
  }

  showsDiagram(location: Pick<Location, 'pathname'>): boolean {
    return this.isBlob(location) && this.notations.detect(location.pathname) !== null
  }

  rawUrl(location: Location): string {
    const rawPath = location.pathname.replace(this.config.blobSegment, this.config.rawSegment)
    return location.origin + rawPath + location.search
  }

  filePath(location: Location): string {
    const [path] = location.pathname.split(this.config.blobSegment).slice(1)
    if (!path) {
      return location.pathname
    }
    return decodeURIComponent(path.replace(LEADING_REF_SEGMENT, ''))
  }

  fileLoader(location: Location): () => Promise<string> {
    const rawUrl = this.rawUrl(location)
    return () => this.http.fetchText(rawUrl)
  }

  findInsertAnchor(doc: Document): HTMLElement | null {
    const code = this.findCode(doc)
    if (!code) {
      return null
    }
    const climbs = Array.isArray(this.config.insertClimb)
      ? this.config.insertClimb
      : [this.config.insertClimb]
    for (const climb of climbs) {
      const ancestor = code.closest<HTMLElement>(climb)
      if (ancestor) {
        return ancestor
      }
    }
    return code
  }

  private findCode(doc: Document): HTMLElement | null {
    for (const selector of this.config.contentSelectors) {
      const el = doc.querySelector<HTMLElement>(selector)
      if (el) {
        return el
      }
    }
    return null
  }
}
