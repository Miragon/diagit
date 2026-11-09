import canvasCss from './cd-canvas.css?inline'
import tokensCss from './cd-tokens.generated.css?inline'

const DOCUMENT_ROOT = /:root\b/g

export const SHADOW_TOKENS_CSS = tokensCss.replace(DOCUMENT_ROOT, ':host')
export const SHADOW_CANVAS_CSS = canvasCss.replace(DOCUMENT_ROOT, ':host')
