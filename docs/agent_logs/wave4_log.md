# wave4 log — 3-button controls, army growth + enemy scaling, upgrades with chapter caps, map camps
Backups (state at start, HEAD 3669cb2): /home/user/agents/w4/bak/ (engine, map, meta, i18n, missions, index.html, story, archery, m2src/)
Test files: /home/user/t/w4/

## Files changed / added
- NEW js/wave4.js (self-contained: controls, army, enemy power curve, upgrade screen, map camp markers, catapult cart, texts in 4 languages injected into i18n L)
- index.html: one line `<script type="module" src="./js/wave4.js">` after meta.js
- js/engine.js (patch /home/user/agents/w4/p_eng.py): G.w3 gets internals (aim, startAtk, parry, startHeavy, doActInner, heroSkill, stickDir, canCancel, spend, keys, joy, hostile, w3Lock);
  mouse clicks on the canvas no longer count as swipe/double-tap dodge; sword swing arc 2.9 m/cos .05 -> 3.25 m/cos -.12 (one swing reaches 2-3 enemies). aim()/lunge limits untouched.
- missions sources (/home/user/agents/m2/src, build.sh now also cats 66_w4camps.js):
  - 20_kit.js (p_kit.py): balanceGroups grows the enemy side per chapter (+floor(c/2) soldiers per posted group, +1 when our host >= 20) with chapter unit pools
    (ch1 infantry, ch2 +shield bearers, ch3 +archers, ch4 +cavalry, ch5+ +catapult cart); still stops at F3_CAP.
  - NEW 66_w4camps.js: 18 camp missions (ch1-3: 2, ch4-7: 3) inserted before each chapter boss, generic campRun().
  - 67_tutorial.js (p_tut.py): the 8 steps teach the 3-button scheme.

## PART A — controls (js/wave4.js + engine API)
- Mobile HUD: only ⚔ #bA (86 px), ➤ #bD (64 px), 🔺 #bP (new, 62 px, amulet SVG, gold gauge ring = G.ulti, glows + pulses when full) + joystick + ⚙.
  All other .ab buttons (b1-b5, b6-b0, bM, bS/bB/bJ/bL of w3) are hidden by CSS (`#btns .ab:not(#bA):not(#bD):not(#bP)`), they stay in the DOM so old code paths do not break.
- ⚔ tap: melee target = engine aim(p, 6.5) (fix3 limits kept: soft lock 6 m, cones, 2 m lunge) -> engine combo (doAct('A'));
  no melee target -> bow volley if enemies 6.8-30 m in the front cone (cos > .34) with line of sight (segment vs solid G.colB boxes; ravines/off boxes ignored):
  3 arrows (4 from bow level 2), up to that many targets (nearest/most dangerous: archers, captains, boss first), real engine projectiles (shoot()), bigger/brighter, 1.55x speed.
  ⚔ hold 300 ms: engine heavy 'sweep' (2H spin, guard break) = spinning strike. Auto hard-lock (p.hl) when the hit target is the boss / a captain (hunt/lead) / elite / heavy.
- ➤: if an enemy is winding up a blockable melee strike at her (state windup, not slam; or a kit move in phase 0 that is not unblockable) and she can cancel her act -> engine w3Parry + immediate counter strike (startAtk uses counterTg);
  else engine dodge (double tap = roll). Unblockable slams/kit moves are never parried (dodge them).
- 🔺: only with a full gauge; picks the power: Gulayim: amulet combo (power 8, when unlocked) vs 3+ near / a tough enemy; wolf strike (5, engine keeps the fixed rules: short strike in a fight, 12 m leap only at a ravine) vs a boss/captain/elite;
  'Qırq qız' beams (4) vs 3+ near or 6+ around; arrow rain/chain (2/7) vs a far group; Allayar: cleave/war cry/bash; Sarbinaz: sweep/thrust/javelin. Shows "🔺 <power name>".
- Contextual: wolf leap over a ravine when she pushes into the ravine edge with no enemy within 8 m (no button). Mounting is automatic in the ride levels already (bM was never shown).
- Desktop: left mouse on the canvas = attack (hold = spin), Space/K/Shift = dodge, E = amulet, J = attack; 1-0, Q, F, R, Tab, L, X, H are swallowed (no hidden extra moves).
- Engine patch details: see "Files changed".

## PART B — army growth + enemy scaling
- Save: localStorage "qq_w4" { men, best{missionId: warriors gained}, up{sword,bow,armor,shield,arch}, lostAll, bossPaid{} }.
- Rescue missions: at mission end (META missionEnd hook) gain = clamp(round(10 + 20 * saved/total), 10, 30) warriors; replays only add the difference to the best result of that mission (no farming).
- Casualties: each warrior body killed in a mission costs men/bodies warriors; deducted at mission end ("Urısta qurban bolǵan batırlar: N" on the end screen + hint). Maidens stay the story's forty.
- Bodies: at mission start up to 6 warrior bodies (type w4bat = yigit model, saber + shield; HP x shields upgrade) + up to 5 archer maidens (w4arc = qiz model with bow, ranged AI)
  spawn ~9 m behind her and march up (follow/drift AI). With 5-9 maidens + Sarbinaz that keeps <= ~21 allied bodies; the rest is a count in the HUD chip "⚔ Safımız: 40 qız + N batır" (top-left)
  and the start hint "⚔ Safımız: 40 qız + N batır · Dushpan: ~M" (M = max(ours x (1.15 + .05c), enemy bodies x 3): always larger than ours).
  No army in 0-0, 0-1, 0-2 (prologue), 3-1 (stealth), ride levels 2-1/4-1/7-1, sniper missions *-S.
