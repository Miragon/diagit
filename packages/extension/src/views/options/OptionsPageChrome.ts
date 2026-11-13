import { FolderOpen, Lock, Star, ThumbsUp, type IconNode } from 'lucide'
import { STORE_LISTINGS } from '../../platform/star-prompt/storeListings'
import { diagitRepository } from '../../platform/DiagitRepository'
import { h } from '../../platform/utils/dom'
import { externalLink } from '../../platform/utils/externalLink'
import { lucideIcon } from '../../platform/utils/lucideIcon'
import { ProcessSketch } from './ProcessSketch'

const DOCS_URL = 'https://miragon.github.io/diagit/'
const PRIVACY_URL = `${DOCS_URL}privacy.html`
const APP_ICON_PATH = '/icon/icon.svg'
const VIEWER_PATH = '/viewer.html'
const FOOTER_LINK = 'btn btn-ghost btn-small'

export class OptionsPageChrome {
  constructor(
    private readonly version: string,
    private readonly extensionId: string,
  ) {}

  header(): HTMLElement {
    return h('header', { class: 'page-header' }, [
      h('img', { class: 'app-icon', src: APP_ICON_PATH, alt: '' }),
      h('h1', { text: 'Diagit' }),
      h('span', { class: 'page-subtitle', text: 'Options' }),
      h('span', { class: 'version', text: `v${this.version}` }),
    ])
  }

  viewerCard(): HTMLElement {
    return h('section', { class: 'card viewer-card' }, [
      h('div', { class: 'viewer-card-body' }, [
        h('h2', { text: 'See any model in seconds' }),
        h('p', {
          class: 'lede',
          text: 'Open a BPMN, DMN, Event Storming or Wardley file from your disk. No repository, no upload, no setup.',
        }),
        h('div', { class: 'viewer-card-actions' }, [
          h('a', { class: 'btn btn-primary', href: VIEWER_PATH }, [
            lucideIcon(FolderOpen),
            'Open a file',
          ]),
          h('span', { class: 'viewer-card-private' }, [
            lucideIcon(Lock),
            'The file stays on your machine',
          ]),
        ]),
      ]),
      h('div', { class: 'viewer-card-art' }, [new ProcessSketch().element()]),
    ])
  }

  supportCard(): HTMLElement {
    const reviewUrl = this.reviewUrl()
    const rate = reviewUrl
      ? [this.externalLink('Rate Diagit', reviewUrl, 'btn btn-secondary', ThumbsUp)]
      : []
    return h('aside', { class: 'card' }, [
      h('div', { class: 'card-head support' }, [
        h('div', { class: 'support-text' }, [
          h('h2', { text: 'Like Diagit?' }),
          h('p', { class: 'lede', text: 'A star or a rating helps other teams find it.' }),
        ]),
        this.externalLink('Star on GitHub', diagitRepository.url, 'btn btn-secondary', Star),
        ...rate,
      ]),
    ])
  }

  footer(): HTMLElement {
    return h('footer', { class: 'page-footer' }, [
      this.externalLink('Docs', DOCS_URL, FOOTER_LINK),
      this.externalLink('Suggest a feature', diagitRepository.featureRequestUrl(), FOOTER_LINK),
      this.externalLink('Privacy', PRIVACY_URL, FOOTER_LINK),
      this.externalLink('Source code', diagitRepository.url, FOOTER_LINK),
      h('span', { class: 'made-by', text: 'Made by Miragon' }),
    ])
  }

  private reviewUrl(): string | undefined {
    return STORE_LISTINGS.find((listing) => listing.extensionId === this.extensionId)?.reviewUrl
  }

  private externalLink(label: string, url: string, className?: string, icon?: IconNode) {
    const content = icon ? [lucideIcon(icon), label] : [label]
    return externalLink(url, { class: className }, content)
  }
}
