import { describe, expect, it } from 'vitest'
import { OptionsPageChrome } from '../../src/views/options/OptionsPageChrome'

const CHROME_ID = 'bjphfmmlciflmdcnpfpbnkmgnkiabfdh'
const UNPACKED_ID = 'unpacked-build-id'

function linkTexts(element: HTMLElement): Record<string, string> {
  return Object.fromEntries(
    [...element.querySelectorAll('a')].map((link) => [link.textContent, link.href]),
  )
}

describe('options page chrome', () => {
  it('names the extension and its version in the header', () => {
    const header = new OptionsPageChrome('0.3.1', CHROME_ID).header()

    expect(header.querySelector('h1')?.textContent).toBe('Diagit')
    expect(header.textContent).toContain('v0.3.1')
  })

  it('offers a star and the store rating of the current browser', () => {
    const links = linkTexts(new OptionsPageChrome('0.3.1', CHROME_ID).supportCard())

    expect(links['Star on GitHub']).toBe('https://github.com/Miragon/diagit')
    expect(links['Rate Diagit']).toContain('chromewebstore.google.com')
  })

  it('leaves out the store rating when the build has no store listing', () => {
    const links = linkTexts(new OptionsPageChrome('0.3.1', UNPACKED_ID).supportCard())

    expect(Object.keys(links)).toEqual(['Star on GitHub'])
  })

  it('links docs, feature requests, privacy and source code in the footer', () => {
    const links = linkTexts(new OptionsPageChrome('0.3.1', CHROME_ID).footer())

    expect(links).toEqual({
      Docs: 'https://miragon.github.io/diagit/',
      'Suggest a feature': 'https://github.com/Miragon/diagit/issues/new?template=feat.yml',
      Privacy: 'https://miragon.github.io/diagit/privacy.html',
      'Source code': 'https://github.com/Miragon/diagit',
    })
  })
})
