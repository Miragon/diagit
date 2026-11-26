import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeStartSection } from '../../src/views/options/CodeStartSection'
import { MemoryStorageArea } from '../fakes/MemoryStorageArea'
import { codeStartSettingIn } from '../fakes/codeVisibilityIn'

afterEach(() => {
  document.body.innerHTML = ''
})

const radio = (value: string) =>
  document.querySelector<HTMLInputElement>(`input[name="code-start"][value="${value}"]`)!

describe('CodeStartSection', () => {
  it('checks the stored start, with the code shown as the default', async () => {
    new CodeStartSection(codeStartSettingIn(new MemoryStorageArea())).mount(document.body)

    await vi.waitFor(() => expect(radio('shown').checked).toBe(true))
    expect(radio('hidden').checked).toBe(false)
    expect(document.querySelector('h2')!.textContent).toBe('Code under diagrams')
  })

  it('stores the start the person picks', async () => {
    const area = new MemoryStorageArea()
    new CodeStartSection(codeStartSettingIn(area)).mount(document.body)

    radio('hidden').click()

    await vi.waitFor(() => expect(area.items.codeUnderDiagrams).toBe('hidden'))
  })

  it('follows a start changed in another options tab', async () => {
    const area = new MemoryStorageArea()
    new CodeStartSection(codeStartSettingIn(area)).mount(document.body)

    await codeStartSettingIn(area).write('hidden')

    expect(radio('hidden').checked).toBe(true)
  })
})
