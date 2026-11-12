import { Link, Trash2 } from 'lucide'
import { browser } from 'wxt/browser'
import { DeviceFlowError, type DeviceFlowFailure } from '../../git-hosts/github/DeviceFlowError'
import {
  GITHUB_APP_INSTALL_URL,
  GITHUB_INSTALLED_APPS_URL,
  type DeviceCode,
  type GithubDeviceFlow,
} from '../../git-hosts/github/GithubDeviceFlow'
import type { GithubTokenStore } from '../../git-hosts/github/GithubTokenStore'
import { diagitRepository, type ReportContext } from '../../platform/DiagitRepository'
import { Notice, type NoticeDetails } from '../../platform/ui/Notice'
import { h } from '../../platform/utils/dom'
import { externalLink } from '../../platform/utils/externalLink'
import { lucideIcon } from '../../platform/utils/lucideIcon'

const COPIED_FEEDBACK_MS = 1500
const EXPIRED_HINT =
  'Your GitHub connection expired. Connect again to see diffs in private repositories.'
const NOT_CONNECTED_HINT = 'Connect GitHub to see diagrams in private repositories.'
const PLACE = 'on the options page'

const FAILURE_COPY: Record<
  Exclude<DeviceFlowFailure, 'cancelled'>,
  Pick<NoticeDetails, 'tone' | 'title' | 'body'> & { reported: boolean }
> = {
  expired: {
    tone: 'warning',
    title: 'The code expired before you confirmed it',
    body: 'Connect again and enter the new code on GitHub within 15 minutes.',
    reported: true,
  },
  denied: {
    tone: 'warning',
    title: 'GitHub authorisation was denied',
    body: 'Connect again and approve Diagit on GitHub.',
    reported: false,
  },
  failed: {
    tone: 'danger',
    title: 'GitHub authorisation could not start',
    body: 'Try again in a moment.',
    reported: true,
  },
}

export class GithubAccessSection {
  private readonly count = h('span', { class: 'count' })
  private readonly body = h('div', { class: 'card-rows' })
  private readonly status = h('p', { class: 'status' })

  constructor(
    private readonly deviceFlow: GithubDeviceFlow,
    private readonly tokens: GithubTokenStore,
    private readonly reportContext: ReportContext,
  ) {}

  mount(app: HTMLElement): void {
    app.append(
      h('section', { class: 'card' }, [
        h('div', { class: 'card-head' }, [h('h2', { text: 'GitHub access' }), this.count]),
        h('p', { class: 'card-desc' }, [
          'Needed only for private repositories on github.com. First ',
          externalLink(GITHUB_APP_INSTALL_URL, { text: 'install the GitHub App' }),
          ' on the repositories it may read, then connect.',
        ]),
        this.body,
        this.status,
        h('div', { class: 'card-foot' }, [
          h('span', {
            class: 'fine-print',
            text: 'Diagit reads only the repositories you install the GitHub App on. The token stays in this browser.',
          }),
        ]),
      ]),
    )
    void this.render()
  }

  private async render(failure?: NoticeDetails): Promise<void> {
    const [token, login, expired] = await Promise.all([
      this.tokens.token(),
      this.tokens.login(),
      this.tokens.connectionExpired(),
    ])
    if (token) {
      const connectedAs = login ? `Connected as @${login}` : 'Connected'
      this.count.textContent = connectedAs
      this.body.replaceChildren(this.connectedRow(connectedAs))
      return
    }
    this.count.textContent = 'Not connected'
    if (failure) {
      this.body.replaceChildren(new Notice(failure, 'row').element)
      return
    }
    const connect = h(
      'button',
      { class: 'btn btn-primary', type: 'button', onClick: () => void this.connect() },
      [lucideIcon(Link), 'Connect GitHub'],
    )
    this.body.replaceChildren(
      h('div', { class: 'card-row' }, [
        h('span', { class: 'card-row-text', text: expired ? EXPIRED_HINT : NOT_CONNECTED_HINT }),
        connect,
      ]),
    )
  }

  private connectedRow(connectedAs: string): HTMLElement {
    const disconnect = h(
      'button',
      { class: 'btn btn-quiet-danger', type: 'button', onClick: () => void this.disconnect() },
      [lucideIcon(Trash2), 'Disconnect'],
    )
    return h('div', { class: 'card-row' }, [
      h('span', { class: 'status-dot', 'aria-hidden': 'true' }),
      h('span', { class: 'card-row-text auth-connected', text: connectedAs }),
      externalLink(GITHUB_INSTALLED_APPS_URL, {
        class: 'btn btn-ghost',
        text: 'Uninstall on GitHub',
      }),
      disconnect,
    ])
  }

  private async connect(): Promise<void> {
    this.setStatus('')
    let code: DeviceCode
    try {
      code = await this.deviceFlow.requestDeviceCode()
    } catch (err) {
      return this.render(this.failureNotice(err))
    }

    this.showUserCode(code)
    this.setStatus('Waiting for you to authorise the code on github.com…')
    await browser.tabs.create({ url: code.verificationUri }).catch(() => undefined)

    try {
      const tokens = await this.deviceFlow.pollForToken(code)
      await this.tokens.connect(tokens, await this.deviceFlow.fetchViewerLogin(tokens.accessToken))
      this.setStatus('Connected.')
    } catch (err) {
      this.setStatus('')
      return this.render(this.failureNotice(err))
    }
    await this.render()
  }

  private async disconnect(): Promise<void> {
    await this.tokens.disconnect()
    this.setStatus('Disconnected.')
    await this.render()
  }

  private showUserCode(code: DeviceCode): void {
    const copyButton = h('button', {
      class: 'btn btn-secondary',
      type: 'button',
      text: 'Copy',
      title: 'Copy the code to your clipboard',
      onClick: () => this.copyUserCode(code.userCode, copyButton),
    })
    this.body.replaceChildren(
      h('div', { class: 'card-row card-row-stacked' }, [
        h('p', { class: 'auth-hint' }, [
          'Enter this code at ',
          externalLink(code.verificationUri, { text: 'github.com/login/device' }),
          ' (a new tab should open automatically):',
        ]),
        h('div', { class: 'user-code-row' }, [
          h('div', { class: 'user-code', text: code.userCode }),
          copyButton,
        ]),
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
    window.setTimeout(() => {
      button.textContent = original
    }, COPIED_FEEDBACK_MS)
  }

  private failureNotice(err: unknown): NoticeDetails | undefined {
    const reason = err instanceof DeviceFlowError ? err.reason : 'failed'
    if (reason === 'cancelled') {
      return undefined
    }
    const { reported, ...copy } = FAILURE_COPY[reason]
    const action = { label: 'Connect GitHub', icon: Link, onClick: () => void this.connect() }
    if (!reported) {
      return { ...copy, action }
    }
    return {
      ...copy,
      action,
      reportUrl: diagitRepository.problemReportUrl(
        `GitHub authorisation failed ${PLACE}`,
        `Diagit showed "${copy.title}" ${PLACE}.`,
        this.reportContext,
        err,
      ),
    }
  }

  private setStatus(text: string): void {
    this.status.textContent = text
  }
}
