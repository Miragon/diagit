import { CODE_HIDDEN_ATTRIBUTE } from '../injectedElements'
import type { HostPage } from '../page/HostPage'
import { CodeStartSetting, type CodeStart } from '../settings/CodeStartSetting'
import { CodeToggle } from './CodeToggle'

export interface FileCode {
  /** Identifies the file while the page is open, so a choice survives a remount by the host. */
  key: string
  hostCode: Element[]
  isLinked: boolean
  /** Diagit's own panel above the code, marked while the code under it is hidden. */
  panel: HTMLElement
}

/**
 * Whether the code under each panel of a page shows: the start from the options page, the
 * person's choice per file while the page is open, and the files that must keep their code.
 */
export class CodeVisibility {
  private startsShown = true
  private readonly choices = new Map<string, boolean>()
  /** The newest toggle per file: a remount replaces the toggle of the panel before. */
  private readonly openToggles = new Map<string, CodeToggle>()

  constructor(private readonly setting: CodeStartSetting = new CodeStartSetting()) {}

  /**
   * Adds the page's rule that hides the code under a marked panel, reads the start and follows
   * it on open panels until the page is invalidated.
   */
  async start(page: HostPage, hiddenCodeCss: string): Promise<void> {
    page.addDocumentStyle(hiddenCodeCss)
    const stopFollowing = await this.setting.follow((start) => this.follow(start))
    if (page.isInvalid) {
      stopFollowing()
    } else {
      page.onInvalidated(stopFollowing)
    }
  }

  toggleFor(file: FileCode): CodeToggle {
    const choice = this.choices.get(file.key)
    const toggle = new CodeToggle({
      shown: choice ?? this.startsShown,
      chosenByUser: choice !== undefined,
      hideCode: (hidden) => file.panel.toggleAttribute(CODE_HIDDEN_ATTRIBUTE, hidden),
      toggled: (shown) => this.choices.set(file.key, shown),
    })
    if (file.isLinked) {
      toggle.keepCodeShown()
    }
    toggle.controls(file.hostCode)
    this.openToggles.set(file.key, toggle)
    return toggle
  }

  private follow(start: CodeStart): void {
    this.startsShown = start === 'shown'
    for (const [key, toggle] of this.openToggles) {
      if (toggle.element.isConnected) {
        toggle.followStart(this.startsShown)
      } else {
        this.openToggles.delete(key)
      }
    }
  }
}
