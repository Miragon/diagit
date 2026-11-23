const NOTATION_RENDERERS =
  '^src/notations/(NotationRegistry|DiagramJsViewer|allNotations|diffableNotations|[^/]+/(?!descriptor\\.ts$))'

const GIT_HOST_FOLDERS = '^src/git-hosts/(github|gitlab|self-hosted)/'
const GIT_HOST_PUBLIC_API = [
  '^src/git-hosts/github/(GithubHost|GithubTokenStore|GithubDeviceFlow|DeviceFlowError)\\.ts$',
  '^src/git-hosts/gitlab/GitlabHost\\.ts$',
  '^src/git-hosts/self-hosted/HostAccess\\.ts$',
]

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'views-stay-isolated',
      comment:
        'A view is one thing the user sees; views share code through notations/, git-hosts/ or platform/, never directly.',
      severity: 'error',
      from: { path: '^src/views/([^/]+)/' },
      to: { path: '^src/views/[^/]+/', pathNot: '^src/views/$1/' },
    },
    {
      name: 'only-entrypoints-know-views',
      severity: 'error',
      from: { path: '^src/(notations|git-hosts|platform|background)/' },
      to: { path: '^src/views/' },
    },
    {
      name: 'notations-stay-isolated',
      comment:
        'Each notation lives in its own folder and only meets the others through the contract in src/notations/.',
      severity: 'error',
      from: { path: '^src/notations/([^/]+)/' },
      to: { path: '^src/notations/[^/]+/', pathNot: '^src/notations/$1/' },
    },
    {
      name: 'notations-know-no-hosts',
      comment: 'A notation renders a file; which host the file comes from is none of its business.',
      severity: 'error',
      from: { path: '^src/notations/' },
      to: { path: ['^src/git-hosts/', '^src/background/'] },
    },
    {
      name: 'git-hosts-stay-light',
      comment:
        'Git hosts run in the background worker and the view router, so they may read notation descriptors but never load a renderer.',
      severity: 'error',
      from: { path: '^src/(git-hosts|background)/' },
      to: { path: NOTATION_RENDERERS },
    },
    {
      name: 'only-views-pick-notation-registries',
      comment:
        'The registries pull in every renderer they list; only a view decides which renderers its bundle carries.',
      severity: 'error',
      from: { pathNot: '^src/views/' },
      to: { path: '^src/notations/(allNotations|diffableNotations)\\.ts$' },
    },
    {
      name: 'git-hosts-only-through-public-api',
      comment:
        'Outside the git hosts, a host is used only through its public files; everything else in its folder is internal to the host.',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/git-hosts/[^/]+/' },
      to: { path: GIT_HOST_FOLDERS, pathNot: GIT_HOST_PUBLIC_API },
    },
    {
      name: 'git-hosts-stay-isolated',
      comment:
        'Git hosts meet each other only through the GitHost contract in src/git-hosts/ and their public files.',
      severity: 'error',
      from: { path: '^src/git-hosts/([^/]+)/' },
      to: { path: GIT_HOST_FOLDERS, pathNot: ['^src/git-hosts/$1/', ...GIT_HOST_PUBLIC_API] },
    },
    {
      name: 'platform-is-the-base',
      severity: 'error',
      from: { path: '^src/platform/' },
      to: { path: '^src/', pathNot: '^src/platform/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^src/',
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js'],
    },
  },
}
