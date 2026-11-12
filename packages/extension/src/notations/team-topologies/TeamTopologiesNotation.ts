import { NavigatedViewer } from '@miragon/team-topologies-renderer'
import rendererCss from '@miragon/team-topologies-renderer/assets/team-topologies.css?inline'
import { parseDocument, type TtDocument } from '@miragon/team-topologies-schema-model'
import { DiagramJsNotation } from '../DiagramJsNotation'
import type { ImportWarning } from '../DiagramJsViewer'
import { TEAM_TOPOLOGIES } from './descriptor'

export class TeamTopologiesNotation extends DiagramJsNotation<NavigatedViewer> {
  constructor() {
    super(TEAM_TOPOLOGIES, rendererCss)
  }

  protected createDiagram(container: HTMLElement): NavigatedViewer {
    return new NavigatedViewer({ container })
  }

  protected async importSource(
    diagram: NavigatedViewer,
    source: string,
  ): Promise<readonly ImportWarning[]> {
    return diagram.importDocument(this.parse(source), { fit: false }).warnings
  }

  private parse(source: string): TtDocument {
    const parsed = parseDocument(JSON.parse(source))
    if (!parsed.ok) {
      throw new Error(parsed.error)
    }
    return parsed.document
  }
}
