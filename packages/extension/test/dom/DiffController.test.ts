import { afterEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { DiffDataError, type DiffFileBlock, type DiffSource } from '../../src/git-hosts/DiffSource'
import { DIFF_ERROR_TAG, DIFF_PANEL_TAG } from '../../src/platform/injectedElements'
import { DiffController } from '../../src/views/diff-viewer/DiffController'
import { DiffPanel } from '../../src/views/diff-viewer/DiffPanel'
import { HostPage } from '../../src/platform/page/HostPage'
import { FakeContentScriptContext } from '../fakes/FakeContentScriptContext'
import { FakeNotationLookup } from '../fakes/FakeNotationLookup'
import { FAKE_REPORT_CONTEXT } from '../fakes/fakeReportContext'
import { codeStartSettingIn, codeVisibilityIn } from '../fakes/codeVisibilityIn'
import { MemoryStorageArea } from '../fakes/MemoryStorageArea'

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { sendMessage: vi.fn(() => Promise.resolve(true)) },
    extension: { inIncognitoContext: false },
  },
}))

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
    loadersFor: async () => null,
    hiddenCodeCss: (hiddenPanel) => `${hiddenPanel} + .code { display: none; }`,
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
          showsOtherFile: () => false,
          hostCode: () => [code],
          reviewCommentCount: () => 0,
          isLinkedFrom: () => false,
          loadOld: async () => '<old/>',
          loadNew: async () => '<new/>',
        },
      ]
    },
  }
}

