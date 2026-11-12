import '../../src/platform/ui/base.css'
import '../../src/platform/ui/viewer.css'
import './viewer.css'
import '../../src/platform/theme/cd-canvas.css'

import { FetchProxy } from '../../src/background/FetchProxy'
import { FetchScope } from '../../src/background/FetchScope'
import { notationDetector } from '../../src/notations/NotationDetector'
import { NOTATION_CATALOG } from '../../src/notations/notationCatalog'
import { allNotations } from '../../src/notations/allNotations'
import { ExtensionEnvironment } from '../../src/platform/ExtensionEnvironment'
import { LinkedModelReader } from '../../src/views/standalone-viewer/LinkedModelReader'
import { StandaloneViewerPage } from '../../src/views/standalone-viewer/StandaloneViewerPage'

const app = document.querySelector<HTMLElement>('#app')!
const NO_AUTH_POLICIES = [] as const
const linkedModel = new URLSearchParams(location.search).get('src')

const page = new StandaloneViewerPage(
  allNotations,
  notationDetector.fileExtensions(),
  NOTATION_CATALOG.map((notation) => notation.label),
  {
    where: 'Standalone viewer',
    environment: ExtensionEnvironment.current().describe(),
  },
  new LinkedModelReader(new FetchProxy(NO_AUTH_POLICIES, new FetchScope())),
)
page.mount(app)
if (linkedModel) {
  void page.openLink(linkedModel)
}
