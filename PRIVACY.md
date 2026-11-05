# Privacy Policy

_Last updated: 2026-11-05_

**Diagit**, published by Miragon GmbH, does not collect, store, transmit, or
sell any personal data. There are no analytics, no tracking, and no external
servers operated by us.

## What the extension does

- It runs only on pages you grant it access to: `gitlab.com`, `github.com`,
  `raw.githubusercontent.com`, and any self-hosted instance you explicitly add in
  the options page.
- On those pages it reads the content of the diagram files it supports (BPMN, DMN,
  Wardley Map, Team Topologies, Event Storming, Context Map, Value Chain and
  Excalidraw files) in order to render the diagram.
  File contents are fetched **directly from the git host you are viewing** (on
  github.com, raw files are served from `raw.githubusercontent.com`), using your
  existing browser session (so private repositories work). For pull-request and
  commit diffs on github.com, the list of changed files and the commits to
  compare come from GitHub's API at `api.github.com`. Nothing is sent anywhere
  else.
- The standalone viewer reads files you drop into it locally, in the browser. They
  never leave your machine.

## Storage

The data stored is kept in your browser's local extension storage and never
leaves your browser:

- the list of self-hosted instance domains you add, so the extension knows where
  to activate;
- an optional GitHub access token, used only for private repositories on
  github.com. You obtain it by installing the GitHub App and connecting once from
  the options page (via GitHub's device flow — no token to paste by hand); the
  extension never sees a client secret. It is sent **only** to `api.github.com`
  (never to any other host) to authenticate the diff-metadata requests and to
  show which account you connected, and only if you choose to connect. Your
  GitHub username is stored alongside it. Disconnecting in the options page
  removes both from your browser; the GitHub App itself stays installed and
  authorised on GitHub until you uninstall it and revoke its authorisation in
  your GitHub settings.

## Permissions

- `scripting`, `storage` — load the viewer when you open a diagram, register it
  on self-hosted instances you add, and remember that list and the optional
  GitHub access token.
- `contextMenus`, `activeTab` — let you grant the viewer on the self-hosted
  instance in the current tab via the toolbar icon or the right-click menu.
- Host access (`gitlab.com`, `github.com`, `raw.githubusercontent.com`, plus any
  self-hosted domain you grant) — required to read and render diagram files on
  those sites. Access to other sites is only ever requested when you add them.
- `api.github.com` — used only for pull-request and commit diffs on github.com.
  Public repositories work without a token; once you connect, the token is
  attached to every request to `api.github.com`.

## Contact

Diagit is published by Miragon GmbH, Böheimstr. 8, 86153 Augsburg, Germany.

Questions: open an issue on the [GitHub repository](https://github.com/Miragon/diagit/issues)
or write to info@miragon.io.
