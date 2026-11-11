import { NOTATION_CATALOG } from './notationCatalog'
import type { NotationDescriptor } from './NotationDescriptor'

const LAST_PATH_SEGMENT = /[^/]*$/

export class NotationDetector {
  constructor(private readonly catalog: readonly NotationDescriptor[] = NOTATION_CATALOG) {}

  detect(path: string | null | undefined): NotationDescriptor | null {
    const fileName = path ? LAST_PATH_SEGMENT.exec(path)![0].toLowerCase() : ''
    const hasExtension = (extension: string) =>
      fileName.length > extension.length + 1 && fileName.endsWith(`.${extension}`)
    return this.catalog.find((notation) => notation.extensions.some(hasExtension)) ?? null
  }

  isDiffable(path: string | null | undefined): boolean {
    return this.detect(path)?.diffable ?? false
  }

  mentionsDiffable(text: string): boolean {
    const lowerText = text.toLowerCase()
    return this.catalog
      .filter((notation) => notation.diffable)
      .some((notation) =>
        notation.extensions.some((extension) => lowerText.includes(`.${extension}`)),
      )
  }

  fileExtensions(): string[] {
    return this.catalog.flatMap((notation) =>
      notation.extensions.map((extension) => `.${extension}`),
    )
  }
}

export const notationDetector = new NotationDetector()
