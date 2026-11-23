import { WebOrigin } from '../platform/WebOrigin'

export interface MessageSender {
  id?: string
  origin?: string
  url?: string
  tab?: { id?: number; url?: string; incognito?: boolean }
}

export interface SenderPage {
  tabId: number
  origin: WebOrigin
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
    const tabOrigin = WebOrigin.of(tab.url)
    if (!tabOrigin || !tabOrigin.equals(this.frameOrigin(sender))) {
      return undefined
    }
    return { tabId: tab.id, origin: tabOrigin, incognito: tab.incognito === true }
  }

  private frameOrigin(sender: MessageSender): WebOrigin | null {
    const frame = sender.origin ?? sender.url
    return frame ? WebOrigin.of(frame) : null
  }
}
