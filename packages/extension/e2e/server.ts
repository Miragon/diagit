/**
 * Fixture server for the WebdriverIO E2E suite. It stands in for github.com so
 * the content scripts (built with `WXT_E2E=1`, which also matches `localhost`)
 * inject against a stable, offline DOM instead of the live site.
 *
 * It serves three things:
 *   1. The built extension's own pages/assets from `.output/chrome-mv3`
 *      (so the standalone `viewer.html` can be driven over HTTP, extension-free).
 *   2. GitHub-shaped host pages — a repository landing page, a blob file view (also
 *      in a layout the viewer cannot place itself in), a
 *      pull-request "Files changed" view (also in a layout the diff adapter does not
 *      recognise) and a single-commit diff view — from
 *      `fixtures/host-dom/`.
 *   3. The data those pages make the extension fetch: the raw `.bpmn`/`.dmn`
 *      bytes (blob + base/head) and the PR/commit REST metadata the diff adapters
 *      read from `/api/v3` (the non-github.com / Enterprise code path).
 */

import { createServer, type Server } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const outDir = normalize(join(dir, '..', '.output', 'chrome-mv3'))
const hostDom = join(dir, 'fixtures', 'host-dom')
const fixtures = join(dir, 'fixtures')

/** The single PR the fixtures describe. Kept in one place so `pr.html`, the REST
 *  responses and the raw routes all agree. */
const PR = {
  owner: 'octo',
  repo: 'flows',
  number: '1',
  file: 'flows/order.bpmn',
  baseSha: 'base0000000000000000000000000000000000000',
  headSha: 'head1111111111111111111111111111111111111',
} as const

const SUBPROCESS_PR = {
  ...PR,
  number: '2',
  baseSha: 'base2222222222222222222222222222222222222',
  headSha: 'head2222222222222222222222222222222222222',
} as const

const UNKNOWN_LAYOUT_PR = { ...PR, repo: 'relayout' } as const

const PULL_REQUESTS = [PR, SUBPROCESS_PR, UNKNOWN_LAYOUT_PR]

const FIXTURE_BY_REF: Record<string, string> = {
  [SUBPROCESS_PR.baseSha]: 'collapsed-subprocess-before.bpmn',
  [SUBPROCESS_PR.headSha]: 'collapsed-subprocess-after.bpmn',
}

/** The single commit the fixtures describe (head = its own SHA, base = parent). */
const COMMIT = {
  owner: 'octo',
  repo: 'flows',
  sha: 'c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00',
  parentSha: 'dead0000dead0000dead0000dead0000dead0000',
  file: 'flows/order.bpmn',
} as const

const REPO_HOME = `/${PR.owner}/${PR.repo}`
const RENAMED_REPO_SEGMENT = `/${PR.owner}/renamed/`
const REPO_SEGMENT = `/${PR.owner}/${PR.repo}/`
const UNKNOWN_LAYOUT_REPO_SEGMENT = `/${UNKNOWN_LAYOUT_PR.owner}/${UNKNOWN_LAYOUT_PR.repo}/`

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eot': 'application/vnd.ms-fontobject',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.bpmn': 'application/xml',
  '.dmn': 'application/xml',
}

function send(
  res: import('node:http').ServerResponse,
  status: number,
  type: string,
  body: string | Buffer,
): void {
  res.writeHead(status, { 'content-type': type })
  res.end(body)
}

/** Serve a file from the built extension output, or return false if absent. */
function serveStatic(path: string, res: import('node:http').ServerResponse): boolean {
  const target = normalize(join(outDir, path))
  if (!target.startsWith(outDir)) {
    return false
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    return false
  }
  send(res, 200, MIME[extname(target)] ?? 'application/octet-stream', readFileSync(target))
  return true
}

/** The raw diagram bytes for a `.../raw/...` request, chosen by file extension. */
const SAMPLE_EXTENSIONS = ['.dmn', '.owm', '.tt', '.storm', '.cm', '.vc.json', '.excalidraw']

