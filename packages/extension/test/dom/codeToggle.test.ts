import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlobPage } from '../../src/git-hosts/BlobPage'
import { githubHost, gitlabHost } from '../../src/git-hosts/hosts'
import { CodeToggle } from '../../src/platform/ui/CodeToggle'
import { FakeHttpClient } from '../fakes/FakeHttpClient'

const HIDDEN_PANEL = 'diagit-viewer[data-code-hidden]'

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

function hideWith(css: string, body: string): void {
  document.head.innerHTML = `<style>${css}</style>`
  document.body.innerHTML = body
}

function isDisplayed(selector: string): boolean {
  return getComputedStyle(document.querySelector(selector)!).display !== 'none'
}

describe('CodeToggle', () => {
  it('starts as asked and hides the code on a click', () => {
    const hideCode = vi.fn()
    const toggled = vi.fn()
    const toggle = new CodeToggle({ shown: true, hideCode, toggled })

    expect(toggle.element.getAttribute('aria-pressed')).toBe('true')
    expect(hideCode).toHaveBeenLastCalledWith(false)

    toggle.element.click()

    expect(toggle.element.getAttribute('aria-pressed')).toBe('false')
    expect(hideCode).toHaveBeenLastCalledWith(true)
    expect(toggled).toHaveBeenLastCalledWith(false)
  })

  it('keeps the code shown and the button away while hiding is not allowed', () => {
    const hideCode = vi.fn()
    const toggle = new CodeToggle({ shown: false, hideCode })
    expect(hideCode).toHaveBeenLastCalledWith(true)

    toggle.allowHiding(false)

    expect(hideCode).toHaveBeenLastCalledWith(false)
    expect(toggle.codeShown).toBe(true)
    expect(toggle.element.hidden).toBe(true)

    toggle.allowHiding(true)

    expect(hideCode).toHaveBeenLastCalledWith(true)
    expect(toggle.element.hidden).toBe(false)
  })
})

describe('BlobPage.hiddenCodeCss', () => {
  it('hides the code container of a GitHub file but not the header in front of it', () => {
    hideWith(
      githubHost.blobPage.hiddenCodeCss(HIDDEN_PANEL),
      `<diagit-viewer data-code-hidden></diagit-viewer>
       <section>
         <div class="file-header">order.bpmn</div>
         <div class="code-blob"><textarea id="read-only-cursor-text-area"></textarea></div>
         <div data-testid="code-lines-container"></div>
       </section>`,
    )

    expect(isDisplayed('.file-header')).toBe(true)
    expect(isDisplayed('.code-blob')).toBe(false)
    expect(isDisplayed('[data-testid="code-lines-container"]')).toBe(false)
  })

  it('hides only the code inside the GitLab file holder', () => {
    hideWith(
      gitlabHost.blobPage.hiddenCodeCss(HIDDEN_PANEL),
      `<diagit-viewer data-code-hidden></diagit-viewer>
       <div class="file-holder">
         <div class="js-file-title">order.bpmn</div>
         <div class="blob-viewer"></div>
       </div>`,
    )

    expect(isDisplayed('.js-file-title')).toBe(true)
    expect(isDisplayed('.blob-viewer')).toBe(false)
  })

  it('hides the code itself when no ancestor matched the climb', () => {
    const blobPage = new BlobPage(
      { blobSegment: '/blob/', rawSegment: '/raw/', contentSelectors: ['.code'], insertClimb: 'x' },
      new FakeHttpClient(),
    )
    hideWith(
      blobPage.hiddenCodeCss(HIDDEN_PANEL),
      '<diagit-viewer data-code-hidden></diagit-viewer><pre class="code"></pre>',
    )

    expect(isDisplayed('.code')).toBe(false)
  })

  it('shows the code again once the panel no longer asks to hide it', () => {
    hideWith(
      githubHost.blobPage.hiddenCodeCss(HIDDEN_PANEL),
      `<diagit-viewer></diagit-viewer>
       <section><div data-testid="code-lines-container"></div></section>`,
    )

    expect(isDisplayed('[data-testid="code-lines-container"]')).toBe(true)
  })
})