function start(source: DiffSource, codeVisibility = codeVisibilityIn()): void {
  new DiffController(
    new HostPage(context.ctx),
    source,
    FAKE_REPORT_CONTEXT,
    new FakeNotationLookup(),
    undefined,
    codeVisibility,
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
    const metadata = deferred()
    start(sourceShowing(fileRoot, metadata.promise))
    await new Promise((resolve) => setTimeout(resolve, 0))
    const listenersWithoutPanel = context.pendingInvalidationListeners
    metadata.resolve()
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

  describe('a file box the host reuses for another file while scrolling', () => {
    function renderRecyclableFileBox(path: string): HTMLElement {
      document.body.innerHTML = `<div class="file" data-path="${path}"><div class="code"></div></div>`
      return document.querySelector<HTMLElement>('.file')!
    }

    function sourceReadingPathsFromPage(): DiffSource {
      return {
        pageKey: () => 'group/project!7',
        unrecognizedFiles: async () => [],
        loadersFor: async () => null,
        hiddenCodeCss: () => '',
        async collect(_location, doc) {
          return [...doc.querySelectorAll<HTMLElement>('.file')]
            .map((fileRoot) => ({ fileRoot, path: fileRoot.dataset.path! }))
            .filter(({ path }) => path.endsWith('.bpmn'))
            .map(({ fileRoot, path }) => ({
              path,
              anchor: fileRoot.querySelector<HTMLElement>('.code')!,
              append: 'before' as const,
              fileRoot,
              isCollapsed: () => false,
              showsOtherFile: () => fileRoot.dataset.path !== path,
              hostCode: () => [],
              reviewCommentCount: () => 0,
              isLinkedFrom: () => false,
              loadOld: async () => null,
              loadNew: async () => null,
            }))
        },
      }
    }

    function reuseFor(fileRoot: HTMLElement, path: string): void {
      fileRoot.dataset.path = path
      fileRoot.querySelector('.code')!.replaceChildren(document.createElement('table'))
    }

    it('removes the panel once the box shows a file that is no diagram', async () => {
      const fileRoot = renderRecyclableFileBox('flows/order.bpmn')
      start(sourceReadingPathsFromPage())
      await vi.waitFor(() => expect(fileRoot.querySelector(DIFF_PANEL_TAG)).not.toBeNull())

      reuseFor(fileRoot, 'src/guard.spec.ts')

      await vi.waitFor(() => expect(fileRoot.querySelector(DIFF_PANEL_TAG)).toBeNull())
    })

    it('shows the diagram of the file the box shows now', async () => {
      const fileRoot = renderRecyclableFileBox('flows/order.bpmn')
      start(sourceReadingPathsFromPage())
      await vi.waitFor(() => expect(fileRoot.querySelector(DIFF_PANEL_TAG)).not.toBeNull())
      const orderPanel = fileRoot.querySelector(DIFF_PANEL_TAG)

      reuseFor(fileRoot, 'flows/invoice.bpmn')

      await vi.waitFor(() => {
        const panels = fileRoot.querySelectorAll(DIFF_PANEL_TAG)
        expect(panels).toHaveLength(1)
        expect(panels[0]).not.toBe(orderPanel)
      })
    })
  })

  it('leaves files of a notation without diff support alone', async () => {
    const fileRoot = renderFileBox()
    start(sourceShowing(fileRoot, Promise.resolve(), 'rules/decide.dmn'))

    await untilRerunStarted()

    expect(fileRoot.querySelector(DIFF_PANEL_TAG)).toBeNull()
  })

  describe('the Code button', () => {
    async function codeButtonOf(code: HTMLElement): Promise<HTMLButtonElement> {
      return vi.waitFor(() => {
        const button =
          code.previousElementSibling?.shadowRoot?.querySelector<HTMLButtonElement>(
            '.diagit-code-toggle',
          )
        expect(button).toBeTruthy()
        return button!
      })
    }

    it('hides the code of the file under the panel and keeps the panel', async () => {
      const fileRoot = renderFileBox()
      const code = fileRoot.querySelector<HTMLElement>('.code')!
      start(sourceShowing(fileRoot, Promise.resolve()))

      const button = await codeButtonOf(code)
      expect(button.getAttribute('aria-pressed')).toBe('true')
      button.click()

      const panel = code.previousElementSibling!
      expect(panel.hasAttribute('data-code-hidden')).toBe(true)
      expect(getComputedStyle(code).display).toBe('none')
      expect(getComputedStyle(panel).display).not.toBe('none')
    })

    it('keeps the choice when the host renders the file box again', async () => {
      const source = sourceShowing(renderFileBox(), Promise.resolve())
      start({
        ...source,
        collect: () =>
          sourceShowing(currentFileBox(), Promise.resolve()).collect(location, document),
      })
      ;(await codeButtonOf(currentCode())).click()

      renderFileBox()

      const button = await codeButtonOf(currentCode())
      expect(button.getAttribute('aria-pressed')).toBe('false')
      expect(currentCode().previousElementSibling!.hasAttribute('data-code-hidden')).toBe(true)
    })

    async function startingWithDiagramAlone(source: DiffSource): Promise<void> {
      const area = new MemoryStorageArea()
      await codeStartSettingIn(area).write('hidden')
      start(source, codeVisibilityIn(area))
    }

    function withFile(source: DiffSource, file: Partial<DiffFileBlock>): DiffSource {
      return {
        ...source,
        collect: async (location, doc) =>
          (await source.collect(location, doc)).map((block) => ({ ...block, ...file })),
      }
    }

    it('hides the code already while the diagram loads when the options say so', async () => {
      const fileRoot = renderFileBox()
      const code = fileRoot.querySelector<HTMLElement>('.code')!
      const neverLoads = () => new Promise<string>(() => {})
      await startingWithDiagramAlone(
        withFile(sourceShowing(fileRoot, Promise.resolve()), {
          loadOld: neverLoads,
          loadNew: neverLoads,
        }),
      )

      await codeButtonOf(code)
      expect(code.previousElementSibling!.hasAttribute('data-code-hidden')).toBe(true)
    })

    it('starts with the code shown for a file the link points into', async () => {
      const fileRoot = renderFileBox()
      const code = fileRoot.querySelector<HTMLElement>('.code')!
      await startingWithDiagramAlone(
        withFile(sourceShowing(fileRoot, Promise.resolve()), { isLinkedFrom: () => true }),
      )

      const button = await codeButtonOf(code)
      expect(button.getAttribute('aria-pressed')).toBe('true')
      expect(code.previousElementSibling!.hasAttribute('data-code-hidden')).toBe(false)
    })

    it('shows the code once review comments load into the file', async () => {
      const fileRoot = renderFileBox()
      const code = fileRoot.querySelector<HTMLElement>('.code')!
      await startingWithDiagramAlone(
        withFile(sourceShowing(fileRoot, Promise.resolve()), {
          reviewCommentCount: () => fileRoot.querySelectorAll('.comment').length,
        }),
      )
      await codeButtonOf(code)
      const panel = code.previousElementSibling!
      expect(panel.hasAttribute('data-code-hidden')).toBe(true)

      code.append(Object.assign(document.createElement('div'), { className: 'comment' }))

      await vi.waitFor(() => expect(panel.hasAttribute('data-code-hidden')).toBe(false))
    })

    const currentFileBox = () => document.querySelector<HTMLElement>('.file')!
    const currentCode = () => currentFileBox().querySelector<HTMLElement>('.code')!
  })

  it('shows an error notice above each file when the metadata cannot be loaded', async () => {
    const fileRoot = renderFileBox()
    const code = fileRoot.querySelector<HTMLElement>('.code')!
    const failing: DiffSource = {
      pageKey: () => 'octo/flows!1',
      unrecognizedFiles: async () => [],
      loadersFor: async () => null,
      hiddenCodeCss: () => '',
      collect: async () => {
        throw new DiffDataError(
          'HTTP 404',
          {
            tone: 'warning',
            title: 'Diagit GitHub App is not installed here',
            body: 'Connect the app.',
            action: { label: 'Install', url: 'https://github.com/apps/x' },
          },
          [
            {
              path: 'flows/order.bpmn',
              anchor: code,
              append: 'before',
              fileRoot,
              isCollapsed: () => false,
              showsOtherFile: () => false,
              hostCode: () => [],
              reviewCommentCount: () => 0,
              isLinkedFrom: () => false,
            },
          ],
        )
      },
    }

    start(failing)

    await vi.waitFor(() => expect(code.previousElementSibling?.localName).toBe(DIFF_ERROR_TAG))
    const notice = code.previousElementSibling!.shadowRoot!
    await vi.waitFor(() =>
      expect(notice.querySelector('.diagit-notice-title')?.textContent).toBe(
        'Diagit GitHub App is not installed here',
      ),
    )
    expect(notice.querySelector('.diagit-toolbar .diagit-file-label')?.textContent).toBe(
      'order.bpmnBPMN',
    )
    expect(notice.querySelector<HTMLElement>('.diagit-notice')!.dataset.layout).toBe('pane')
    expect(notice.querySelector('.diagit-notice-body')?.textContent).toBe('Connect the app.')
    expect(notice.textContent).not.toContain('Open in Diagit')
    expect(notice.querySelector('.diagit-notice-actions a')?.getAttribute('href')).toBe(
      'https://github.com/apps/x',
    )
    const report = notice.querySelector<HTMLAnchorElement>('.diagit-notice-report')!
    expect(new URL(report.href).searchParams.get('console')).toBe('HTTP 404')
    expect(decodeURIComponent(report.href)).not.toContain('flows/order.bpmn')
  })

  it('names the diagram kind when the host gives no cause for the failure', async () => {
    const fileRoot = renderFileBox()
    const code = fileRoot.querySelector<HTMLElement>('.code')!
    start({
      pageKey: () => 'octo/flows!1',
      unrecognizedFiles: async () => [],
      loadersFor: async () => null,
      hiddenCodeCss: () => '',
      collect: async () => {
        throw new DiffDataError(
          'HTTP 500',
          { tone: 'danger', body: 'Reload the page to try again.' },
          [
            {
              path: 'flows/order.bpmn',
              anchor: code,
              append: 'before',
              fileRoot,
              isCollapsed: () => false,
              showsOtherFile: () => false,
              hostCode: () => [],
              reviewCommentCount: () => 0,
              isLinkedFrom: () => false,
            },
          ],
        )
      },
    })

    await vi.waitFor(() => expect(code.previousElementSibling?.localName).toBe(DIFF_ERROR_TAG))
    const notice = code.previousElementSibling!.shadowRoot!
    await vi.waitFor(() =>
      expect(notice.querySelector('.diagit-notice-title')?.textContent).toBe(
        'BPMN diff data could not be loaded',
      ),
    )
    expect(notice.querySelector<HTMLElement>('.diagit-notice')!.dataset.tone).toBe('danger')
  })

  describe('a changed diagram file whose diff view Diagit does not recognise', () => {
    afterEach(async () => {
      vi.mocked(browser.extension).inIncognitoContext = false
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
        loadersFor: async () => null,
        hiddenCodeCss: () => '',
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
        .shadowRoot!.querySelector<HTMLAnchorElement>('.diagit-notice-report')!
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

    function noticeButtons(): HTMLButtonElement[] {
      const notice = document.querySelector(DIFF_ERROR_TAG)!.shadowRoot!
      return [...notice.querySelectorAll<HTMLButtonElement>('button')]
    }

    it('opens the diff of the file in the standalone viewer', async () => {
      render(changedFileHtml)
      start(sourceMissing('flows/order.bpmn'))
      await vi.waitFor(() => expect(document.querySelector(DIFF_ERROR_TAG)).not.toBeNull())

      const [openButton] = noticeButtons()
      expect(openButton!.textContent).toBe('Open in Diagit')
      openButton!.click()

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'openDiffViewer',
        pageUrl: location.href,
        path: 'flows/order.bpmn',
      })
    })

    it('offers no viewer in an incognito window, where it would open in a normal one', async () => {
      vi.mocked(browser.extension).inIncognitoContext = true
      render(changedFileHtml)
      start(sourceMissing('flows/order.bpmn'))
      await vi.waitFor(() => expect(document.querySelector(DIFF_ERROR_TAG)).not.toBeNull())

      expect(noticeButtons()).toEqual([])
      expect(document.querySelector(DIFF_ERROR_TAG)!.shadowRoot!.textContent).toContain(
        "The file's changes are still shown below.",
      )
    })
  })
})
