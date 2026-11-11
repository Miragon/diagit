import { h } from './dom'

type ExternalLinkProps = {
  class?: string
  text?: string
}

export function externalLink(
  href: string,
  props: ExternalLinkProps = {},
  children: (Node | string)[] = [],
): HTMLAnchorElement {
  return h('a', { ...props, href, target: '_blank', rel: 'noopener noreferrer' }, children)
}
