### v5.0.4 (2022-01-09)

- [Do not follow cross-origin non-anchor relations in internalOnly mode](https://github.com/Munter/hyperlink/commit/bfaa8dcd4b2cbc59c64ca9064095f73eeb7589a2) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.0.3 (2021-11-21)

- [Do not continue crawling on the other origin when the origin-crossing relation results in an HTTP redirect](https://github.com/Munter/hyperlink/commit/240f5848eb100ba205987be33d0b385e6bfc35f1) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add regression test for \#196](https://github.com/Munter/hyperlink/commit/a6ef642acfd380e90647e666e3518142f68f0e49) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.0.2 (2021-11-20)

- [Also require parseTree to be present, see \#196](https://github.com/Munter/hyperlink/commit/80870165df69d4fdf5b9d96c04a68e42a7eb891a) ([Andreas Lind](mailto:andreas.lind@workday.com))

### v5.0.1 (2021-11-20)

- [Try to fix \#196](https://github.com/Munter/hyperlink/commit/3051c35259e824346297f31efc37da433375c242) ([Andreas Lind](mailto:andreas.lind@workday.com))

### v5.0.0 (2021-10-21)

- [Add CHANGELOG.md to .prettierignore](https://github.com/Munter/hyperlink/commit/25312a181dd92fc95666046b7dbe268468dd9530) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [prettier --write '\*\*\/\*.{js,json,md,css}'](https://github.com/Munter/hyperlink/commit/58773608d6bd994a218e61b412c0626efea52459) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Lock prettier down to the minor version](https://github.com/Munter/hyperlink/commit/a27c70868a05d9ecd32955cf777c65e464385d45) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Drop node.js 8 and 10 support \(semver-major\)](https://github.com/Munter/hyperlink/commit/3cb184f8f86023f0e0021cc47da0f3e4aa205924) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update assetgraph to ^7.3.1](https://github.com/Munter/hyperlink/commit/738937b4892f25460d3f119676c13ee71fe29fbc) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [+1 more](https://github.com/Munter/hyperlink/compare/v4.7.0...v5.0.0)

### v4.7.0 (2021-08-09)

#### Pull requests

- [#189](https://github.com/Munter/hyperlink/pull/189) Avoid ever following JavascriptFetch relations. Fixes \#188 ([Peter Müller](mailto:munter@fumle.dk))

#### Commits to master

- [Add README section about new sitemap support](https://github.com/Munter/hyperlink/commit/2d19a041b4a05ba2281f121c3919dec335f80bd3) ([Peter Müller](mailto:pingvin+github@gmail.com))
- [Prettier formatting](https://github.com/Munter/hyperlink/commit/a2478e01fe2e89b57e1885fa0607196d52602bd9) ([Peter Müller](mailto:pingvin+github@gmail.com))
- [Upgrade urltools to 0.4.2. Fixes \#169](https://github.com/Munter/hyperlink/commit/5e5d0a84d58f74acbe8dd923701780332a52c74a) ([Peter Müller](mailto:pingvin+github@gmail.com))
- [Add assetgraph-plugin-sitemap for sitemap support](https://github.com/Munter/hyperlink/commit/58e4a957b7965706243eea0b198115f502644bf3) ([Peter Müller](mailto:pingvin+github@gmail.com))
- [Update assetgraph to 7.1.0](https://github.com/Munter/hyperlink/commit/f1888ddcfcf8006b1074762ab8e2738fc088d099) ([Peter Müller](mailto:pingvin+github@gmail.com))

### v4.6.1 (2021-04-13)

- [#192](https://github.com/Munter/hyperlink/pull/192) Make it clearer that --skip and --todo are substrings ([Aarni Koskela](mailto:akx@iki.fi))
- [#193](https://github.com/Munter/hyperlink/pull/193) Remove antiquated JSHint files ([Aarni Koskela](mailto:akx@iki.fi))

### v4.6.0 (2020-11-12)

- [Update assetgraph to ^6.3.0](https://github.com/Munter/hyperlink/commit/9441a659ea9f7738b74dbb4c33e2a19b6decbe44) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.5.3 (2020-10-05)

- [Replace optimist with yargs, fixes \#185](https://github.com/Munter/hyperlink/commit/eafa7d0010b9d61a440057d9a990cb86e1b74ae8) ([Andreas Lind](mailto:andreas.lind@peakon.com))

### v4.5.2 (2020-08-12)

- [#184](https://github.com/Munter/hyperlink/pull/184) Update assetgraph dependency ([gchuf](mailto:gasper.cefarin@gmail.com))

### v4.5.1 (2020-08-11)

- [#183](https://github.com/Munter/hyperlink/pull/183) Use FileRedirect relations for the pretty feature ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.5.0 (2020-05-03)

#### Pull requests

- [#180](https://github.com/Munter/hyperlink/pull/180) Check name-attributes as a fallback for id-attributes when validating… ([Peter Müller](mailto:munter@fumle.dk))
- [#168](https://github.com/Munter/hyperlink/pull/168) Add 'pretty'-option that lets hyperlink sresolve extensionless hrefs … ([Peter Müller](mailto:munter@fumle.dk))
- [#178](https://github.com/Munter/hyperlink/pull/178) Align \(a bit more\) with prettier 2 defaults ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [#176](https://github.com/Munter/hyperlink/pull/176) chore\(package\): update prettier to version 2.0.1 ([Andreas Lind](mailto:andreas.lind@peakon.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))
- [#174](https://github.com/Munter/hyperlink/pull/174) Update sinon to the latest version 🚀 ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))
- [#173](https://github.com/Munter/hyperlink/pull/173) Update mocha to the latest version 🚀 ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))
- [#172](https://github.com/Munter/hyperlink/pull/172) Update eslint-plugin-node to the latest version 🚀 ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))
- [#171](https://github.com/Munter/hyperlink/pull/171) Update nyc to the latest version 🚀 ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))
- [#170](https://github.com/Munter/hyperlink/pull/170) Update sinon to the latest version 🚀 ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))

#### Commits to master

- [Add --pretty option to README](https://github.com/Munter/hyperlink/commit/f696f7d8c75574dee729a187869398a201922b0d) ([Peter Müller](mailto:munter@fumle.dk))
- [Add test for getModifiedHref](https://github.com/Munter/hyperlink/commit/135cd2479bf74369100c7f0978ac4e279860ea27) ([Peter Müller](mailto:munter@fumle.dk))
- [Switch to mocharc file](https://github.com/Munter/hyperlink/commit/8cbd2aa3878ae234b707d0beced308c22e55ef7c) ([Peter Müller](mailto:munter@fumle.dk))

### v4.4.3 (2019-11-25)

- [Update dependencies](https://github.com/Munter/hyperlink/commit/c942792c8783ac1478a9b25671461a5e0c5b4725) ([Peter Müller](mailto:munter@fumle.dk))
- [Update assetgraph to 6.0.2](https://github.com/Munter/hyperlink/commit/73b1c5e5daf3679e15b5df17dba28f35be5e8ab7) ([Peter Müller](mailto:munter@fumle.dk))

### v4.4.2 (2019-11-16)

- [Fix bug where local srcset images would be categorized as external](https://github.com/Munter/hyperlink/commit/4613190b9bd75b29f24134e2a0aa985f37e1b421) ([Peter Müller](mailto:munter@fumle.dk))
- [Add npmjs.com to weird hosts that add 'user-content-' in front of fragments](https://github.com/Munter/hyperlink/commit/5aae7eac33d29828d21cc601521be4443de3d0b2) ([Peter Müller](mailto:munter@fumle.dk))
- [prettier --write '\*\*\/\*.js'](https://github.com/Munter/hyperlink/commit/48cccd31e1f53c85a80d929066efe3522d6fb821) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [chore\(package\): update prettier to version 1.19.1](https://github.com/Munter/hyperlink/commit/afb4df466fc3fe873c3c1bb96664721afdda2eb0) ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))
- [Trim 'index.html' away from fragment redirect expected URLs](https://github.com/Munter/hyperlink/commit/9973d693e7b1b6ec85441c2b93c044b85b2ef2d1) ([Peter Müller](mailto:munter@fumle.dk))

### v4.4.1 (2019-11-05)

- [#166](https://github.com/Munter/hyperlink/pull/166) Fix error thrown when encountering HTTP redirects with HTML payload ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Peter Müller](mailto:munter@fumle.dk))

### v4.4.0 (2019-10-29)

#### Pull requests

- [#165](https://github.com/Munter/hyperlink/pull/165) Emit an error if a relation with a fragment gets redirected ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Peter Müller](mailto:munter@fumle.dk))

#### Commits to master

- [Updated dependencies](https://github.com/Munter/hyperlink/commit/007c38e4f4cadc5059c9dd4867071abf42bab3c2) ([Peter Müller](mailto:munter@fumle.dk))
- [chore\(package\): update eslint-plugin-node to version 10.0.0](https://github.com/Munter/hyperlink/commit/0e772a3c7b9404bcbdfde91dfe166d8ec3dc123d) ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))

### v4.3.2 (2019-08-28)

#### Pull requests

- [#162](https://github.com/Munter/hyperlink/pull/162) Update eslint-config-standard to the latest version 🚀 ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))
- [#161](https://github.com/Munter/hyperlink/pull/161) Update assetgraph to the latest version 🚀 ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))

#### Commits to master

- [Update travis config](https://github.com/Munter/hyperlink/commit/7e50eca7d7511319d76b20d46b4de589a25ab045) ([Peter Müller](mailto:munter@fumle.dk))
- [Dev dependency maintenance](https://github.com/Munter/hyperlink/commit/ea42586de353fb6008bc7a9650fac54fd74bcc34) ([Peter Müller](mailto:munter@fumle.dk))
- [Fix critical security issues](https://github.com/Munter/hyperlink/commit/66eef780058f3fd9724539906178250939e98aa0) ([Peter Müller](mailto:munter@fumle.dk))
- [Sto using async keyword as a variable](https://github.com/Munter/hyperlink/commit/e3a5d0fa5cf7f0e93624cd976f678c2cc0ec862d) ([Peter Müller](mailto:munter@fumle.dk))
- [Switch tap-render out with @munter\/tap-render](https://github.com/Munter/hyperlink/commit/080b5665efc7805132b752f0313b06ff5deda2fc) ([Peter Müller](mailto:munter@fumle.dk))

### v4.3.1 (2019-08-16)

- [Fix bug where fragment checks would be executed to links to external pages that were never loaded when runnin in internal mode](https://github.com/Munter/hyperlink/commit/55934904c5a1347054173c3325bdf1bdf34f8a69) ([Peter Müller](mailto:munter@fumle.dk))

### v4.3.0 (2019-08-15)

- [Update to Assetgraph 5.12.0. Now with runtime js import\(\) support](https://github.com/Munter/hyperlink/commit/e880d167f6ab261b88dddd1670e497b41b157be2) ([Peter Müller](mailto:munter@fumle.dk))

### v4.2.0 (2019-08-13)

- [#159](https://github.com/Munter/hyperlink/pull/159) Feature\/handle GitHub readme fragments ([Peter Müller](mailto:munter@fumle.dk))

### v4.1.2 (2019-07-24)

#### Pull requests

- [#157](https://github.com/Munter/hyperlink/pull/157) Update dependencies to enable Greenkeeper 🌴 ([Peter Müller](mailto:munter@fumle.dk), [greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))
- [#155](https://github.com/Munter/hyperlink/pull/155) Stop recursing into Html where it shouldn't ([Peter Müller](mailto:munter@fumle.dk))
- [#156](https://github.com/Munter/hyperlink/pull/156) Output valid TAP details without any stray colons that cause par… ([Peter Müller](mailto:munter@fumle.dk))
- [#153](https://github.com/Munter/hyperlink/pull/153) Run fragment-check when `internal` flag is true ([Peter Müller](mailto:munter@fumle.dk))

#### Commits to master

- [Update to assetgraph 5.11.0. Closes \#158](https://github.com/Munter/hyperlink/commit/3785c5204fdefe76340d1fba6b6b82bafa44b1fe) ([Peter Müller](mailto:munter@fumle.dk))
- [Auto generate CHANGELOG.md](https://github.com/Munter/hyperlink/commit/6046ea5a581cab0142998f0a940331ef7b308d46) ([Peter Müller](mailto:munter@fumle.dk))
- [Less aggressive semver upgrade scheme on prettier](https://github.com/Munter/hyperlink/commit/3cda33f7f65132ec30ca452c164f28183df40980) ([Peter Müller](mailto:munter@fumle.dk))
- [Enable prettier as part of eslint](https://github.com/Munter/hyperlink/commit/3edb74fd14dd75dcb3699485309ca06fc050b480) ([Peter Müller](mailto:munter@fumle.dk))
- [Update prettier to 1.18.2](https://github.com/Munter/hyperlink/commit/3cc5f3eecc0e219e696e8ca55162905d918a6173) ([Peter Müller](mailto:munter@fumle.dk))
- [+12 more](https://github.com/Munter/hyperlink/compare/v4.1.1...v4.1.2)

### v4.1.1 (2019-06-03)

#### Pull requests

- [#151](https://github.com/Munter/hyperlink/pull/151) Fix fragment check through redirects ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Remove silly use of switch \(...\) {}](https://github.com/Munter/hyperlink/commit/7e66101f3038711bf34b46d88f0194304a916b5d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Remove unnecessary !!](https://github.com/Munter/hyperlink/commit/c119cc22d7c82d2af23810bdbc809d5d66244029) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add launch config for running the test suite with the vscode debugger](https://github.com/Munter/hyperlink/commit/82148b31410fb516b9124a7b2dfb029d31fed1f5) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.1.0 (2019-04-06)

#### Pull requests

- [#149](https://github.com/Munter/hyperlink/pull/149) Update assetgraph to version 5 ([Christoph Guttandin](mailto:chrisguttandin@media-codings.com))

#### Commits to master

- [Bring back the type compatibility check](https://github.com/Munter/hyperlink/commit/58f9f8827ee37315fa89071348b83360464b8c2c) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Revert "Remove tests which cover the compatibility check"](https://github.com/Munter/hyperlink/commit/7bc868caff5a03c752408862b5a216dd01b6bbb6) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update httpception to ^2.1.0 so the tests run with node 10+](https://github.com/Munter/hyperlink/commit/695abb5c7161f4d611f81aec6c9a7f4d66b71f01) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.0.0 (2018-07-29)

#### Pull requests

- [#147](https://github.com/Munter/hyperlink/pull/147) Fix problem with failing fragment check on non-loaded external html assets ([Peter Müller](mailto:munter@fumle.dk))
- [#142](https://github.com/Munter/hyperlink/pull/142) Use assetgraph to load file-urls when traversing local files non-recu… ([Peter Müller](mailto:munter@fumle.dk))
- [#139](https://github.com/Munter/hyperlink/pull/139) Don't follow links to unsupported protocols. Closes \#131 ([Peter Müller](mailto:munter@fumle.dk))
- [#138](https://github.com/Munter/hyperlink/pull/138) Check Content-Type headers ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Peter Müller](mailto:munter@fumle.dk))
- [#136](https://github.com/Munter/hyperlink/pull/136) Fix excessive mixed-content checks of irrelevant relations ([Peter Müller](mailto:munter@fumle.dk))
- [#134](https://github.com/Munter/hyperlink/pull/134) Fix the behavior of followSourceMaps:true ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#133](https://github.com/Munter/hyperlink/pull/133) --skip and --todo and deprecate --exclude ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Peter Müller](mailto:munter@fumle.dk))
- [#132](https://github.com/Munter/hyperlink/pull/132) Update to assetgraph 4 ([Andreas Lind](mailto:andreas@one.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Peter Müller](mailto:munter@fumle.dk))
- [#130](https://github.com/Munter/hyperlink/pull/130) Only HEAD assets without outgoing relations ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Peter Müller](mailto:munter@fumle.dk))
- [#129](https://github.com/Munter/hyperlink/pull/129) Test \(and fix up\) excludePatterns ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Update readme](https://github.com/Munter/hyperlink/commit/336ace59c2b45fe83d0290c70e6c28dc68ba5358) ([Peter Müller](mailto:munter@fumle.dk))
- [Added --internal cli switch that avoids checking any crossorigin links. This allows you to do quick checks on your own sites internal structure](https://github.com/Munter/hyperlink/commit/5fbce69752314abf74d570ba35915d5609e7a407) ([Peter Müller](mailto:munter@fumle.dk))
- [Lock down prettier to a minor version, ~1.14.0](https://github.com/Munter/hyperlink/commit/177aaae39d158d229f615e599a398cf60dcdc6b2) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [eslint --fix .](https://github.com/Munter/hyperlink/commit/8ad42e469f2456d0dca4dbcc58d32f2b2a945dc0) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Restore compatibility with assetgraph &gt; 4.8.0](https://github.com/Munter/hyperlink/commit/aa33dde09c4419c3062a2b3ba2ad506784dd9712) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [+25 more](https://github.com/Munter/hyperlink/compare/v3.0.1...v4.0.0)

### v3.0.1 (2017-12-17)

#### Pull requests

- [#124](https://github.com/Munter/hyperlink/pull/124) Fix checking of &lt;link rel=preconnect href=...&gt; ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Update dependencies](https://github.com/Munter/hyperlink/commit/6c19cf017268a20d9999b6cd30be6f8ccce4dcc5) ([Peter Müller](mailto:munter@fumle.dk))
- [Fix test that failed because of differing assetgraph root and asset url](https://github.com/Munter/hyperlink/commit/576a34ea57575ed55da3a03e5a39467eb070efee) ([Peter Müller](mailto:munter@fumle.dk))
- [Update assetgraph to 3.13.1](https://github.com/Munter/hyperlink/commit/1cd2f97d5975f5bd22ed31b133c4c3fc1959ad4e) ([Peter Müller](mailto:munter@fumle.dk))

### v3.0.0 (2017-07-16)

#### Pull requests

- [#116](https://github.com/Munter/hyperlink/pull/116) docs\(README\): update usage ([Simon Legner](mailto:Simon.Legner@gmail.com))

#### Commits to master

- [Added --source-maps option to include source map files and sources in traversal. Separates recursion and source map traversal. semvar-major](https://github.com/Munter/hyperlink/commit/a8f3504ee0d1efbf7902f0a77beabec5051cdcc1) ([Peter Müller](mailto:munter@fumle.dk))
- [Added --canonicalroot option. semver-minor](https://github.com/Munter/hyperlink/commit/5f55fa433c8876819ea4062ace0c5bb6ec90b038) ([Peter Müller](mailto:munter@fumle.dk))
- [Give some servers a bit more time to recover from a 502 response when requesting HEAD + GET in close succession. Avoids 502 response to GET request. Fixes \#120](https://github.com/Munter/hyperlink/commit/1b2c80cd00b68d6c6df5c37ab3ccead7bc0a5e06) ([Peter Müller](mailto:munter@fumle.dk))

### v2.8.0 (2017-05-13)

#### Pull requests

- [#118](https://github.com/Munter/hyperlink/pull/118) Fix\/memory usage ([Andreas Lind](mailto:andreas@one.com))

#### Commits to master

- [Retry with GET request in some situations when HEAD request fails](https://github.com/Munter/hyperlink/commit/bbe9aa006c0e74ee6ded1a61db19451b30b22a00) ([Peter Müller](mailto:munter@fumle.dk))
- [Add option to debug memory usage](https://github.com/Munter/hyperlink/commit/bd7484044081233ea41982ac31595e3ac64b3ef0) ([Peter Müller](mailto:munter@fumle.dk))
- [Fix bug introdduced in previous version. Callbacks would not be called](https://github.com/Munter/hyperlink/commit/d90b96fd2a3726d8317d719a62ac5588fa752527) ([Peter Müller](mailto:munter@fumle.dk))
- [Try HTTP HEAD before falling back to HTTP GET for external assets. Also send some accept headers to improve odds of webserver responding. Refs \#117](https://github.com/Munter/hyperlink/commit/3e26dfa405ffa18fb50bb9b9278d2742f9642cea) ([Peter Müller](mailto:munter@fumle.dk))
- [Update dependencies](https://github.com/Munter/hyperlink/commit/631eaba56d7ccf1f82d5df7b395cee068defc4ef) ([Peter Müller](mailto:munter@fumle.dk))

### v2.7.1 (2017-03-06)

- [Handle errors in inline assets better and improve CSS debug description. semver-patch](https://github.com/Munter/hyperlink/commit/00b4506e05cd567c0efbae17db6968df3eb2fa87) ([Peter Müller](mailto:munter@fumle.dk))
- [Fixes missing lookup up nonInlineAncestor for relations from inlined assets when generating debug output. semver-patch](https://github.com/Munter/hyperlink/commit/5c0c582acf16b0a53c62c22526cc0cfd072f3ff2) ([Peter Müller](mailto:munter@fumle.dk))

### v2.7.0 (2017-02-09)

#### Pull requests

- [#111](https://github.com/Munter/hyperlink/pull/111) Update nyc to version 10.0.0 🚀 ([greenkeeperio-bot](mailto:support@greenkeeper.io))
- [#109](https://github.com/Munter/hyperlink/pull/109) Show false positive ([Juho Vepsalainen](mailto:bebraw@gmail.com))

#### Commits to master

- [Added ability to exclude urls. Closes \#12](https://github.com/Munter/hyperlink/commit/a883caaaa839c12816b609d0ffc730b7b6a35650) ([Peter Müller](mailto:munter@fumle.dk))
- [Fix test for improved html debugging output](https://github.com/Munter/hyperlink/commit/4a76f7b6b82175a899e02a74dd43ae1ef8364275) ([Peter Müller](mailto:munter@fumle.dk))
- [Added 302 redirect test data](https://github.com/Munter/hyperlink/commit/df9c88757ca9f3e5738cce8c4861362e43ca5132) ([Peter Müller](mailto:munter@fumle.dk))
- [Improve debugging output for HtmlRelations](https://github.com/Munter/hyperlink/commit/b0e68126aa62dbf998698912b3c0a8c68d2e2eb2) ([Peter Müller](mailto:munter@fumle.dk))
- [Dont falsely report protocol relative href urls as violating the mixed-content rule](https://github.com/Munter/hyperlink/commit/6b8c82e4bb604b52f207c8a5a543259e303f4f50) ([Peter Müller](mailto:munter@fumle.dk))
- [+9 more](https://github.com/Munter/hyperlink/compare/v2.6.1...v2.7.0)

### v2.6.1 (2016-10-22)

- [Fix missing util file. Too restrictive files array in package.json :\(](https://github.com/Munter/hyperlink/commit/39f4b2018c416072dfcfbbb5655080eeca78cb21) ([Peter Müller](mailto:munter@fumle.dk))

### v2.6.0 (2016-10-22)

- [Improve fragmetn identifier checks](https://github.com/Munter/hyperlink/commit/22df4d65cd97aa9a986f2575495ce22bbe3bc90d) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to assetgraph 3.0.0-35](https://github.com/Munter/hyperlink/commit/72716b9601a8ec3ab3b02f6c92bb230ca5cf19c0) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to assetgraph 3.0.0-34](https://github.com/Munter/hyperlink/commit/3306188d631818030c4b4f9e16668a46c702dfce) ([Peter Müller](mailto:munter@fumle.dk))
- [Be more resilient against error types](https://github.com/Munter/hyperlink/commit/ad759efda060c6331e1139dfeb2d3408404aedc7) ([Peter Müller](mailto:munter@fumle.dk))

### v2.5.0 (2016-10-18)

#### Pull requests

- [#102](https://github.com/Munter/hyperlink/pull/102) async@2.1.1 untested ⚠️ ([greenkeeperio-bot](mailto:support@greenkeeper.io))

#### Commits to master

- [Early exit when a fragment identifier has no fragment](https://github.com/Munter/hyperlink/commit/c61c40e56207cb51ba1bb2c857404eb68c4fc63e) ([Peter Müller](mailto:munter@fumle.dk))
- [Filter out AssetGraph.ensureAssetConfigHasType errors. They were usually duplicates of a later more informative ENOENT anyway](https://github.com/Munter/hyperlink/commit/15b8327296c9ade12c7fd81d1479f0b95de133f7) ([Peter Müller](mailto:munter@fumle.dk))
- [Exit with code 0 on success, 1 if there are errors. Fixes \#38](https://github.com/Munter/hyperlink/commit/2a784459fc15457203cd583a380f85fb93e545b8) ([Peter Müller](mailto:munter@fumle.dk))
- [Check fragment identifier integrity. Closes \#105](https://github.com/Munter/hyperlink/commit/d972ff44ebc368548e9316eb20243601c2596fab) ([Peter Müller](mailto:munter@fumle.dk))
- [Update jshint and async](https://github.com/Munter/hyperlink/commit/184539a6227a9f9be3716939c44b30a1b4ac5847) ([Peter Müller](mailto:munter@fumle.dk))

### v2.4.0 (2016-10-11)

#### Pull requests

- [#23](https://github.com/Munter/hyperlink/pull/23) Update request to version 2.67.0 🚀 ([greenkeeperio-bot](mailto:support@greenkeeper.io))
- [#25](https://github.com/Munter/hyperlink/pull/25) Update assetgraph to version 2.0.1 🚀 ([greenkeeperio-bot](mailto:support@greenkeeper.io))

#### Commits to master

- [Update async and lodash](https://github.com/Munter/hyperlink/commit/c08d2b794353192b185e2c9dd3d92638bb311aa4) ([Peter Müller](mailto:munter@fumle.dk))
- [Dependency minor and patch updates](https://github.com/Munter/hyperlink/commit/7c1ef6bcbb7af7bbad1b4cf492526db926b6bbad) ([Peter Müller](mailto:munter@fumle.dk))
- [Update population queries to use crossorigin getter](https://github.com/Munter/hyperlink/commit/e15c6f67cd7cade82e03a0cbabae729394203d10) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to assetraph 3.0.0-27](https://github.com/Munter/hyperlink/commit/d13b46ce47df78dae504ef5fa1bc32f1e0acb174) ([Peter Müller](mailto:munter@fumle.dk))

### v2.3.0 (2015-10-14)

#### Pull requests

- [#15](https://github.com/Munter/hyperlink/pull/15) lodash@3.10.1 untested ⚠️ ([greenkeeperio-bot](mailto:support@greenkeeper.io))
- [#16](https://github.com/Munter/hyperlink/pull/16) jshint@2.8.0 untested ⚠️ ([greenkeeperio-bot](mailto:support@greenkeeper.io))
- [#18](https://github.com/Munter/hyperlink/pull/18) Update request to version 2.65.0 🚀 ([greenkeeperio-bot](mailto:support@greenkeeper.io))
- [#19](https://github.com/Munter/hyperlink/pull/19) Add `concurrency` option to CLI ([Albert Fernández](mailto:albertfdp@gmail.com))
- [#14](https://github.com/Munter/hyperlink/pull/14) Updated async to version 1.4.2 ([greenkeeperio-bot](mailto:support@greenkeeper.io))

#### Commits to master

- [Run linting on test](https://github.com/Munter/hyperlink/commit/9fe29f3b79e50f0718b7c1c6686c49e9d2645a9e) ([Peter Müller](mailto:munter@fumle.dk))

### v2.2.0 (2015-08-18)

- [Explicitly only include needed files](https://github.com/Munter/hyperlink/commit/8c3f8ffb5d190533cb3173717029661f6a33db93) ([Peter Müller](mailto:munter@fumle.dk))
- [Ignore local .tap files](https://github.com/Munter/hyperlink/commit/97bf9276f0a9e0070a72b4323c278edbf6e43f7a) ([Peter Müller](mailto:munter@fumle.dk))
- [Upgrade to assetgraph 1.22.0. Fixes \#4 Fixes \#11](https://github.com/Munter/hyperlink/commit/a4ec7f51a5533eb01678ef273ff358f4b99bc2f4) ([Peter Müller](mailto:munter@fumle.dk))
- [Fix typo that resulted in incorrectly flagging all urls as mixed content urls](https://github.com/Munter/hyperlink/commit/044d7b1226100f80037ef70a8c6ef435e3389b93) ([Peter Müller](mailto:munter@fumle.dk))
- [Be better at finding rootUrl in non-file input urls](https://github.com/Munter/hyperlink/commit/d66bcf03acf7717df440f92a79a99d74232ac2e5) ([Peter Müller](mailto:munter@fumle.dk))
- [+1 more](https://github.com/Munter/hyperlink/compare/v2.1.0...v2.2.0)

### v2.1.0 (2015-07-23)

- [Added SSL mixed content detection for external content](https://github.com/Munter/hyperlink/commit/6d57ec7cf669cc925ef6332c8a620c46c6869239) ([Peter Müller](mailto:munter@fumle.dk))
- [Improved integrations part of README with tee](https://github.com/Munter/hyperlink/commit/22bce258058dc96049ea885c76005f1af78d5a2f) ([Peter Müller](mailto:munter@fumle.dk))

### v2.0.4 (2015-04-15)

- [Send User-Agent with all requests, hopefully reducing the amount of 403 responses from servers. Fixes \#9](https://github.com/Munter/hyperlink/commit/c5d7ff0d0aee25e68c8e032aafdeb18670d1e4b3) ([Peter Müller](mailto:munter@fumle.dk))

### v2.0.3 (2015-04-12)

- [Treat non-ok HTTP status codes as separate error from redirect chain, and treat redirect chains starting with a 302 as valid](https://github.com/Munter/hyperlink/commit/5f430d3ffa3ea2752453b3bd591c0f69443829cf) ([Peter Müller](mailto:munter@fumle.dk))
- [Use a better test name for non-200 responses](https://github.com/Munter/hyperlink/commit/b5b619e654beda43759bd3cf5c46d34df4aafde9) ([Peter Müller](mailto:munter@fumle.dk))
- [Include list of referring pages when failing tests on HTTP 200 check](https://github.com/Munter/hyperlink/commit/4d507a0660807416d2145d312f6880c24543bced) ([Peter Müller](mailto:munter@fumle.dk))
- [Improve error rendering. Now includes line numbers in 'at:' block if they are annotated in the error](https://github.com/Munter/hyperlink/commit/7de2c64fa64db59581b3ac117dcb58f22898bca7) ([Peter Müller](mailto:munter@fumle.dk))

### v2.0.2 (2015-04-09)

- [Update assetgraph to 1.17.4](https://github.com/Munter/hyperlink/commit/b19dded7c119207944ae5d313215cbf22cccc0c3) ([Peter Müller](mailto:munter@fumle.dk))

### v2.0.1
- [Upgrade to assetgraph 1.17.3](https://github.com/Munter/hyperlink/commit/29f6795e53221c4911cc0433e60e6a76db1bac58) ([Peter Müller](mailto:munter@fumle.dk))
- [Update README.md](https://github.com/Munter/hyperlink/commit/8130f5a9f989e09fd6b8915facb13fad27be5195) ([Peter Müller](mailto:munter@fumle.dk))
- [Update README.md](https://github.com/Munter/hyperlink/commit/2eb4514d8844e8c4fde917d9e4166eaf0d9c9dce) ([Peter Müller](mailto:munter@fumle.dk))
- [Remove outdated example from README](https://github.com/Munter/hyperlink/commit/fa9c9b7bdf9843ddad1c6ea2943437384b69561d) ([Peter Müller](mailto:munter@fumle.dk))

### v1.0.2 (2015-04-05)

#### Pull requests

- [#3](https://github.com/Munter/hyperlink/pull/3) Bump dependencies ([Pascal Hartig](mailto:phartig@twitter.com))

#### Commits to master

- [Lock request, since upgrading it regresses redirect chain detection](https://github.com/Munter/hyperlink/commit/9a7df5000da20351661d834f41b6e9eb94b81801) ([Peter Müller](mailto:munter@fumle.dk))
- [Upgrade to assetgraph 1.17.0. Fixes \#2](https://github.com/Munter/hyperlink/commit/5b5edf2471e294dbc273f38538eacd065070625f) ([Peter Müller](mailto:munter@fumle.dk))
- [Update README.md](https://github.com/Munter/hyperlink/commit/a5aba3c81d1a7dd08308a44405d5352c722b124b) ([Peter Müller](mailto:munter@fumle.dk))
- [Update README.md](https://github.com/Munter/hyperlink/commit/0b1b4d4de6c0cd7695760788d2fd04ee4ef23ef5) ([Peter Müller](mailto:munter@fumle.dk))

### v1.0.1
- [Updated dependencies](https://github.com/Munter/hyperlink/commit/a14cf427c1718fa9206712f70b827d161bbd111e) ([Peter Müller](mailto:munter@fumle.dk))

### v1.0.0 (2014-07-22)

- [Added README](https://github.com/Munter/hyperlink/commit/dea5a1726f9353ee20bf10b529427f444c3ef6a9) ([Peter Müller](mailto:munter@fumle.dk))
- [Updated jshint config](https://github.com/Munter/hyperlink/commit/254a2bcfbfd756e5fd20c2fa9d0cb8d8a9b839e3) ([Peter Müller](mailto:munter@fumle.dk))
- [Updated assetgrpah to 1.7.1](https://github.com/Munter/hyperlink/commit/0f55cb8b6c1a7a00111fa99f4856cf8921a6e4e7) ([Peter Müller](mailto:munter@fumle.dk))
- [Fix wrong redirect chain logging](https://github.com/Munter/hyperlink/commit/e17a4187f31a55c29f27ee354cfb26f1c6d237ec) ([Peter Müller](mailto:munter@fumle.dk))
- [Add robustness against dns errors and better logging when no redirects are present](https://github.com/Munter/hyperlink/commit/059080279b983e7718a1dd2f62e47a2546607f5e) ([Peter Müller](mailto:munter@fumle.dk))
- [+5 more](https://github.com/Munter/hyperlink/compare/v0.0.1...v1.0.0)

### v0.0.1 (2014-07-07)

- [Typo in package.json](https://github.com/Munter/hyperlink/commit/13f7c2cebab5f34d273715231cbda08f73fcd4db) ([Peter Müller](mailto:munter@fumle.dk))
- [Added redirect chain detection](https://github.com/Munter/hyperlink/commit/13f6da79178a3308047617aa9ed02f16f5aff2ef) ([Peter Müller](mailto:munter@fumle.dk))
- [Working version for internal link consistency](https://github.com/Munter/hyperlink/commit/bc4e23639019c991d5be5ecbc2ccf9dc4e280936) ([Peter Müller](mailto:munter@fumle.dk))
- [Added assetgraph 1.6.42](https://github.com/Munter/hyperlink/commit/e98e598888993f1870e52ae1c0aa851db255b33c) ([Peter Müller](mailto:munter@fumle.dk))
- [dotfiles](https://github.com/Munter/hyperlink/commit/33e34140fead636606dc586bf7b0531e14dc7f56) ([Peter Müller](mailto:munter@fumle.dk))
- [+1 more](https://github.com/Munter/hyperlink/compare/13f7c2cebab5f34d273715231cbda08f73fcd4db%5E...v0.0.1)

