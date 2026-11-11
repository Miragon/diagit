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
      h('section', { class: 'section' }, [
        h('h2', { text: 'Something not working?' }),
        h('p', { class: 'intro', text: 'Most problems have one of these causes.' }),
        h('div', { class: 'card' }, [
          ...COMMON_FIXES.map((fix) => this.fixLink(fix.icon, fix.text, `${DOCS_URL}${fix.page}`)),
          h('div', { class: 'row help-actions' }, [
            this.reportButton(),
            this.copyButton(),
            h('span', { class: 'hint', text: 'No URLs, repository names or tokens.' }),
          ]),
        ]),
      ]),
    )
  }

  private fixLink(icon: IconNode, text: string, url: string): HTMLElement {
    return externalLink(url, { class: 'fix-link' }, [
      h('span', { class: 'fix-icon' }, [lucideIcon(icon)]),
      h('span', { class: 'fix-text', text }),
      lucideIcon(ChevronRight),
    ])
  }

  private reportButton(): HTMLElement {
    const url = this.debugInfo.bugReportUrl()
    return externalLink(url, { class: 'btn primary' }, [lucideIcon(Bug), 'Report a bug'])
  }

  private copyButton(): HTMLButtonElement {
    const button = h('button', { class: 'btn copy-debug-info', type: 'button' }, [
      lucideIcon(ClipboardCopy),
      this.copyLabel,
    ])
    button.addEventListener('click', () => void this.copyDebugInfo(button))
    return button
  }

  private async copyDebugInfo(button: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.debugInfo.text(await this.setup()))
    } catch {
      return
    }
    this.copyLabel.textContent = 'Copied ✓'
    button.classList.add('copied')
    window.setTimeout(() => {
      this.copyLabel.textContent = COPY_LABEL
      button.classList.remove('copied')
    }, COPIED_FEEDBACK_MS)
  }
}
