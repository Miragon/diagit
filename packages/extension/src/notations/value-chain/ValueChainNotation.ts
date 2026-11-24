import { NavigatedViewer } from '@miragon/value-chain-renderer'
import rendererCss from '@miragon/value-chain-renderer/assets/value-chain.css?inline'
import { loadDocument } from '@miragon/value-chain-schema-model'
import { DiagramJsNotation } from '../DiagramJsNotation'
import { parseJsonModel } from '../../platform/utils/parseJsonModel'
import type { ImportWarning } from '../DiagramJsViewer'
import { VALUE_CHAIN } from './descriptor'

export class ValueChainNotation extends DiagramJsNotation<NavigatedViewer> {
  constructor() {
    super(VALUE_CHAIN, rendererCss)
  }

  protected createDiagram(container: HTMLElement): NavigatedViewer {
    return new NavigatedViewer({ container, fitOnImport: false })
  }

  protected async importSource(
    diagram: NavigatedViewer,
    source: string,
  ): Promise<readonly ImportWarning[]> {
    return diagram.importDocument(parseJsonModel(source, loadDocument))
  }
}