function rawDiagram(path: string): Buffer {
  const refFixture = Object.entries(FIXTURE_BY_REF).find(([ref]) => path.includes(`/${ref}/`))
  if (refFixture) {
    return readFileSync(join(fixtures, refFixture[1]))
  }
  const extension = SAMPLE_EXTENSIONS.find((candidate) => path.toLowerCase().endsWith(candidate))
  const name = `sample${extension ?? '.bpmn'}`
  return readFileSync(join(fixtures, name))
}

export interface FixtureServer {
  readonly port: number
  close(): Promise<void>
}

export function startFixtureServer(port: number): Promise<FixtureServer> {
  const server: Server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')

    const isPage = path.includes('/blob/') || path.includes('/pull/')
    if (path.includes(RENAMED_REPO_SEGMENT) && !isPage) {
      res.writeHead(302, { location: path.replace(RENAMED_REPO_SEGMENT, REPO_SEGMENT) })
      return res.end()
    }

    // GitHub REST metadata for the PR diff adapter (Enterprise `/api/v3` path).
    for (const pr of PULL_REQUESTS) {
      const pulls = `/api/v3/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`
      if (path === pulls) {
        const repo = { full_name: `${pr.owner}/${pr.repo}` }
        return send(
          res,
          200,
          MIME['.json']!,
          JSON.stringify({
            base: { sha: pr.baseSha, repo },
            head: { sha: pr.headSha, repo },
          }),
        )
      }
      if (path === `/api/v3/repos/${pr.owner}/${pr.repo}/compare/${pr.baseSha}...${pr.headSha}`) {
        return send(
          res,
          200,
          MIME['.json']!,
          JSON.stringify({ merge_base_commit: { sha: pr.baseSha } }),
        )
      }
      if (path === `${pulls}/files`) {
        return send(
          res,
          200,
          MIME['.json']!,
          JSON.stringify([{ filename: pr.file, status: 'modified' }]),
        )
      }
    }

    // GitHub REST metadata for the commit diff adapter (Enterprise `/api/v3` path).
    if (path === `/api/v3/repos/${COMMIT.owner}/${COMMIT.repo}/commits/${COMMIT.sha}`) {
      return send(
        res,
        200,
        MIME['.json']!,
        JSON.stringify({
          sha: COMMIT.sha,
          parents: [{ sha: COMMIT.parentSha }],
          files: [{ filename: COMMIT.file, status: 'modified' }],
        }),
      )
    }

    // Raw file content (blob viewer + PR base/head loaders).
    if (path.includes('/raw/')) {
      return send(res, 200, MIME[extname(path)] ?? MIME['.bpmn']!, rawDiagram(path))
    }

    // GitHub-shaped host pages.
    if (path === REPO_HOME) {
      return send(res, 200, MIME['.html']!, readFileSync(join(hostDom, 'repo-home.html')))
    }
    if (path.includes('/blob/')) {
      const page = path.startsWith(UNKNOWN_LAYOUT_REPO_SEGMENT)
        ? 'blob-unknown-layout.html'
        : 'blob.html'
      return send(res, 200, MIME['.html']!, readFileSync(join(hostDom, page)))
    }
    if (path.includes('/pull/')) {
      const page = path.startsWith(UNKNOWN_LAYOUT_REPO_SEGMENT)
        ? 'pr-unknown-layout.html'
        : 'pr.html'
      return send(res, 200, MIME['.html']!, readFileSync(join(hostDom, page)))
    }
    if (path.includes('/commit/')) {
      return send(res, 200, MIME['.html']!, readFileSync(join(hostDom, 'commit.html')))
    }

    // Everything else: the built extension's own pages/assets (viewer.html, …).
    if (serveStatic(path === '/' ? '/index.html' : path, res)) {
      return
    }
    send(res, 404, 'text/plain', `not found: ${path}`)
  })

  return new Promise((resolve) => {
    server.listen(port, () =>
      resolve({
        port,
        close: () => new Promise<void>((done) => server.close(() => done())),
      }),
    )
  })
}
