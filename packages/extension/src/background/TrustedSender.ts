import { webOrigin } from '../platform/utils/origin'

export interface MessageSender {
  id?: string
  origin?: string
  url?: string
  tab?: { id?: number; url?: string }
}

export interface SenderPage {
  tabId: number
  origin: string
}

export class TrustedSender {
  constructor(private readonly extensionId: string) {}

  pageOf(sender: MessageSender): SenderPage | undefined {
    const { id, tab } = sender
    if (id !== this.extensionId || tab?.id == null || !tab.url) return undefined
    const tabOrigin = webOrigin(tab.url)
    if (!tabOrigin || this.frameOrigin(sender) !== tabOrigin) return undefined
    return { tabId: tab.id, origin: tabOrigin }
  }

  private frameOrigin(sender: MessageSender): string | null {
    if (sender.origin) return sender.origin
    return sender.url ? webOrigin(sender.url) : null
  }
}
