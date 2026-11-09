export const gitlabSelectors = {
  blob: {
    content: [
      '[data-testid="blob-viewer-file-content"]',
      '.blob-viewer',
      '.blob-content-holder',
      'main .file-content',
    ],
    insertClimb: '.file-holder',
  },
  diff: {
    regionsThatOnlyMentionFiles: '.diff-tree-list, .md',
    fileRoot: '.diff-file, [data-testid="file-holder"], diff-file',
    pathAttr: '[data-path]',
    rapidDiffFileData: 'data-file-data',
    rapidDiffClosedBody: 'details[data-file-body]:not([open])',
    titleEl: '.file-title-name, [data-testid="file-title"]',
    contentExplicit:
      '.diff-content, [data-testid="diff-content"], [data-testid="rd-diff-file-body"]',
    titleForSibling:
      '.file-title, .js-file-title, [data-testid="file-title"], .file-title-flex-parent',
    collapseContent:
      '.diff-content, [data-testid="content-area"], [data-testid="diff-content"], [data-testid="rd-diff-file-body"]',
  },
}
