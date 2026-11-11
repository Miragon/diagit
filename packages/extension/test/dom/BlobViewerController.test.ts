import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BlobPage } from '../../src/git-hosts/BlobPage'
import { HOST_TAG, PLACEMENT_NOTICE_TAG } from '../../src/platform/injectedElements'
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
    expect(panelCss).toContain('--diagit-font:')
    expect(panelCss).toContain('--diagit-font-mono:')
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

  describe('when the page offers no place for the view', () => {
    const ALL_MOUNT_RETRIES_MS = 7_000

    function startOn(pathname: string): void {
      new BlobViewerController(pageAt(pathname), blobPage, new FakeNotationLookup()).start()
    }

    function noticeText(): string {
      return document.querySelector(PLACEMENT_NOTICE_TAG)?.shadowRoot?.textContent ?? ''
    }

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows a notice once every attempt to place the view has failed', async () => {
      document.body.innerHTML = '<main><p>The host moved the code somewhere new.</p></main>'
      startOn('/o/r/blob/main/order.bpmn')

      await vi.advanceTimersByTimeAsync(ALL_MOUNT_RETRIES_MS)

      expect(noticeText()).toContain('view could not be added')
      expect(noticeText()).toContain('Report this problem')
    })

    it('stays quiet on a file that is not a diagram', async () => {
      document.body.innerHTML = '<main></main>'
      startOn('/o/r/blob/main/README.md')

      await vi.advanceTimersByTimeAsync(ALL_MOUNT_RETRIES_MS)

      expect(document.querySelector(PLACEMENT_NOTICE_TAG)).toBeNull()
    })

    it('keeps the notice away once it was dismissed', async () => {
      document.body.innerHTML = '<main></main>'
      startOn('/o/r/blob/main/order.bpmn')
      await vi.advanceTimersByTimeAsync(ALL_MOUNT_RETRIES_MS)

      const dismiss = document
        .querySelector(PLACEMENT_NOTICE_TAG)!
        .shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Close"]')!
      dismiss.click()
      document.querySelector('main')!.append(document.createElement('p'))
      await vi.advanceTimersByTimeAsync(ALL_MOUNT_RETRIES_MS)

      expect(document.querySelector(PLACEMENT_NOTICE_TAG)).toBeNull()
    })

    it('removes the notice once the view finds its place', async () => {
      document.body.innerHTML = '<main></main>'
      startOn('/o/r/blob/main/order.bpmn')
      await vi.advanceTimersByTimeAsync(ALL_MOUNT_RETRIES_MS)

      document.querySelector('main')!.innerHTML = '<section><div class="code"></div></section>'
      await vi.advanceTimersByTimeAsync(ALL_MOUNT_RETRIES_MS)

      expect(document.querySelector(HOST_TAG)).not.toBeNull()
      expect(document.querySelector(PLACEMENT_NOTICE_TAG)).toBeNull()
    })
  })
})
