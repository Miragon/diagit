import { describe, expect, it } from 'vitest'
import { DebugInfo } from '../src/views/options/DebugInfo'

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.60 Safari/537.36'
const EDGE_UA = `${CHROME_UA} Edg/142.0.3595.53`
const FIREFOX_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0'

describe('DebugInfo', () => {
  it.each([
    [CHROME_UA, 'Chrome 142, extension 0.3.1'],
    [EDGE_UA, 'Edge 142, extension 0.3.1'],
    [FIREFOX_UA, 'Firefox 145, extension 0.3.1'],
    ['curl/8.0', 'Unknown browser, extension 0.3.1'],
  ])('names browser and extension version for %s', (userAgent, environment) => {
    expect(new DebugInfo('0.3.1', userAgent).environment()).toBe(environment)
  })

  it('opens the bug template with the environment filled in', () => {
    const url = new URL(new DebugInfo('0.3.1', CHROME_UA).bugReportUrl())

    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/Miragon/diagit/issues/new')
    expect(url.searchParams.get('template')).toBe('fix.yml')
    expect(url.searchParams.get('env')).toBe('Chrome 142, extension 0.3.1')
  })

  it('describes the setup without URLs, domains or tokens', () => {
    const text = new DebugInfo('0.3.1', CHROME_UA).text({
      selfHostedInstances: 2,
      githubConnected: true,
    })

    expect(text).toBe(
      [
        'Diagit 0.3.1',
        'Browser: Chrome 142',
        'Self-hosted instances: 2',
        'GitHub access: connected',
      ].join('\n'),
    )
  })
})
