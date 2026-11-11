import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SelfHostedHost } from '../../src/git-hosts/self-hosted/SelfHostedHostStore'
import { SelfHostedHostsSection } from '../../src/views/options/SelfHostedHostsSection'

vi.mock('wxt/browser', () => ({ browser: {} }))

const hosts = {
  all: () => [{ id: 'gitlab', label: 'GitLab' }],
  hostById: (id: string | undefined) => (id === 'gitlab' ? { label: 'GitLab' } : undefined),
}

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountedWith(instances: SelfHostedHost[]): Promise<HTMLTableElement> {
  const access = { list: () => Promise.resolve(instances) }
  new SelfHostedHostsSection(access as never, hosts as never).mount(document.body)
  await vi.waitFor(() => expect(document.querySelector('tbody tr')).not.toBeNull())
  return document.querySelector('table')!
}

function cellTexts(table: HTMLTableElement, selector: string): string[][] {
  return [...table.querySelectorAll(selector)].map((row) =>
    [...row.children].map((cell) => cell.textContent ?? ''),
  )
}

describe('SelfHostedHostsSection', () => {
  it('lists each instance as a table row with its type', async () => {
    const table = await mountedWith([
      { origin: 'https://gitlab.example.com', type: 'gitlab' },
      { origin: 'https://git.example.org' },
    ])

    expect(cellTexts(table, 'thead tr')).toEqual([['Instance', 'Type', 'Actions']])
    expect(cellTexts(table, 'tbody tr')).toEqual([
      ['https://gitlab.example.com', 'GitLab', 'Remove'],
      ['https://git.example.org', 'Self-hosted', 'Remove'],
    ])
  })

  it('shows the empty state inside the table', async () => {
    const table = await mountedWith([])

    expect(cellTexts(table, 'tbody tr')).toEqual([['No self-hosted instances added yet.']])
  })
})
