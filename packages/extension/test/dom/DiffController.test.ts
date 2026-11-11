import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiffDataError, type DiffSource } from '../../src/git-hosts/DiffSource'
import { DIFF_ERROR_TAG, DIFF_PANEL_TAG } from '../../src/platform/injectedElements'
import { DiffController } from '../../src/views/diff-viewer/DiffController'
import { DiffPanel } from '../../src/views/diff-viewer/DiffPanel'
import { HostPage } from '../../src/platform/page/HostPage'
import { FakeContentScriptContext } from '../fakes/FakeContentScriptContext'
import { FakeNotationLookup } from '../fakes/FakeNotationLookup'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'

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
  pageKey = () => 'octo/flows!1',
): DiffSource {
  return {
    pageKey,
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
  new DiffController(
    new HostPage(context.ctx),
    source,
    FAKE_REPORT_CONTEXT,
    new FakeNotationLookup(),
  ).start()
}

const untilRerunStarted = () =>
  new Promise((resolve) => setTimeout(resolve, RERUN_DEBOUNCE_MS + 100))

afterEach(() => {
  context.invalidate()
  vi.restoreAllMocks()
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

  it('releases the panel and its watchers once the host removes the file', async () => {
    const destroy = vi.spyOn(DiffPanel.prototype, 'destroy')
    const fileRoot = renderFileBox()
    start(sourceShowing(fileRoot, Promise.resolve()))
    const listenersWithoutPanel = context.pendingInvalidationListeners
    await vi.waitFor(() => expect(fileRoot.querySelector(DIFF_PANEL_TAG)).not.toBeNull())

    fileRoot.remove()

    await vi.waitFor(() => expect(destroy).toHaveBeenCalled())
    expect(context.pendingInvalidationListeners).toBe(listenersWithoutPanel)
  })

  it('replaces the panels when the page moves to other revisions of the same files', async () => {
    const fileRoot = renderFileBox()
    let pageKey = 'octo/flows!1'
    start(sourceShowing(fileRoot, Promise.resolve(), 'flows/order.bpmn', () => pageKey))
    await vi.waitFor(() => expect(fileRoot.querySelector(DIFF_PANEL_TAG)).not.toBeNull())
    const wholePullRequestPanel = fileRoot.querySelector(DIFF_PANEL_TAG)

    pageKey = 'octo/flows!1@c0ffee0'
    fileRoot.append(document.createElement('span'))

    await vi.waitFor(() => {
      const panel = fileRoot.querySelector(DIFF_PANEL_TAG)
      expect(panel).not.toBeNull()
      expect(panel).not.toBe(wholePullRequestPanel)
    })
  })

  it('removes the panels when the page moves to revisions it cannot show', async () => {
    const fileRoot = renderFileBox()
    let pageKey: string | null = 'octo/flows!1'
    start(sourceShowing(fileRoot, Promise.resolve(), 'flows/order.bpmn', () => pageKey!))
    await vi.waitFor(() => expect(fileRoot.querySelector(DIFF_PANEL_TAG)).not.toBeNull())

    pageKey = null
    fileRoot.append(document.createElement('span'))

    await vi.waitFor(() => expect(fileRoot.querySelector(DIFF_PANEL_TAG)).toBeNull())
  })

  it('mounts no panel for a page the user already left while its data was loading', async () => {
    const fileRoot = renderFileBox()
    const wholePullRequest = deferred()
    let pageKey = 'octo/flows!1'
    const source = sourceShowing(
      fileRoot,
      wholePullRequest.promise,
      'flows/order.bpmn',
      () => pageKey,
    )
    start(source)

    pageKey = 'octo/flows!1@c0ffee0'
    source.collect = async () => []
    fileRoot.append(document.createElement('span'))
    await untilRerunStarted()
    wholePullRequest.resolve()
    await untilRerunStarted()

    expect(fileRoot.querySelector(DIFF_PANEL_TAG)).toBeNull()
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
        throw new DiffDataError(
          'HTTP 404',
          {
            hint: 'Connect the app.',
            action: { label: 'Install', url: 'https://github.com/apps/x' },
          },
          [
            {
              path: 'flows/order.bpmn',
              anchor: code,
              append: 'before',
              fileRoot,
              isCollapsed: () => false,
            },
          ],
        )
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
    expect(notice.querySelector('.diagit-error-actions a')?.getAttribute('href')).toBe(
      'https://github.com/apps/x',
    )
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

    it('reports the problem with place and environment but without the file path', async () => {
      render(changedFileHtml)

      start(sourceMissing('flows/order.bpmn'))

      await vi.waitFor(() => expect(document.querySelector(DIFF_ERROR_TAG)).not.toBeNull())
      const report = document
        .querySelector(DIFF_ERROR_TAG)!
        .shadowRoot!.querySelector<HTMLAnchorElement>('.diagit-error-report')!
      const fields = new URL(report.href).searchParams
      expect(fields.get('where')).toBe(FAKE_REPORT_CONTEXT.where)
      expect(fields.get('env')).toBe(FAKE_REPORT_CONTEXT.environment)
      expect(decodeURIComponent(report.href)).not.toContain('order.bpmn')
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
