import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SelfHostedHost } from '../../src/git-hosts/self-hosted/SelfHostedHostStore'
import { SelfHostedHostsSection } from '../../src/views/options/SelfHostedHostsSection'

vi.mock('wxt/browser', () => ({ browser: {} }))

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountedWith(instances: SelfHostedHost[]): Promise<HTMLTableElement> {
  const access = { list: () => Promise.resolve(instances) }
  new SelfHostedHostsSection(access as never).mount(document.body)
  await vi.waitFor(() => expect(document.querySelector('tbody tr')).not.toBeNull())
  return document.querySelector('table')!
}

function cellTexts(table: HTMLTableElement, selector: string): string[][] {
  return [...table.querySelectorAll(selector)].map((row) =>
    [...row.children].map((cell) => cell.textContent ?? ''),
  )
}

describe('SelfHostedHostsSection', () => {
  it('lists each instance as a table row', async () => {
    const table = await mountedWith([
      { origin: 'https://gitlab.example.com' },
      { origin: 'https://git.example.org' },
    ])

    expect(cellTexts(table, 'thead tr')).toEqual([['Instance', '2 instances']])
    expect(cellTexts(table, 'tbody tr')).toEqual([
      ['https://gitlab.example.com', 'Remove'],
      ['https://git.example.org', 'Remove'],
    ])
  })

  it('shows the empty state inside the table', async () => {
    const table = await mountedWith([])

    expect(cellTexts(table, 'thead tr')).toEqual([['Instance', '0 instances']])
    expect(cellTexts(table, 'tbody tr')).toEqual([['No self-hosted instances added yet.']])
  })

  it('places the add form in the footer row on the same columns', async () => {
    const table = await mountedWith([{ origin: 'https://gitlab.example.com' }])
    const footerCells = [...table.querySelectorAll('tfoot td')]

    expect(table.querySelector('thead th:last-child')?.textContent).toBe('1 instance')
    expect(footerCells.map((cell) => cell.firstElementChild?.tagName)).toEqual(['INPUT', 'BUTTON'])
  })
})
