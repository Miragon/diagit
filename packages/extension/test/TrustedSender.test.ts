import { describe, expect, it } from 'vitest'
import { TrustedSender, type MessageSender } from '../src/background/TrustedSender'

const senders = new TrustedSender('diagit-id')
const githubTab = { id: 7, url: 'https://github.com/o/r/pull/1' }
const ownTopFrame: MessageSender = { id: 'diagit-id', frameId: 0, tab: githubTab }

describe('TrustedSender.pageOf', () => {
  it('returns the tab of a message from our own content script in the top frame', () => {
    expect(senders.pageOf(ownTopFrame)).toEqual({ tabId: 7, url: githubTab.url })
  })

  it('refuses a foreign extension', () => {
    expect(senders.pageOf({ ...ownTopFrame, id: 'other-extension' })).toBeUndefined()
    expect(senders.pageOf({ ...ownTopFrame, id: undefined })).toBeUndefined()
  })

  it('refuses a sub frame', () => {
    expect(senders.pageOf({ ...ownTopFrame, frameId: 3 })).toBeUndefined()
    expect(senders.pageOf({ ...ownTopFrame, frameId: undefined })).toBeUndefined()
  })

  it('refuses a sender without a tab, tab id or tab url', () => {
    expect(senders.pageOf({ ...ownTopFrame, tab: undefined })).toBeUndefined()
    expect(senders.pageOf({ ...ownTopFrame, tab: { url: githubTab.url } })).toBeUndefined()
    expect(senders.pageOf({ ...ownTopFrame, tab: { id: 7 } })).toBeUndefined()
    expect(senders.pageOf({ ...ownTopFrame, tab: { id: 7, url: '' } })).toBeUndefined()
  })
})
