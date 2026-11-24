import { describe, expect, it } from 'vitest'
import { parseExcalidrawScene } from '../src/notations/excalidraw/utils/parseExcalidrawScene'
import { ModelRejected } from '../src/platform/ModelRejected'

describe('parseExcalidrawScene', () => {
  it('returns the scene of a .excalidraw file', () => {
    const source = JSON.stringify({ type: 'excalidraw', elements: [{ id: 'box' }], files: {} })

    expect(parseExcalidrawScene(source).elements).toEqual([{ id: 'box' }])
  })

  it('keeps only files embedded as base64 image data URLs, so rendering never fetches a URL', () => {
    const embedded = { id: 'embedded', dataURL: 'data:image/svg+xml;base64,PHN2Zy8+' }
    const source = JSON.stringify({
      type: 'excalidraw',
      elements: [],
      files: {
        embedded,
        remote: { id: 'remote', dataURL: 'https://attacker.example/pixel.png' },
        protocolRelative: { id: 'protocolRelative', dataURL: '//attacker.example/pixel.png' },
        notBase64: { id: 'notBase64', dataURL: 'data:image/svg+xml,<svg/>' },
        notAnImage: { id: 'notAnImage', dataURL: 'data:text/html;base64,PGgxPg==' },
        missing: { id: 'missing' },
        malformed: 'https://attacker.example/pixel.png',
      },
    })

    expect(parseExcalidrawScene(source).files).toEqual({ embedded })
  })

  it('treats a scene without files as having none', () => {
    const source = JSON.stringify({ type: 'excalidraw', elements: [] })

    expect(parseExcalidrawScene(source).files).toEqual({})
  })

  it.each(['{"type":"excalidraw"}', 'null', '{"type":"other","elements":[]}'])(
    'rejects JSON that is not an Excalidraw scene as unsupported: %s',
    (source) => {
      expect(rejectionOf(source)).toBe('unsupported')
    },
  )

  it('rejects text that is not JSON as malformed', () => {
    expect(rejectionOf('not json')).toBe('malformed')
  })
})

function rejectionOf(source: string): string | undefined {
  try {
    parseExcalidrawScene(source)
  } catch (err) {
    return err instanceof ModelRejected ? err.reason : undefined
  }
  return undefined
}
