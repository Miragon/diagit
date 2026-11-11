const BIDI_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu

export function stripBidiMarks(text: string): string {
  return text.replace(BIDI_MARKS, '')
}
