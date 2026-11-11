import { Star, ThumbsUp, type IconNode } from 'lucide'
import { GITHUB_REPOSITORY_URL, STORE_LISTINGS } from '../../platform/star-prompt/storeListings'
import { h } from '../../platform/utils/dom'
import { externalLink } from '../../platform/utils/externalLink'
import { lucideIcon } from '../../platform/utils/lucideIcon'

const DOCS_URL = 'https://miragon.github.io/diagit/'
const PRIVACY_URL = `${DOCS_URL}privacy.html`
const FEATURE_REQUEST_URL = `${GITHUB_REPOSITORY_URL}/issues/new?template=feat.yml`
const APP_ICON_PATH = '/icon/icon.svg'

export class OptionsPageChrome {
  constructor(
    private readonly version: string,
    private readonly extensionId: string,
  ) {}

  header(): HTMLElement {
    return h('header', { class: 'page-header' }, [
      h('img', { class: 'app-icon', src: APP_ICON_PATH, alt: '' }),
      h('h1', { text: 'Diagit' }),
      h('span', { class: 'version', text: `v${this.version}` }),
    ])
  }

  supportCard(): HTMLElement {
    const reviewUrl = this.reviewUrl()
    const rate = reviewUrl ? [this.externalLink('Rate Diagit', reviewUrl, 'btn', ThumbsUp)] : []
    return h('aside', { class: 'card support' }, [
      h('div', { class: 'support-text' }, [
        h('strong', { text: 'Like Diagit?' }),
        h('span', { class: 'hint', text: 'A star or a rating helps other teams find it.' }),
      ]),
      this.externalLink('Star on GitHub', GITHUB_REPOSITORY_URL, 'btn', Star),
      ...rate,
    ])
  }

  footer(): HTMLElement {
    return h('footer', { class: 'page-footer' }, [
      this.externalLink('Docs', DOCS_URL),
      this.externalLink('Suggest a feature', FEATURE_REQUEST_URL),
      this.externalLink('Privacy', PRIVACY_URL),
      this.externalLink('Source code', GITHUB_REPOSITORY_URL),
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
