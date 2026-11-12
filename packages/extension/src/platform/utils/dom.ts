type Props = {
  class?: string
  text?: string
  title?: string
  type?: string
  [key: string]: any
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props,
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null) {
        continue
      }
      if (key === 'class') {
        el.className = value
      } else if (key === 'text') {
        el.textContent = value
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value)
      } else {
        el.setAttribute(key, String(value))
      }
    }
  }
  for (const child of children) {
    el.append(child)
  }
  return el
}
