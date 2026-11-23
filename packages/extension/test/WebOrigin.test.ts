import { describe, expect, it } from 'vitest'
import { WebOrigin } from '../src/platform/WebOrigin'

describe('WebOrigin.of', () => {
  it('keeps only the origin of an http(s) url, port included', () => {
    expect(String(WebOrigin.of('https://github.com/o/r?x=1'))).toBe('https://github.com')
    expect(String(WebOrigin.of('http://localhost:4567/a'))).toBe('http://localhost:4567')
  })

  it('returns null for relative, malformed and non-web urls', () => {
    for (const url of ['/o/r', 'not a url', 'null', 'data:text/plain,x', 'file:///etc/passwd']) {
      expect(WebOrigin.of(url)).toBeNull()
    }
  })
})

describe('WebOrigin.known', () => {
  it('throws for a url that has no web origin', () => {
    expect(() => WebOrigin.known('about:blank')).toThrow('Not an http(s) url: about:blank')
  })
})

describe('WebOrigin.equals', () => {
  const github = WebOrigin.known('https://github.com')

  it('compares origins, not urls', () => {
    expect(github.equals(WebOrigin.of('https://github.com/o/r/raw/main/a.bpmn'))).toBe(true)
    expect(github.equals(WebOrigin.of('http://github.com'))).toBe(false)
    expect(github.equals(WebOrigin.of('https://api.github.com'))).toBe(false)
  })

  it('is false for a missing origin', () => {
    expect(github.equals(null)).toBe(false)
    expect(github.equals(undefined)).toBe(false)
  })
})
