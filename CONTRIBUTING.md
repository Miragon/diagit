# Contributing

Thanks for helping improve the Diagit extension!

## Getting started

```bash
npm install
npm run dev            # live-reload the extension in Chrome
```

This opens a browser with the extension pre-loaded and hot-reloads on every
change. For Firefox:

```bash
npm run dev -w @diagit/extension -- -b firefox
```

## Repository layout

This is an npm-workspaces monorepo:

| Package              | What it is                                                                  |
| -------------------- | --------------------------------------------------------------------------- |
| `packages/bpmn-diff` | Framework-free BPMN parsing (bpmn-moddle) + the semantic diff. No DOM.      |
| `packages/extension` | The [WXT](https://wxt.dev) extension: content scripts, options, background. |

The diff is deliberately isolated in `bpmn-diff` so it is unit-tested in plain Node,
independently of the extension that renders it.

## Development

```bash
# quality gates
npm test               # unit + DOM-component tests (vitest)
npm run typecheck
npm run lint
npm run lint:deps      # architecture guardrail (dependency-cruiser)
npm run knip           # unused files, exports & dependencies (knip)

# production build (both browsers) + zips
npm run build -w @diagit/extension
npm run zip   -w @diagit/extension

# artifact size budget (size-limit), needs a production build
npm run size
```

## End-to-end tests

`npm test` covers the pure logic (Node) and the injection DOM helpers (happy-dom).
On top of that, one [WebdriverIO](https://webdriver.io) suite loads the **real
built extension** into a browser and runs the same specs on **Chrome, Edge and
Firefox** (`packages/extension/e2e`). It serves GitHub-shaped fixture pages from a
local server (no live github.com) and asserts the diagram actually renders.

```bash
# 1. build the extension in E2E mode (its view router also matches localhost)
npm run e2e:build -w @diagit/extension
# 2. run the suite (defaults to every browser that's installed)
npm run test:e2e  -w @diagit/extension
```

Pick a subset of browsers, or **see it run**:

```bash
WDIO_BROWSERS=chrome npm run test:e2e -w @diagit/extension  # just one browser
WDIO_HEADED=1        npm run test:e2e -w @diagit/extension  # visible browser window
WDIO_SCREENSHOTS=1   npm run test:e2e -w @diagit/extension  # PNG per test
```

`WDIO_HEADED=1` opens a real window (the specs run fast, so drop a `browser.debug()`
into one to freeze it and look). `WDIO_SCREENSHOTS=1` writes a PNG of each test's
end state (the rendered diagram above the host DOM) to
`packages/extension/.output/e2e-screenshots/`, which works headless too and is
uploadable as a CI artifact.

> Re-run `e2e:build` after changing extension code: the suite drives the built
> `.output` extension, not your source directly. CI runs this suite per browser
> (Chrome & Edge required, Firefox soaking).

### Drift canary (real github.com)

The fixture suite tests _our_ logic against a copy of GitHub's DOM, so it can't
notice GitHub changing its real markup. A separate **canary** covers that: it
loads the extension against the real `dev:example` pages and checks the diagram
still injects. Every GitHub selector lives in one file per host
(`src/git-hosts/github/githubSelectors.ts`, `gitlab/gitlabSelectors.ts`), so a drift fix is a
one-file change.

```bash
npm run build       -w @diagit/extension   # normal build (real github.com)
npm run test:e2e:live -w @diagit/extension # WDIO_LIVE against real github.com
```

It runs **weekly** (`.github/workflows/canary.yml`), **not** on PRs. Real GitHub
is A/B-tested and occasionally flaky, so it must never block a merge. When it goes
red, GitHub changed its DOM: update the selector file (and refresh the fixtures).
A GitLab canary is a tracked follow-up.

## Loading the extension unpacked

You don't need the Chrome Web Store / AMO to run this. Load the built extension
directly. Build it once (`npm run build -w @diagit/extension`), which
produces two artifacts:

- `packages/extension/.output/chrome-mv3`: for **all Chromium browsers**
- `packages/extension/.output/firefox-mv3`: for **Firefox and its forks**

> For active development, prefer `npm run dev` (Chromium) or
> `npm run dev -w @diagit/extension -- -b firefox`. It hot-reloads
> instead of requiring a rebuild + reload for each change.

### Chromium browsers (Chrome, Edge, Vivaldi, Brave, Opera, Arc, …)

They all load the **same** `chrome-mv3` folder. Open your browser's extensions
page, turn on **Developer mode**, then click **Load unpacked** and select
`packages/extension/.output/chrome-mv3`.

| Browser        | Extensions page        |
| -------------- | ---------------------- |
| Chrome         | `chrome://extensions`  |
| Edge           | `edge://extensions`    |
| Vivaldi        | `vivaldi://extensions` |
| Brave          | `brave://extensions`   |
| Opera          | `opera://extensions`   |
| Chromium / Arc | `chrome://extensions`  |

The extension stays installed across restarts. After a rebuild, hit **↻ Reload**
on the extension card to pick up changes.

### Firefox (and forks: LibreWolf, Waterfox, Zen, …)

- **Quick / temporary** (simplest, but removed when you close the browser):
  open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** →
  select `packages/extension/.output/firefox-mv3/manifest.json`.
- **Permanent:** Firefox only installs **signed** add-ons persistently. Either
  submit the zip to [AMO](https://addons.mozilla.org) for signing, or use
  **Firefox Developer Edition / Nightly**, set `xpinstall.signatures.required` to
  `false` in `about:config`, then install the packaged zip from
  `npm run zip -w @diagit/extension` (`.output/*.zip`).

### After installing

`gitlab.com` and `github.com` work immediately. For a **self-hosted** GitLab EE /
GitHub Enterprise instance, open a `.bpmn` file (or a merge request) there and
click the extension's toolbar icon (or right-click the page → _Enable Diagit on this
domain_) to grant access to just that site. You can also
manage domains in the options page.

## Before you open a PR

Please make sure these pass:

```bash
npm test          # unit tests
npm run typecheck
npm run lint
npm run lint:deps  # architecture boundaries
npm run knip       # unused files, exports & dependencies
npm run format     # prettier
```

## Conventions

- **Commits & PR titles** follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, …). The PR title is checked in
  CI and drives the automated release notes (release-please).
- **Architecture**: keep `packages/bpmn-diff` free of DOM and bpmn-js: it's the pure,
  testable diff core. The layering is enforced by dependency-cruiser in both
  packages (`npm run lint:deps`).
- **Classes first**: behaviour lives in classes; pure helpers go to a `utils/`
  folder. ESLint rejects top-level functions anywhere else.
- **Dependencies** are pinned to exact versions.
- Every surface follows the Miragon design system. Colours come from the vendored
  tokens in `packages/extension/src/platform/theme/` as `--cd-ui-*` roles, never as raw values;
  the git host only decides light or dark. CI checks this with brand-lint (job `brand`). Details
  and the update path are in `CLAUDE.md`.

## Where things live

- `packages/bpmn-diff/src/domain`: the diff algorithm (pure).
- `packages/bpmn-diff/src/adapter`: BPMN XML → parsed model (bpmn-moddle).
- `packages/extension/entrypoints`: one-line WXT entrypoints that wire the classes below.
- `packages/extension/src/views`: what the user sees, one folder per view: `blob-viewer`
  (diagram above a file), `diff-viewer` (before/after diff in PRs/MRs), `standalone-viewer`,
  `options`, plus the `view-router` that picks the view for a page. Views never import each other.
- `packages/extension/src/notations`: one folder per notation behind the `Notation`
  interface (descriptor, viewer, CSS, optional differ); each folder's `descriptor.ts` and
  `notationCatalog.ts` are light and import-safe, everything else loads a renderer. Only views
  pick a registry (`allNotations`, `diffableNotations`), so each bundle carries just the
  renderers it needs.
- `packages/extension/src/git-hosts`: where files come from: one folder per git host behind the
  `GitHost` interface (routes, REST API, DOM scanner, blob page, diff pages), the `DiffSource`
  seam, the `HostRegistry` and `self-hosted/` instance access.
- `packages/extension/src/background`: the background worker (fetch proxy, script injection).
- `packages/extension/src/platform`: the browser runtime everything builds on: messaging,
  settings, the content-script `HostPage`, shared UI and `utils/`. It imports nothing outside itself.

Imports point down: `views` / `background` → `notations` / `git-hosts` → `platform`. The rules live in
`packages/extension/.dependency-cruiser.cjs`.

### Adding a git host

Create `src/git-hosts/<host>/` with a class implementing `GitHost`, register it in
`src/git-hosts/hosts.ts`, and add one entrypoint per view script it declares
(`<host>-blob.content.ts`, …). Add its API origin to `host_permissions` in
`wxt.config.ts` when it is cross-origin.

### Adding a notation

Every notation lives in its own folder `src/notations/<notation>/` and never imports another notation
(`notations-stay-isolated` in `.dependency-cruiser.cjs`):

1. `descriptor.ts` with id, label and file extensions, listed in `notationCatalog.ts`.
   It must stay free of viewer imports, because git hosts load it to detect files.
2. A class implementing `Notation` (viewer, CSS), registered in `allNotations.ts`. A
   diagram-js based renderer extends `DiagramJsNotation` and only creates the diagram and
   imports the file (see `wardley-map/WardleyMapNotation.ts`). Any other renderer implements
   `DiagramViewer` itself (see `excalidraw/ExcalidrawViewer.ts`).
3. For diff support: a `packages/<notation>-diff` workspace with the framework-free diff
   (like `packages/bpmn-diff`), a `DiagramDiffer` in the notation folder, `diffable: true`
   and an entry in `diffableNotations.ts`.

The registry tests check that the lists stay in sync.
