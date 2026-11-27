export const HOST_TAG = 'diagit-viewer'

export const DIFF_PANEL_TAG = 'diagit-diff'

export const PLACEMENT_NOTICE_TAG = 'diagit-placement-notice'

export const DIFF_ERROR_TAG = 'diagit-diff-error'

export const CODE_HIDDEN_ATTRIBUTE = 'data-code-hidden'

/** A file-page panel while the host's code under it is hidden. */
export const CODE_HIDDEN_HOST = `${HOST_TAG}[${CODE_HIDDEN_ATTRIBUTE}]`

/** A diff panel while the host's code under it is hidden. */
export const CODE_HIDDEN_DIFF_PANEL = `${DIFF_PANEL_TAG}[${CODE_HIDDEN_ATTRIBUTE}]`
