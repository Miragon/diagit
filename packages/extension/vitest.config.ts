import { defineConfig } from 'vitest/config'

// Two projects so the fast pure-logic suite keeps running in Node while the
// DOM-component tests (content-script injection points, injected UI builders)
// get a real `document` via happy-dom. Keeping them apart means the node suite
// stays free of any accidental DOM globals.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/**/*.test.ts'],
          exclude: ['test/dom/**'],
        },
      },
      {
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: ['test/dom/**/*.test.ts'],
          css: { include: [/platform\/theme\/.*\.css/, /platform\/ui\/(base|fonts)\.css/] },
          server: { deps: { inline: [/@miragon\//] } },
        },
      },
    ],
  },
})
