import { browser } from 'wxt/browser'
import { DeviceFlowError } from '../../git-hosts/github/DeviceFlowError'
import {
  GITHUB_APP_INSTALL_URL,
  GITHUB_INSTALLED_APPS_URL,
  type DeviceCode,
  type GithubDeviceFlow,
} from '../../git-hosts/github/GithubDeviceFlow'
import type { GithubTokenStore } from '../../git-hosts/github/GithubTokenStore'
import { h } from '../../platform/utils/dom'
import { errorMessage } from '../../platform/utils/errorMessage'

const COPIED_FEEDBACK_MS = 1500

type StatusKind = 'error' | 'ok'

export class GithubAccessSection {
  private readonly body = h('div', { class: 'auth-body' })
  private readonly status = h('p', { class: 'status' })

  constructor(
    private readonly deviceFlow: GithubDeviceFlow,
    private readonly tokens: GithubTokenStore,
  ) {}

  mount(app: HTMLElement): void {
    app.append(
      h('h1', { text: 'GitHub access (private repos)' }),
      h('p', { class: 'intro' }, [
        'Only needed for private repositories on github.com: their diff metadata comes from ',
        h('code', { text: 'api.github.com' }),
        ', a separate origin your github.com login cookie does not cover (public repos, GitLab and GitHub Enterprise work without it).',
      ]),
      h('p', { class: 'intro' }, [
        'First ',
        h('a', {
          href: GITHUB_APP_INSTALL_URL,
          target: '_blank',
          rel: 'noreferrer',
          text: 'install the GitHub App',
        }),
        ' on the accounts and repositories it may read, then connect below. The extension only ever gets access to the repos you install it on, and the access token is stored in this browser and sent only to ',
        h('code', { text: 'api.github.com' }),
        '; the refresh token that renews it is sent only to ',
        h('code', { text: 'github.com' }),
        '.',
      ]),
      h('div', { class: 'card' }, [this.body, this.status, this.appRemovalHint()]),
    )
    void this.render()
  }

  private async render(): Promise<void> {
    const [token, login] = await Promise.all([this.tokens.token(), this.tokens.login()])
    if (token) {
      const disconnect = h('button', { class: 'btn danger', type: 'button', text: 'Disconnect' })
      disconnect.addEventListener('click', () => void this.disconnect())
      const connectedAs = login ? `Connected as @${login}` : 'Connected'
      this.body.replaceChildren(
        h('div', { class: 'row auth-row' }, [
          h('span', { class: 'auth-connected', text: connectedAs }),
          disconnect,
        ]),
      )
      return
    }
    const connect = h('button', { class: 'btn primary', type: 'button', text: 'Connect GitHub' })
    connect.addEventListener('click', () => void this.connect())
    this.body.replaceChildren(h('div', { class: 'row auth-row' }, [connect]))
  }

  private async connect(): Promise<void> {
    let code: DeviceCode
    try {
      code = await this.deviceFlow.requestDeviceCode()
    } catch (err) {
      return this.setStatus(`Could not start authorisation: ${this.authError(err)}`, 'error')
    }

    this.showUserCode(code)
    this.setStatus('Waiting for you to authorise the code on github.com…', 'ok')
    await browser.tabs.create({ url: code.verificationUri }).catch(() => undefined)

    try {
      const tokens = await this.deviceFlow.pollForToken(code)
      await this.tokens.connect(tokens, await this.deviceFlow.fetchViewerLogin(tokens.accessToken))
      this.setStatus('Connected.', 'ok')
    } catch (err) {
      this.setStatus(this.authError(err), 'error')
    }
    await this.render()
  }

  private async disconnect(): Promise<void> {
    await this.tokens.disconnect()
    this.setStatus('Disconnected.', 'ok')
    await this.render()
  }

  private showUserCode(code: DeviceCode): void {
    const copyButton = h('button', {
      class: 'btn copy',
      type: 'button',
      text: 'Copy',
      title: 'Copy the code to your clipboard',
      onClick: () => this.copyUserCode(code.userCode, copyButton),
    })
    this.body.replaceChildren(
      h('p', { class: 'auth-hint' }, [
        'Enter this code at ',
        h('a', {
          href: code.verificationUri,
          target: '_blank',
          rel: 'noreferrer',
          text: 'github.com/login/device',
        }),
        ' (a new tab should open automatically):',
      ]),
      h('div', { class: 'user-code-row' }, [
        h('div', { class: 'user-code', text: code.userCode }),
        copyButton,
      ]),
    )
  }

  private async copyUserCode(userCode: string, button: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(userCode)
    } catch {
      return
    }
    const original = button.textContent
    button.textContent = 'Copied ✓'
    button.classList.add('copied')
    window.setTimeout(() => {
      button.textContent = original
      button.classList.remove('copied')
    }, COPIED_FEEDBACK_MS)
  }

  private appRemovalHint(): HTMLElement {
    return h('div', { class: 'auth-removal' }, [
      h('p', {
        class: 'auth-hint',
        text: 'Disconnect only removes the access and refresh tokens from this browser. To remove the GitHub App itself, uninstall it and revoke its authorisation in your GitHub settings.',
      }),
      h('a', {
        class: 'btn',
        href: GITHUB_INSTALLED_APPS_URL,
        target: '_blank',
        rel: 'noreferrer',
        text: 'Uninstall on GitHub',
      }),
    ])
  }

  private setStatus(text: string, kind: StatusKind): void {
    this.status.textContent = text
    this.status.className = `status ${kind}`
  }

  private authError(err: unknown): string {
    return err instanceof DeviceFlowError ? err.message : errorMessage(err)
  }
}
