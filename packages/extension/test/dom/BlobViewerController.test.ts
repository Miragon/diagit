import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { BlobPage } from '../../src/git-hosts/BlobPage'
import { HOST_TAG, PLACEMENT_NOTICE_TAG } from '../../src/platform/injectedElements'
import { BlobViewerController } from '../../src/views/blob-viewer/BlobViewerController'
import { HostPage } from '../../src/platform/page/HostPage'
import { FakeContentScriptContext } from '../fakes/FakeContentScriptContext'
import { FakeHttpClient } from '../fakes/FakeHttpClient'
import { FakeNotationLookup } from '../fakes/FakeNotationLookup'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { sendMessage: vi.fn(() => Promise.resolve(true)) },
    extension: { inIncognitoContext: false },
  },
}))

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
  vi.restoreAllMocks()
})

describe('BlobViewerController', () => {
  it('renders the diagram above the file of a diagram blob page', async () => {
    document.body.innerHTML = '<section id="file"><div class="code"></div></section>'

    new BlobViewerController(
      pageAt('/o/r/blob/main/order.bpmn'),
      blobPage,
      FAKE_REPORT_CONTEXT,
      new FakeNotationLookup(),
    ).start()

    const file = document.getElementById('file')!
    await vi.waitFor(() => expect(file.previousElementSibling?.localName).toBe(HOST_TAG))
    const toolbar = file.previousElementSibling!.shadowRoot!.querySelector('.diagit-toolbar')!
    expect(toolbar.querySelector('.file-name')!.textContent).toBe('order.bpmn')
  })

  it('moves the clearance under the host sticky header from the file to the panel', async () => {
    document.body.innerHTML = `
      <style>.below-sticky-header { margin-top: 44px; }</style>
      <section id="file" class="below-sticky-header"><div class="code"></div></section>`
    new BlobViewerController(
      pageAt('/o/r/blob/main/order.bpmn'),
      blobPage,
      FAKE_REPORT_CONTEXT,
      new FakeNotationLookup(),
    ).start()

    const file = document.getElementById('file')!
    await vi.waitFor(() => expect(file.previousElementSibling?.localName).toBe(HOST_TAG))
    const panelContainer = file.previousElementSibling!.shadowRoot!.querySelector('div')!
    expect(panelContainer.style.paddingTop).toBe('44px')
    expect(getComputedStyle(file).marginTop).toBe('0px')

    context.invalidate()

    expect(document.querySelector(HOST_TAG)).toBeNull()
    expect(getComputedStyle(file).marginTop).toBe('44px')
  })

  it('themes the panel with the Miragon tokens', async () => {
    document.body.innerHTML = '<section id="file"><div class="code"></div></section>'

    new BlobViewerController(
      pageAt('/o/r/blob/main/order.bpmn'),
      blobPage,
      FAKE_REPORT_CONTEXT,
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
      FAKE_REPORT_CONTEXT,
      new FakeNotationLookup(),
    ).start()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(document.querySelector(HOST_TAG)).toBeNull()
  })

  describe('when the page offers no place for the view', () => {
    const ALL_MOUNT_RETRIES_MS = 7_000

    function startOn(pathname: string): void {
      new BlobViewerController(
        pageAt(pathname),
        blobPage,
        FAKE_REPORT_CONTEXT,
        new FakeNotationLookup(),
      ).start()
    }

    function noticeText(): string {
      return document.querySelector(PLACEMENT_NOTICE_TAG)?.shadowRoot?.textContent ?? ''
    }

    function noticeButtons(): HTMLButtonElement[] {
      return [
        ...document.querySelector(PLACEMENT_NOTICE_TAG)!.shadowRoot!.querySelectorAll('button'),
      ]
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
      expect(noticeText()).toContain('Report problem')
      expect(
        document
          .querySelector(PLACEMENT_NOTICE_TAG)!
          .shadowRoot!.querySelector<HTMLElement>('.diagit-toast')!.dataset.tone,
      ).toBe('warning')
      const openTab = vi.spyOn(window, 'open').mockReturnValue(null)
      const reportButton = noticeButtons().find(
        (button) => button.textContent === 'Report problem',
      )!
      reportButton.click()
      const fields = new URL(String(openTab.mock.calls[0]![0])).searchParams
      expect(fields.get('where')).toBe(FAKE_REPORT_CONTEXT.where)
      expect(fields.get('env')).toBe(FAKE_REPORT_CONTEXT.environment)
    })

    it('offers to open the model in the viewer as the primary action', async () => {
      document.body.innerHTML = '<main></main>'
      startOn('/o/r/blob/main/order.bpmn')
      await vi.advanceTimersByTimeAsync(ALL_MOUNT_RETRIES_MS)

      const [openButton] = noticeButtons()
      expect(openButton!.textContent).toBe('Open in Diagit')
      expect(openButton!.classList).toContain('btn-primary')
      openButton!.click()

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'openViewer',
        url: 'https://github.com/o/r/raw/main/order.bpmn',
      })
      expect(document.querySelector(PLACEMENT_NOTICE_TAG)).toBeNull()
    })

    it('offers no viewer in an incognito window, where it would open in a normal one', async () => {
      vi.mocked(browser.extension).inIncognitoContext = true
      document.body.innerHTML = '<main></main>'
      startOn('/o/r/blob/main/order.bpmn')
      await vi.advanceTimersByTimeAsync(ALL_MOUNT_RETRIES_MS)
      vi.mocked(browser.extension).inIncognitoContext = false

      expect(noticeButtons().map((button) => button.textContent)).not.toContain('Open in Diagit')
      expect(noticeText()).toContain('Report problem')
      expect(noticeText()).not.toContain('Open the file in Diagit')
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
