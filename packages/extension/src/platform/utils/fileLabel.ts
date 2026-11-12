import { File } from 'lucide'
import { h } from './dom'
import { lucideIcon } from './lucideIcon'

export function fileLabel(fileName: string, notationLabel: string): HTMLElement {
  return h('div', { class: 'diagit-file-label' }, [
    lucideIcon(File),
    h('span', { class: 'file-name', text: fileName }),
    h('span', { class: 'kind', text: notationLabel }),
  ])
}
