import DmnNavigatedViewer from 'dmn-js/lib/NavigatedViewer'
import { detectHostTheme, diagramColors } from '../../platform/utils/hostTheme'
import { fitWithPadding, type FitCanvas } from '../../platform/utils/fitWithPadding'
import { onViewboxChange, type EventBus } from '../../platform/utils/viewboxChange'
import { toggleZoomScroll } from '../../platform/utils/zoomScroll'
import { ModelRejected } from '../../platform/ModelRejected'
import { rejectionOfUnparsedXml } from '../../platform/utils/modelSource'
import type { DiagramViewer } from '../Notation'

const DMN_NAMESPACE = 'https://www.omg.org/spec/DMN/20191111/MODEL/'
const DMN_FIT_PADDING = 64
const VIEWS_CHANGED = 'views.changed'

export class DmnViewer implements DiagramViewer {
  static async create(canvas: HTMLElement, xml: string): Promise<DmnViewer> {
    const { stroke, fill } = diagramColors(detectHostTheme(canvas))
    const viewer = new DmnNavigatedViewer({
      container: canvas,
      drd: {
        zoomScroll: { enabled: false },
        drdRenderer: {
          defaultFillColor: fill,
          defaultStrokeColor: stroke,
          defaultLabelColor: stroke,
        },
      },
    })
    try {
      await viewer.importXML(xml)
    } catch (err) {
      const failure = DmnViewer.rejectionOf(viewer, xml, err) ?? err
      viewer.destroy()
      throw failure
    }
    const dmnViewer = new DmnViewer(viewer)
    dmnViewer.fitViewportUnlessContainerIsUnmeasured()
    return dmnViewer
  }

  private static rejectionOf(
    viewer: DmnNavigatedViewer,
    xml: string,
    err: unknown,
  ): ModelRejected | null {
    if (!viewer.getDefinitions()) {
      return rejectionOfUnparsedXml(xml, DMN_NAMESPACE, err)
    }
    return viewer.getViews().length ? null : new ModelRejected('no-content', { cause: err })
  }

  private constructor(private readonly viewer: DmnNavigatedViewer) {}

  fit(): void {
    const canvas = this.activeCanvas()
    if (canvas) {
      fitWithPadding(canvas, DMN_FIT_PADDING)
    }
  }

  resized(): void {
    this.activeCanvas()?.resized()
  }

  zoomBy(factor: number): void {
    const canvas = this.activeCanvas()
    canvas?.zoom(canvas.zoom() * factor)
  }

  zoomLevel(): number | null {
    return this.activeCanvas()?.zoom() ?? null
  }

  onViewChange(listener: () => void): () => void {
    let stopFollowingViewbox = this.onActiveViewboxChange(listener)
    const followActiveView = () => {
      stopFollowingViewbox()
      stopFollowingViewbox = this.onActiveViewboxChange(listener)
      listener()
    }
    this.viewer.on(VIEWS_CHANGED, followActiveView)
    return () => {
      stopFollowingViewbox()
      this.viewer.off(VIEWS_CHANGED, followActiveView)
    }
  }

  setInteractive(active: boolean): void {
    toggleZoomScroll(this.viewer.getActiveViewer(), active)
  }

  destroy(): void {
    this.viewer.destroy()
  }

  private activeCanvas(): FitCanvas | undefined {
    try {
      return this.viewer.getActiveViewer()?.get<FitCanvas>('canvas')
    } catch {
      return undefined
    }
  }

  private onActiveViewboxChange(listener: () => void): () => void {
    const eventBus = this.activeEventBus()
    return eventBus ? onViewboxChange(eventBus, listener) : () => {}
  }

  private activeEventBus(): EventBus | undefined {
    try {
      return this.viewer.getActiveViewer()?.get<EventBus>('eventBus')
    } catch {
      return undefined
    }
  }

  private fitViewportUnlessContainerIsUnmeasured(): void {
    try {
      this.activeCanvas()?.zoom('fit-viewport')
    } catch {
      return
    }
  }
}
