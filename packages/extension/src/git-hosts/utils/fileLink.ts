/**
 * A hash points into a file when it names an element inside the file, or starts with the id
 * the host gives the file (line anchors such as `diff-<id>R42` that are not rendered yet).
 */
export function isLinkedInto(fileRoot: HTMLElement, hash: string, fileIds: string[]): boolean {
  const target = decodeURIComponent(hash.replace(/^#/, ''))
  if (!target) {
    return false
  }
  const linked = fileRoot.ownerDocument.getElementById(target)
  if (linked && fileRoot.contains(linked)) {
    return true
  }
  return fileIds.some((id) => id !== '' && target.startsWith(id))
}
