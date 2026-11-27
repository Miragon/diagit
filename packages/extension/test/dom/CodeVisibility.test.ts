import { afterEach, describe, expect, it } from 'vitest'
import { HostPage } from '../../src/platform/page/HostPage'
import { CODE_HIDDEN_ATTRIBUTE } from '../../src/platform/injectedElements'
import type { CodeVisibility, FileCode } from '../../src/platform/ui/CodeVisibility'
import { FakeContentScriptContext } from '../fakes/FakeContentScriptContext'
import { MemoryStorageArea } from '../fakes/MemoryStorageArea'
import { codeStartSettingIn, codeVisibilityIn } from '../fakes/codeVisibilityIn'

const context = new FakeContentScriptContext()

afterEach(() => {
  context.invalidate()
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

function fileCode(overrides: Partial<FileCode> = {}): FileCode & { readonly hidden: boolean } {
  return {
    key: 'flows/order.bpmn',
    hostCode: [],
    isLinked: false,
    panel: document.createElement('div'),
    get hidden() {
      return this.panel.hasAttribute(CODE_HIDDEN_ATTRIBUTE)
    },
    ...overrides,
  }
}

async function started(visibility: CodeVisibility): Promise<CodeVisibility> {
  await visibility.start(new HostPage(context.ctx), '')
  return visibility
}

async function loadedWithStart(start: 'shown' | 'hidden') {
  const area = new MemoryStorageArea()
  await codeStartSettingIn(area).write(start)
  const visibility = await started(codeVisibilityIn(area))
  return { area, visibility }
}

describe('CodeVisibility', () => {
  it('starts with the code shown by default', async () => {
    const visibility = await started(codeVisibilityIn())
    const file = fileCode()

    visibility.toggleFor(file)

    expect(file.hidden).toBe(false)
  })

  it('starts with the diagram alone when the options say so', async () => {
    const { visibility } = await loadedWithStart('hidden')
    const file = fileCode()

    const toggle = visibility.toggleFor(file)

    expect(file.hidden).toBe(true)
    expect(toggle.element.getAttribute('aria-pressed')).toBe('false')
  })

  it('starts with the code shown for a file a link points into', async () => {
    const { visibility } = await loadedWithStart('hidden')
    const file = fileCode({ isLinked: true })

    visibility.toggleFor(file)

    expect(file.hidden).toBe(false)
  })

  it('shows the code once review comments appear, also late', async () => {
    const { visibility } = await loadedWithStart('hidden')
    const file = fileCode()
    const toggle = visibility.toggleFor(file)

    toggle.countReviewComments(0)
    expect(file.hidden).toBe(true)

    toggle.countReviewComments(2)
    expect(file.hidden).toBe(false)
  })

  it('counts the review comments the person hid and never hides the code itself', async () => {
    const visibility = await started(codeVisibilityIn())
    const file = fileCode()
    const toggle = visibility.toggleFor(file)
    toggle.countReviewComments(2)
    const count = () => toggle.element.querySelector<HTMLElement>('.diagit-code-count')!

    expect(count().hidden).toBe(true)

    toggle.element.click()
    toggle.countReviewComments(3)

    expect(file.hidden).toBe(true)
    expect(count().hidden).toBe(false)
    expect(count().textContent).toBe('3')
    expect(toggle.element.getAttribute('aria-description')).toBe('3 review comments hidden')
  })

  it('adds the rule that hides the code to the page', async () => {
    await codeVisibilityIn().start(new HostPage(context.ctx), '.panel + .code { display: none }')

    expect(document.head.textContent).toContain('.panel + .code')
  })

  it('stops following the start once the page is invalidated', async () => {
    const area = new MemoryStorageArea()
    const visibility = await started(codeVisibilityIn(area))
    const file = fileCode()
    document.body.append(visibility.toggleFor(file).element)

    context.invalidate()
    await codeStartSettingIn(area).write('hidden')

    expect(file.hidden).toBe(false)
  })

  it('keeps the choice for a file when its panel mounts again', async () => {
    const visibility = await started(codeVisibilityIn())
    visibility.toggleFor(fileCode()).element.click()
    const remounted = fileCode()

    const toggle = visibility.toggleFor(remounted)

    expect(remounted.hidden).toBe(true)
    expect(toggle.element.getAttribute('aria-pressed')).toBe('false')
  })

  describe('when the start changes on the options page', () => {
    it('follows it on open panels the person did not touch', async () => {
      const { area, visibility } = await loadedWithStart('shown')
      const untouched = fileCode({ key: 'a.bpmn' })
      const chosen = fileCode({ key: 'b.bpmn' })
      const untouchedToggle = visibility.toggleFor(untouched)
      const chosenToggle = visibility.toggleFor(chosen)
      document.body.append(untouchedToggle.element, chosenToggle.element)
      chosenToggle.element.click()
      chosenToggle.element.click()

      await codeStartSettingIn(area).write('hidden')

      expect(untouched.hidden).toBe(true)
      expect(chosen.hidden).toBe(false)
    })

    it('keeps the code of a file with review comments', async () => {
      const { area, visibility } = await loadedWithStart('shown')
      const file = fileCode()
      const toggle = visibility.toggleFor(file)
      document.body.append(toggle.element)
      toggle.countReviewComments(1)

      await codeStartSettingIn(area).write('hidden')

      expect(file.hidden).toBe(false)
    })

    it('uses the new start for panels that mount afterwards', async () => {
      const { area, visibility } = await loadedWithStart('shown')

      await codeStartSettingIn(area).write('hidden')
      const file = fileCode()
      visibility.toggleFor(file)

      expect(file.hidden).toBe(true)
    })
  })
})

describe('CodeStartSetting', () => {
  it('reads an unknown stored value as the default start', async () => {
    const area = new MemoryStorageArea()
    area.items.codeUnderDiagrams = 'sideways'

    expect(await codeStartSettingIn(area).read()).toBe('shown')
  })
})
