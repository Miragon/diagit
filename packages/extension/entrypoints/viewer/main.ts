import '../../src/platform/theme/cd-tokens.generated.css'
import './viewer.css'
import '../../src/platform/theme/cd-canvas.css'

import { notationDetector } from '../../src/notations/NotationDetector'
import { allNotations } from '../../src/notations/allNotations'
import { StandaloneViewerPage } from '../../src/views/standalone-viewer/StandaloneViewerPage'

const app = document.querySelector<HTMLElement>('#app')!

new StandaloneViewerPage(allNotations, notationDetector.fileExtensions()).mount(app)
