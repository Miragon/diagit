import { describe, expect, it } from 'vitest'
import { ExtensionEnvironment } from '../src/platform/ExtensionEnvironment'
import { DebugInfo } from '../src/views/options/DebugInfo'

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.60 Safari/537.36'

describe('DebugInfo', () => {
  it('opens the bug template with the environment filled in', () => {
    const url = new URL(new DebugInfo(new ExtensionEnvironment('0.3.1', CHROME_UA)).bugReportUrl())

    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/Miragon/diagit/issues/new')
    expect(url.searchParams.get('template')).toBe('fix.yml')
    expect(url.searchParams.get('env')).toBe('Chrome 142, extension 0.3.1')
  })

  it('describes the setup without URLs, domains or tokens', () => {
    const text = new DebugInfo(new ExtensionEnvironment('0.3.1', CHROME_UA)).text({
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
