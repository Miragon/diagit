import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiffDataError, type DiffSource } from '../../src/git-hosts/DiffSource'
import { DIFF_ERROR_TAG, DIFF_PANEL_TAG } from '../../src/platform/injectedElements'
import { DiffController } from '../../src/views/diff-viewer/DiffController'
import { HostPage } from '../../src/platform/page/HostPage'
import { FakeContentScriptContext } from '../fakes/FakeContentScriptContext'
import { FakeNotationLookup } from '../fakes/FakeNotationLookup'

const RERUN_DEBOUNCE_MS = 300

const context = new FakeContentScriptContext()

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((done) => (resolve = done))
  return { promise, resolve }
}

function renderFileBox(): HTMLElement {
  document.body.innerHTML = '<div class="file"><div class="code"></div></div>'
  return document.querySelector<HTMLElement>('.file')!
}

function sourceShowing(
  fileRoot: HTMLElement,
  metadata: Promise<void>,
  path = 'flows/order.bpmn',
): DiffSource {
  return {
    pageKey: () => 'octo/flows!1',
    unrecognizedFiles: async () => [],
    async collect() {
      const code = fileRoot.querySelector<HTMLElement>('.code')!
      await metadata
      return [
        {
          path,
          anchor: code,
          append: 'before',
          fileRoot,
          isCollapsed: () => false,
          loadOld: async () => null,
          loadNew: async () => null,
        },
      ]
    },
  }
}

function start(source: DiffSource): void {
  new DiffController(new HostPage(context.ctx), source, new FakeNotationLookup()).start()
}

const untilRerunStarted = () =>
  new Promise((resolve) => setTimeout(resolve, RERUN_DEBOUNCE_MS + 100))

afterEach(() => {
  context.invalidate()
  document.body.innerHTML = ''
})

describe('DiffController', () => {
  it('mounts the panel above the code of a changed diagram file', async () => {
    const fileRoot = renderFileBox()
    const metadata = deferred()
    start(sourceShowing(fileRoot, metadata.promise))

    metadata.resolve()

    const code = fileRoot.querySelector('.code')!
    await vi.waitFor(() => expect(code.previousElementSibling?.localName).toBe(DIFF_PANEL_TAG))
  })

  it('mounts the panel above the code the host re-rendered while metadata was loading', async () => {
    const fileRoot = renderFileBox()
    const metadata = deferred()
    start(sourceShowing(fileRoot, metadata.promise))

    const codeScannedBeforeMetadataArrived = fileRoot.querySelector('.code')!
    const reRenderedCode = codeScannedBeforeMetadataArrived.cloneNode(true) as HTMLElement
    codeScannedBeforeMetadataArrived.replaceWith(reRenderedCode)
    await untilRerunStarted()
    metadata.resolve()

    await vi.waitFor(() =>
      expect(reRenderedCode.previousElementSibling?.localName).toBe(DIFF_PANEL_TAG),
    )
  })

  it('leaves files of a notation without diff support alone', async () => {
    const fileRoot = renderFileBox()
    start(sourceShowing(fileRoot, Promise.resolve(), 'rules/decide.dmn'))

    await untilRerunStarted()

    expect(fileRoot.querySelector(DIFF_PANEL_TAG)).toBeNull()
  })

  it('shows an error notice above each file when the metadata cannot be loaded', async () => {
    const fileRoot = renderFileBox()
    const code = fileRoot.querySelector<HTMLElement>('.code')!
    const failing: DiffSource = {
      pageKey: () => 'octo/flows!1',
      unrecognizedFiles: async () => [],
      collect: async () => {
        throw new DiffDataError('HTTP 404', 'Connect the app.', [
          {
            path: 'flows/order.bpmn',
            anchor: code,
            append: 'before',
            fileRoot,
            isCollapsed: () => false,
          },
        ])
      },
    }

    start(failing)

    await vi.waitFor(() => expect(code.previousElementSibling?.localName).toBe(DIFF_ERROR_TAG))
    const notice = code.previousElementSibling!.shadowRoot!
    await vi.waitFor(() =>
      expect(notice.querySelector('.diagit-error-title')?.textContent).toBe(
        'BPMN diff could not be loaded',
      ),
    )
    expect(notice.querySelector('.diagit-error-hint')?.textContent).toBe('Connect the app.')
    expect(notice.querySelector('.diagit-error-detail')?.textContent).toBe('HTTP 404')
  })

  describe('a changed diagram file whose diff view Diagit does not recognise', () => {
    afterEach(async () => {
      context.invalidate()
      await untilRerunStarted()
    })

    function sourceMissing(
      path: string,
      isRecognized = () => false,
      pageKey = (): string | null => 'octo/flows!1',
    ): DiffSource {
      return {
        pageKey,
        collect: async () => [],
        unrecognizedFiles: async () => {
          const header = document.querySelector<HTMLElement>('.file-header')!
          return isRecognized() ? [] : [{ path, header }]
        },
      }
    }

    const changedFileHtml = `
      <section class="changed-file">
        <div class="file-header"><span><a>flows/order.bpmn</a></span></div>
        <table class="lines"></table>
      </section>`

    function render(html: string): void {
      document.body.innerHTML = html
    }

    it('shows an error notice right after the visible file header', async () => {
      render(changedFileHtml)

      start(sourceMissing('flows/order.bpmn'))

      const header = document.querySelector('.file-header')!
      await vi.waitFor(() => expect(header.nextElementSibling?.localName).toBe(DIFF_ERROR_TAG))
    })

    it('shows the notice only once while the page keeps changing', async () => {
      render(changedFileHtml)
      start(sourceMissing('flows/order.bpmn'))
      await vi.waitFor(() => expect(document.querySelector(DIFF_ERROR_TAG)).not.toBeNull())

      document.body.append(document.createElement('div'))
      await untilRerunStarted()

      expect(document.querySelectorAll(DIFF_ERROR_TAG)).toHaveLength(1)
    })

    it('removes the notice once the file is recognised', async () => {
      render(changedFileHtml)
      let recognized = false
      start(sourceMissing('flows/order.bpmn', () => recognized))
      await vi.waitFor(() => expect(document.querySelector(DIFF_ERROR_TAG)).not.toBeNull())

      recognized = true
      document.body.append(document.createElement('div'))

      await vi.waitFor(() => expect(document.querySelector(DIFF_ERROR_TAG)).toBeNull())
    })

    it('removes the notice when the page is no longer a pull request', async () => {
      render(changedFileHtml)
      let pageKey: string | null = 'octo/flows!1'
      start(
        sourceMissing(
          'flows/order.bpmn',
          () => false,
          () => pageKey,
        ),
      )
      await vi.waitFor(() => expect(document.querySelector(DIFF_ERROR_TAG)).not.toBeNull())

      pageKey = null
      document.body.append(document.createElement('div'))

      await vi.waitFor(() => expect(document.querySelector(DIFF_ERROR_TAG)).toBeNull())
    })
  })
})
