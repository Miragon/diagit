import { Server, Trash2 } from 'lucide'
import { browser } from 'wxt/browser'
import type { HostAccess } from '../../git-hosts/self-hosted/HostAccess'
import type { SelfHostedHost } from '../../git-hosts/self-hosted/SelfHostedHostStore'
import { h } from '../../platform/utils/dom'
import { errorMessage } from '../../platform/utils/errorMessage'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import { normalizeOrigin, originToPattern } from '../../platform/utils/origin'

const INTRO =
  'gitlab.com and github.com work without setup. Add your own GitLab or GitHub Enterprise here, or click the Diagit icon on one of its pages.'

type StatusKind = 'error' | 'ok'

export class SelfHostedHostsSection {
  private readonly originInput = h('input', {
    type: 'text',
    class: 'input',
    placeholder: 'https://gitlab.example.com',
    'aria-label': 'Instance URL',
  }) as HTMLInputElement
  private readonly addButton = h('button', {
    class: 'btn btn-large btn-primary',
    type: 'button',
    text: 'Add instance',
  })
  private readonly status = h('p', { class: 'status' })
  private readonly count = h('span', { class: 'count' })
  private readonly rows = h('div', { class: 'card-rows' })

  constructor(private readonly access: HostAccess) {}

  mount(app: HTMLElement): void {
    app.append(
      h('section', { class: 'card' }, [
        h('div', { class: 'card-head' }, [h('h2', { text: 'Self-hosted instances' }), this.count]),
        h('p', { class: 'card-desc', text: INTRO }),
        this.rows,
        h('div', { class: 'card-foot' }, [this.originInput, this.addButton]),
        this.status,
      ]),
    )
    this.addButton.addEventListener('click', () => void this.add())
    this.originInput.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') {
        void this.add()
      }
    })
    void this.refresh()
  }

  private async add(): Promise<void> {
    const origin = normalizeOrigin(this.originInput.value)
    if (!origin) {
      return this.setStatus('Enter a valid http(s) URL.', 'error')
    }

    let granted: boolean
    try {
      granted = await browser.permissions.request({ origins: [originToPattern(origin)] })
    } catch (err) {
      return this.setStatus(`Could not request permission: ${errorMessage(err)}`, 'error')
    }
    if (!granted) {
      return this.setStatus('Permission was not granted.', 'error')
    }

    await this.access.add(origin)
    this.originInput.value = ''
    this.setStatus(`Added ${origin}.`, 'ok')
    await this.refresh()
  }

  private async remove(host: SelfHostedHost): Promise<void> {
    const pattern = originToPattern(host.origin)
    await this.access.revoke([pattern])
    await browser.permissions.remove({ origins: [pattern] }).catch(() => undefined)
    this.setStatus(`Removed ${host.origin}.`, 'ok')
    await this.refresh()
  }

  private async refresh(): Promise<void> {
    const hosts = await this.access.list()
    this.count.textContent = hosts.length === 1 ? '1 instance' : `${hosts.length} instances`
    if (!hosts.length) {
      this.rows.replaceChildren(
        h('div', { class: 'card-row card-empty', text: 'No self-hosted instances added yet.' }),
      )
      return
    }
    this.rows.replaceChildren(...hosts.map((host) => this.renderRow(host)))
  }

  private renderRow(host: SelfHostedHost): HTMLElement {
    const remove = h(
      'button',
      { class: 'btn btn-quiet-danger', type: 'button', 'aria-label': `Remove ${host.origin}` },
      [lucideIcon(Trash2), 'Remove'],
    )
    remove.addEventListener('click', () => void this.remove(host))
    return h('div', { class: 'card-row' }, [
      lucideIcon(Server, 'card-row-icon'),
      h('span', { class: 'card-row-text', text: host.origin }),
      remove,
    ])
  }

  private setStatus(text: string, kind: StatusKind): void {
    this.status.textContent = text
    this.status.className = `status ${kind}`
    this.originInput.setAttribute('aria-invalid', String(kind === 'error'))
  }
}
