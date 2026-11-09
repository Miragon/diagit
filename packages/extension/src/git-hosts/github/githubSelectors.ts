export const githubSelectors = {
  blob: {
    content: ['[data-testid="code-lines-container"]', '#read-only-cursor-text-area'],
    insertClimb: 'section',
  },
  diff: {
    regionsThatOnlyMentionFiles: '.markdown-body',
    fileRootLegacy: '.file[data-tagsearch-path], .js-file',
    diffHeaderWrapper: '[data-diff-header-wrapper]',
    modernRootClimb: 'div[id^="diff-"]',
    pathAttrs: ['data-tagsearch-path', 'data-path'],
    legacyPathEl: '.file-info a, .file-header [title]',
    modernHeading: '[data-diff-header-wrapper] h3',
    modernCode: 'table[data-diff-anchor]',
    legacyCode: '.js-file-content, .data.highlight, .diff-table',
  },
}
