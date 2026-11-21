# Archery "sniper" mode log (archery agent)

Owner files: **js/archery.js** (new; source of truth /home/user/agents/archery/archery.js, deployed with /home/user/agents/archery/deploy.sh which stamps the current ?v=),
**/home/user/agents/m2/src/75_archery.js** (new; included in build.sh after 70_fly.js), strings in **js/i18n.js** (inserted by /home/user/agents/archery/i18n_add.py, one block per language, keys `ar_*`).
Backups: /home/user/agents/archery/build.sh.orig, /home/user/agents/archery/i18n.pre.js. Nothing committed / pushed / deployed.

## Hooks into other files (all small)
- m2/src/build.sh: `... 70_fly.js 75_archery.js > /tmp/missions.mjs` (python replace with assert).
- 75_archery.js: imports `runArchery` from ./archery.js; splices 3 MLIST entries (ty 'archer' → existing TYICON 🏹) after 3-2, 5-1, 6-1 and registers RUN[id];
  stars = ['win','flag','flag2'] with fl 'ar_s_noal' (no alarm) and fl2 = 'ar_s_cap' / 's_allq' (existing "no maiden lost") / 'ar_s_west'. Map links follow MLIST order automatically.
- i18n.js: 41 keys × 4 languages.
- Global test hook is `window.__QQBOW` (NOT `__ARCH`: the tutorial agent's 67_tutorial feature-detects a *melee* bow API under `__ARCH/__ARCHERY/G.archery`).

## The mode (js/archery.js)
- Runs inside the normal mission flow: `runArchery(id, H)` → H.chapterStart(mood, H.B[ch]) (the chapter's real scenery) → own level kit on top → `G.freeze = true; G.player = null`
  (melee engine AI / collisions / player are off; units are real engine models spawned with `spawn(type,x,z,'npc',raw)` and driven here) → `G.camFn` (own first-person camera)
  + `G.tick` (own sim) → resolves `{ ok, noAlarm, all, why }`; cleanup restores camera fov/far, G.ts, G.freeze, G.camFn, G.tick. No engine.js change.
- Camera: first person from the hide (crest of earth + grass/stones, or a rooftop with parapet), fov 52 → 10 (5×) while drawing; camera.far 212 while in the mode (whole-level view was ~600k tris).
- Controls (touch): drag anywhere = look (also sliding the thumb on the shoot button); hold 🏹 = draw (ring fills, full draw 0.75 s, release < 0.3 s = cancel), release = loose;
  hold 🫁 = hold breath (sway × 0.16 for ~4 s, then 2.2 s of shaking); 0.85 s to nock the next arrow. Keyboard for desktop: Space = draw, Shift/B = breath, arrows = look.
- Bow sight (SVG): sight ring + level bubble, centre cross = launch line, coloured fibre pins for 50/75/100/125/150 m (angle = g·d / 2v², the pin of the target's distance goes on the target),
  wind hold ticks (0.5 m at 100 m), rangefinder: distance tag over the guard nearest the reticle + "◎ 83 m" under the ring.
- Ballistics: v0 80 m/s (× 0.55–1 by draw), g 6.2, wind 0.5–3.2 m/s lateral (gusts every 14–24 s, HUD shows m/s and ➤ direction relative to the view). Flight is pre-computed at release
  (120 Hz) and played back; every guard keeps its current velocity while an arrow is in the air (S.commit), so leading a walker works exactly as aimed.
  Hits: head sphere r .25 at 0.9 H (headshot), body capsule r .33; ropes (segment, r .3); solids = AABB then precise raycast on the real mesh; ground/water.
- Guards: patrol (waypoints with y, pauses looking around), still (sweeping look), talking pairs (face each other, gesture), script (beacon keeper), rush. Suspicion:
  body in the view cone (22 m while falling, 18 m landed; the partner of a pair reacts 1.6× faster), arrow landing ≤ 6 m away (0.55–1.0), arrow whizzing ≤ 1.7 m past the head (0.42);
  "?" / "?!" over the head, global 👁 meter; ≥ 1 → ALARM (two horn blasts, battle music) → every guard alert, rush squad runs at the hide (fail when one reaches it).
  Ground guards don't see across the wall line (L.wallZ) unless elevated.
- Kill: arrow sticks in the body (attached to the model), Hit_A → Death_A, guards on walls/towers fall off with a ballistic arc away from the shooter, dust on landing; sparks/dust only, no blood.
- Arrow cam (headshot / last required target / key target / rope; flight > 0.32 s; SET.arcam ≠ 0): G.ts 0.13, chase camera just behind the spinning arrow, glowing trail,
  CSS speed lines + letterbox; cut to an impact camera in front-side of the target (G.ts 0.28 → 1) while he recoils and falls; tap anywhere (or the shoot button / Esc) skips.
  Toggle: 🎥 in the mode's HUD and a "🏹 Oq kamerası" row injected into the game's ⚙ panel (own .aseg class — story.js setTexts only walks .seg rows). Stored in SET.arcam (qq_set).
- HUD (own DOM #arch + CSS #archCss, game palette): objective + counter, 👁 alert meter, wind, arrows left, 🎥, ⚙ (opens the game settings), tips (first run: drag / hold / pins / breath),
  centre messages (Basqa tiydi! / Jıǵıldı! / DABÍL!), markers over heads, "Alǵa!" button (5-S).

## Missions (m2/src/75_archery.js + LEVELS in archery.js)
- **3-S Dáryanıń arǵı betindegi lager** (ch3, after 3-2 "Qul kárwanı", before 3-3 "Kópirdi uslap tur"; DUSK; Gúlayım on a crest across the river, ~80–100 m):
  palisade with gate gap, 2 watchtowers (archers, sweeping), 2 patrols in front of the palisade, a talking pair at the gate fire, 6 yurts, horses; after 3 kills the camp's
  captain (nayza) walks out of the gate to the fire — bonus target (he finds the pair's bodies if you left them there). 12 arrows. Rush 4. Stars: win / no alarm / captain too.
- **5-S Darbent diywalı** (ch5, after 5-1, Sárbinaz on a rock ledge in the pass; wall across the pass with 2 towers, ~60–100 m): 4 maidens sneak along the right cliff in 4 bounds
  between rock covers (player taps «Alǵa!»); any guard whose cone covers a moving maiden fills a red ring over his head (≈1–2.5 s) → shoot him or a maiden is caught + alarm.
  Guards: wall archer, wall patrol, 2 tower guards, ground patrol in front of the postern, a talking pair at a fire halfway. 12 arrows. Rush 3 (they hunt the maidens).
  Stars: win / no alarm / no maiden lost (existing s_allq).
- **6-S Qashal dárwazası aldında** (ch6, after 6-1, before 6-2 "Dárwaza qamalı"; DAY; Gúlayım on a rooftop up the street, ~95–110 m): the city wall built by buildCh6;
  6 sentries on the eastern wall (patrol, 2 archers incl. the corner tower, gate-tower guard, a talking pair) + the beacon keeper sitting on the west gate tower:
  after 2 eastern kills, any suspicion or the alarm he runs to the brazier (6.5 s, ring meter) — if he lights it: beacon fire + alarm. Then cut the two ropes of the raised
  gate bridge (timber lintel + pulleys in front of the gate towers) → the bridge crashes down, 6 maidens charge the gate → win. 2 western-wall guards = bonus.
  14 arrows. Rush 4. Stars: win / no alarm / western wall too and beacon never lit.

## New qq strings (please check — Karakalpak Latin, words reused from i18n.js where they exist: saqshı, sadaq, oq, dabıl, dárwaza, diywal, júzbası, qolǵa tústi, Alǵa…)
ar_n_3 Dáryanıń arǵı betindegi lager · ar_o_3 Lagerdiń 6 saqshısın sadaq penen, dabıl kótertpey joq etiń · ar_n_5 Darbent diywalı ·
ar_o_5 Dárwazaǵa jasırın baratırǵan qızlardı qorǵań — olardı kórgen hár bir saqshını atıń · ar_n_6 Qashal dárwazası aldında ·
ar_o_6 Shıǵıs diywaldıń saqshıların joq etiń, belgi otın jaqtırmań, keyin arqanlardı úzip dárwazanı túsiriń ·
ar_s_noal Dabıl kóterilmedi · ar_s_cap Lagerdiń júzbası da jıǵıldı · ar_s_west Batıs diywal da tazalandı, belgi otı janbadı ·
ar_alarm DABÍL! Kerney shalındı! · ar_rush Olar sizge qaray juwırıp kiyatır — toqtatıń! · ar_head Basqa tiydi! · ar_kill Jıǵıldı! · ar_miss Tiymedi — olar estidi ·
ar_noarrow Oqlar tawsıldı · ar_skip Ótkiziw ushın basıń · ar_cam Oq kamerası · ar_found Jasırınǵan jerińizdi tawıp aldı! · ar_cap Júzbası ·
ar_capt Lagerdiń júzbası shıqtı — qosımsha nıshan · ar_capt2 Júzbası ele tiri — úshinshi juldız ushın onı atıń ·
ar_t1 Átirapqa qaraw ushın barmaǵıńızdı súyreń · ar_t2 🏹 túymesin basıp turıń — sadaq tartıladı, jiberseńiz — atıladı ·
ar_t3 Oq tómenleydi: aralıq belgisin (50–150 m) nıshanǵa tuwrılań · ar_t4 Júrip baratırǵan saqshınıń aldına qaratıń, samaldı da esapqa alıń ·
ar_t5 🫁 túymesin basıp turıń — demińizdi tutasız, nıshan tınıshlanadı · ar_beacon Belgi otın jaǵıwshı otqa qaray juwırıp baratır! ·
ar_lit Belgi otı janıp ketti — Qashal xabar taptı! · ar_ropes Endi dárwaza kópirin uslap turǵan eki arqandı úziń · ar_rope Arqan úzildi! ·
ar_gate Dárwaza tústi — qızlar, alǵa! · ar_go Alǵa! · ar_mgo Qızlar panada — jol ashıq bolǵanda «Alǵa!» túymesin basıń ·
ar_spot Saqshı qızlardı kórip atır — onı atıń! · ar_mlost Bir qız qolǵa tústi! · ar_mallost Barlıq qızlar qolǵa tústi ·
ar_d3a (Gúlayım) Lager dáryanıń arǵı betinde. Bir saqshı kerney shalsa, pútkil lager oyanadı. Bir oq — bir saqshı. ·
ar_d3b (Sárbinaz) Ot basındaǵı ekewi gápten tınbaydı. Birin atqannan keyin dárhal ekinshisin atıń. ·
ar_d5a (Sárbinaz) Qızlar jartas boylap kishi dárwazaǵa jasırın baradı. Men qırdan qarap turaman — olardı kórgen saqshı tiri qalmaydı. ·
ar_d6a (Gúlayım) Dárwaza minarasındaǵı ot — belgi otı. Ol jansa, pútkil Qashal juwırıp keledi. Keyin arqanlar — kópir bizdiki. ·
ar_d6b (Sárbinaz) Qızlar diywal astında kútip tur. Belgi beriń, Gúlayım.
Unsure words: kerney (horn), belgi otı (signal fire / beacon), nıshan (target), aralıq belgisi (range pin), pana (cover), jartas (cliff), qır (ledge), samal (wind), dem (breath), Shıǵıs/Batıs (east/west).
"Settings: 🏹 Oq kamerası" row uses the existing `on`/`off` strings.
