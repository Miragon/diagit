import { Bug, ChevronRight, ClipboardCopy, FileType, Lock, Server, type IconNode } from 'lucide'
import { h } from '../../platform/utils/dom'
import { externalLink } from '../../platform/utils/externalLink'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import type { DebugInfo, ExtensionSetup } from './DebugInfo'

const DOCS_URL = 'https://miragon.github.io/diagit/'
const COPIED_FEEDBACK_MS = 1500
const COPY_LABEL = 'Copy debug info'

const COMMON_FIXES: readonly { icon: IconNode; text: string; page: string }[] = [
  {
    icon: Lock,
    text: 'Private repositories on github.com need the GitHub App',
    page: 'private-repos.html',
  },
  {
    icon: Server,
    text: 'A self-hosted GitLab or GitHub Enterprise needs its domain allowed',
    page: 'self-hosted.html',
  },
  { icon: FileType, text: 'Which file types Diagit shows', page: 'notations.html' },
]

export class HelpSection {
  private readonly copyLabel = h('span', { text: COPY_LABEL })

  constructor(
    private readonly debugInfo: DebugInfo,
    private readonly setup: () => Promise<ExtensionSetup>,
  ) {}

  mount(app: HTMLElement): void {
    app.append(
      h('section', { class: 'card' }, [
        h('div', { class: 'card-head' }, [h('h2', { text: 'Something not working?' })]),
        h('p', { class: 'card-desc', text: 'Most problems have one of these causes.' }),
        ...COMMON_FIXES.map((fix) => this.fixLink(fix.icon, fix.text, `${DOCS_URL}${fix.page}`)),
        h('div', { class: 'card-foot' }, [
          this.reportButton(),
          this.copyButton(),
          h('span', {
            class: 'fine-print card-foot-end',
            text: 'No URLs, repository names or tokens.',
          }),
        ]),
      ]),
    )
  }

  private fixLink(icon: IconNode, text: string, url: string): HTMLElement {
    return externalLink(url, { class: 'card-row card-link' }, [
      lucideIcon(icon, 'card-row-icon'),
      h('span', { class: 'card-row-text', text }),
      lucideIcon(ChevronRight, 'card-link-chevron'),
    ])
  }

  private reportButton(): HTMLElement {
    const url = this.debugInfo.bugReportUrl()
    return externalLink(url, { class: 'btn btn-secondary' }, [lucideIcon(Bug), 'Report a bug'])
  }

  private copyButton(): HTMLButtonElement {
    return h(
      'button',
      {
        class: 'btn btn-ghost copy-debug-info',
        type: 'button',
        onClick: () => void this.copyDebugInfo(),
      },
      [lucideIcon(ClipboardCopy), this.copyLabel],
    )
  }

  private async copyDebugInfo(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.debugInfo.text(await this.setup()))
    } catch {
      return
    }
    this.copyLabel.textContent = 'Copied ✓'
    window.setTimeout(() => {
      this.copyLabel.textContent = COPY_LABEL
    }, COPIED_FEEDBACK_MS)
  }
}
