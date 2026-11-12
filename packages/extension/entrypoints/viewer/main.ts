import '../../src/platform/ui/base.css'
import '../../src/platform/ui/viewer.css'
import './viewer.css'
import '../../src/platform/theme/cd-canvas.css'

import { notationDetector } from '../../src/notations/NotationDetector'
import { NOTATION_CATALOG } from '../../src/notations/notationCatalog'
import { allNotations } from '../../src/notations/allNotations'
import { ExtensionEnvironment } from '../../src/platform/ExtensionEnvironment'
import { StandaloneViewerPage } from '../../src/views/standalone-viewer/StandaloneViewerPage'

const app = document.querySelector<HTMLElement>('#app')!

new StandaloneViewerPage(
  allNotations,
  notationDetector.fileExtensions(),
  NOTATION_CATALOG.map((notation) => notation.label),
  {
    where: 'Standalone viewer',
    environment: ExtensionEnvironment.current().describe(),
  },
).mount(app)
