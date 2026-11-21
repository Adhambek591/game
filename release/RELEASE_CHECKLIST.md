# Qırq qız — Play Market release checklist (state 2026-11-20 evening)

| Item | State | Where |
|---|---|---|
| Web manifest: name "Qırq qız", icons 192/512 + maskable 192/512, landscape, fullscreen, colours | DONE (not deployed yet) | public/manifest.webmanifest |
| Service worker: network-first js/json/html/css, offline shell + offline page, no browser error screen | DONE + tested offline (not deployed yet) | public/sw.js, t/bench/swt.log |
| Viewport / safe area / fullscreen / orientation lock | OK, nothing to change | index.html, story.js begin() |
| Privacy policy, 4 languages, matches the build (no data, no ads SDK) | DONE (qq text needs the author's reading) | public/privacy.html |
| Store texts qq / uz / ru / en + Console answers | DONE (qq needs the author's reading) | release/store_listing.md |
| Icon 512 | DONE | release/graphics/icon_512.png |
| Feature graphic 1024x500 | DONE (burgundy Gúlayım from current key art; redo when blue key art exists) | release/graphics/feature_1024x500.png |
| Phone screenshots (min 2, 16:9) | see release/screenshots/ — list in bench_log / final report | release/screenshots/ |
| TWA draft (Bubblewrap) | DONE | release/twa/twa-manifest.json |
| assetlinks.json | TEMPLATE — needs the SHA-256 from Play Console, then copy to public/.well-known/assetlinks.json | release/twa/assetlinks.json |
| Target API 36 | must be checked in the generated build.gradle | — |
| Download size | NOT READY: ~50 MB before first play, 98 MB total. Owners: models / mechanics (Top-20 #1, #4) | bench_log §1, §10 |
| "Reklama" buttons with a fake 5 s timer | NOT READY: hide or relabel before review (listing says "no ads") | engine.js ADS fallback, story.js, missions.js |
| Real-device test (3 GB Android, Chrome) | NOT DONE by anyone | — |
| Deploy of manifest/sw/privacy/icon | NOT DONE (nothing committed or pushed by me) | — |

## Author's part (cannot be done by an agent)
1. Read the Karakalpak blocks in store_listing.md and privacy.html.
2. Confirm package name `app.zagara.qirqqiz` and the public domain.
3. Play Console: create app, enable Play App Signing, upload the .aab built by Bubblewrap, keep the upload keystore + password safe.
4. Give the SHA-256 fingerprint (App integrity page) so assetlinks.json can be deployed; enter contact e-mail; submit content-rating and Data-safety forms (answers are in store_listing.md).
