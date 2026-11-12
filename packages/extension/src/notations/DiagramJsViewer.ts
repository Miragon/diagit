import { fitWithPadding, type FitCanvas } from '../platform/utils/fitWithPadding'
import { toggleZoomScroll } from '../platform/utils/zoomScroll'
import type { DiagramViewer } from './Notation'

export interface DiagramJsDiagram {
  get<T>(name: string): T
  destroy(): void
}

export interface ImportWarning {
  readonly message: string
}

interface ElementRegistry {
  getAll(): unknown[]
}

const ROOT_ELEMENT_ONLY = 1

export class DiagramJsViewer implements DiagramViewer {
  static async create(
    diagram: DiagramJsDiagram,
    importSource: () => Promise<readonly ImportWarning[]>,
  ): Promise<DiagramJsViewer> {
    try {
      const warnings = await importSource()
      DiagramJsViewer.failIfNothingWasImported(diagram, warnings)
    } catch (err) {
      diagram.destroy()
      throw err
    }
    const viewer = new DiagramJsViewer(diagram)
    viewer.setInteractive(false)
    viewer.fit()
    return viewer
  }

  private static failIfNothingWasImported(
    diagram: DiagramJsDiagram,
    warnings: readonly ImportWarning[],
  ): void {
    const [firstWarning] = warnings
    const importedElements = diagram.get<ElementRegistry>('elementRegistry').getAll().length
    if (firstWarning && importedElements <= ROOT_ELEMENT_ONLY) {
      throw new Error(firstWarning.message)
    }
  }

  private constructor(private readonly diagram: DiagramJsDiagram) {}

  fit(): void {
    fitWithPadding(this.canvas)
  }

  zoomBy(factor: number): void {
    this.canvas.zoom(this.canvas.zoom() * factor)
  }

  setInteractive(active: boolean): void {
    toggleZoomScroll(this.diagram, active)
  }

  destroy(): void {
    this.diagram.destroy()
  }

  private get canvas(): FitCanvas {
    return this.diagram.get<FitCanvas>('canvas')
  }
}
