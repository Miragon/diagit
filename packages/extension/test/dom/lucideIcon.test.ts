import { Star } from 'lucide'
import { describe, expect, it } from 'vitest'
import { lucideIcon } from '../../src/platform/utils/lucideIcon'

describe('lucideIcon', () => {
  it('creates a decorative svg with the design system stroke width', () => {
    const svg = lucideIcon(Star)
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.getAttribute('stroke-width')).toBe('2.5')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.hasAttribute('class')).toBe(false)
  })

  it('sets the given class name', () => {
    const svg = lucideIcon(Star, 'diagit-toast-icon')
    expect(svg.getAttribute('class')).toBe('diagit-toast-icon')
  })
})
