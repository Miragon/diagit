import { defineConfig } from 'wxt'

// `npm run dev:example` opens the browser at our own in-repo fixtures so the
// git-host views can be exercised without depending on foreign repos:
//   - two blob pages (BPMN + DMN) exercise the inline viewer
//   - a permanently-closed demo PR (#12) exercises the before/after diff view
// The fixtures live on `main` at packages/extension/e2e/fixtures and are the
// same files the e2e suite renders.
const REPO = 'https://github.com/Miragon/diagit'
const FIXTURES = `${REPO}/blob/main/packages/extension/e2e/fixtures`
const EXAMPLE_URLS = [
  `${FIXTURES}/sample.bpmn`, // inline viewer — BPMN
  `${FIXTURES}/sample.dmn`, // inline viewer — DMN
  `${REPO}/pull/12/files`, // diff viewer — closed demo PR (do not merge/delete)
]
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
const openExample = Boolean(env?.WXT_DEV_EXAMPLE)

// E2E test build: let the background worker fetch the fixture server's raw files
// and PR JSON from localhost (the view router also matches localhost — see
// `withE2eMatches`). Never enabled in a store build.
const e2e = Boolean(env?.WXT_E2E)
const e2eHostPermissions = e2e ? ['http://localhost/*'] : []

function extensionPagesCsp(command: 'build' | 'serve'): string {
  const isDev = command === 'serve'
  const devAssets = isDev ? ['http://localhost:*'] : []
  const devHotReload = isDev ? ['ws://localhost:*'] : []
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'img-src': ["'self'", 'data:', ...devAssets],
    'font-src': ["'self'", 'data:', ...devAssets],
    'style-src': ["'self'", "'unsafe-inline'"],
    'connect-src': ['https:', 'http:', ...devHotReload],
  }
  return Object.entries(directives)
    .map(([directive, sources]) => [directive, ...sources].join(' '))
    .join('; ')
}

const EXCALIDRAW_BUNDLE = /@excalidraw\/utils\/dist\/(dev|prod)\/index\.js/
const EMBEDDED_BASE64_ASSET = /(data:font\/woff2;base64,)?[A-Za-z0-9+/]{5000,}={0,2}/g
const CSP_BLOCKED_GLOBAL_LOOKUP = 'Function("return this")()'
const THIRD_PARTY_WIDGET_SCRIPT = /<script[^<]*src="https:\/\/[^"]*widgets\.js"[^<]*<\\\/script>/g

// https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  vite: () => ({
    plugins: [
      {
        name: 'excalidraw-patch-bundle',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          if (!EXCALIDRAW_BUNDLE.test(id)) {
            return null
          }
          const stripped = code.replace(EMBEDDED_BASE64_ASSET, '')
          const withoutWidgets = stripped.replace(THIRD_PARTY_WIDGET_SCRIPT, '')
          if (
            stripped.length === code.length ||
            withoutWidgets.length === stripped.length ||
            !stripped.includes(CSP_BLOCKED_GLOBAL_LOOKUP)
          ) {
            throw new Error(
              'excalidraw-patch-bundle no longer matches @excalidraw/utils. Update EMBEDDED_BASE64_ASSET, THIRD_PARTY_WIDGET_SCRIPT and CSP_BLOCKED_GLOBAL_LOOKUP in wxt.config.ts for the new bundle format.',
            )
          }
          return {
            code: withoutWidgets.replace(CSP_BLOCKED_GLOBAL_LOOKUP, 'globalThis'),
            map: null,
          }
        },
      },
      {
        name: 'bpmn-io-escape-noncharacters',
        generateBundle(_options: unknown, bundle: Record<string, { type: string; code?: string }>) {
          for (const file of Object.values(bundle)) {
            if (file.type === 'chunk' && file.code) {
              file.code = file.code.replace(
                /[\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
                (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
              )
            }
          }
        },
      },
    ],
  }),
  webExt: {
    startUrls: openExample ? EXAMPLE_URLS : undefined,
  },
  manifest: ({ command }) => ({
    name: 'Diagit',
    description:
      'See diagram files as diagrams on GitHub and GitLab, and review model changes in pull requests as a visual before/after diff.',
    permissions: ['scripting', 'storage', 'contextMenus', 'activeTab'],
    action: {
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '128': 'icon/128.png',
      },
    },
    host_permissions: [
      'https://gitlab.com/*',
      'https://github.com/*',
      'https://raw.githubusercontent.com/*',
      'https://api.github.com/*',
      ...e2eHostPermissions,
    ],
    optional_host_permissions: ['*://*/*'],
    content_security_policy: { extension_pages: extensionPagesCsp(command) },
    browser_specific_settings: {
      gecko: {
        id: 'diagit@miragon.io',
        data_collection_permissions: { required: ['none'] },
      },
    },
  }),
})
