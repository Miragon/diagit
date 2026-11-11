export interface StoreListing {
  browser: 'chrome' | 'edge' | 'firefox'
  extensionId: string
  reviewUrl: string
}

export const STORE_LISTINGS: readonly StoreListing[] = [
  {
    browser: 'chrome',
    extensionId: 'bjphfmmlciflmdcnpfpbnkmgnkiabfdh',
    reviewUrl:
      'https://chromewebstore.google.com/detail/diagit/bjphfmmlciflmdcnpfpbnkmgnkiabfdh/reviews',
  },
  {
    browser: 'edge',
    extensionId: 'pphcelcgicmpdkkbginmkdogceepigen',
    reviewUrl: 'https://microsoftedge.microsoft.com/addons/detail/pphcelcgicmpdkkbginmkdogceepigen',
  },
  {
    browser: 'firefox',
    extensionId: 'diagit@miragon.io',
    reviewUrl: 'https://addons.mozilla.org/firefox/addon/diagit/reviews/',
  },
]
