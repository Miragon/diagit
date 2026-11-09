import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlobPage } from '../../src/git-hosts/BlobPage'
import { HOST_TAG } from '../../src/platform/injectedElements'
import { BlobViewerController } from '../../src/views/blob-viewer/BlobViewerController'
import { HostPage } from '../../src/platform/page/HostPage'
import { FakeContentScriptContext } from '../fakes/FakeContentScriptContext'
import { FakeHttpClient } from '../fakes/FakeHttpClient'
import { FakeNotationLookup } from '../fakes/FakeNotationLookup'

const context = new FakeContentScriptContext()

function pageAt(pathname: string): HostPage {
  const win = {
    location: { pathname, origin: 'https://github.com', search: '', hostname: 'github.com' },
    document,
  } as unknown as Window
  return new HostPage(context.ctx, win)
}

const blobPage = new BlobPage(
  {
    blobSegment: '/blob/',
    rawSegment: '/raw/',
    contentSelectors: ['.code'],
    insertClimb: 'section',
  },
  new FakeHttpClient().respondWith({ 'https://github.com/o/r/raw/main/order.bpmn': '<bpmn/>' }),
)

afterEach(() => {
  context.invalidate()
  document.body.innerHTML = ''
})

describe('BlobViewerController', () => {
  it('renders the diagram above the file of a diagram blob page', async () => {
    document.body.innerHTML = '<section id="file"><div class="code"></div></section>'

    new BlobViewerController(
      pageAt('/o/r/blob/main/order.bpmn'),
      blobPage,
      new FakeNotationLookup(),
    ).start()

    const file = document.getElementById('file')!
    await vi.waitFor(() => expect(file.previousElementSibling?.localName).toBe(HOST_TAG))
  })

  it('themes the panel with the Miragon tokens', async () => {
    document.body.innerHTML = '<section id="file"><div class="code"></div></section>'

    new BlobViewerController(
      pageAt('/o/r/blob/main/order.bpmn'),
      blobPage,
      new FakeNotationLookup(),
    ).start()

    const file = document.getElementById('file')!
    await vi.waitFor(() => expect(file.previousElementSibling?.localName).toBe(HOST_TAG))
    const panelStyles = file.previousElementSibling!.shadowRoot!.querySelectorAll('style')
    const panelCss = [...panelStyles].map((style) => style.textContent).join('\n')
    expect(panelCss).toContain('--cd-ui-text')
    expect(panelCss).not.toContain(':root')
  })

  it('renders nothing on a blob page without a diagram', async () => {
    document.body.innerHTML = '<section><div class="code"></div></section>'

    new BlobViewerController(
      pageAt('/o/r/blob/main/README.md'),
      blobPage,
      new FakeNotationLookup(),
    ).start()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(document.querySelector(HOST_TAG)).toBeNull()
  })
})