- Enemy side per chapter: posted groups get floor(c/2) extra soldiers (+1 if our host >= 20) from the chapter pool infantry -> +shield bearer (ch2) -> +archer (ch3) -> +cavalry (ch4, mounted askar, engine cavAI) -> +catapult cart (ch5+, max 1 per group);
  engine 40-enemy budget (F3_CAP) unchanged. Captains (mission hunt targets) get poise x (1 + .2c).
- Enemy power curve: every enemy in chapter c >= 1 (not the tutorial/prologue, not invulnerable story units) gets HP x (1 + .085 E) and damage x (1 + .05 E), E = 85 % of the chapter cap
  (ch1 x1.22 HP, ch2 x1.36, ch3 x1.51, ch4 x1.65, ch5 x1.80, ch6 x1.94, ch7 x2.08). Sword at the cap gives +10 %/level, so at ~85 % of the cap the fight is as before, below it harder.
- Catapult cart (wave4.js catapult()): R_arava prop + post + throwing arm on a hidden askar body, does not move, every 5-6.5 s lobs a stone at her: red circle (telegraph 1.7 s, r 3) then unblockable hit; 420 x (1 + .25c) HP.

## PART C — coins, upgrades, chapter caps
- Upgrade screen "⚒ Safımız hám qural" (own overlay, meta colours): end screen button (replaces the old 🛒 shop button), ⚒ button in the map header.
  Tracks: Gúlayım sword (+10 % melee/level, via __META.pdMul wrapper), Gúlayım bow (+12 % arrow damage/level, volley 3 -> 4 arrows from level 2), maidens' armour (+12 % HP/level),
  warriors' shields (+12 % HP, +3 % block/level), archer maidens (bodies = level, max 5).
- Cap per chapter = 2c + 1 (ch1 3, ch2 5, ch3 7 … ch7 15). The cap chapter = 1 + chapter bosses beaten in a row, so the next cap opens only after the chapter's final fight;
  the first win over each chapter boss pays 200 + 100c coins ("Jeńis! Kúsheytiw shegi endi N-dáreje").
- Cost of level L -> L+1: base x (1 + .6 L) (sword/bow 60, armour/shield 50, archers 70). Measured income: 1-1 paid 218 coins (+ quests/achievements), 0-0 paid 165;
  a whole chapter (4 missions + 2-3 camps, ~220-300 each, + boss bonus) buys ~70-100 % of the cap in all five tracks (ch1 full cap = 1390 coins).
- Old shop levels SAVE.up.sword / SAVE.up.maid are migrated once into the new sword / armour tracks and zeroed (no double bonus).

## PART D — camps on the world map
- 18 camp missions "c-C1..C3" inserted before each chapter boss (ch1-3: 2 camps, ch4-7: 3): yurt camp (6 yurts, banners, cart), watchtower (palisade with a 6.8 m gate gap, two B_tower props, yurts behind),
  river ford (water band across the lane at z -53, boulders on the banks, yurts on the far bank). 60/80, 80/90, 90/100, 100/110/110, 110/120/120, 130/130/140, 140/150/150 soldiers.
- In the level: 3 posted groups (front guard, fire circle, rear guard) + the captain ("Júzbası", leader(), HP x (1.2 + .1c)) + cavalry (ch4+) + catapults (ch5: 1, ch6+: 2) stand there from the start
  (shown in the fly-over); one body = 3 soldiers; the rest come out of the tents / tower gate in waves of <= 5 while fewer than 14 are up (engine arrive() keeps them off-screen).
  HUD: "⛺ <camp> — Dushpan: n/N   🎯 Júzbası". Win = reserve empty + all bodies + captain dead -> "Lager tazalandı!" + normal end screen. The boss mission unlocks after the last camp (list order).
- World map: camp icons (⛺/🗼/🌊, red; green ✓ when cleared) on the route between the chapter nodes; the current chapter's camps show "N ásker"; tapping one opens that chapter's card.
- story.js: the ?start= test parameter accepts camp ids (m1-C1) — one regex.

