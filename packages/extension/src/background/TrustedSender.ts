const TOP_FRAME_ID = 0

export interface MessageSender {
  id?: string
  frameId?: number
  tab?: { id?: number; url?: string }
}

export interface SenderPage {
  tabId: number
  url: string
}

export class TrustedSender {
  constructor(private readonly extensionId: string) {}

  pageOf(sender: MessageSender): SenderPage | undefined {
    const { id, frameId, tab } = sender
    if (id !== this.extensionId || frameId !== TOP_FRAME_ID) return undefined
    if (tab?.id == null || !tab.url) return undefined
    return { tabId: tab.id, url: tab.url }
  }
}
