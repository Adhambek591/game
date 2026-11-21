# map agent log — chapter map, mission intro fly-over, chapter-end stars, credits

## New file
- js/map.js — everything lives here (CSS is injected from JS as <style id="mapcss">; no index.html edits were needed).
  Exports: initMap(ctx), openMap(src), endStars(n,k,total), saveStars(n,k), getStars(), flyFor(bannerTitle), introFly(points), credits(fromTitle).
  Debug: window.__M = { credits, endStars, openMap, introFly, flyFor, getStars, saveStars }.
  localStorage: qq_stars = {"0":0,"1":3,"2":2,...} (best stars per chapter; written by endStars). Unlock rule: prologue always; ch1 when qq_prog exists; chN when qq_ch >= N or chapter N-1 has saved stars.
  Query params: ?map=1 opens the map after loading; intro fly-over is skipped when ?fast=1 is given unless &fly=1 is also given (so other agents' fast tests are unaffected).

## engine.js (2 small edits)
1. render(), camera line — appended at end of the line:
   `camera.lookAt(G.cam.x * .85, .8, F - .9); if (G.camFn) G.camFn(camera, dt);`
2. right after `export function start() {...}`:
   `export function camOverride(fn) { G.camFn = fn; } // map.js intro fly-over: fn(camera, dt) runs after the default camera each frame`

## story.js (exact edits)
1. after the audio.js import line: `import { initMap, flyFor, endStars, credits } from './map.js?v=…';`
2. bannerShow(): prefix inserted at start of body:
   `const fly = flyFor(a); if (fly) return fly.then(() => bannerShow(a, b, c, dur));`
   (flyFor returns a promise only when the banner title equals t('ch1'..'ch7') and the current G.player has not been flown yet — i.e. the main chapter banner right after control is given. Ride levels (rideT banner), prologue (ch0) and retries are unaffected.)
3. chapterEnd(): `$('stars').textContent = '★'.repeat(k) + '☆'.repeat(stars.length - k);` → `endStars(n, k, stars.length);`
4. epilogue(): `$('stars').textContent = '★'.repeat(...)...;` → `endStars(7, st.filter(Boolean).length, st.length);`
   and after `await cutscene('e2', 'nar13', 'ruins');` added ` await credits();`
5. title: after `$('tcont').onclick = () => begin(CHAP[chSaved] || CHAP[1]);` added line `initMap({ CHAP, prolog, begin });`
   (initMap re-binds #tcont to open the map, adds #tmap "Karta" button after #tcont and #tcred "Avtorlar" button at the end of #tbox; both appear when #tplay is shown.)

## i18n.js
Added one line per language at the top of each block, marked `// map.js credits` and `// map.js (chapter map / intro fly-over)`.
Keys: m_btn m_title m_back m_locked m_play m_boss m_best m_sar m_dar m_qas e_horde e_wolf e_arch e_mage e_cap e_gate cr_btn cr_based cr_ver cr_rec cr_src cr_made cr_names

### New Karakalpak (qq) strings — please check
- m_btn: "🗺 Karta"            (map button)
- m_title: "Gúlayımnıń jolı"  (map title: Gulayim's journey)
- m_back: "◂ Artqa"
- m_locked: "Aldıńǵı baptı pitkeriń"  (finish the previous chapter)
- m_play: "Oynaw ▸"
- m_boss: "BOSS"
- m_best: "Jańa rekord!"
- m_sar / m_dar / m_qas: "Sarkop" / "Darbent" / "Qashal"
- e_horde: "Qalmaq áskerleri"   e_wolf: "Qasqırlar"   e_arch: "Sadaqshılar" (archers — unsure)
- e_mage: "Sıyqırshılar" (shamans — unsure)   e_cap: "Tutqınlar"   e_gate: "Qorǵan dárwazası"
- cr_btn: "🎬 Avtorlar" (credits button — unsure; author may prefer another word)
- credits lines: texts given by the author, copied verbatim.

## Chapter intro points (map.js INTRO)
1: horde -50, wolves -78, mage -100, BOSS Qashqir -140 | 2: horde -66, archers -74, BOSS Qum dev -132 | 3: horde -42, captives -62, BOSS jallod -108, captives -152
4: horde -45, wolves -82, BOSS Aydarho -170.5 | 5: horde -36, shamans -70, BOSS Qunqar -136 | 6: horde -40, gate -120, BOSS Qargashiq -160 | 7: horde -44, Qashqir -86, BOSS Surtaysha -150
(z values taken from wave()/bossFight() calls; if gameplay agent moves bosses, update INTRO.)

## Testing
Own harness copy on port 8771 (rt.sh's port 8765 + pkill would collide with other agents): /home/user/t/rtm.sh, runm.cjs; scripts mp2.js (title/credits/map card), endt.js (end screen + map), fly.js (intro fly-over).

## Credits (extra task)
- map.js credits(fromTitle): dark ornamented layer #cred (z 75), Nukus logo (assets/img/nukus_logo_white.webp) fades in, then slow scroll: based-on line, version, recording, source, "Game created by" + 4 names, © 2026 Nukus Animation. Music: setMusic('calm') (playTrack isn't exported from audio.js); from title it restores playTitle() on close. Tap / Enter skips; it ends by itself after the scroll.
- Shown after the epilogue cutscenes (story.js epilogue: ` await credits();` after cutscene e2), before the final end screen; also via the title button #tcred.
- Credits texts are the author's own, verbatim, in all 4 languages (cr_* keys); ru names in Cyrillic.

## Misc
- Test-only params in map.js: ?flyx=N speeds up the fly-over timer (swiftshader runs at ~0.1–1 fps here); G.flyDbg() returns the timer state.
- Verified: no [pageerror] in any run; fly-over finishes → camOverride(null), HUD back on, chapter banner + dialog continue; end screen stars + Map button + back; map card → Play starts the chapter.
