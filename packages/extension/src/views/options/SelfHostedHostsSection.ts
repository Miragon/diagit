import { Server } from 'lucide'
import { browser } from 'wxt/browser'
import type { HostAccess } from '../../git-hosts/self-hosted/HostAccess'
import type { SelfHostedHost } from '../../git-hosts/self-hosted/SelfHostedHostStore'
import { h } from '../../platform/utils/dom'
import { errorMessage } from '../../platform/utils/errorMessage'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import { normalizeOrigin, originToPattern } from '../../platform/utils/origin'

const INTRO =
  'gitlab.com and github.com work out of the box. For a self-hosted GitLab or GitHub Enterprise instance, the quickest way is to open a .bpmn file (or a merge request) there and click the extension icon, or right-click the page and choose "Enable Diagit on this domain". You can also add a domain manually below.'

type StatusKind = 'error' | 'ok'

export class SelfHostedHostsSection {
  private readonly originInput = h('input', {
    type: 'text',
    class: 'input',
    placeholder: 'https://gitlab.example.com',
    'aria-label': 'Instance URL',
  }) as HTMLInputElement
  private readonly addButton = h('button', {
    class: 'btn btn-primary add-instance',
    type: 'button',
    text: 'Add instance',
  })
  private readonly status = h('p', { class: 'status' })
  private readonly count = h('th', { scope: 'col', class: 'count' })
  private readonly rows = h('tbody')

  constructor(private readonly access: HostAccess) {}

  mount(app: HTMLElement): void {
    app.append(
      h('section', { class: 'section' }, [
        h('h2', { text: 'Self-hosted instances' }),
        h('p', { class: 'intro', text: INTRO }),
        h('div', { class: 'card instances-card' }, [this.instanceTable()]),
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
        h('tr', {}, [
          h('td', { class: 'empty', colspan: '2' }, [
            lucideIcon(Server),
            'No self-hosted instances added yet.',
          ]),
        ]),
      )
      return
    }
    this.rows.replaceChildren(...hosts.map((host) => this.renderRow(host)))
  }

  private instanceTable(): HTMLTableElement {
    return h('table', { class: 'instances' }, [
      h('thead', {}, [h('tr', {}, [h('th', { scope: 'col', text: 'Instance' }), this.count])]),
      this.rows,
      h('tfoot', {}, [
        h('tr', {}, [h('td', {}, [this.originInput, this.status]), h('td', {}, [this.addButton])]),
      ]),
    ])
  }

  private renderRow(host: SelfHostedHost): HTMLElement {
    const remove = h('button', {
      class: 'btn btn-quiet-danger',
      type: 'button',
      text: 'Remove',
      'aria-label': `Remove ${host.origin}`,
    })
    remove.addEventListener('click', () => void this.remove(host))
    return h('tr', {}, [h('td', { text: host.origin }), h('td', {}, [remove])])
  }

  private setStatus(text: string, kind: StatusKind): void {
    this.status.textContent = text
    this.status.className = `status ${kind}`
    this.originInput.setAttribute('aria-invalid', String(kind === 'error'))
  }
}
