import type {
  ChangeDetail,
  DiagramComparison,
  DiagramDiff,
  DiagramDiffer,
} from '../../src/notations/Notation'
import { FakeDiffableViewer } from './FakeDiffableViewer'

export class FakeDiffer implements DiagramDiffer {
  readonly css = ''
  readonly showsBpmnIoLogo = false
  readonly viewers: FakeDiffableViewer[] = []

  constructor(
    private readonly result: DiagramDiff = { added: [], removed: [], changed: [], moved: [] },
    private readonly knownIds: string[] = [],
    private readonly details: Record<string, ChangeDetail> = {},
  ) {}

  async compare(): Promise<DiagramComparison> {
    return { diff: this.result, detail: (id) => this.details[id] ?? null }
  }

  async createViewer(canvas: HTMLElement): Promise<FakeDiffableViewer> {
    canvas.append(Object.assign(document.createElement('svg'), { className: 'fake-diagram' }))
    const viewer = new FakeDiffableViewer(this.knownIds)
    this.viewers.push(viewer)
    return viewer
  }
}
