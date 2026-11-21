# Tutorial log (0-0 "Shınıǵıw maydanı" / Mashq maydoni / Training Field)
Agent: tutorial. Work dir /home/user/agents/tut (parts p1..p5.js -> 67_tutorial.js, patch scripts p_*.py, pre-edit copies story.js map.js meta.js i18n.js build.sh.pre).

## Files
- NEW /home/user/agents/m2/src/67_tutorial.js (built into js/missions.js; build.sh order: ... 65_v3.js 67_tutorial.js 70_fly.js). Self-contained closure `TUT`; adds
  `MLIST.unshift({ id: '0-0', c: 0, ty: 'train', ... s: ['win','flag','flag2'] })`, `TYICON.train = '🎯'`, `RUN['0-0']`, `window.__TUT` (S(), next(), skip(), feat()) and `window.__TUT_R` (run state, tests).
  Own imports (engine yurt/banner/ground/wall/water/sparks/doAct, scenery.js as tuSCN) at the top of the part — ES imports are legal anywhere at module top level.
- /home/user/agents/m2/src/build.sh: `67_tutorial.js` inserted before `70_fly.js` (one str.replace).
- js/i18n.js: one line per language block (`// tutorial 0-0 (tutorial agent)`), 77 keys tu_* + n_ays n_aqm n_jup n_ms.
- js/story.js (3 tiny edits): PORT += ays:'md_aysuliw', aqm:'md_aqmaral', jup:'md_jupar', ms:'keyart' (dialog portraits);
  title Play -> runMission('0-0') for a NEW player (no qq_tut, no qq_prog, no '0-0' star key), else '0-1' as before; `?start=0-0` / `?start=tut` accepted.
