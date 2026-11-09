import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileHeaderLocator } from '../../src/git-hosts/FileHeaderLocator'

const locator = new FileHeaderLocator('.markdown-body')

function render(html: string): Document {
  document.body.innerHTML = html
  return document
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FileHeaderLocator', () => {
  it('finds the header around a visible full path', () => {
    const doc = render(`
      <section>
        <div class="file-header"><span><a>flows/order.bpmn</a></span></div>
        <table></table>
      </section>`)

    const found = locator.findVisible(doc, ['flows/order.bpmn'])

    expect(found.map(({ path, header }) => [path, header.className])).toEqual([
      ['flows/order.bpmn', 'file-header'],
    ])
  })

  it('ignores the file tree and the host regions that only mention files', () => {
    const doc = render(`
      <div role="tree"><div class="tree-item-title">flows/order.bpmn</div></div>
      <div class="markdown-body"><p><code>flows/order.bpmn</code></p></div>`)

    expect(locator.findVisible(doc, ['flows/order.bpmn'])).toEqual([])
  })

  it('ignores a path the host has not rendered yet', () => {
    const doc = render('<div class="file-header" hidden>flows/order.bpmn</div>')
    vi.spyOn(doc.querySelector('.file-header')!, 'getClientRects').mockReturnValue([] as never)

    expect(locator.findVisible(doc, ['flows/order.bpmn'])).toEqual([])
  })

  it('tells whether the page mentions a diagram file at all', () => {
    expect(locator.mentionsDiagram(render('<h3>flows/Order.BPMN</h3>'))).toBe(true)
    expect(locator.mentionsDiagram(render('<h3>src/Order.kt</h3>'))).toBe(false)
  })
})
