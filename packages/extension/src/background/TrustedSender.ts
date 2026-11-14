import { webOrigin } from '../platform/utils/origin'

export interface MessageSender {
  id?: string
  origin?: string
  url?: string
  tab?: { id?: number; url?: string; incognito?: boolean }
}

export interface SenderPage {
  tabId: number
  origin: string
  incognito: boolean
}

export class TrustedSender {
  constructor(private readonly extensionId: string) {}

  isOwn(sender: MessageSender): boolean {
    return sender.id === this.extensionId
  }

  pageOf(sender: MessageSender): SenderPage | undefined {
    const { tab } = sender
    if (!this.isOwn(sender) || tab?.id == null || !tab.url) {
      return undefined
    }
    const tabOrigin = webOrigin(tab.url)
    if (!tabOrigin || this.frameOrigin(sender) !== tabOrigin) {
      return undefined
    }
    return { tabId: tab.id, origin: tabOrigin, incognito: tab.incognito === true }
  }

  private frameOrigin(sender: MessageSender): string | null {
    if (sender.origin) {
      return sender.origin
    }
    return sender.url ? webOrigin(sender.url) : null
  }
}
