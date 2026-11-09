import '../../src/platform/theme/cd-tokens.generated.css'
import '../options/options.css'
import './alert.css'

import { AlertPage } from '../../src/views/alert/AlertPage'

const app = document.querySelector<HTMLElement>('#alert')!

new AlertPage(new URLSearchParams(location.search), () => window.close()).mount(app)
window.resizeBy(0, document.body.scrollHeight - window.innerHeight)
