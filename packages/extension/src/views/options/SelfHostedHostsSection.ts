import { browser } from 'wxt/browser'
import type { GitHost } from '../../git-hosts/GitHost'
import type { HostAccess } from '../../git-hosts/self-hosted/HostAccess'
import type { SelfHostedHost } from '../../git-hosts/self-hosted/SelfHostedHostStore'
import { h } from '../../platform/utils/dom'
import { errorMessage } from '../../platform/utils/errorMessage'
import { normalizeOrigin, originToPattern } from '../../platform/utils/origin'

const INTRO =
  'gitlab.com and github.com work out of the box. For a self-hosted GitLab or GitHub Enterprise instance, the quickest way is to open a .bpmn file (or a merge request) there and click the extension icon, or right-click the page and choose "Enable Diagit on this domain". You can also add a domain manually below.'

export interface HostChoices {
  all(): readonly GitHost[]
  hostById(id: string | undefined): GitHost | undefined
}

type StatusKind = 'error' | 'ok'

export class SelfHostedHostsSection {
  private readonly originInput = h('input', {
    type: 'text',
    class: 'input origin',
    placeholder: 'https://gitlab.example.com',
  }) as HTMLInputElement
  private readonly typeSelect = h('select', { class: 'input' }) as HTMLSelectElement
  private readonly addButton = h('button', {
    class: 'btn primary',
    type: 'button',
    text: 'Add instance',
  })
  private readonly status = h('p', { class: 'status' })
  private readonly list = h('ul', { class: 'list' })

  constructor(
    private readonly access: HostAccess,
    private readonly hosts: HostChoices,
  ) {}

  mount(app: HTMLElement): void {
    this.typeSelect.append(
      ...this.hosts.all().map((host) => h('option', { value: host.id, text: host.label })),
    )
    app.append(
      h('h1', { text: 'Self-hosted instances' }),
      h('p', { class: 'intro', text: INTRO }),
      h('div', { class: 'card' }, [
        h('div', { class: 'row' }, [this.originInput, this.typeSelect, this.addButton]),
        this.status,
      ]),
      h('div', { class: 'card' }, [this.list]),
    )
    this.addButton.addEventListener('click', () => void this.add())
    this.originInput.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') void this.add()
    })
    void this.refresh()
  }

  private async add(): Promise<void> {
    const origin = normalizeOrigin(this.originInput.value)
    if (!origin) return this.setStatus('Enter a valid http(s) URL.', 'error')

    let granted: boolean
    try {
      granted = await browser.permissions.request({ origins: [originToPattern(origin)] })
    } catch (err) {
      return this.setStatus(`Could not request permission: ${errorMessage(err)}`, 'error')
    }
    if (!granted) return this.setStatus('Permission was not granted.', 'error')

    await this.access.label(origin, this.typeSelect.value)
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
    if (!hosts.length) {
      this.list.replaceChildren(
        h('li', { class: 'empty', text: 'No self-hosted instances added yet.' }),
      )
      return
    }
    this.list.replaceChildren(...hosts.map((host) => this.renderRow(host)))
  }

  private renderRow(host: SelfHostedHost): HTMLElement {
    const remove = h('button', { class: 'btn danger', type: 'button', text: 'Remove' })
    remove.addEventListener('click', () => void this.remove(host))
    return h('li', {}, [
      h('span', { class: 'origin-name', text: host.origin }),
      h('span', { class: 'badge', text: this.hosts.hostById(host.type)?.label ?? 'Self-hosted' }),
      remove,
    ])
  }

  private setStatus(text: string, kind: StatusKind): void {
    this.status.textContent = text
    this.status.className = `status ${kind}`
  }
}
