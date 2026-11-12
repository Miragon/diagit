import { File } from 'lucide'
import { h } from './dom'
import { lucideIcon } from './lucideIcon'

export function fileLabel(filePath: string, notationLabel: string): HTMLElement {
  return h('div', { class: 'diagit-file-label' }, [
    lucideIcon(File),
    h('span', { class: 'file-name', text: filePath.slice(filePath.lastIndexOf('/') + 1) }),
    h('span', { class: 'kind', text: notationLabel }),
  ])
}
