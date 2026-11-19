export type DiffSide = 'old' | 'new'

export type ShownSides = DiffSide | 'both'

export const SIDE_LABEL: Record<DiffSide, string> = {
  old: 'Before',
  new: 'After',
}
