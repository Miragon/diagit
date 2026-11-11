import { describe, expect, it } from 'vitest'
import { ExtensionEnvironment } from '../src/platform/ExtensionEnvironment'

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.60 Safari/537.36'
const EDGE_UA = `${CHROME_UA} Edg/142.0.3595.53`
const FIREFOX_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0'

describe('ExtensionEnvironment', () => {
  it.each([
    [CHROME_UA, 'Chrome 142, extension 0.3.1'],
    [EDGE_UA, 'Edge 142, extension 0.3.1'],
    [FIREFOX_UA, 'Firefox 145, extension 0.3.1'],
    ['curl/8.0', 'Unknown browser, extension 0.3.1'],
  ])('names browser and extension version for %s', (userAgent, description) => {
    expect(new ExtensionEnvironment('0.3.1', userAgent).describe()).toBe(description)
  })
})