# RESUMED (wave4 continuation agent, Nov 20 ~20:00 UTC)
State found: wave4.js complete and parsing, parts A/B/C and the 18 camps of D done and bot-tested by the first agent (tuC = tutorial 8/8 steps, m11 = 1-1 ★★★ +30 batır, c1b = camp 1-C1 won, b14hi/b14lo = boss 1-4 with/without upgrades, mpA/mpB = map + upgrade screen; all 0 pageerror).
Nothing was cut mid-patch (node --check clean on every js + m2/src). Its last run (c5a = camp 5-C1) was stuck at "Dushpan: 3/110" with 7 deaths: the bug below. Backups of everything I touched: /home/user/agents/w4r/*.before.js, patch scripts p1..p8.py there.

## Fixes
- Catapult cart: it was an `askar` entity with hidden meshes, so the engine's soldier kit (W3K.askar) kept running on the invisible body (it walked and attacked, catAI never pinned it) and it had 3560 HP (ally balance x2.2 + chapter curve x1.8).
  Now own type `T.w4cat` (no kit), pinned every frame (CATS list in rockTick), 300 x (1 + .2c) HP, no chapter curve (e.w4s). Camp groups are posted with `noExtra` (20_kit balanceGroups honours it): the balance no longer adds uncounted soldiers / 3 extra catapults into a camp.
- qq typos in the tutorial texts: "ózıń/ózım" -> "óziń/ózim".

## PART D — showcase siege "Qashal qamalı" (mission 6-Q, after 6-1; m2/src/66_w4camps.js siegeRun, own level siegeBuild)
- Our two catapult carts (wave4.js catProp, blue flag) stand behind her and lob stones (wave4.js lob(), gold circle) at the wall the whole time; stones hurt enemies only.
- Wave 1/3: the sortie in front of the wall (8 bodies, shown in the fly-over). Wave 2/3: a flank attack from the steppe behind us (8) + 4 archers ON the wall (type w4wa, never come down) — shot with ⚔ = bow volley (also hit by our stones).
  Then the catapults switch to the gate: 3 hits breach it ("Dárwaza buzıldı! Alǵa!"). Wave 3/3: the garrison behind the gate (6) and two points (red ring, banner) held by a captain + 5 guards each; captain down = "Noqat iyelendi n/2", ring turns green, checkpoint.
  Final: "Qorǵan begi" alone in a duel ring (kit duel(), his men watch and flee). HUD "🏰 Tolqın n/3 — …". ?start=m6-Q works (story.js regex). 38 enemy bodies in total (cap 40).
- Camps: HUD now shows the wave too: "⛺ <camp> — Tolqın n/3 · Dushpan: n/N" (1 = the posted camp, 2 = first reserves out of the tents, 3 = last half of the reserve); purse 60 + 30c.

## PART E — missions gap table (urgent5_log) with the coordinator's rulings
- Rides 2-1 / 4-1 / 7-1: NO fighting on horseback (kept). rideRun has `len` (extra ground + boulders beyond the 200 m scenery), `wait` riders (bolt when she is 30 m away), `build`, `xMax`, mid-ride checkpoint.
  2-1: 440 m, 5 riders (3 + 2 later), 13 rings. 4-1: 460 m along the SHORE — sea closes the right side (water + collision), crates/driftwood, two pairs of riders, carts at the far end. 7-1: 420 m gallop (15 rings, 90 s star timer), then
  "Atlardan túsiń — lagerge hújim!": everybody dismounts and the chapter's big battle is fought on foot = campRun (yurt camp, 150 soldiers in 3 waves + captain, catapults, cavalry guards), our host joins (NOARMY no longer lists 7-1).
- Chapter-3 intro (lore3 + c3 + nar7) now plays at the start of 3-1 only (3-2 swallows the old call once). 3-2: the roped line has 4 armoured spearmen and there is a second roped line (2 spearmen + 2 swordsmen) further up the road.
- 2-3: after the escort, "Qudıq qasındaǵı qorǵanıs": two attacks on the resting caravan from BOTH sides at once (6 and 8 raiders, raidAI on the caravan people), side alert "Eki tárepten hújim! n/2". No sandstorm (not done).
- 0-1: Camel Dev removed. Finale = hold the wall: 10 townsfolk sit in the square, then run past Allayar into the town (one every 2.6 s) while 3 waves come up the street; every raider who gets past z -36 costs one townsman. HUD "🛡 Tolqın n/3 — Qalaǵa kirgen xalıq: n/m".
- 4-2: the plank square is now a docked war boat (w4Boat: bulwarks with shields, pointed bow, mast + sail, gangplank, sea beyond and beside it). Still on the shore level, no hold below deck.
- NOT done from the table: v5 video, per-chapter challenge missions, NG+, weekly boss, 2-3 sandstorm.

## Benchmark items (bench_log top-20)
- #3 done: engine ADS.rewarded() returns false when there is no ad provider (ysdk / QQ_ADS) — the fake 5 s countdown is unreachable; body.w4noads hides #drevive, #eadx2, #shad.
- One upgrade screen: Camp has a 4th tab "⚒ Safımız hám qural" (meta.js TABS/PANE.army, pane from wave4 paneHTML()); the end-screen button, the map ⚒ button and the old Shop (story.js openShop) all open that tab. The old overlay #w4up stays only as a fallback.
- #9 partly: 150 ms input buffer for ⚔/➤ (press()/bufTick(), counters G.stats.w4tap / w4buf), press feedback class .dn on #bA/#bD/#bP. Floating joystick NOT done.
- #14 done (see rides). #13 partly (3 waves with a counter; no burnable tents / modifiers). #18 done: /home/user/agents/w4/econ.js (ch1-7 = 101/89/107/91/91/98/92 %; levels 14-15 repriced; mission incomes beyond ch1 are estimates).
- NOT done: #5 (body cap/LOD/perf overlay), #8 (tutorial 8 -> 4 steps), #12 (boss rules), #19 (collectible coins, chest bar), lazy-load hook for #1.

## UI ELEMENTS (for the UI agent; all created by js/wave4.js unless noted)
#bP (.ab.w4, amulet button; .full when charged, .w4no shake, .dn pressed) · #bA.dn / #bD.dn (pressed) · #w4army (HUD chip "Safımız: 40 qız + N batır") · #w4ctl (control legend, first 14 s) ·
#w4end (end-screen line: joined / fallen warriors) · #w4upb (end-screen button, class "btn alt") · #w4mapb (map header ⚒, class "bk") · #w4cardarmy (host line in the chapter card) ·
.w4camp (.ci, small; .done, .lk) camp icons on the map · .w4pane (.army, .info, .grid, .tr, .ic, .tx, .pp i, .bb/.poor/.done) = Camp tab "army" · #w4up (fallback overlay, same inner classes) ·
style tags #w4css, #w4mapcss, #w4panecss, #w4noadscss · body.w4noads · Camp tab button .mt-tab[data-v="army"] (meta.js) · #huntcnt (kit, existing).

## New qq strings — full list in /home/user/agents/w4/qq_strings.txt (regenerated). Added in this session:
Qashal qamalı · Qorǵandı qamań: diywaldaǵı sadaqshılardı atıń, dárwaza buzılǵan soń eki noqattı iyeleń · Tolqın {n}/{m} · Dushpan: {n} · Diywaldaǵı sadaqshılar: {n} ·
Manjanıqlarımız diywaldı urıp atır! Qorǵannan shıqqan dushpandı jeńiń · Diywaldaǵı sadaqshılardı ⚔ penen atıń — alıstan Gúlayım sadaqtan atadı · Manjanıqlar dárwazanı urıp atır! · Dárwaza buzıldı! Alǵa! ·
Noqatlardı iyeleń — júzbasılardı jeńiń ({n}/{m}) · Noqat iyelendi: {n}/{m} · Qorǵan begi · Qashal qorǵanınıń basshısı · Qashal qorǵanı alındı! ·
Dushpan lagerine shawıp jetiń hám onı talqanlań · Atlardan túsiń — lagerge hújim! · Diywaldı uslap turıń — xalıq qalaǵa kirip alsın! · Qalaǵa kirgen xalıq: {n}/{m} · Dushpan ótip ketti — bir adam qutıla almadı! ·
Xalıq qalaǵa kirdi. Sarkop dárwazası jabıldı! · Qudıq qasındaǵı qorǵanıs · Dushpan eki tárepten kiyatır — kárwandı qorǵań! · Eki tárepten hújim! {n}/{m} · (Camp tab) Safımız hám qural

## Tests in this session (844x390, real-input bot /home/user/t/w4/bot.js, no god mode)
- sg1 (6-Q siege, upgrades 11/13): finished ★★★, 0 deaths, 0 pageerror, +482 coins, 24 volleys, 14 parries, 7 amulet uses; shots /home/user/t/w4/sg1_6.jpg, sg1_40.jpg, sg1_100.jpg, sg1_end.jpg. After it the wall was lowered to 4.8 m (camera was blocked at its foot) — not re-run.
- dbg5 (5-C1 after the catapult fix): catapults pinned, type w4cat, no pageerror (short run, camp not played to the end again).
- r71 (7-1, upgrades 13): ride ~58 s (15 rings), dismount, foot battle 150 soldiers in 3 waves + captain: finished ★★★, 0 deaths, 0 pageerror, +573; shots r71_8/30/75/120/end.jpg. (In that run our host had not joined the foot battle — fixed afterwards: campRun resets __W4.RUN.m after the level is rebuilt; not re-run.)
- r41 (4-1 shore ride): 4/4 riders caught, end at ~61 s game time, ★★★, 0 pageerror; shots r41_10/35.jpg. KNOWN: the sea strip is hardly visible (engine water() plane seems to sit at ground level) — only the collision edge and crates mark the shore; needs the graphics agent or a raised water plane.
- p01b (0-1 hold the wall, no camel): 3 waves, townsfolk reach the town, finished ★★★, 0 deaths, 0 pageerror. (First run p01: townsfolk got stuck on the street-side skirmishes -> inner lanes x = ±4.8 + 24 s failsafe.)
- NOT play-tested after the last patches: 2-1 (longer), 2-3 well defence, 3-1/3-2 intro move + second roped line, 4-2 boat, 5-C1 to the end, Camp "army" tab + redirected shop, input buffer, lowered siege wall, map camp marker positions. All files pass node --check.

## Coordinator requests handled late in the session
- Camp Hero tab no longer sells sword / maidens' training (meta.js TRAIN = life, squad, horse) — each upgrade exists once (sword + maidens' armour are in the army tab).
- campMarks: markers sit at 38–62 % of the road between two nodes; "N ásker" only on the next uncleared camp.
- ru: "Каскыр-бек" -> "Каскыр" (n_qa, o_boss); no "bek" form of Qasqır left in i18n.
- #eadx2 gets no inline display:block any more ('' when an ad provider exists, else none); #drevive never had one. Kit ids #huntcnt, #rescnt, #cvbar, #dir, #f3side untouched.
- NOT done: loader total MB ("X / Y MB"), joystick was already floating (added the 8 px dead zone only).

# RESUMED — round 2 (after the first hand-back, ~21:00–)
## New in this round (all node --check clean; patch scripts /home/user/agents/w4r/, extra backups *.before*.js)
- Balance (wave4.js `defi`): on top of the chapter curve, every level the average of sword + maidens' armour is BELOW the expected level (85 % of the cap) gives every enemy +22 % damage (max x2.6) and +10 % HP.
  ch1 at level 0: dmg x1.56, HP x1.26 · ch3 at level 0: dmg x2.3, HP x1.6 · at 85–100 % of the cap: nothing.
- Boss rules (#12, wave4.js bossEvade / bossTick / finisherFx): three ➤ presses timed into the boss's wind-ups (parry or dodge; counter "1/3, 2/3") stagger him for 2.4 s ("💫 Esenkiredi!");
  at 6 % HP he reels for 5 s ("⚔ Sońǵı soqqı — ⚔ basıń!") and the next hit is the finisher: slow-mo, G.feel.trauma + G.hitStop (animation agent's system, no second table), 0.9 s camera push-in. Not on 0-0 / 0-2 / 2-2 / 7-4 (scripted or non-lethal bosses).
  50 % phase roar and the 3 attack kits are the engine's existing bossPhase / W3K — not changed. Fight length to be read from the bot runs below.
- Tutorial (#8): 4 steps — ⚔ attack (no demo before it, one line of talk), ➤ parry, 🔺 amulet, duel. `?tut8=1` plays the old 8 steps.
- Perf (#5): engine render(): bodies farther than ~22 m (low) / 33 m from the camera update their animation every 2nd frame with accumulated time; wave4 bodyCap(): at quality 0 only the 25 nearest bodies + the hero are drawn
  (corpses hidden first, then far allies, living enemies last; boss / captains / catapults always); `?perf=1` -> #w4perf "fps · bodies · calls · tris".
- Lazy load (#1): engine LAZY now also holds allayar, surtaysha, wolf, mother, archer, mage (4.5 MB); the 9.5 MB of legacy GLBs are no longer fetched when the R_ model exists (models R2).
  missions.js runMission(): every mission except 0-0 first awaits w4Ensure() — "#w4load: Júklenip atır… X / Y MB". Boot: window.__LOAD = { mb, total (7.7), done, files } is updated per file and the bar now moves per file.
  Catapults (enemy + ours) use window.__MXB.put(g,'catapult',…) when js/models_ext.js is loaded (models R3), else the old mesh. models_ext.js is NOT loaded by index.html yet (models R1 is for the lead).
- Coins (#19): 3 ancient coins per mission at the roadside (x ±5.6, 24 / 55 / 88 m from the start; +15 gold, kept in qq_w4.coins); end screen line "🪙 Áyyemgi teńgeler: n/3 · Keyingi juldız sandıǵına: ★ N" (__META.chestNext()).
- Sidestep plays 'Dodge_Side' (animation agent). Joystick dead zone 8 px.
- UI elements added: #w4perf, #w4load. New qq: Esenkiredi! · Sońǵı soqqı — ⚔ basıń! · Júklenip atır… · Áyyemgi teńge {n}/{m} · Áyyemgi teńgeler: {n}/{m} · Keyingi juldız sandıǵına: ★ {n}
## Tests round 2
- t23 (2-3 with the well defence, lazy load active): finished ★★★, 0 pageerror, +152; shots t23_60.jpg …

## QA FIXES DONE — 21:35 UTC (qa_log pass 1; all files node --check clean; only short smoke runs so far, see below)
(1) BLOCKER 1-1 / 1-3 / 3-2: 45_rescue dragAI — a handler never crosses a closed gate (stops 1.6 m before it) and never leaves the lane; where he cannot go on he turns round and fights (awake, reachable).
    20_kit wdTick watchdog: an enemy standing beyond a closed gate or outside the lane for 8 s (not a sleeper at his own post, not elevated, not a travelling scripted unit) is brought back behind the camera, awake. rein(): spawn points closer than 16 m are moved behind the camera / far up the road.
(2) engine ai(): an awake enemy on the far side of a closed gate neither fights nor shoots (boss and scripted units excepted). wave4 attack(): a target across a gate / up on a wall / behind a wall is never a melee target — the bow volley takes it (from 1.5 m); sleepers within 16 m or unreachable are volley targets too (the arrow wakes their post).
(3) Boss weak points: 🔺 near any boss with a weak-point script (2-4, 3-4, 4-4, 5-4, 6-4) — or three dodges/parries of his strikes — opens him for 6–7 s (his own onSlam / onChain / onLeap runs; else openT). Works for every hero. Not yet verified by a full fight (runs are limited to 110 s).
(4) Hints rewritten in 4 languages for ⚔ / ➤ / 🔺: w_qd, w_ja, w_ay, w_qu, w_qg, o_helm, o_totem, v3h_phal (wave4 TX overrides) and engine h_jump.
(5) "Duel: …" replaced by "✓ <mission>" when the boss falls; ?start= accepts 3-S / 5-S / 6-S; bosses attack 30 % more often, bosses without a weak-point script (Qashqir …) have x1.6 HP.
    NOT fixed: 1-2 late text staying, 1-2 shaman HP stuck (not investigated), level-up banner width, trainee standing in the dummy.
Coordinator UI notes done: host line only in the left chip (start hint shows the enemy estimate only), key legend 10 s on touch / always on desktop, key badges hidden on touch (pointer:coarse).
Models R2 (legacy GLB filter) + lazy load + R3 (catapult via __MXB) done earlier; R4: camps use tug / mantlet / tent / weaponRack / arrowBasket / campfire / watchtower / fordStones / fordStakes / reeds / boat through __MXB.put when the module is loaded (not yet looked at in a screenshot).

## Round 3 (code-only, ~21:50 UTC; no browser runs — QA had the machine). All js + m2/src pass node --check, missions.js rebuilt.
- Audio wiring (audio_log API, every call guarded): engine — Sfx.parry({x,z}) on a parry, Sfx.block('block',{x,z}) when a unit blocks, Sfx.arrowHit('body'|'wood',{x,z}) on projectile impacts, Sfx.swing(1,{x,z}) for the hero's swings,
  Sfx.hit('heavy',{x,z}) on the spin / heavy strike, Sfx.fall({x,z}) on a knockdown landing. wave4 — Sfx.bowDraw() in the volley, heavy hit + maid 'kill' bark on the finisher.
  missions — fail() -> Sfx.defeat(); 2-3 cart loop every 0.5 s while it rolls (off at the well and at the end); 4-2 boat deck Sfx.surface('wood') while she stands on it; Sfx.stinger('wave') on camp waves, siege waves 2-3, 0-1 waves, well attacks;
  leader death -> Sfx.bark('maid','kill'), 4.3 s later Sfx.bark('enemy','flee') if his men are still alive. Bridges: no surface call (not done).
- Minors: level-up banner #mt-lvup is now 5vw..95vw (max-width 90vw, overflow hidden).
  1-2 shaman: no invulnerability / shield / self-heal in his code path (shamanAI heals OTHER units 20 %, curses, summons 2 wolves twice; hp set 520 then ally balance) — the stuck HP is not explained by reading; needs a replay with a state dump.
  1-2 "Keshigip qaldıńız…": it is a hintRaw (auto-hides after 5 s) fired once when the fire clock reaches 0 — I found no code that keeps it; not changed.
  Tutorial trainee in the dummy: not changed (in the 4-step tutorial Gúlayım no longer walks to the dummies for the demo; the other npcs stand at z -26 / -31).
- Boot trim: R_yigit stays at boot because the tutorial spawns an npc of type 'son' (67_tutorial.js:297); the props not in the models agent's list (B_house 186 KB, B_tower 81 KB, W_axe 49 KB) are only 0.3 MB and are read synchronously by wall()/house()/decor(), so they stay too.
- /home/user/agents/w4/qq_strings.txt regenerated: 105 wave4.js strings + 240 i18n qq strings with prefixes f3_ / tu*_ / v3*_ / ar_ (346 lines).

## QA pass 2a fixes — 22:05 UTC (code + two 100 s load checks: 1-4 and 1-C1 start with 0 pageerror; nothing played to the end)
(1) engine keydown: KeyE / KeyU no longer call w3Strong — E is the amulet only (wave4), strong = hold ⚔ / J / left mouse.
(2) Stun-lock: engine — after a poise break the unit cannot be broken again for 14 s + the 2.4 s stagger (bosses, captains, duel foes; 5 s for others) -> stagger uptime <= ~15 %. wave4 — the 3-dodge stagger has a 12 s cooldown;
    captains (mission hunt targets) and duel champions become elite (they flinch only with broken poise), get a poise bar (22 % of HP, 160–900), HP x1.5 (captains) / x2.6 (champions), damage x1.15; heavy bosses: damage x1.3 (on top of cd x0.7, HP x1.6 without a weak-point script) and the under-upgrade penalty.
(3) Root cause of the watchdog firing in 3-4: my own gate rule made reinforcements spawned beyond a closed gate stand idle. Now an awake enemy beyond the gate WALKS IN through it (no attacks / shots across it). The watchdog relocates 17–23 m AHEAD of her (never beyond the gate; from behind only if the gate is closer than 15 m) and logs every firing: "[watchdog] #n <mission> <type> -> x,z hero z gate z".
(4) Camps: one body = 2 soldiers (was 3); three real waves — the posted camp, then after a 5 s pause the first half of the reserve in batches of <= 5, pause, the second half; later waves add unit types (shield, archer, swordsman, spearman by chapter + wave); captain with poise as above; HUD "⛺ Tolqın n/3 · Dushpan: n/N 🎯 Júzbası" (camp name dropped: it wrapped).
(5) the two front yurts of the yurt camp stand outside the lane (roof no longer over the play area); n_cleave / n_bash / n_cry / n_thrust / n_sweep / n_javelin added to i18n through wave4 TX (4 languages); duel() restores the mission objective when the duel ends.
    NOT done: 6-Q hero/spearman scale, empty / overlapping ally HP bars, 3-4 hint printed twice, 3-4 other enemies during the duel, shaman's summoned wolves next to him (by design of shamanAI).
(6) Wolves: entity height 1.5 for the quadruped (HP bar); new type `wolfman` (R_bori, lazy, loaded by w4Ensure) for the potion brute — transformEnt uses it when the model is loaded; boribasi and wolves stay the quadruped; Qasqır boss keeps his own model (R_qashqir).
    models_ext.js vary(): no wolf atlas swap when rig.proc === 'wolf' (one line, models agent idle).

## QA pass 2b — fixes and balance (sim bot = QA's /home/user/t/qa/bot2.js through /home/user/t/w4/wb.sh on lockB; logs /home/user/t/w4/{q,r,s,f}*.log)
1. 5-4 BLOCKER fixed: Qunqar had 20 541 HP (chapter curve x my x1.6) and the fight ran at 0.35x. Now: no blanket x1.6; per-boss table BOSSK [HP x, damage x]; the weak point opens on 🔺 / poise break for every hero; a retry gives the boss 4 % back (was 10 %).
2. 7-4 BLOCKER fixed: totems (and stone gates) break under plain ⚔ next to them (every hero, no power / cooldown) — sim: totem objective passed, Surtaysha beaten at the cap.
3. Stun-lock root cause: the PARRY, not the hits — every ➤ in a wind-up cancelled the boss's attack and staggered him 0.7 s (engine w3Parry) and the wave4 parry window was 70 % of the wind-up. Now: parry on a boss = 0.2 s recoil + 34 % poise
   (three parries / timed dodges break the bar -> 2.4 s stagger, weak point opens), no second break for 18 s; parry window vs bosses / captains = last 35 % of the wind-up. Measured stagger share: 12–18 %.
4. Balance: BOSSK = qashqir [5, .75], qumdev [2.8, .45], jallod [1.9, .45], aydarho [2, .45], qunqar [1, .5], qargashiq [1.9, .38]; Surtaysha (7-4) damage x.7; champions (duel) HP x5.5, captains x2.2, both with poise + elite hyper-armour;
   under-upgrade penalty: +35 % enemy damage per missing level (max x2.2), +7 % HP; the armour track now also protects the heroine (-2.5 % damage per level, max -40 %) and 🔺 heals her 12 %; camp soldiers HP x1.35, damage x1.2.
   Nudges: end-screen button pulses "⚒ Kúsheytiw múmkin!" when an upgrade is affordable; chapter card shows "● Usınıs etilgen kúsh: jetkilikli / shegarada / kúsheytiń!" (green / yellow / red, #w4power).
5. Body cap never hides a living enemy or anybody within 14 m (only far corpses and distant allies).
6. HUD (engine): enemy HP bars only for the locked target, bosses / captains / duel foes and damaged enemies within 8 m; ally bars only below 50 %; no world bar is drawn over the portrait, joystick, button cluster, ⚙ or the objective strip.
   NOT done (CSS / camera work): distance chip, combo counter vs ⚙, banner vs boss bar, #qqbark position, boss-fight camera offset, shore camera.
7. One upgrade list: hero armour / squad / horse rows moved from the Hero tab into the army tab (.w4train). Map node layout NOT changed.
8. Allies keep up: catch-up run starts at 9–12.5 m (was 18–25) and is faster than her own run. Sim "ally > 22 m" share: 2-4 1 %, 4-4 0 %, 5-4 1 % (1-1 still 74 % — there the "allies" are freed villagers walking home, not the host).
9. 2-3 objective shows "🛡 Qudıq qasındaǵı qorǵanıs — Tolqın n/2" during the well fight; the duel line is replaced after a duel. NOT done: army chip after a death in 5-C1, 6-Q stray text, 3-S alarm (archery.js, not mine), end screen at 1366x768, 4-2 objective (not re-run).

### Balance table (QA sim bot, 844x390, one 95 s run each; fight time = boss samples x 0.185 s; "min HP" = hero's lowest HP share)
| fight | upgrade level | result | fight time | deaths | min HP | boss stagger share |
|---|---|---|---|---|---|---|
| 1-4 Qasqır | 0 / cap 3 | won | 155 s | 1 | 1 % | 14 % |
| 1-4 Qasqır | 3 / 3 | won | 111 s | 0 | 75 % | 15 % |
| 2-4 Qum dáwi | 5 / 5 | won | 107 s | 0 | 66 % | 11 % |
| 3-4 Jallad | 0 / cap 7 | NOT won in 625 game-s | — | 4 | 3 % | 13 % (before the softer penalty: max x2.2 instead of x3 — not re-run) |
| 3-4 Jallad | 7 / 7 | won | 96 s | 0 | 78 % | 17 % |
| 4-4 Aydarha | 9 / 9 | won | 83 s | 0 | 57 % | 11 % |
| 5-4 Qunqar (Sárbinaz) | 11 / 11 | won | 97 s | 0 | 80 % | 10 % |
| 6-4 Qarǵashıq | 13 / 13 | won | 122 s | 0 | 73 % | 11 % |
| 7-4 Surtaysha | 15 / 15 | won (totems + chain QTE) | 91 s + QTE | 0 | 41 % | <1 % |
| 1-1 champion duel | 3 / 3 | won | 27 s (HP x4.4; now x5.5) | 0 | 82 % | 7 % |
| 2-2 Bayimbet duel | 5 / 5 | 6 s before the fix (he was excluded); with x5.5 — see f22c.log | | | | |
| camp 1-C1 | 3 / 3 | won | 2.0 min (before soldiers x1.35 HP / x1.2 dmg — see fc1c.log) | 0 | 68 % | |
At the cap the bot ends above the 30–70 % band in several fights (it dodges better than a player; 4-4 and 7-4 are inside the band). Not simulated: bosses at 60 % of the cap, camps other than 1-C1, 6-Q, 7-1, 5-C1, 4-2, 2-3 difficulty.

## STORY CORRECTION (author) — implemented, flow play-verified (st0.log: 0-0 finished -> flashback card -> 0-1 as Allayar, 0 pageerror)
- Tutorial 0-0 ending: no súren alarm, no smoke over Sarkop. After the duel a mounted messenger gallops into the training ground (existing rider + camera), dialogue w4_ms1 / w4_ms_gu1 / w4_ms2 / w4_ms3 / w4_ms_gu2; end banner "Shınıǵıw tamamlandı — Shabarmannıń gúrrińi" (the line "Endi Gúlayım bolıp oynaysız" removed from here).
- 0-1 opens with the flashback card "📜 Shabarmannıń gúrrińi / Tań sáhárde Sarkopta… / Allayar bay bolıp oynaysız", then lore0 + the old prologue (player = Allayar, portrait/name Allayar as before); 0-2 unchanged (scripted loss to Surtaysha).
  HUD chip in 0-1 / 0-2: "⚔ Sarkop batırları hám Allayardıń altı ulı" (never "40 qız").
- 1-1: "⚔ Endi Gúlayım bolıp oynaysız" is shown 1.5 s after chapter 1 starts.
- Not changed: videos / narration nar1–nar3 order (0-1 still plays v1 + nar1 after the card; 0-2 -> chapter 1 as before); the first attack hint in 0-1 still mentions the bow although Allayar has none.
New qq lines for the author:
  w4_ms1: Gúlayım! Men Sarkoptan shabarmanman… Qıran tawına toqtamay shawıp keldim. Tań sáhárde Surtaysha qırq mıń láshker menen Sarkopqa hújim etti!
  w4_ms_gu1: Ákem… Allayar bay qay jerde? Sóyle!
  w4_ms2: Allayar bay altı ulı menen dárwaza aldında turdı. Xalıq qalaǵa kirip alǵansha sheginbedi…
  w4_ms3: Keyin Surtayshanıń ózi shıqtı. Men kórgenimdi aytıp bereyin…
  w4_ms_gu2: Qızlar, atlarǵa minińler! Sarkopqa!
  w4_tale: Shabarmannıń gúrrińi · w4_flash: Tań sáhárde Sarkopta… · w4_play_al: Allayar bay bolıp oynaysız · w4_sarkop: Sarkop batırları hám Allayardıń altı ulı
  also new this round: w4_power "Usınıs etilgen kúsh: {s}" (jetkilikli / shegarada / kúsheytiń!) · w4_canup "Kúsheytiw múmkin!" · w4_e_hero "Gúlayımǵa zıyan −{n}%"

## Balance 2c — boss table at 0 % / ~60 % / 100 % of the cap (Nov 21, local in-browser QA bot tools/test/qa/bot_page.js, one run per cell, high variance esp. 4-4)
Changes: (1) story.js retry: the boss regains min(50 %, 4 % + 4.5 % x under-upgrade deficit) of max HP on a retry (deficit = wave4 defi(c): 0 at >= 85 % of the cap) -> at the cap unchanged (4 %), far under-upgraded the boss cannot be worn down by retries (author: under-upgraded should lose).
(2) BOSSK: qashqir [5, .95] (was .75), jallod [1.9, .55] (.45), aydarho [2.2, .5] ([2, .45]), qunqar [1.35, .7] ([1, .5]), qargashiq [2.3, .75] ([1.9, .38]); qumdev, Surtaysha unchanged.
| boss | level | before 2c | after 2c |
|---|---|---|---|
| 1-4 Qasqır | cap 3 | won 112 s, 0 deaths, min HP 66 % | won 104 s, 0 deaths, 53 % |
| 1-4 Qasqır | 0 | won after 1 death, 133 s | (not re-run; retry now gives 15 % back) |
| 2-4 Qum dáwi | cap 5 | won 106 s, 0, 37 % | unchanged |
| 2-4 Qum dáwi | 0 | won after 3 deaths, 225 s | (not re-run) |
| 3-4 Jallad | cap 7 | won 108 s, 0, 55 % | (dmg x1.22, not re-run) |
| 3-4 Jallad | 0 | won after 2 deaths, 233 s | (not re-run) |
| 4-4 Aydarha | cap 9 | won 64 s, 0, 72 % | [2.4,.5]: 153 s, 0, 26 % · [2.8,.55]: 150 s, 1 death · final [2.2,.5] not re-run |
| 5-4 Qunqar (Sárbinaz) | cap 11 | won 73 s, 0, 70 % | won 104 s, 0, 48 % |
| 5-4 Qunqar | 7 (64 %) | — | won after 3 deaths, 229 s |
| 5-4 Qunqar | 0 | won after 4 deaths, 320 s | LOST: 8 deaths in 708 game-s, boss stays 84-94 % |
| 6-4 Qarǵashıq | cap 13 | won 93 s, 0, 76 % | won 119 s, 0, 31 % |
| 7-4 Surtaysha | cap 15 | won (totems + QTE), 0, 58 % | unchanged |
| 7-4 Surtaysha | 0 | won after 2 deaths | (retry rule applies; not re-run) |
Stagger share in all fights 7-16 % (no stun-lock). The bot dodges better than a player; at the cap it now ends 26-53 % HP.
## Camp balance 2c (Nov 21; QA sim bot bot_page.js in the built-in browser, threaded local server; one run each)
Camp soldiers now get a per-chapter [HP x, damage x] from `W4CAMPK` in tools/m2src/66_w4camps.js (was a flat HP x1.35 / damage x1.2), on top of the chapter curve + under-upgrade penalty.
Fight time = game-s from "Tolqın 1/3" to "Dushman: 0/N" (end banners excluded; "end" = bot clock at the end screen). min HP = heroine's lowest HP share (the bot uses the 🔺 12 % heal often).
| camp | level / cap | camp K [HP, dmg] | result | fight time | deaths | min HP |
|---|---|---|---|---|---|---|
| 1-C1 (60) | 3 / 3 | old 1.35 / 1.2 | won | end 265 s | 0 | 75 % |
| 1-C1 | 0 / 3 | old 1.35 / 1.2 | won | end 344 s | 0 | 78 % (too easy at L0) |
| 1-C1 | 3 / 3 | 1.1 / 2.4 | won | end 227 s | 0 | 54 % |
| 1-C1 | 0 / 3 | 1.1 / 2.4 | won after 2 deaths | end 370 s | 2 | 2 % |
| 2-C1 (80) | 5 / 5 | 1.1 / 2.4 | won | ~166 s | 0 | 85 % |
| 2-C1 | 0 / 5 | 1.1 / 2.4 | won after 4 deaths | 284 s | 4 | 2 % |
| 2-C1 | 5 / 5 | 1.2 / 3.4 | won | 140 s | 0 | 66 % |
| 3-C1 (90) | 7 / 7 | 1.1 / 2.4 | won | 157 s | 0 | 82 % (still easy) |
| 5-C1 (110) | 11 / 11 | 1.1 / 2.4 | won | 262 s | 0 | 55 % |
| 7-C1 (140) | 15 / 15 | 1.1 / 2.4 | won | 157 s | 0 | 92 % |
| 7-C1 | 15 / 15 | 1.5 / 4.2 | won | 167 s | 0 | 73 % |
Committed table: 1 [1.1, 2.4] · 2 [1.2, 3.4] · 3–6 [1.1, 2.4] · 7 [1.5, 4.2] (the 7-1 foot battle uses ch7 too).
Left: 3-C1 needs more (try [1.25, 3.6]); 4-C1 / 6-C1 not measured; 7-C1 still slightly above 70 % (try [1.5, 5.5]); L0 measured only for ch1/ch2 (both struggle: 2–4 deaths).
Army chip: "Safımız: 40 qız + 0 batır" shows in camps (2-C1, 3-C1, 5-C1, 7-C1) once the warrior bodies on the field have fallen, with or without a heroine death (qq_w4.men unchanged). After a death + retry in 2-C1 no allies were present at all (only Gúlayım): the army is not respawned on retry.

## Release pass (Nov 21, main session) — verified with the QA bot at the cap unless noted
- 6-Q: wave-2 "immune wall archers" = volley restarted by fast taps before the first arrow; fixed (wave4 attack()); 6-Q 3 stars, 0 deaths without god mode.
- Played to the end screen: 6-2 ★★★, 6-3 ★, 7-1 ★★★, 7-2 ★★, 7-3 ★★★, 3-S ★★, 5-S ★★, 6-S ★★ (archery autoplayer tools/test/qa/arch_bot.js).
- Archery arrow budgets 3-S 18, 5-S 18, 6-S 22 (was 12/12/14: with the alarm the rushers + ropes left at most one miss).
- Objectives: reinforcements show w4_o_rein (previous objective restored), stealth alarm shows w4_o_alarm; o_gate without the old "(1 — …)" button.
- 4-2: volley line of sight ignores low stake rows (melee still blocked); 4-2 ★★★.
- 1-1: amulet button hidden until the mother gives the amulet.
- Tutorial player is the recruit Aysuliw (qiz model, green) — not Gúlayım; no change.
- Camps at the cap: 3-C1 [1.25,3.6] 9 % HP -> [1.2,3.0]; 4-C1 [1.1,2.4] 71 % -> [1.2,3.2]; 6-C1 [1.3,3.6] 76 % -> [1.4,6.0]; 7 -> [1.5,6.0]. Final values not re-measured.