- js/map.js (1 edit): mdone('0-0') is also true when qq_prog or qq_tut exist (existing players: the map's "current mission" never jumps back to the tutorial).
- js/meta.js (2 edits): Aysulıw u: { m: '1-2', m0: '0-0' }; unlock check `(u.m0 && +SM[u.m0] > 0)` -> she joins after the tutorial is finished with >= 1 star (skipping does not give her).

## Flow (each step: one-line card "k/N icon text [progress]" under the objective + pulsing button + 👇 pointer; advance only on success; +coins, praise bubble)
Setting: morning training field by the river (scenery ch3 river camp + bridge at z=-78, built WITHOUT the war props of buildCh3), white yurts,
coloured banners, spear racks, straw bales, tethered horses. Ambient life: 4 sparring pairs (attack / block with sparks), 3 archers shooting
visible arrows at their own targets, 2 riders cantering along the right edge, watchers who cheer, banter bubbles (tu_a1..8) over maidens near the camera.
Buttons appear one by one as they are taught (class `tuhide` with !important, restored on cleanup — W3's per-frame display writes can't fight it).
 1 move (joystick → marker)            2 light: 3-hit combo on a straw dummy (hits < 1.3 s apart, one per swing)
 3 strong: shield dummy only takes `hvy` hits (W3 bS button if present, else hold ⚔); light hits → "Qalqan!" + Sárbinaz "hold longer"
 4 dodge ➤ x2 vs Aysulıw (real enemy AI, red wedge telegraph, harmless 5–8 dmg, never dies)   5 roll (double tap ➤ / R) x1
 6 block (hold bB) x3                  7 parry (bB < 0.3 s before the hit; G.stats.parry) + slow-mo moment
 8 jump + ⚔ in the air (plunge) on a dummy      9 lock-on (bL): Aysulıw and Jupar, with a switch (p.hl)
10 amulet (b8 shield power, cd 3 s here): let Aysulıw strike the shield
11 go to the shooting line   12 bow — see "Bow" below   13 ride: auto-mount, 4 golden rings (miss = ring stays, bubble "turn back")
14 final duel with Sárbinaz (kit duel(): ring, 8 maidens cheering, nonLethal .3 → she sits down and yields; windup .72, string 2)
→ hook: horn, smoke columns far beyond the river, a rider (son model, mounted) gallops over the bridge; dialog messenger / Gúlayım / Sárbinaz / Gúlayım
→ banner "Shınıǵıw tamamlandı" → win(): end screen, ★ = completed | duel without a hit (flag) | all bonuses (flag2: perfect dodge, every ring first pass, + bullseye when the sniper range exists)
→ "Keyingi tapsırma ▸" = 0-1 prologue (Allayar at Sarkop) — consistent with lore1/nar3 (Gúlayım was training at Qıran when Sarkop was attacked).
Skip: "Shınıǵıwdı ótkerip jiberiw ▸▸" (bottom centre) → qq_tut=1, stars['0-0']=0 (done, 0★), straight to 0-1.
Feature detection (TU_FEAT): W3 via G.w3 + its buttons (bS bB bJ bL); a missing feature = the step is skipped and N shrinks. Player hits are observed by wrapping
the player's damage() (ifr / guard / shield flags); partner strikes are detected from the AI state windup → recover and judged 0.16 s later.
G.noDeath during the whole tutorial; G.powers / G.noVar restored on cleanup (the amulet does not leak into 0-1).

## Bow
js/archery.js is a separate sniper MODE (runArchery(id, H) builds its own scene, freezes the engine) — not a melee bow API. So:
- if `LEVELS['TU-S']` exists (archery agent: please add a no-alarm "training range" level — straw targets: static ~50 m, moving ~75 m, far ~120 m with wind,
  arrow cam on the bullseye; allStar() = bullseye on the far one), the tutorial runs it as one step and then REBUILDS the field (field(R,'after'): player at the
  shooting line, Sárbinaz / Aysulıw / Jupar / Aqmaral, amulet kept) and goes on with the ride. Result `all` → bonus 'bull'.
- else (now): the existing 🏹 arrow-rain skill (button 2) on 3 straw targets in the field (2 must be hit).
- archery.js renamed its global to __QQBOW on purpose; my ARCH() probe (window.__ARCH / __ARCHERY / G.archery) therefore stays null → in-field bow steps
  (bow1 static / bow2 moving / bow3 far + bullseye bonus) only run if someone exposes a melee bow API under those names.

## New qq (Karakalpak) strings — please check (uncertain words: qurshaq = training dummy, nıshana = target, kerney = horn, sınasıp kór = spar, halqa = ring, domalap = roll, Iynim = my shoulder, Suńqarday, qaplanday)
- tu_n: Shınıǵıw maydanı
- tu_o: Urıs aldınan qırq qızdı shınıqtırıń
- tu_skip: Shınıǵıwdı ótkerip jiberiw ▸▸
- tu_done: Shınıǵıw tamamlandı
- tu_s1: Sárbinazdı bir soqqı da jemey jeńiń
- tu_s2: Barlıq qosımsha sınawlar
- tu_duel_t: Shınıǵıw jekpe-jegi — ólimge shekem emes
- tu_shieldblk: Qalqan!
- tu_d_sa1: Qayırlı tań, Gúlayım! Qızlar tań azannan beri maydanda — seni kútip tur.
- tu_d_gu0: Onda baslayıq. Búgin dushpan qapı aldında turǵanday shınıǵamız.
- tu_d_sa1b: Ha! Onda qızlarǵa áwele óziń kórsetip ber!
- tu_d_ays1: Gúlayım, men menen sınasıp kór! Ayap otırmayman.
- tu_d_gu1: Qáne onda, Aysulıw. Soqqı ber — qızlarǵa qılıshtan qalay qashıwdı kórsetemen.
- tu_d_aqm1: Qılısh jeter! Nıshanalarǵa júriń — qızdıń birinshi dostı onıń sadaǵı.
- tu_d_sa2: Aq atıń erlendi! Halqalar arasınan shawıp ót — batırdıń qalay at shabatuǵının kórset.
- tu_d_sa3: Al endi — men menen. Úyrengenleriń hámmesi — birden.
- tu_d_gu3: Meni ayama, Sárbinaz.
- tu_d_sa4: Qashan ayaǵan edim? Qızlar, sheńber bolıp turıń!
- tu_d_sa6: Jeter, jeter — jeńildim! Iynim muni bir hápte umıtpaydı.
- tu_d_ms1: Gúlayım! Surtaysha qırq mıń láshkeri menen Sarkopqa basıp keldi! Allayar bay qala diywalların uslap tur — meni saǵan jiberdi!
- tu_d_gu4: Áke…
- tu_d_sa5: Qızlar tayar, Gúlayım. Tek buyrıq ber.
- tu_d_gu5: Atlanıń, qızlar! Sarkopqa shabamız!
- tu_t_move: Joystik penen shınıǵıw qurshaqlarına barıń
- tu_t_light: ⚔ túymesin tez-tez basıń — qurshaqqa 3 soqqılı kombo beriń
- tu_t_heavy: Qalqan tez soqqılardı toqtatadı. Kúshli soqqı ushın ⚔ túymesin BASIP TURIŃ
- tu_t_heavyS: Qalqan tez soqqılardı toqtatadı — KÚSHLI soqqı túymesin basıń
- tu_t_dodge: Qızıl sektor tolǵanda ➤ basıp shetke qashıń
- tu_t_roll: ➤ túymesin eki ret tez basıń — soqqısı astınan domalap ótiń
- tu_t_block: Qalqan túymesin basıp turıp, soqqıların toqtatıń
- tu_t_parry: Qılıshı túsip kiyatırǵanda qalqan túymesin basıń — soqqını QAYTARIŃ!
- tu_t_jump: Sekiriń, hawada ⚔ basıń — qurshaqqa sekirip soqqı beriń
- tu_t_lock: Nıshan túymesin basıp nıshanǵa alıń — jáne bassańız Juparǵa ótedi
- tu_t_amu: Tumardı basıń — nur qalqanı — Aysulıw oǵan soqqı bersin
- tu_t_range: Oq atıw sızıǵına barıń
- tu_t_rain: 🏹 basıń — nıshanalarǵa oq jamǵırın jawdırıń
- tu_t_bow1: Sadaqtı tartıp, nıshanǵa alıń hám qoyıp jiberiń — nıshanaǵa tiygiziń
- tu_t_bow2: Endi qozǵalıp baratırǵan nıshana — azǵana aldın alıń
- tu_t_bow3: Alıstaǵı nıshana: oqtıń tómenlewin hám samaldı esapqa alıń — altın ortasına
- tu_t_ride: Barlıq altın halqalar arasınan shawıp ótiń
- tu_t_duel: Sońǵı sınaw: úyrengenlerińiz benen Sárbinazdı jeńiń
- tu_p_move: Jol beriń, qızlar — Gúlayım keldi!
- tu_p_light: Suńqarday shaqqan!
- tu_p_heavy: Ha! Aǵash sınıqları hár tárepke ushtı!
- tu_p_dodge: Samalday — tiyip te almayman!
- tu_p_roll: Tuwrı qılıshımnıń astınan!
- tu_p_block: Tas diywalday!
- tu_p_parry: Qaytardı! Qılıshım shetke ushıp ketti!
- tu_p_jump: Qıyadan sekirgen qaplanday!
- tu_p_lock: Ekewimiz de nıshanańdamız!
- tu_p_amu: Qılıshım nurdan tayıp ketti!
- tu_p_rain: Bir de bir nıshana pútin qalmadı!
- tu_p_bow1: Dál tiydi!
- tu_p_bow2: Qozǵalısta urdıń!
- tu_p_bow3: Sonsha alıstan ba? Isenip bolmaydı!
- tu_p_ride: Dalada ushqan oqtay!
- tu_b_hold: Qalqan shıdadı! Túymeni uzaǵıraq basıp tur!
- tu_b_hit: Tiydi! Jáne bir ret!
- tu_b_amu: Bul ákeńniń tumarı! Qáne, kúshin kóreyik.
- tu_b_miss: Halqanı ótkerip jiberdiń — artqa qayt!
- tu_b_horn: Esitip tursızlar ma… kerney! Kópir tárepten!
- tu_b_ms: Gúlayım! Gúlayım!
- tu_bonus_pd: Bonus: minsiz qashıw!
- tu_bonus_rings: Bonus: barlıq halqalar birinshi urınıwda!
- tu_bonus_bull: Bonus: dál ortasına!
- tu_a1: Shıntaǵıńdı joqarıraq! Joqarıraq!
- tu_a2: Jáne! Jáne bir ret!
- tu_a3: Qolım úzilip túsetuǵın boldı…
- tu_a4: Qarańlar — Gúlayım bizge qarap tur!
- tu_a5: Oqlarımdı kim aldı?!
- tu_a6: Qılıshqa emes — iynine qara!
- tu_a7: Tezirek, tezirek!
- tu_a8: Búgin azanda dárya qanday shıraylı…
- n_ays: Aysulıw
- n_aqm: Aqmaral
- n_jup: Jupar
- n_ms: Shabarman

## Bugs found by testing (fixed)
- W3's w3Hud() writes bB/bJ style.display every frame → hidden-until-taught buttons now use the class `tuhide` (display:none!important).
- The engine's straggler pull (engine.js straggle(): far/lone enemies are teleported and killed after 6 pulls) killed the sparring partner when the
  player stayed far away → props and partners carry farT = -1e9 (the kit's "scripted" marker) every frame.
- Light dummies stay as decoration but become team 'npc' after their step (so W3 hard lock / auto-aim don't pick them during later steps).
- Card + objective showed the same text → objective = mission name, card = instruction; card moved to the bottom centre (forward targets appear right under
  the top HUD with this camera) and the duplicate icon prefix removed (UI skin turns ⚔ ➤ etc. into icons).

## Hook polish
- Rider eases in and stops ~3.4 m in front of Gúlayım; a short camera override (engine camOverride) lifts the camera and looks past the bridge
  (rider + five smoke columns on the far bank) during the horn, the gallop and the messenger's lines, then eases back. Removed on cleanup.
- Partners lose name plate + gold ring when they step out of a drill (detached; the engine re-showed hidden plates). All props are retired
  (team npc) before the duel so the direction arrow / lock never point at an old dummy.

## Tests (own port 8895, snapshot /home/user/t/tsnap via /home/user/t/tsnap.sh, script /home/user/t/tut_run.js, 844x390, LOWQ)
tut_run.js drives the tutorial with REAL key input (W, J, hold J/E, K, double K/R, Q hold / Q tap, F+J, Tab, 8, 2), renders only for screenshots.
Env: SHOTS=0 (logic only), SHOTSET=ids, FASTTO=<step id> (skips earlier steps via __TUT.next()), HOOKONLY, TUS (load title, set __TUT_FAKEARCH, start via __MS.run).
- tl4.log: full logic run start→end screen, 0 [pageerror]: move@2.0 light@4.5 heavy@7.9 dodge@17.3 roll@21.9 block@34.2 parry@44.7 jump@46.6 lock@49.3
  amu@53.3 range@54.7 sniper(fake)@57.9 ride@69.3 end@92.0 (game seconds of the bot; a person needs ~3–5 min). Field rebuild after the sniper segment works.
- tl2.log: full run without the fake sniper (16 steps incl. old bow1..3 because the snapshot still exposed window.__ARCH) — passed through amulet.
- End screen: ★ completed, "Aysulıw qatarǵa qosıldı" (maiden unlock toast from meta), +105 XP, next = Sarkop dárwazası (0-1), "Keyingi tapsırma ▸".
- Screenshots looked at: ta_dlg, ta_2_light, ta_3_heavy, ta_4_dodge, tb_10_amu, tb_12_rain, tb_13_ride, tb_duel, tc_x42, td_hook_ride, td_hook_dlg, td_end (+ te_* hook re-check).
- tsk.log (/home/user/t/tu_skip.js): Skip button → mis 0-1 (lore0 → cutscene v1), qq_tut=1, qq_stars {"0-0":0}, no button left hidden, card hidden, G.powers {} — 0 [pageerror].
- te_hook_ride.jpg / te_hook_dlg.jpg: the hook cinematic (bridge, river, rider galloping in, fires + smoke on the far bank, yurts, banners).
- All runs: 0 [pageerror]. bust.py runs via build.sh after every build.

## Honest weaknesses / open
- Sniper bow: js/archery.js is a separate mode with guard-type targets; there is no training-range level yet. Hook is ready (LEVELS['TU-S'] → runArchery → field rebuilt);
  until then the bow step is the arrow-rain skill (button 2) on straw targets — NOT the requested draw/aim/release + moving + long-range + arrow-cam lesson.
  Archery agent: a no-alarm 'TU-S' with 3 straw targets (static / moving / far+wind, arrow cam on the bullseye, allStar = bullseye) would complete it.
- Balance/feel not play-tested by a person: the bot passes every step; parry timing (guard < 0.3 s before the hit, partner windup 1.3 s) and the final duel
  (Sárbinaz windup .72, 1100 HP, nonLethal 30 %) need a phone test. "No hit in the duel" (2nd star) may be hard for beginners.
- The perfect-dodge bonus (engine perfectDodge) needs the dodge in the first 0.3 s before the hit — the bot never got it; flag2 therefore untested as "all ★".
- Sárbinaz does not visibly sit down when she yields (kit duel() plays Sit_Floor_Idle; her model seems to lack it) — reads as "stops fighting".
- The hook's fires stand right across the river (fog hides anything farther) — they read as beacon / camp fires rather than distant Sarkop.
- The field ground is the ch3 dirt lane; greenery is at the sides (scenery ch3). Props (dummies, targets, rings, racks) are primitives.
- Messenger portrait = keyart crop (no portrait art for him); Jupar has no lines.
- Testing under ~30 other headless browsers on 1 CPU: logic runs fast (render stub), each screenshot takes 1–3 min, so screenshots were taken in 4 partial runs.
