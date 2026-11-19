/** Loads one side of a diff, or resolves to `null` when the file does not exist on that side. */
export function sideLoader(
  exists: boolean,
  load: () => Promise<string>,
): () => Promise<string | null> {
  return exists ? load : () => Promise.resolve(null)
}
