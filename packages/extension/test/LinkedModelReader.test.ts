import { describe, expect, it, vi } from 'vitest'
import { FetchProxy } from '../src/background/FetchProxy'
import { FetchScope } from '../src/background/FetchScope'
import { LinkedModelReader } from '../src/views/standalone-viewer/LinkedModelReader'

vi.mock('wxt/browser', () => ({ browser: {} }))

const RAW_FILE = 'https://git.example.com/g/p/-/raw/main/order.bpmn'

function textResponse(url: string, text: string, status = 200): Response {
  return { ok: status < 400, status, url, text: async () => text } as unknown as Response
}

function readerWith(fetch: typeof globalThis.fetch, grantedPatterns: string[] = []) {
  const contains = vi.fn(async ({ origins }: { origins: string[] }) =>
    origins.every((origin) => grantedPatterns.includes(origin)),
  )
  const reader = new LinkedModelReader(new FetchProxy([], new FetchScope(), fetch), () => ({
    contains,
  }))
  return { reader, contains }
}

describe('LinkedModelReader.mayRead', () => {
  it('allows an origin Diagit has host access to', async () => {
    const { reader, contains } = readerWith(vi.fn(), ['https://git.example.com/*'])

    expect(await reader.mayRead(RAW_FILE)).toBe(true)
    expect(contains).toHaveBeenCalledWith({ origins: ['https://git.example.com/*'] })
  })

  it('refuses an origin without host access', async () => {
    const { reader } = readerWith(vi.fn(), ['https://git.example.com/*'])

    expect(await reader.mayRead('https://evil.example/order.bpmn')).toBe(false)
    expect(await reader.mayRead('http://git.example.com/g/p/-/raw/main/order.bpmn')).toBe(false)
  })

  it('allows a host on a custom port that was granted with its port', async () => {
    const { reader } = readerWith(vi.fn(), ['https://git.example.com:8443/*'])

    expect(await reader.mayRead('https://git.example.com:8443/g/p/-/raw/main/a.bpmn')).toBe(true)
    expect(await reader.mayRead('https://git.example.com:9443/g/p/-/raw/main/a.bpmn')).toBe(false)
  })

  it('allows a host on a custom port that was granted for every port', async () => {
    const { reader } = readerWith(vi.fn(), ['http://localhost/*'])

    expect(await reader.mayRead('http://localhost:4613/o/r/raw/main/order.bpmn')).toBe(true)
  })

  it('refuses when the browser cannot answer', async () => {
    const contains = vi.fn().mockRejectedValue(new Error('Invalid url pattern'))
    const reader = new LinkedModelReader(new FetchProxy([], new FetchScope()), () => ({ contains }))

    expect(await reader.mayRead(RAW_FILE)).toBe(false)
  })

  it('refuses urls that are no web address without asking the browser', async () => {
    const { reader, contains } = readerWith(vi.fn(), ['https://git.example.com/*'])

    for (const url of ['javascript:alert(1)', 'data:text/xml,<x/>', 'file:///etc/passwd', 'x']) {
      expect(await reader.mayRead(url)).toBe(false)
    }
    expect(contains).not.toHaveBeenCalled()
  })
})

describe('LinkedModelReader.fetchText', () => {
  it('reads the file with the browser login and no token', async () => {
    const fetch = vi.fn().mockResolvedValue(textResponse(RAW_FILE, '<bpmn/>'))
    const { reader } = readerWith(fetch)

    expect(await reader.fetchText(RAW_FILE)).toBe('<bpmn/>')
    expect(fetch).toHaveBeenCalledWith(RAW_FILE, {
      credentials: 'include',
      headers: undefined,
      redirect: 'manual',
    })
  })

  it('refuses a response from another origin', async () => {
    const fetch = vi.fn().mockResolvedValue(textResponse('https://evil.example/x', '<bpmn/>'))
    const { reader } = readerWith(fetch)

    await expect(reader.fetchText(RAW_FILE)).rejects.toThrow('Refused the redirect')
  })

  it('reports the HTTP status of a failed download', async () => {
    const fetch = vi.fn().mockResolvedValue(textResponse(RAW_FILE, '', 404))
    const { reader } = readerWith(fetch)

    await expect(reader.fetchText(RAW_FILE)).rejects.toMatchObject({ status: 404 })
  })
})
