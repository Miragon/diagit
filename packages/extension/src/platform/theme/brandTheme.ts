import baseCss from '../ui/base.css?inline'
import canvasCss from './cd-canvas.css?inline'

const DOCUMENT_ROOT = /:root\b/g

export const SHADOW_BASE_CSS = baseCss.replace(DOCUMENT_ROOT, ':host')
export const SHADOW_CANVAS_CSS = canvasCss.replace(DOCUMENT_ROOT, ':host')
