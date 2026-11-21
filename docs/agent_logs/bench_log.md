# bench_log — benchmark vs best-in-genre + Play Market readiness (analyst / release-prep agent)
Written 2026-11-20 ~20:10 UTC (sandbox clock). I did NOT touch js/*, index.html or missions sources. Files I own/changed are listed in PART 2.
Evidence base: logs of all agents, code grep, screenshots of the current build (t/w4, t/ui2, t/bench), my own headless runs (t/bench/*.log),
production headers of https://test.zagara.app, and web research (sources at the end). The sandbox was shared and slow, the working tree changed
under me several times (19:57–20:07 new feel.js / models_ext.js / ui_skin.js), so scores are for the state I could observe, not a device play-test.

## PART 1 — BENCHMARK

### Scores now -> what 8/10 needs
| # | Area | Now | Needs for 8 |
|---|------|-----|-------------|
| 1 | First 60 s / onboarding | 5 | playable in <=10 s on 4G (boot <=8 MB), first sword hit <=20 s after Play, hero = Gúlayım in the first fight |
| 2 | Controls (3 buttons) | 7 | floating joystick, 48 px+ dead-zone-free buttons verified on 3 real phones, input buffer 150 ms, no hidden mandatory gesture |
| 3 | Combat feel | 6 | real hit-react/dodge/block clips, per-weight hit-stop + trauma shake table, finisher on every elite/boss, haptics |
| 4 | Enemy variety, waves, camps | 6 | each chapter introduces 1 new enemy with 1 new rule; camp fights 3 distinct phases instead of a head-count |
| 5 | Boss design | 6 | 3 readable attacks + 1 phase change + 1 arena gimmick per boss, 90–150 s fights, finisher cinematic, tested win rate 60–80 % |
| 6 | Progression / economy | 6 | ONE upgrade screen, one currency, a measured coin curve, visible "next unlock" at every end screen |
| 7 | Mission structure / pacing | 7 | missions 2.5–4 min, rides 45–60 s, no two consecutive missions of the same type, mid-mission checkpoint |
| 8 | HUD / UI | 7 | map without overlaps at 667x375, end screen = 1 primary + 2 secondary buttons, no placeholder ad buttons |
| 9 | Audio | 5 | 3 layers of combat music by intensity, 3–4 variants of each hit/swing, enemy/ally barks, UI sounds, boss stingers |
| 10 | Performance on low-end Android | 4 | 30 fps on a 3 GB Mali-G52 phone with 20 allies + 20 enemies, <=150 draw calls, <=350k triangles on screen |
| 11 | Retention hooks | 6 | 7-day login calendar, per-mission collectible (3 hidden items), "almost there" chest bar on end screen |
| 12 | Monetization-free polish | 5 | no fake ad timer, consistent Gúlayım colour in icon/key art/game, no test strings, credits + version in settings |
| | **Overall** | **~5.8** | |

### 1. First 60 seconds / onboarding
- Best: Shadow Fight 2/3 put the player in a fight within seconds and teach by doing; SF2 was built so players "pick the game up and learn on-the-fly" with two action buttons + direction [S3].
  Dynasty Warriors Unleashed explains each new option only when it first appears [S4]. Grimvalor lets the first boss be optional so nobody is stuck [S2].
- Ours: boot downloads ~50 MB in ~360 requests before the game is fully ready (34 MB character GLBs, 4.6 MB ground textures, 3.8 MB props, 2.6 MB HDR; t/bench/load_qq.log).
  The CDN does not compress .glb/.hdr (production headers: no content-encoding on model/gltf-binary). Then: lore text wall ("Kirisiw") -> tutorial 0-0, 8 steps, each first demonstrated by Gúlayım
  (bot run: first hit at 16 s game time, end at ~140 s), and the player is the trainee Aysulıw, not the heroine on the icon.
  Since ~19:57 the title hides Play/Continue behind a progress bar + "LOADING…" until the boot load ends (good: no dead taps), but Camp/Shop/Book stay tappable meanwhile and the wait is the 50 MB above.
  English title logo "FORTY MAIDENS" is clipped at the right screen edge at 1280x720 (t/bench/shots/01_title_en.png).
- Gap: download size is 5–8x what a web/TWA game can afford on mobile data; the first minute is watching, not fighting; the tutorial is long for players who already know action games.
- Fix spec:
  a) (models/mechanics) Boot set = only what the title + 0-0 need: R_gulayim, R_qiz, R_sarbinaz, saber, bow, yurt, 1 ground set, 1 HDR. Everything else loads behind the mission fade ("loading" already exists on #fade).
     Acceptance: t/bench/load.js reports BYTES <= 8,000,000 before the title is interactive; mission fade <= 6 s on a throttled 10 Mbit profile.
  b) (models) Re-export R_*.glb at <=12k vertices (now 19–41k) and resize textures to 1024 -> expected 0.6–0.9 MB per character (now 1.6–3.3 MB). Acceptance: assets/models <= 20 MB total (now 52 MB).
  c) (missions) Tutorial: 4 steps instead of 8 (move, attack combo, dodge, amulet); bow and lock-on are taught in the first mission that needs them; "Skip" stays. Demo-before-try only for dodge.
     Acceptance: bot run reaches the 0-0 end screen in <=75 s game time; first player hit <=12 s after the fade.
  d) (missions/video) Lore wall -> 2 lines over the first camera fly-in (the text is already narrated in nar*.mp3).
- To verify (owner UI): (1) the English logo must fit at 16:9 (1280x720) and 19.5:9; (2) with empty storage, after loading exactly one of #tplay/#tcont has offsetWidth > 0; (3) show loaded MB / total on the bar.

### 2. Controls (author's rule: Attack / Dodge / Amulet)
- Best: Grimvalor ships 5 on-screen buttons and makes the attack button contextual (also "use"; swipes on it give other attacks) and reviewers call the virtual buttons "more than up to the task" [S2].
  SF2: two action buttons + direction, automatic block [S3]. The usual complaint about musou on phones is that specials are hard to find without looking when the fight is frantic [S4]. Touch has no click, so every press needs sound + visual feedback [S5].
- Ours (wave4): ⚔ 86 px (tap combo, hold 300 ms spin, auto bow volley when no melee target), ➤ 64 px (parry if an enemy winds up, else dodge, double tap roll), 🔺 62 px amulet with a gauge ring, joystick, ⚙. Good and in line with the best.
- Gap: joystick looks fixed-position; hold/double-tap are invisible rules; parry-or-dodge on one button can surprise the player; never verified on a real phone thumb.
- Fix spec (mechanics/UI): floating joystick (appears where the left thumb lands in the left 45 % of the screen, radius 56 px, dead zone 8 px); input buffer 150 ms for ⚔ and ➤ during any action;
  ➤ always moves the heroine (parry = dodge-step + automatic counter, never a standstill); ⚔/➤ get a 60 ms scale-to-0.92 press animation + click; amulet button shows the power name only the first 3 times.
  Acceptance: in a 60 s bot fight no ⚔ tap is dropped (taps sent == attacks started + buffered), and at 667x375 the three buttons' rects do not intersect and each is >= 56 px.

### 3. Combat feel
- Best: hit-stop on every landed hit scaled by weight; shake amplitude/frequency scaled by weight; hit animations start with zero cross-fade from a damaged pose and "start very quick but end slowly"; enemy attacks slower than the player's so they can be read;
  additive shake on enemies that cannot be interrupted; FOV narrowing only in 1v1 [S6]. Trauma model: trauma 0–1, shake = trauma² × max offset, noise-sampled, max ~1 new shake/hit-stop per frame, 2–3 sounds per frame [S7].
- Ours: hit-stop exists (0.07 s hit, 0.13 crit, 0.06 parry, 0.12–0.17 heavy), shake, sparks, damage numbers (own hits bigger), white HP lag bar, poise bars, red telegraph rings/wedges, execution close-up, level-up slow-mo, vibrate() helper, per-sound rate limits. A new js/feel.js appeared at 20:00 (someone is on it).
  Weak: no real dodge/block/jump/hit-react clips (sidestep = walk clip at 2.6x, guard = procedural arm; witcher_log "honest weaknesses"); enemies' hit reaction is mostly knockback + flash.
- Fix spec:
  a) (mechanics) one table: light 50 ms / 0.15 trauma; 3rd combo hit 80 ms / 0.3; heavy/spin 110 ms / 0.45; kill 90 ms + 0.25; parry 70 ms / 0.2; boss hit on hero 120 ms / 0.6; finisher 180 ms / 0.8. Shake offset max 0.35 m, decay 2.2/s, squared. Never stack: max(current, new).
  b) (animation) 4 new clips in anims.json and mapped in skinrig MAP: Dodge_Side (0.35 s), Hit_Front (0.3 s), Hit_Back (0.3 s), Block_Impact (0.25 s). Zero cross-fade into hit clips.
  c) (mechanics) kill of an elite/captain = 0.6 s finisher (camera 15 % closer, time 0.35x); haptics 15 ms light / 35 ms heavy / [30,40,60] finisher, toggle in ⚙.
  Acceptance: frame capture of a 3-hit combo shows 3 distinct freezes; an enemy hit from behind plays Hit_Back; with "vibration off" navigator.vibrate is never called.

### 4. Enemy variety, waves, camps
- Best: musou works because crowds are fodder and officers are the real fights; the screen must "keep up with the huge numbers of enemies" [S4]. Shadow Fight makes each weapon a small moveset the player learns before the next arrives [S3].
- Ours: infantry, shield bearer (needs heavy), spear, archer, mage, wolf, cavalry (ch4+), catapult cart (ch5+), captains; 40-enemy budget; 18 camps of 60–150 "soldiers" (1 body = 3) in three layouts; reinforcements run in from off-screen with a horn.
- Gap: camps are a head-count ("Dushpan: 12/60") without phases; the same three layouts repeat 18 times; nothing new to learn after ch5.
- Fix spec (missions): every camp = 3 phases with a visible goal: (1) break the gate/tower guard, (2) burn 2–3 tents (each stops one reinforcement stream), (3) captain duel. One modifier per camp from a list of 6 (night, sandstorm –visibility, archers on towers, hostages to free first, cavalry charge every 30 s, catapult). Camp length 3–4 min.
  Acceptance: no two consecutive camps share layout+modifier; a bot clears ch1 camp in 150–240 s game time.

### 5. Boss design
- Best: Grimvalor — pattern learning and openings, "feels great to win without taking hits", first boss optional [S2]. Bosses that summon adds are the common complaint; ours were removed on the author's request (good).
- Ours: 7 chapter bosses + Surtaysha prologue, kits with telegraphs (wedge, wave, rock circle, dive marker), duel ring where both armies watch, phase 2 buffs, QTE clinch. Not played to the end by any bot in ch2+ (logs), balance unknown; some boss models lazy-load and fell back to placeholder figures in tests.
- Fix spec (mechanics/missions): per boss exactly 3 attacks (one blockable -> parry window, one unblockable ring -> dodge, one ranged), phase change at 50 % with a 2 s roar (invulnerable, camera pull-back), stagger after 3 parries -> 4 s free damage window, finisher at 0 HP.
  HP tuned for 90–150 s. Acceptance: scripted "perfect" bot wins every boss in <=150 s, the "attack only" bot loses >=50 % of the time from ch3 on; boss model is in memory before the boss intro (no fallback figure in the intro screenshot).

### 6. Progression / economy
- Best: SF3's hook is equipment + levelling between bouts [S1]; DWU opens depth gradually and explains each option as it appears [S4].
- Ours: three overlapping systems — Camp (meta.js: level 1–30, skill tracks, 12 equipment items, 12 maidens, quests, achievements, chests), Upgrade screen (wave4: sword, bow, armour, shields, archers, cap 2c+1 per chapter, cost base×(1+0.6L)),
  and the old Shop that still sells the same training. Army growth 10–30 warriors per rescue, casualties deducted. Measured income only for 0-0 (165) and 1-1 (218).
- Gap: a new player meets three shops; the end screen offers "Safımız hám qural", "Qos" and a shop badge at once; coin curve unverified after ch1.
- Fix spec (mechanics + UI): one screen "Qos" with 2 tabs (Áskerler & qural = wave4 tracks; Gúlayım = skills + equipment). Remove the title Shop tile. End screen shows one line "Next: <cheapest affordable upgrade>" with a single button.
  Economy check script: sum of mission rewards per chapter must be 80–110 % of the cost of that chapter's caps. Acceptance: grep finds one openShop-like entry point; simulated full-clear of ch1–ch7 never has > 1.5 chapters of unspent coins or < 60 % of caps affordable.

### 7. Mission structure / pacing
- Best: short bouts with story between them [S1]; players judge controls after 15/30/60 minutes of play, so variety must hold that long [S5].
- Ours: strong variety (rescue, ride chase with rings, caravan escort with 4 scripted ambushes, bridge defence, sniper archery, stealth, camps, boss duels), 30 missions + 18 camps. Rides are 15–25 s (fix3 log), caravan ~1:55, bridge ~70 s for a bot.
- Fix spec (missions): rides 45–60 s (level 450 m, 5 riders, 10 rings, 2 jumps); mid-mission checkpoint after the 2nd objective (death restarts there, not at the start); order camps so a camp never follows a camp.
  Acceptance: mission durations in bot logs all within 120–240 s except rides (45–75 s) and bosses (90–150 s).

### 8. HUD / UI
- Ours: painted skin, portrait frame, 3 buttons, objective plate, off-screen arrow with metres, combo counter, compact camp. Problems seen in screenshots: world map — camp icons cover chapter titles ("1-bap …", "3-bap …" unreadable, t/ui2/bf_map_qq_844x390.jpg);
  end screen has 5 actions; keyboard hint letters (E, K) are drawn on the buttons in the desktop harness — confirm they are hidden on touch; "Reklama" buttons start a 5 s fake countdown (engine.js ADS fallback).
- Fix spec (UI): map — camp icons 26 px, placed on the route line at >= 40 px from any label, labels get a z-index above icons; end screen — primary "Next", secondary "Map", tertiary "Qos" (badge) only; hide every ad button unless window.QQ_ADS or ysdk exists.
  Acceptance: at 667x375 and 844x390 no camp icon rect intersects a chapter label rect (script over getBoundingClientRect); #eadx2/#drevive/#shad have offsetWidth 0 when no ad provider.

### 9. Audio
- Ours: 5 music tracks (title, calm, battle, boss, win), 16 sfx, 13 narration lines, buses + ducking + per-sound cooldowns (urgent5). One swing, one hit, one hurt sample pitched ±14 %.
- Gap vs best: no intensity layering, no variants, no barks from maidens/enemies, no UI click, boss has no stinger on phase change.
- Fix spec (audio): hit ×4, swing ×3, block ×2, arrow impact ×2, footsteps/hoofs by surface ×2; 8 short maiden barks + 6 enemy barks (qq), rate-limited 1 per 4 s; battle music low-pass at 900 Hz when hero HP < 25 %; boss phase stinger 2 s; UI tap 40 ms.
  Budget: +600 KB at 64–96 kbit mono. Acceptance: in a 60 s fight recording no identical hit sample plays twice in a row.

### 10. Performance on low-end Android
- Best practice: ~100–200 draw calls on low-end mobile, device-pixel-ratio adapted at runtime, shadows and blended meshes kept minimal, skinned meshes are expensive even off-screen [S8].
- Ours: pixel ratio 0.9 / 1.25 / 1.75 by quality, composer + soft shadows when q>0, an fps-driven scaler in fx.js (PF.lvl steps when fps < 27 / < 18), LODs for horses and far units.
  But characters are 19–41k vertices each (R_jallod 41k, R_surtaysha 40k, R_gulayim 33k, R_askar 24k), and wave4 puts up to ~21 allies + 40 enemies on the field: worst case > 1.2 M skinned vertices. Nobody measured on a phone; headless SwiftShader gave 22–40 fps on the TITLE only.
- Fix spec (models + mechanics): gameplay LOD0 <= 8k vertices for soldiers/maidens, <= 14k for heroes/bosses; beyond 18 m swap to a <= 2.5k LOD with animation updated every 2nd frame; shadows: hero + boss only on q1, none on q0;
  cap bodies on screen to 26 at q0 (12 allies + 14 enemies, the rest queue off-screen); print renderer.info (calls/triangles) in a ?perf=1 overlay.
  Acceptance: ?perf=1 in a ch5 camp shows <= 150 calls and <= 350k triangles at q0; a real 3 GB phone holds >= 28 fps for 60 s.

### 11. Retention hooks
- Ours: daily gift banner (+100), 3 daily + 2 weekly quests, 16 achievements, 3 stars per mission with named conditions, 8 star chests, maidens unlocked by stars, a dástan book.
- Fix spec (mechanics/UI): 7-day calendar (day 7 = a maiden skin or tumar), 3 hidden "ancient coins" per mission shown on the map node (0/3), end screen bar "N stars to the next chest".
  Acceptance: map node tooltip shows stars and coins; calendar state survives reload; no push notifications (keeps the Data-safety form empty).

### 12. Monetization-free polish
- Fake ad timer (must go or be relabelled as a free bonus), icon/key art show Gúlayım in burgundy while the in-game model and new cutscenes are blue, domain is "test.", two boss tracks, mixed keyboard hints. Add version string + credits in ⚙.

### Mistakes common in this genre — do not repeat
1. Button creep: every new skill gets a button (we just escaped it — keep new moves contextual).
2. Bosses that are HP sponges or hide behind summoned adds.
3. Camera shake / flashes on every hit until the screen is unreadable (cap: one shake per frame, squared trauma).
4. Tutorials that explain everything before the first real fight.
5. Three currencies and four shops by chapter 2.
6. Auto-play that makes the player a spectator (DWU: early game trivial with auto, then a wall [S4]).
7. Enemy attacks without a readable wind-up, or telegraphs hidden under bridges/decks (fix3 log notes rings at y 0.07 under the 1-3 deck).
8. Crowds that tank the frame rate on the very phones the audience owns.
9. Escort missions with a fail state on a slow NPC (ours has none — keep it).
10. A multi-ten-MB download before the first frame of a web game.
11. Requiring a held finger for long periods (tiring) [S5].
12. Fake or forced ads in a build that has no ad provider.

### TOP-20 for one night (priority order, owner)
1. Boot download <= 8 MB: lazy-load everything not needed for title + 0-0 — **models** (+ mechanics for the loader hook)
2. Title: English logo "FORTY MAIDENS" is clipped at 16:9; show MB progress while Play is hidden — **UI-design**
3. Hide all "Reklama" buttons when no ad provider exists (ADS fallback timer) — **UI-design** (+ mechanics one line in ADS)
4. Decimate R_*.glb to <= 8k/14k vertices, textures 1024 — **models**
5. Body cap 26 at low quality + far LOD every 2nd frame + ?perf=1 overlay — **mechanics**
6. Hit-stop / trauma table (numbers in §3a), max-not-sum stacking — **mechanics**
7. 4 animation clips: Dodge_Side, Hit_Front, Hit_Back, Block_Impact — **animation**
8. Tutorial 8 -> 4 steps, first hit <= 12 s — **missions**
9. Floating joystick + 150 ms input buffer + button press feedback — **mechanics** / **UI-design**
10. One upgrade screen (merge Shop + wave4 screen into Qos), end screen 1+2 buttons — **UI-design**
11. World map: camp icons never overlap chapter labels — **UI-design**
12. Boss rules: 3 attacks, 50 % phase roar, stagger after 3 parries, finisher; bosses preloaded before intro — **mechanics** / **missions**
13. Camps in 3 phases with burnable tents + 6 modifiers — **missions**
14. Rides 45–60 s, checkpoint after 2nd objective — **missions**
15. Sound variants (hit ×4, swing ×3, block ×2) + UI tap + boss stinger — **audio**
16. Maiden/enemy barks in Karakalpak (author checks the lines) — **audio**
17. Icon, key art, feature graphic with BLUE Gúlayım to match the game — **graphics**
18. Economy check script and retune so a chapter pays 80–110 % of its caps — **mechanics**
19. Collectible ancient coins (3 per mission) + "N stars to next chest" bar — **missions** / **UI-design**
20. Cutscenes: re-encode v1.mp4 (6.4 MB at 3.3 Mbit, others ~1 Mbit) and make every video failure skip silently offline — **video**

## PART 2 — PLAY MARKET READINESS

### What I changed (all originals in /home/user/agents/release/backup/)
- public/manifest.webmanifest: name/short_name "Qırq qız" (was "Qirq qiz — …"), id, lang kaa, display fullscreen + display_override, orientation landscape,
  theme/background #10142b (matches <meta theme-color>), categories, icons 192/512 "any" + maskable 192/512.
- NEW public/assets/img/icon-maskable-192.png (50 KB, resized from the 512 maskable).
- public/sw.js: same strategy and same cache name 'qq-2' (no forced re-download). Added: precache of the shell on install; navigation falls back to the cached shell (ignoreSearch) and then to a tiny 4-language
  offline page instead of a browser error; 5xx on navigation -> cached shell; error responses are no longer cached for navigations; .webmanifest is network-first. Videos and range requests still bypass the worker.
  Test (t/bench/swt.js, swt.log): registered on 127.0.0.1, loaded once, killed the server -> "?lang=qq", "?lang=ru&x=1", "index.html" and a never-visited URL all reached the title offline, 0 page errors.
- public/privacy.html: rewritten, 4 languages (en/qq/uz/ru), states the truth of the current build: no personal data, no account, no ads SDK, no analytics, progress in local storage, how to delete, hosting logs, children, changes, contact.
  The old text promised AdMob/Yandex ads and in-app purchases that do not exist.
- No game asset was recompressed. Reasons: engine.js/fx.js/horse.js read raw geometry attributes (quantized/meshopt GLBs would need loader + code changes by their owners); cutscene videos are being regenerated by the video agent right now.

### Audit results
- Viewport: width=device-width, viewport-fit=cover, user-scalable=no; safe-area env() variables used; visualViewport fit (ui4). OK.
- Fullscreen/orientation: begin() requests fullscreen and locks landscape on mobile UAs; rotate overlay exists; in the TWA both are also forced by the Android manifest. OK.
- Network: zero third-party URLs in index.html/js (grep) -> Data safety "no data collected" is accurate.
- Size: deploy = 98 MB without public/_raw (116 MB of source GLBs, git-ignored, not on production). models 52 MB, video 22 MB (streamed, never cached), env 8.7 MB, audio 7.1 MB, props 3.7 MB, img 3.1 MB.
  Heaviest: v1.mp4 6.4 MB; R_jallod 3.3, R_surtaysha 3.2, R_qashqir 3.0, R_qargashiq 3.0, R_qumdev 2.8, R_gulayim 2.8, R_allayar 2.5 MB; anims.json 1.9 MB (259 KB brotli on the CDN); battle.mp3 1.7 MB; 2 HDRs 1.2–1.4 MB.
  First load measured: ~50 MB / ~360 requests (see §1). Production sends cache-control max-age=0 for everything; the service worker's cache-first covers repeat visits.
- Production gaps: https://test.zagara.app/.well-known/assetlinks.json returns the HTML shell (SPA fallback) -> TWA verification would fail until the real file is deployed.

### Release materials (/home/user/agents/release/)
- store_listing.md — title / short / full description in qq, uz, ru, en + Console answers (category, ads, data safety, audience, content rating).
- graphics/icon_512.png, graphics/feature_1024x500.png|jpg (made from the existing key art; Gúlayım is burgundy there — see Top-20 #17).
- screenshots/ — phone screenshots 1920x1080 from the harness (status in the final report).
- twa/twa-manifest.json (Bubblewrap draft: package app.zagara.qirqqiz, fullscreen, landscape, minSdk 23, fallback customtabs), twa/assetlinks.json (template with fingerprint placeholders).
- backup/ — originals of manifest, sw.js, privacy.html.

### TWA plan
1. `npm i -g @bubblewrap/cli`; `bubblewrap init --manifest https://test.zagara.app/manifest.webmanifest` (or copy twa/twa-manifest.json, delete the *_REMOVE_ME key), `bubblewrap build` -> app-release-bundle.aab.
2. Target API: Play requires API 36 (Android 16) for new apps and updates since 31 Aug 2026 [S9] — check app/build.gradle after init.
3. Upload the .aab to an internal test track; Play Console -> App integrity -> App signing: copy the SHA-256 of the app signing key into assetlinks.json (keep the upload key's SHA-256 too),
   put the file at public/.well-known/assetlinks.json, deploy, check that the URL returns JSON (application/json), then install from the internal track: no browser bar = verified.
   If verification fails the app opens as a Custom Tab with a URL bar [S10].
4. Quality: the TWA must not show an error when offline or on 404/5xx [S11] — covered by the new sw.js fallback; unknown paths already return the shell on production.
5. Moving from test.zagara.app to a final domain later = new host in twa-manifest + assetlinks on the new domain + app update (package name stays).

### What only the author can do (minimal)
1. Read the Karakalpak texts: release/store_listing.md (qq block) and public/privacy.html (qq block).
2. Decide the package name (draft app.zagara.qirqqiz — it can never be changed after the first upload) and whether the store URL stays test.zagara.app.
3. In Play Console (organisation account): create the app, let Play manage app signing, create/keep the upload keystore + password (Bubblewrap generates it — back it up), upload the .aab.
4. Send (or paste into assetlinks.json) the SHA-256 fingerprint from App integrity; fill the contact e-mail; submit the content-rating and Data-safety forms with the answers in store_listing.md.

## Sources
[S1] pocketgamer.com/shadow-fight-3/how-shadow-fight-3-revolutionised-the-mobile-brawler
[S2] toucharcade.com/2018/10/11/grimvalor-review/
[S3] gamedeveloper.com/business/designing-a-hardcore-game-for-the-mobile-masses
[S4] gamezebo.com/reviews/dynasty-warriors-unleashed-review-fight-forever/
[S5] gamedeveloper.com/game-platforms/designing-better-controls-for-the-touchscreen-experience
[S6] gamedeveloper.com/programming/the-role-of-animations-in-hit-effects
[S7] forum.godotengine.org/t/game-feel-effects-that-stack-without-fighting-your-code-trauma-shake-real-time-hit-stop-and-apply-the-difference/146379
[S8] developer.playcanvas.com/user-manual/optimization/guidelines/
[S9] developer.android.com/google/play/requirements/target-sdk
[S10] developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2
[S11] developer.chrome.com/docs/android/trusted-web-activity/whats-new/
Not reachable (permission prompt timed out): support.google.com/googleplay/android-developer/answer/9866151 (asset specs), Bubblewrap CLI README on raw.githubusercontent.com —
the listing limits and twa-manifest field names in this log are from my own knowledge and must be checked in the Console / against `bubblewrap init` output.
The hit-stop/shake numbers in §3 are my tuning proposal; the sources give the method, not the values.

## Addendum 20:30 UTC — screenshots and harness limits
- release/screenshots/: 06_title_qq.png (title, Karakalpak, 1280x720), 02_squad_en.png (1-1, Gúlayım + maidens, full quality with shadows), 03_march_en.png (1-4 start). All 1280x720 24-bit PNG = valid Play phone screenshots (16:9).
  01_title_en was dropped: it shows the loading state and the clipped English logo.
- NOT achieved: real battle / boss / caravan frames at store quality. At full quality under SwiftShader, with 6–9 jobs queued on lockB, the game advanced ~1.5 s of game time per run and one PNG took ~90 s; my SPAWN helper found no window.__T.
  Two jobs (03_camp_en, 04_caravan_en) were still queued when I stopped; if they finish, run release/screenshots/collect.sh. For the listing take 3–4 action screenshots on a real phone (fight with telegraph rings, boss duel, caravan, archery) — owner: UI-design / graphics.
- Title timing on the local server: Play button visible 4.8 s after navigation (t/bench/shots/06_title_qq.log) — on localhost; the same boot is ~50 MB over the network.
- One request returns 404 on every load on the local server (production masks it with the SPA fallback); not identified — owner of index.html should check the Network tab.
- Harness files: /home/user/t/bench/{run.cjs,rt.sh,snap.sh,load.js,watch.js,tap.js,swt.js,sshot.js,one.sh}. Note: watch.js run "on.log" never tapped Play (button was hidden while loading) — its log is not evidence of anything.
