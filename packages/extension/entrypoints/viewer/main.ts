import '../../src/platform/ui/base.css'
import './viewer.css'
import '../../src/platform/theme/cd-canvas.css'

import { notationDetector } from '../../src/notations/NotationDetector'
import { allNotations } from '../../src/notations/allNotations'
import { ExtensionEnvironment } from '../../src/platform/ExtensionEnvironment'
import { StandaloneViewerPage } from '../../src/views/standalone-viewer/StandaloneViewerPage'

const app = document.querySelector<HTMLElement>('#app')!

new StandaloneViewerPage(allNotations, notationDetector.fileExtensions(), {
  where: 'Standalone viewer',
  environment: ExtensionEnvironment.current().describe(),
}).mount(app)
