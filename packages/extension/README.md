# `@diagit/extension`

> The browser extension (Chrome, Edge, Firefox) — renders **BPMN, DMN, the Miragon notations and Excalidraw inline**
> on GitLab & GitHub and shows a **before/after diff** in pull/merge requests.

## Why

A process change should be reviewed as a _diagram_, not as a wall of
`<bpmn:sequenceFlow>`. This is the front-end that puts the real model back where
the review happens: on the file page and in the PR/MR — no downloads, no context
switch to a modeler.

It's the primary delivery path for the [`bpmn-diff`](../bpmn-diff) diff engine, wrapped in
[bpmn-js / dmn-js](https://bpmn.io) for rendering and built with
[WXT](https://wxt.dev) so one codebase ships to Chromium **and** Firefox.

## Install

| Browser | Store                                                                                                | Status    |
| ------- | ---------------------------------------------------------------------------------------------------- | --------- |
| Chrome  | [Chrome Web Store](https://chromewebstore.google.com/detail/diagit/bjphfmmlciflmdcnpfpbnkmgnkiabfdh) | Available |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/diagit/)                                  | Available |
| Edge    | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/pphcelcgicmpdkkbginmkdogceepigen)   | Available |

Building from source is covered in the repo [README](../../README.md#install).

## What's inside

- **`entrypoints/*.content.ts`** — content scripts per surface: file (blob)
  viewer and PR/MR diff, for GitHub and GitLab. Only `view-router` is declared
  in the manifest: it follows the hosts' client-side navigation and has the
  background load the matching view script on demand.
- **`entrypoints/background.ts`** — fetches file contents from the host you're
  viewing, loads view scripts on demand and manages per-domain permissions
  (self-hosted GitLab/GitHub).
- **`entrypoints/options` + `viewer`** — the options page and a standalone
  drop-in viewer (nothing leaves your machine).
- **`src/`** — views (`views/`), notations (`notations/`), git hosts (`git-hosts/`), the
  background worker (`background/`) and the browser runtime (`platform/`).

## Develop

```bash
npm run dev                # hot-reload in Chromium
npm run dev -- -b firefox  # …in Firefox
npm run dev:example        # …and open the git-host views on our own fixtures
npm run build              # production build for both browsers
```

`npm run dev:example` opens three tabs against this repo so the git-host views
can be checked end-to-end without foreign repos: the inline viewer on
`e2e/fixtures/sample.bpmn` and `sample.dmn`, and the before/after diff on a
permanently-closed demo PR ([#12](https://github.com/Miragon/diagit/pull/12)).
The tab list lives in [`wxt.config.ts`](./wxt.config.ts) (`EXAMPLE_URLS`).

Loading the built extension unpacked and the full monorepo layout are covered in
[CONTRIBUTING.md](../../CONTRIBUTING.md).
