import { describe, expect, it } from 'vitest'
import { ViewerHeader } from '../../src/platform/ui/ViewerHeader'

describe('ViewerHeader', () => {
  it('names the viewer and links to the options page', () => {
    const header = new ViewerHeader().element

    expect(header.querySelector('h1')?.textContent).toBe('Diagit')
    expect(header.querySelector('.page-subtitle')?.textContent).toBe('Viewer')
    const [link] = header.querySelectorAll('a')
    expect(link?.textContent).toBe('Options')
    expect(link?.getAttribute('href')).toBe('/options.html')
    expect(link?.querySelector('svg')).not.toBeNull()
  })
})
