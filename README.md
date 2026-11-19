# Diagit

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/bjphfmmlciflmdcnpfpbnkmgnkiabfdh?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/diagit/bjphfmmlciflmdcnpfpbnkmgnkiabfdh)
[![Firefox Add-ons](https://img.shields.io/amo/v/diagit?label=Firefox%20Add-ons&logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/firefox/addon/diagit/)
[![Edge Add-ons](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fpphcelcgicmpdkkbginmkdogceepigen&query=%24.version&prefix=v&label=Edge%20Add-ons&logo=microsoftedge&logoColor=white&color=blue)](https://microsoftedge.microsoft.com/addons/detail/pphcelcgicmpdkkbginmkdogceepigen)
[![Chrome users](https://img.shields.io/chrome-web-store/users/bjphfmmlciflmdcnpfpbnkmgnkiabfdh?label=Chrome%20users&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/diagit/bjphfmmlciflmdcnpfpbnkmgnkiabfdh)
[![Firefox users](https://img.shields.io/amo/users/diagit?label=Firefox%20users&logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/firefox/addon/diagit/)
[![Edge users](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fpphcelcgicmpdkkbginmkdogceepigen&query=%24.activeInstallCount&label=Edge%20users&logo=microsoftedge&logoColor=white&color=blue)](https://microsoftedge.microsoft.com/addons/detail/pphcelcgicmpdkkbginmkdogceepigen)
[![GitHub stars](https://img.shields.io/github/stars/Miragon/diagit?style=flat&logo=github)](https://github.com/Miragon/diagit/stargazers)
[![CI](https://github.com/Miragon/diagit/actions/workflows/ci.yml/badge.svg)](https://github.com/Miragon/diagit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/Miragon/diagit)](LICENSE)

![Diagit, a browser extension: diagrams and their changes, right on GitHub and GitLab. Next to the claim, a GitHub file page shows the order-to-cash process drawn above its BPMN source](assets/store/cover.png)

A browser extension that draws BPMN, DMN, Wardley Maps and other model files above their source on GitHub and GitLab, and shows BPMN changes as a before/after diff in pull and merge requests.

## Why

Models kept in Git are text files. On GitHub or GitLab you see their source, and reviewing a change means reading a wall of XML or JSON instead of the process, map or team structure it describes.

## What you get

- **Wherever your repos live.** github.com, gitlab.com, GitHub Enterprise and self-hosted GitLab.
- **Files from your disk.** A viewer page in the extension opens local models; nothing leaves your machine. [Open a file from your disk](https://miragon.github.io/diagit/notations#open-a-file-from-your-disk)
- **A visual diff for BPMN.** Added, removed, changed and moved elements are marked, in GitHub commits too. [Review a model change](https://miragon.github.io/diagit/review-changes)

![On a GitHub pull request, the changed .bpmn file switches from the plain diagram to a before/after diff, then jumps to the added task "Review result", back to all changes and opens the diff in full screen](assets/demo.gif)

## Supported notations

| Notation        | File endings       | File page | PR / MR diff |
| --------------- | ------------------ | --------- | ------------ |
| BPMN            | `.bpmn`            | yes       | yes          |
| DMN             | `.dmn`             | yes       | not yet      |
| Wardley Map     | `.owm`, `.wmap`    | yes       | not yet      |
| Team Topologies | `.tt`, `.ttm.json` | yes       | not yet      |
| Event Storming  | `.storm`           | yes       | not yet      |
| Context Map     | `.cm`, `.cm.json`  | yes       | not yet      |
| Value Chain     | `.vc`, `.vc.json`  | yes       | not yet      |
| Excalidraw      | `.excalidraw`      | yes       | not yet      |

## Install

| Browser | Store                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------- |
| Chrome  | [Chrome Web Store](https://chromewebstore.google.com/detail/diagit/bjphfmmlciflmdcnpfpbnkmgnkiabfdh) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/diagit/)                                  |
| Edge    | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/pphcelcgicmpdkkbginmkdogceepigen)   |

Diffs in private github.com repos need the [GitHub App](https://miragon.github.io/diagit/private-repos); self-hosted instances need [their domain allowed](https://miragon.github.io/diagit/self-hosted) once.

## Get started

1. Open a model file in a GitHub or GitLab repository, for example a `.bpmn` file.
2. In a pull request (**Files changed**) or merge request (**Changes**), Diagit shows the old and the new version of a changed model side by side.

The full walk-through is in [Getting started](https://miragon.github.io/diagit/getting-started).

## Help and feedback

- **Documentation:** [miragon.github.io/diagit](https://miragon.github.io/diagit/)
- **Bugs and ideas:** [open an issue](https://github.com/Miragon/diagit/issues)
- **Security:** report privately, see [SECURITY.md](SECURITY.md)

## Contributing

Contributions are welcome. Building from source, tests and conventions: [CONTRIBUTING.md](CONTRIBUTING.md).

## Privacy

Diagit collects no data and has no server. See [PRIVACY.md](PRIVACY.md).

## Credits

- [bpmn-js](https://github.com/bpmn-io/bpmn-js) and [dmn-js](https://github.com/bpmn-io/dmn-js) by [bpmn.io](https://bpmn.io)
- The renderers of the [Miragon modelers](https://github.com/Miragon/modeler-suite) for the other notations
- [Excalidraw](https://github.com/excalidraw/excalidraw)'s export code

## License

[MIT](LICENSE) © Miragon GmbH
