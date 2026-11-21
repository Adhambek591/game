# ui2 log — UI/UX polish pass (ui2 agent)
Started 2026-11-20 18:39 UTC. Sandbox restarted ~19:5x; resumed (index.html was intact, nothing of mine was applied before the restart).
Backups: /home/user/agents/ui2/index.before_ui2.html, new.before_ui2.css, skin.before_ui2.js
Sources: /home/user/agents/ui2/src/ui2.css (-> app/public/css/ui2.css), ui_skin.js (-> app/public/js/ui_skin.js), apply.py (copies + patches index.html idempotently)
NOTE: /home/user/t/ui/src/build.py is STALE (urgent5 edited the inline <style> directly) — do not run it, it would drop the volume-slider and fade-spinner CSS.
Tests: /home/user/t/ui2/{run.sh,s_menu.js,s_game.js}; before shots /home/user/t/ui2/bf_*.jpg (menus) and bfg_*.jpg (gameplay)

## What is applied (all via files I own)
- NEW css/ui2.css (linked right after the inline <style>, `?v=` set by apply.py), NEW js/ui_skin.js (defer, before story.js), index.html: `<p id="dtip">` inside #dead .in. Nothing else in index.html touched.
- Design system (tokens in :root of ui2.css): type 12/13/15 PT Sans + 18/24/32 Forum; spacing 4/8/12/16/24; touch target 48; chip = felt pill + gold hairline; one carnelian-red primary button per screen; overlays enter in 180 ms (opacity+scale), reduced-motion respected; ram's-horn (muyiz) strip as the only new ornament.
- Loading: tiles hidden until the game is ready -> only name, bar, "Júklenbekte".
- Title: Shop tile hidden (merged into the upgrade screen), 2 quiet 48 px links (Camp, Book) under the one primary button.
- Settings/pause: 2-column grid, everything (incl. the bottom button) visible at 844x390 without scrolling; 1 column under 640 px width.
- HUD: narrower hero bars; coin/army/rescued/targets chips in one aligned column with one style; XP badge hidden in fights; key legend only on non-touch; amulet button re-skinned (enamel + gold rim, ring gauge, dim until full); distance pill under the direction arrow; side alert, tutorial card, skip pill re-skinned; while a dialogue is open the buttons/joystick/chips fade out.
- Upgrade screen (#w4up): felt cards, painted icons instead of emoji (ui_skin.js), carnelian diamond pips, 48 px buy buttons at the right of each row.
- Result: row 1 = XP + ad bonus, row 2 = Map | NEXT (primary) | Upgrade; Camp shortcut pill hidden (duplicate).
- Defeat: a useful tip line (5 tips x 4 languages, ui_skin.js), Retry first.
- Map: ⚒ is a round 44 px button; camp markers 22 px so they cover less of the chapter labels.

## Menus merged / removed
1. Title "Dúkan" (shop) tile -> hidden; upgrades live in ONE place ("Safımız hám qural").
2. Result screen "Qos ⚠ … álsiz" pill -> hidden (duplicate of the Upgrade button next to it).
3. In-fight XP badge -> hidden (shown on the result screen).

## New Karakalpak strings to check (defeat tips, js/ui_skin.js)
- Dushpan qılıshın kótergende ➤ túymesin basıń — soqqını qaytarıp, juwap soqqı beresiz.
- Jerdegi qızıl sheńberden shıǵıń — bul soqqını qaytarıp bolmaydı.
- Tumar tolıp jarqırasa, 🔺 túymesin basıń — eń kúshli soqqı tayın.
- Awır urıs aldınan qılıshtı hám qızlardıń sawıtın kúsheytiń.
- Qızlarıńızdan alıslamań — jalǵız qalsańız, dushpan qorshap aladı.

## Wave 2 (coordinator + bench_log items), 20:30–
- Ads: every ad button hidden by CSS unless `window.QQ_ADS` or `window.ysdk` exists (ui_skin.js sets html.qq-ads): #eadx2, #drevive, #shad, #adov, any button holding the skinned ad icon.
- Title name always fits its column (ui_skin.js fitTitle: shrinks #tname font when scrollWidth > #tbox width) — fixes "FORTY MAIDENS"/"СОРОК ДЕВУШЕК" clipped at 16:9.
- Loading: new `<div id="loadmb">` under #loadtxt shows "NN% · X.X MB" (PerformanceObserver resource sizes) until Play/Continue appears; tiles hidden while loading (was already so).
- Press feedback: #btns .ab gets class .prs on pointerdown (document capture listener, passive) -> scale .92 + gold ring, 60 ms.
- One upgrade hub: mechanics moved the army screen into Camp as tab "army" (.w4pane) at ~20:30 — my #w4up styles now also target .w4pane (`:is(#w4up,.w4pane)`), emoji -> painted icons there too; the separate map ⚒ button (#w4mapb) is hidden (Camp button stays).
- Map: camp markers 26 px, chapter nodes/labels z-index above them, ui_skin.js mapFix() moves any marker that intersects a node part (portrait/stars/label) to the nearest free spot (<= 84 px) via CSS `translate`; "★ N / next" bar appended to #mt-chestbar (chestNext()).
- Store/brand art with BLUE Gúlayım (Nano Banana Pro edit of the old key art/icon, reference = assets/img/p_gu.jpg, unlim/free, 2 generations, 0 credits):
  installed assets/img/ui/key.webp + key_s.webp (title background), assets/img/keyart.jpg (og:image), icon-192/512, icon-maskable-192/512; old files in /home/user/agents/ui2/bak_img/.
  /home/user/agents/release/graphics/: feature_1024x500.png|jpg (new), icon_512.png, icon_192.png, icon_maskable_512.png, keyart_1920x1072.jpg, keyart_master_3168x1344.jpg; previous burgundy files in graphics/old_burgundy/.
  Masters: /home/user/t/ui2/art/key_blue.png (3168x1344), icon_blue.png (2048x2048); feature built by art/feat.py (title set in P052 because Forum TTF is not installed in the sandbox).

## REQUESTS (other owners)
1. sw.js owner: images are cache-first under cache name 'qq-2' — bump V so returning players get the new blue key art / icons.
2. mechanics (wave4/meta): Camp "Hero" tab still sells Qılısh qayraw / Sawıt / Qızlar mashqı (old SAVE.up tracks) next to the army tab's sword/armour — remove or merge the duplicates; end screen #w4upb should open Camp→army (it does if upOpen() does).
3. mechanics (wave4 campMarks): place camp markers >= 40 px from node labels at source (I only nudge them at runtime); camp count labels "N ásker" only for the next uncleared camp.
4. i18n owner: ru "БОСС: Каскыр-бек" on the chapter-1 map card — author's rule: the wolf boss is just "Qasqır"/"Каскыр" (no "bek").
5. engine/story: add class "full"/"cd" states are fine; if ADS fallback timer is removed, also drop the inline display:block on #eadx2/#drevive.
6. missions (hunt/res chips): #huntcnt/#rescnt/#cvbar/#dir/#f3side use inline styles; I override with !important — please keep the ids.
7. story.js: #loadtxt could show total MB; I show received MB only (total unknown to UI).

## Tests run (flock lockA, port 8893, LOWQ) — 0 [pageerror], 0 HTTP 4xx in the final runs
844x390 qq (menus a1/a2/c1/f1 + real gameplay 1-1 a2g), 740x360 ru (menus b1 + gameplay b1g), 1366x768 en (d1), 1280x720 en title (e1), 932x430 with simulated safe areas 59/0/59/21 qq (n1), 390x844 portrait uz (p1: rotate hint).
Not re-run after wave 2: gameplay HUD (only .prs press style + ad hiding changed there); dialogue fade-out of buttons and the tutorial card/skip restyle were not screenshotted in a live tutorial (lock congestion).
Shots: /home/user/agents/ui2/shots/ (ba_*.jpg = before over after), raw: /home/user/t/ui2/*.jpg.
bust.py run at the end.
