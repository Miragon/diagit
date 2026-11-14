import { Settings } from 'lucide'
import { h } from '../utils/dom'
import { lucideIcon } from '../utils/lucideIcon'

export class ViewerHeader {
  readonly element = h('header', { class: 'page-header' }, [
    h('img', { class: 'app-icon', src: '/icon/icon.svg', alt: '' }),
    h('h1', { text: 'Diagit' }),
    h('span', { class: 'page-subtitle', text: 'Viewer' }),
    h('a', { class: 'btn btn-ghost page-header-end', href: '/options.html' }, [
      lucideIcon(Settings),
      'Options',
    ]),
  ])
}
