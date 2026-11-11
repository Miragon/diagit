# Changelog

## [0.4.0](https://github.com/Miragon/diagit/compare/v0.3.1...v0.4.0) (2026-11-11)


### Features

* add help, bug report and debug info to the options page ([#146](https://github.com/Miragon/diagit/issues/146)) ([4a94602](https://github.com/Miragon/diagit/commit/4a9460253c64575b94fc59604c7db41fb42150d7))
* ask once for a GitHub star and a store rating ([#142](https://github.com/Miragon/diagit/issues/142)) ([2524e0b](https://github.com/Miragon/diagit/commit/2524e0b0d096151b9d47b645aa801c3529f83e39))
* **blob:** tell the user when a diagram view finds no place on a file page ([#138](https://github.com/Miragon/diagit/issues/138)) ([6634c7c](https://github.com/Miragon/diagit/commit/6634c7cb6baca45bcf261cc4f915a6ce2f4331d3))
* **diff:** flag changed diagrams whose diff view is not recognised ([#137](https://github.com/Miragon/diagit/issues/137)) ([334757a](https://github.com/Miragon/diagit/commit/334757a6973094ee72a550e71f7f78d43b5854c4))
* follow the Miragon design system ([#135](https://github.com/Miragon/diagit/issues/135)) ([a236452](https://github.com/Miragon/diagit/commit/a23645217b53f4ce1ddac2bc91e4d3475ee071f8))
* restructure the options page with header, support row and footer ([#145](https://github.com/Miragon/diagit/issues/145)) ([e214c70](https://github.com/Miragon/diagit/commit/e214c705662bb6787c62b396f4671c49a1db427d))
* show diagram errors on file pages and in the standalone viewer with the shared notice ([#157](https://github.com/Miragon/diagit/issues/157)) ([a9c888c](https://github.com/Miragon/diagit/commit/a9c888c8fe6c480755547ea716f9277526dfe3f9))


### Bug Fixes

* open the options page from the toolbar icon on allowed domains ([#143](https://github.com/Miragon/diagit/issues/143)) ([41ba290](https://github.com/Miragon/diagit/commit/41ba290f92df711de9f75c9024daba9dd9d0fcbe))

## [0.3.1](https://github.com/Miragon/diagit/compare/v0.3.0...v0.3.1) (2026-11-09)


### Bug Fixes

* **gitlab:** support the Rapid Diffs merge request view ([#133](https://github.com/Miragon/diagit/issues/133)) ([693cde2](https://github.com/Miragon/diagit/commit/693cde2c6743ab91eb3b162394c57fd5d4396b07))

## [0.3.0](https://github.com/Miragon/diagit/compare/v0.2.1...v0.3.0) (2026-11-07)


### Features

* **extension:** refresh expiring GitHub App user tokens ([#112](https://github.com/Miragon/diagit/issues/112)) ([b683f5a](https://github.com/Miragon/diagit/commit/b683f5a91f708d3896737383a0d8b1d6d09c4596)), closes [#103](https://github.com/Miragon/diagit/issues/103)
* **extension:** use the Miragon comet as extension icon ([#93](https://github.com/Miragon/diagit/issues/93)) ([d90e627](https://github.com/Miragon/diagit/commit/d90e6270c75de05da6cb3e77af7fc9f5bea8c413))
* rename to Diagit and render the Miragon notations ([#81](https://github.com/Miragon/diagit/issues/81)) ([2904322](https://github.com/Miragon/diagit/commit/2904322ed0c71e82e5498697915db755e0e636f6))
* render Excalidraw diagrams inline ([#87](https://github.com/Miragon/diagit/issues/87)) ([74062f3](https://github.com/Miragon/diagit/commit/74062f35989fcb890f70c14525783166e068a9de))
* show Camunda 7 transaction boundaries and diff async continuations ([#84](https://github.com/Miragon/diagit/issues/84)) ([bfac53e](https://github.com/Miragon/diagit/commit/bfac53ef4184faa23a213d8c0aad16a6e5383ba8))


### Bug Fixes

* **extension:** drop the notation list from the manifest description ([#126](https://github.com/Miragon/diagit/issues/126)) ([024dc33](https://github.com/Miragon/diagit/commit/024dc339c77f7038f150a8f7384729b64909e43f))
* **extension:** only proxy fetches to the sender tab's origin ([#111](https://github.com/Miragon/diagit/issues/111)) ([68ab5ac](https://github.com/Miragon/diagit/commit/68ab5aca970c8de54d868a5393baacd443ac5ce6))
* **extension:** point GitHub App install link to miragon-diagit ([#95](https://github.com/Miragon/diagit/issues/95)) ([d104d39](https://github.com/Miragon/diagit/commit/d104d3939872da0218784f1c5cf17090f7c3a85a))
* **extension:** refuse redirects in the background fetch and add a CSP for extension pages ([#120](https://github.com/Miragon/diagit/issues/120)) ([f67778c](https://github.com/Miragon/diagit/commit/f67778c41cbd56e85b9802d8fd270927050fbb38)), closes [#115](https://github.com/Miragon/diagit/issues/115)
* **extension:** show permission errors on a bundled page ([#110](https://github.com/Miragon/diagit/issues/110)) ([f27b817](https://github.com/Miragon/diagit/commit/f27b817f783468875a060c179ae18c817318245d)), closes [#104](https://github.com/Miragon/diagit/issues/104)
* **extension:** stop untrusted diagrams from loading external URLs ([#121](https://github.com/Miragon/diagit/issues/121)) ([c3b4147](https://github.com/Miragon/diagit/commit/c3b4147d5193a0734586dc9a9226dc0f31ef734f))
* **extension:** strip third-party widget scripts from the Excalidraw bundle ([#94](https://github.com/Miragon/diagit/issues/94)) ([a4ca8c0](https://github.com/Miragon/diagit/commit/a4ca8c0f67dd9e755944a6db6be74c006276c0b4))

## [0.2.1](https://github.com/emaarco/bpmn-io-browser-plugin/compare/v0.2.0...v0.2.1) (2026-10-05)


### Bug Fixes

* detect missed BPMN changes and diff GitHub PRs against the merge base ([#60](https://github.com/emaarco/bpmn-io-browser-plugin/issues/60)) ([9dcc30f](https://github.com/emaarco/bpmn-io-browser-plugin/commit/9dcc30f0bb61e42c7bf7abe2226afc8b621850b1))

## 0.2.0 (2026-10-03)


### Features

* BPMN & DMN viewer + diff extension for GitLab & GitHub ([#1](https://github.com/emaarco/bpmn-io-browser-plugin/issues/1)) ([7b4f116](https://github.com/emaarco/bpmn-io-browser-plugin/commit/7b4f116b3fa41e01cd986407d7d0807d4dae24d0))
* **extension:** add copy button for the GitHub device-flow code ([#42](https://github.com/emaarco/bpmn-io-browser-plugin/issues/42)) ([a8f1e5e](https://github.com/emaarco/bpmn-io-browser-plugin/commit/a8f1e5e86b188d7752bf4c8d4fe3d30c16ed52bf))
* **extension:** merge the inline diff panel into the host file box ([#32](https://github.com/emaarco/bpmn-io-browser-plugin/issues/32)) ([12ec0be](https://github.com/emaarco/bpmn-io-browser-plugin/commit/12ec0beaf7a9f5effbfad7002a32a9219c5b634d))
* **extension:** render BPMN diffs on GitHub commit pages ([#28](https://github.com/emaarco/bpmn-io-browser-plugin/issues/28)) ([8b1c785](https://github.com/emaarco/bpmn-io-browser-plugin/commit/8b1c78524b06ee9ee65010f38a98c54c3edf5fc2))
* **extension:** replace manual PAT with GitHub App device-flow auth ([#41](https://github.com/emaarco/bpmn-io-browser-plugin/issues/41)) ([08337ea](https://github.com/emaarco/bpmn-io-browser-plugin/commit/08337ea489b2b632809c852fcd2c89aa608121b2))
* **extension:** support private github.com repos via an optional API token ([#30](https://github.com/emaarco/bpmn-io-browser-plugin/issues/30)) ([106e302](https://github.com/emaarco/bpmn-io-browser-plugin/commit/106e302f947cc1cbb290efe575cd41c1889798e5))
* **extension:** use BPMN-task glyph as the plugin logo ([#29](https://github.com/emaarco/bpmn-io-browser-plugin/issues/29)) ([063ea37](https://github.com/emaarco/bpmn-io-browser-plugin/commit/063ea3731d7c1fe64b44b787975d7460cc958119))
* rename to "BPMN & DMN for GitHub & GitLab" and self-host dev:example ([#14](https://github.com/emaarco/bpmn-io-browser-plugin/issues/14)) ([8f0506c](https://github.com/emaarco/bpmn-io-browser-plugin/commit/8f0506ce3777c451fb154678aa875f9acf6e1dbd))


### Bug Fixes

* collapse the inline BPMN diff panel when a file is marked viewed ([#15](https://github.com/emaarco/bpmn-io-browser-plugin/issues/15)) ([657d272](https://github.com/emaarco/bpmn-io-browser-plugin/commit/657d27257b5b07f0f29f28be278dbc4ac8d6608e))
* DMN inline viewer polish — scroll, overlay, padding, dark mode ([#8](https://github.com/emaarco/bpmn-io-browser-plugin/issues/8)) ([871ed05](https://github.com/emaarco/bpmn-io-browser-plugin/commit/871ed056e4cfa00e587db2170132f29fc8f9fdc9))
* **extension:** follow host page theme so GitLab dark mode renders correctly ([#19](https://github.com/emaarco/bpmn-io-browser-plugin/issues/19)) ([6f2f7b3](https://github.com/emaarco/bpmn-io-browser-plugin/commit/6f2f7b3b86adfc86cb3c4f1d9563a10c7306fa1d))
* **extension:** hide the inline diagram when a GitLab file is collapsed/viewed ([#20](https://github.com/emaarco/bpmn-io-browser-plugin/issues/20)) ([abd84c6](https://github.com/emaarco/bpmn-io-browser-plugin/commit/abd84c61ea079ca64a94f53d8f6edf94fcc32350))
* **extension:** open options page in a tab to stop embedded dialog jitter ([#27](https://github.com/emaarco/bpmn-io-browser-plugin/issues/27)) ([4b6543a](https://github.com/emaarco/bpmn-io-browser-plugin/commit/4b6543abdd54f3a56fe9651ddd20c2c650e36d16))
* **extension:** re-fit diff diagrams on resize (PR/MR view) ([#18](https://github.com/emaarco/bpmn-io-browser-plugin/issues/18)) ([c77433a](https://github.com/emaarco/bpmn-io-browser-plugin/commit/c77433abbbbaa0fbe7737ca9602d1cb1d7fb9741))
* **extension:** remove the gap between the diff panel and host file box ([#34](https://github.com/emaarco/bpmn-io-browser-plugin/issues/34)) ([ba02318](https://github.com/emaarco/bpmn-io-browser-plugin/commit/ba023182a2828383e867cfff14882ff808ce6d5e))
* **extension:** render diagrams after client-side navigation ([#54](https://github.com/emaarco/bpmn-io-browser-plugin/issues/54)) ([b295c49](https://github.com/emaarco/bpmn-io-browser-plugin/commit/b295c49abfa5f3b98dca09f210b564ad9bb7a774))
* **extension:** stop stacking diff panels when a viewed file is re-rendered ([#26](https://github.com/emaarco/bpmn-io-browser-plugin/issues/26)) ([a4ee75a](https://github.com/emaarco/bpmn-io-browser-plugin/commit/a4ee75aad4e3d2dffcde7e3d583fd5dd57f655d8))
* **extension:** surface private-repo diff failures and stop the retry storm ([#31](https://github.com/emaarco/bpmn-io-browser-plugin/issues/31)) ([bdd1137](https://github.com/emaarco/bpmn-io-browser-plugin/commit/bdd11375bcbca34fdb6776c9baac44bc6390a7e0))
* **extension:** theme the diff/zoom button hover and round the controls ([#35](https://github.com/emaarco/bpmn-io-browser-plugin/issues/35)) ([6466b37](https://github.com/emaarco/bpmn-io-browser-plugin/commit/6466b3797cef87d891f47e59afa496ed1d674e38))
* **extension:** wrap the diff tabs and diagram in one bordered box ([#33](https://github.com/emaarco/bpmn-io-browser-plugin/issues/33)) ([6dd0e8c](https://github.com/emaarco/bpmn-io-browser-plugin/commit/6dd0e8c61ba2bf5f7fc3fd5c969e2c5b1d9f7524))
* **extension:** zoom the diagram on Ctrl/Cmd+wheel instead of the page ([#25](https://github.com/emaarco/bpmn-io-browser-plugin/issues/25)) ([a7ddeb5](https://github.com/emaarco/bpmn-io-browser-plugin/commit/a7ddeb51f10bb12b749804e681c14edffb5aa335))
* render BPMN diffs on GitHub's new Files changed experience ([#13](https://github.com/emaarco/bpmn-io-browser-plugin/issues/13)) ([709089e](https://github.com/emaarco/bpmn-io-browser-plugin/commit/709089eaf962f332c43f08615d220f01b3b03f08))


### Miscellaneous Chores

* release 0.2.0 ([#57](https://github.com/emaarco/bpmn-io-browser-plugin/issues/57)) ([628e331](https://github.com/emaarco/bpmn-io-browser-plugin/commit/628e3314d9bcd82bfdbe47c8da027ea60eeb5ed8))
