import { miragonDocs } from './miragon/config'

export default miragonDocs({
  repo: 'Miragon/diagit',
  title: 'Miragon Diagit',
  description:
    'A browser extension that renders diagram models inline on GitLab and GitHub and shows a visual before/after diff in merge and pull requests.',
  githubStars: false,
  footerMessage: 'Released under the MIT License.',
  nav: [
    { text: 'Getting started', link: '/getting-started' },
    { text: 'Review changes', link: '/review-changes' },
    { text: 'Notations', link: '/notations' },
  ],
  sidebar: [
    {
      text: 'Start',
      items: [{ text: 'Getting started', link: '/getting-started' }],
    },
    {
      text: 'Use',
      items: [
        { text: 'Review a model change', link: '/review-changes' },
        { text: 'Supported notations', link: '/notations' },
      ],
    },
    {
      text: 'Setup',
      items: [
        { text: 'Self-hosted instances', link: '/self-hosted' },
        { text: 'Private repos on github.com', link: '/private-repos' },
      ],
    },
    {
      text: 'Trust',
      items: [{ text: 'Privacy and permissions', link: '/privacy' }],
    },
  ],
})
