import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SelfHostedHost } from '../../src/git-hosts/self-hosted/SelfHostedHostStore'
import { SelfHostedHostsSection } from '../../src/views/options/SelfHostedHostsSection'

vi.mock('wxt/browser', () => ({ browser: {} }))

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountedWith(instances: SelfHostedHost[]): Promise<HTMLElement> {
  const access = { list: () => Promise.resolve(instances) }
  new SelfHostedHostsSection(access as never).mount(document.body)
  await vi.waitFor(() => expect(document.querySelector('.card-row')).not.toBeNull())
  return document.querySelector<HTMLElement>('section.card')!
}

function rowTexts(card: HTMLElement): string[] {
  return [...card.querySelectorAll('.card-row')].map((row) => row.textContent ?? '')
}

describe('SelfHostedHostsSection', () => {
  it('lists each instance as a card row', async () => {
    const card = await mountedWith([
      { origin: 'https://gitlab.example.com' },
      { origin: 'https://git.example.org' },
    ])

    expect(card.querySelector('.card-head .count')!.textContent).toBe('2 instances')
    expect(rowTexts(card)).toEqual([
      'https://gitlab.example.comRemove',
      'https://git.example.orgRemove',
    ])
  })

  it('shows the empty state as a card row', async () => {
    const card = await mountedWith([])

    expect(card.querySelector('.count')!.textContent).toBe('0 instances')
    expect(rowTexts(card)).toEqual(['No self-hosted instances added yet.'])
  })

  it('places the add form in the card footer', async () => {
    const card = await mountedWith([{ origin: 'https://gitlab.example.com' }])
    const footer = card.querySelector('.card-foot')!

    expect(card.querySelector('.count')!.textContent).toBe('1 instance')
    expect([...footer.children].map((child) => child.tagName)).toEqual(['INPUT', 'BUTTON'])
    expect(footer.querySelector('button')!.textContent).toBe('Add instance')
  })
})
