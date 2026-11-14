import { describe, expect, it } from 'vitest'
import { TrustedSender, type MessageSender } from '../src/background/TrustedSender'

const senders = new TrustedSender('diagit-id')
const githubTab = { id: 7, url: 'https://github.com/o/r/pull/1' }
const chromeTopFrame: MessageSender = {
  id: 'diagit-id',
  origin: 'https://github.com',
  url: githubTab.url,
  tab: githubTab,
}
const firefoxTopFrame: MessageSender = { id: 'diagit-id', url: githubTab.url, tab: githubTab }

describe('TrustedSender.pageOf', () => {
  it('returns the tab and origin of our own content script on the tab origin', () => {
    expect(senders.pageOf(chromeTopFrame)).toEqual({
      tabId: 7,
      origin: 'https://github.com',
      incognito: false,
    })
  })

  it('falls back to the frame url where the browser sends no origin', () => {
    expect(senders.pageOf(firefoxTopFrame)).toEqual({
      tabId: 7,
      origin: 'https://github.com',
      incognito: false,
    })
  })

  it('accepts a prerendered page, whose top frame has no frame id 0', () => {
    const prerendered = { ...chromeTopFrame, frameId: 42, documentLifecycle: 'prerender' }
    expect(senders.pageOf(prerendered)).toEqual({
      tabId: 7,
      origin: 'https://github.com',
      incognito: false,
    })
  })

  it('tells whether the tab is incognito', () => {
    const incognitoTab = { ...chromeTopFrame, tab: { ...githubTab, incognito: true } }
    expect(senders.pageOf(incognitoTab)?.incognito).toBe(true)
  })

  it('refuses a foreign extension', () => {
    expect(senders.pageOf({ ...chromeTopFrame, id: 'other-extension' })).toBeUndefined()
    expect(senders.pageOf({ ...chromeTopFrame, id: undefined })).toBeUndefined()
  })

  it('refuses a frame whose origin differs from the tab', () => {
    const iframe = { ...chromeTopFrame, origin: 'https://viewscreen.githubusercontent.com' }
    expect(senders.pageOf(iframe)).toBeUndefined()
    expect(senders.pageOf({ ...firefoxTopFrame, url: 'https://evil.example/x' })).toBeUndefined()
    expect(senders.pageOf({ ...chromeTopFrame, origin: 'null' })).toBeUndefined()
  })

  it('refuses a sender without a frame origin or url', () => {
    expect(senders.pageOf({ ...firefoxTopFrame, url: undefined })).toBeUndefined()
    expect(senders.pageOf({ ...firefoxTopFrame, url: 'not a url' })).toBeUndefined()
  })

  it('refuses a sender without a tab, tab id or web tab url', () => {
    expect(senders.pageOf({ ...chromeTopFrame, tab: undefined })).toBeUndefined()
    expect(senders.pageOf({ ...chromeTopFrame, tab: { url: githubTab.url } })).toBeUndefined()
    expect(senders.pageOf({ ...chromeTopFrame, tab: { id: 7 } })).toBeUndefined()
    expect(senders.pageOf({ ...chromeTopFrame, tab: { id: 7, url: 'not a url' } })).toBeUndefined()
    const blankTab = { id: 7, url: 'about:blank' }
    expect(senders.pageOf({ id: 'diagit-id', url: 'about:blank', tab: blankTab })).toBeUndefined()
  })
})

describe('TrustedSender.isOwn', () => {
  it('knows our own extension pages, which belong to no web page', () => {
    const viewer = { id: 'diagit-id', url: 'chrome-extension://diagit-id/viewer.html' }
    expect(senders.isOwn(viewer)).toBe(true)
    expect(senders.pageOf(viewer)).toBeUndefined()
  })

  it('refuses another extension', () => {
    expect(senders.isOwn({ ...chromeTopFrame, id: 'other-id' })).toBe(false)
  })
})
