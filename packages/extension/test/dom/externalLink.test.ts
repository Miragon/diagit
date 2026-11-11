import { describe, expect, it } from 'vitest'
import { externalLink } from '../../src/platform/utils/externalLink'

describe('externalLink', () => {
  it('opens the url in a new tab without opener or referrer', () => {
    const link = externalLink('https://example.com/docs')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('https://example.com/docs')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('sets class and text', () => {
    const link = externalLink('https://example.com', { class: 'btn', text: 'Docs' })
    expect(link.className).toBe('btn')
    expect(link.textContent).toBe('Docs')
  })

  it('appends element and string children', () => {
    const icon = document.createElement('span')
    const link = externalLink('https://example.com', {}, [icon, 'Report a bug'])
    expect(link.firstChild).toBe(icon)
    expect(link.textContent).toBe('Report a bug')
  })
})
