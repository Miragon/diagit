import { CodeStartSetting, type CodeStart } from '../settings/CodeStartSetting'
import { CodeToggle } from './CodeToggle'

export interface FileCode {
  /** Identifies the file while the page is open, so a choice survives a remount by the host. */
  key: string
  hostCode: Element[]
  isLinked: boolean
  hideCode(hidden: boolean): void
}

/**
 * Whether the code under each panel of a page shows: the start from the options page, the
 * person's choice per file while the page is open, and the files that must keep their code.
 */
export class CodeVisibility {
  private startsShown = true
  private readonly choices = new Map<string, boolean>()
  private readonly openToggles = new Set<CodeToggle>()

  constructor(private readonly setting: CodeStartSetting = new CodeStartSetting()) {}

  /** Reads the start and follows it on open panels; returns the unsubscribe. */
  async load(): Promise<() => void> {
    let changedWhileReading = false
    const stopFollowing = this.setting.onChange((start) => {
      changedWhileReading = true
      this.follow(start)
    })
    const start = await this.setting.read()
    if (!changedWhileReading) {
      this.startsShown = start === 'shown'
    }
    return stopFollowing
  }

  toggleFor(file: FileCode): CodeToggle {
    const choice = this.choices.get(file.key)
    const toggle = new CodeToggle({
      shown: choice ?? this.startsShown,
      chosenByUser: choice !== undefined,
      hideCode: (hidden) => file.hideCode(hidden),
      toggled: (shown) => this.choices.set(file.key, shown),
    })
    if (file.isLinked) {
      toggle.keepCodeShown()
    }
    toggle.controls(file.hostCode)
    this.openToggles.add(toggle)
    return toggle
  }

  reviewCommentsChanged(toggle: CodeToggle, count: number): void {
    toggle.countReviewComments(count)
    if (count > 0) {
      toggle.keepCodeShown()
    }
  }

  private follow(start: CodeStart): void {
    this.startsShown = start === 'shown'
    for (const toggle of this.openToggles) {
      if (toggle.element.isConnected) {
        toggle.followStart(this.startsShown)
      } else {
        this.openToggles.delete(toggle)
      }
    }
  }
}
