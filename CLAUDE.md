# CLAUDE.md

Read `CONTRIBUTING.md` for setup, checks, conventions and where things live.

## Design system (mandatory)

All UI and visual work follows the Miragon design system for products. The source of truth is the
skill `miragon-brand:modeler-tool-design` in Miragon/corporate-identity. It loads on UI work once
the plugin is installed (`.claude/settings.json` enables it). Copy and tone follow
`miragon-brand:brand-tone`, the docs site `miragon-brand:docs-site`, icons `miragon-brand:icon-design`.

- Tokens come unchanged from the skill: `cd-tokens.generated.css`, `cd-tokens.generated.json` and
  `cd-canvas.css` in `packages/extension/src/platform/theme/`. Never fork a hex value, never edit
  a vendored file. Components use the `--cd-ui-*` roles only.
- Diagit lives inside a foreign page (GitHub, GitLab). The host decides only the mode:
  `detectHostTheme` sets `data-cd-theme` (light or dark) on the panel root. Host colours, host
  fonts and host tokens (Primer, GitLab) are never taken over. The extension's own pages (options,
  standalone viewer, alert) use `data-cd-theme="system"`.
- Dark surfaces are black and the neutral steps, never tinted. Green and amber are fills with a
  contour in `--cd-schwarz` on light, never a thin stroke or text there.
- Known deviation, decided for now: fonts stay the system stacks (and the bpmn-js / dmn-js
  defaults on the canvas) instead of Geist. Function icons come from Lucide with stroke 2.5. The
  app icon is the comet on blue.
- UI copy is English, sentence case, with the shared terms from §2 of the guide.

Checks: `node .miragon/sync.mjs check` (vendored copies unchanged) and
`node .miragon/brand-lint/brand-lint.mjs .` (hard brand rules). Both run in CI (job `brand`).

To update to a new miragon-brand release: update the plugin, run `node .miragon/sync.mjs` (copies
brand-lint and the tokens from the newest installed plugin and rewrites `.miragon/vendored.json`),
check the docs kit as the `docs-site` skill describes, then build, test and look at the views in
light and dark.
