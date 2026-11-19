import type { DiffSide } from './DiffNotices'

export type ShownSides = DiffSide | 'both'

export const SIDE_LABEL: Record<DiffSide, string> = {
  old: 'Before',
  new: 'After',
}
