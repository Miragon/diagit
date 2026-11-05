import '../options/options.css'
import './alert.css'

import { AlertPage } from '../../src/views/alert/AlertPage'

const app = document.querySelector<HTMLElement>('#app')!

new AlertPage(new URLSearchParams(location.search), () => window.close()).mount(app)
window.resizeBy(0, document.body.scrollHeight - window.innerHeight)
