/**
 * A hash points into a file when it names an element inside the file, or starts with the id
 * the host gives the file (line anchors such as `diff-<id>R42` that are not rendered yet).
 * A hash that does not decode, such as `#50%off`, is taken as written.
 */
export function isLinkedInto(fileRoot: HTMLElement, hash: string, fileIds: string[]): boolean {
  const written = hash.replace(/^#/, '')
  let target = written
  try {
    target = decodeURIComponent(written)
  } catch {
    // Not percent-encoded as a URI component; the hash is used as written.
  }
  if (!target) {
    return false
  }
  const linked = fileRoot.ownerDocument.getElementById(target)
  if (linked && fileRoot.contains(linked)) {
    return true
  }
  return fileIds.some((id) => id !== '' && target.startsWith(id))
}
