# Getting started

Install Diagit, open a model file on GitHub or GitLab and review a change to a BPMN process in a pull request. It takes about three minutes.

**Requirements:** Chrome, Edge or Firefox, and a repository on github.com, gitlab.com or a self-hosted GitLab or GitHub Enterprise instance.

## 1. Install the extension

Add Diagit from your browser's store:

- [Chrome Web Store](https://chromewebstore.google.com/detail/diagit/bjphfmmlciflmdcnpfpbnkmgnkiabfdh)
- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/diagit/)
- [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/pphcelcgicmpdkkbginmkdogceepigen)

Public repositories on github.com and all repositories on gitlab.com work right away. Diffs in private repositories on github.com need the GitHub App ([Private repos on github.com](./private-repos)), and a self-hosted instance needs its domain allowed once ([Self-hosted instances](./self-hosted)). The Diagit icon appears in the browser toolbar.

## 2. Open a model file

Open any [supported file](./notations) in a repository, for example a `.bpmn`, `.storm` or `.owm` file. Diagit draws the diagram above the source:

<figure class="shot">
  <img src="/shots/file-page.png" alt="A .bpmn file on a GitHub-like file page: Diagit draws the order process above the file's source, with zoom buttons at the bottom left" />
  <figcaption>order.bpmn on a file page, drawn by Diagit</figcaption>
</figure>

Drag to move the diagram, zoom with **−** and **+**, and press **Fit** to see all of it again. The source stays below, unchanged.

## 3. Review a change in a pull request

Open a pull request or merge request that changes a `.bpmn` file and go to **Files changed** (on GitLab: **Changes**). Diagit adds a panel above the file's text diff. Switch it from **Plain** to **Diff**:

<figure class="shot">
  <img src="/shots/pr-diff.png" alt="Diagit's Diff view in a pull request: the old process on the left, the new one on the right, the added payment step and reminder marked green, the renamed check task blue" />
  <figcaption>order.bpmn in a pull request, Diff view</figcaption>
</figure>

The old model is on the left, the new one on the right. Added, removed, changed and moved elements carry their colour; [Review a model change](./review-changes) explains each one.

## Troubleshooting

::: details Nothing appears on my company's GitLab or GitHub Enterprise
Diagit needs your permission once per self-hosted domain. Open a model file there and click the Diagit icon in the toolbar, then allow access. See [Self-hosted instances](./self-hosted).
:::

::: details The diff panel is missing in a private repository on github.com
github.com serves pull request data from `api.github.com`, which your login cookie does not reach. Install the GitHub App and connect it once, as described in [Private repos on github.com](./private-repos).
:::

::: details A file shows only its source
Diagit recognises files by their ending. Check that the file ends in one of the [supported endings](./notations), such as `.bpmn` or `.vc.json`. Reload the page after renaming.
:::

::: details A diagram appears, but no diff for my DMN, Wardley Map or other model
The before/after diff is available for BPMN so far. All other notations are drawn on the file page, also inside a pull request.
:::

## Next steps

- [Review a model change](./review-changes): what each colour means and how to step through changes.
- [Supported notations](./notations): all eight notations and their file endings.
- [Privacy and permissions](./privacy): what Diagit reads, stores and sends.
