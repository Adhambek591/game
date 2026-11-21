# Play-test fixes (author's phone session, Nov 20) — engine.js, missions (m2/src → js/missions.js), story.js
Backups: /home/user/agents/pf/engine.orig.js, missions.orig.js, story.orig.js, src.orig/ ; patch scripts /home/user/agents/pf/p1..p9.py ; bot /home/user/t/pf/play.js (real input: key events + doAct, NO god mode), runner /home/user/t/pf/run.sh <port> "<missions>" TMAX
NOTE for other agents: at ~10:39 I ran `pkill -f "node runp.cjs"` once by mistake, which may have killed other agents' test browsers at that moment — sorry; afterwards I only killed my own PIDs.

## 1. Nobody freezes far away / objectives never wait on a stuck unit
- engine `straggle()` (replaces the old farT teleport): an AWAKE enemy that is >25 m away, >16 m behind the player, on the far side of a closed gate,
  or out of contact for 20 s (6 s when ≤3 enemies are awake; also pulled when ≤3 left and >16 m away) is brought in: `pullSpot()` puts it AHEAD of the
  player just past the top of the screen and short of the closed gate (behind her only if there is no room ahead), never across a ravine/barrier box,
  never inside a prop. A unit that keeps getting lost (>5 pulls) or can't be placed is killed (counted done). Off-navmesh x/NaN is repaired.
- awake enemies on the player's side of a closed gate can no longer walk through it (gates = G.limitZ, only the player was limited before).
- kit: posted (sleeping) groups wake when the player has walked past them (P.z < group zMin − 6) — the 1-1 "lone looter" left behind at z −12
  was the frozen warrior the arrow showed at 45 m; `clear()/dead()` record `G.mis.need`; `needTick` wakes any awaited sleeping group that is >22 m away
  (or ≤3 left) for 5 s.
- arrow: optional side markers (1-1 hidden children) and markers behind the player no longer drive it (the 66 m arrow at the start of 1-1);
  priority aim → nearest awake enemy → nearest reachable named captain → marker ahead.
## 2. Wolves
- loco anim for every non-player unit is now picked from the smoothed velocity VECTOR (min of |v| and frame speed): jitter/being shoved no longer reads as running.
- wolfAI chase: >7.5 m runs straight in (slight flank); close in it picks ONE stalking spot beside the prey, walks there, stands and watches, re-picks
  only when the prey moves 2.5 m or after 2–4 s (was an endless orbit at full run); without an attack token on the player it looks for other prey; dart-away after a pounce shortened.
  Bot measurement 1-1: 0 of 639 wolf samples played a run cycle while moving < 0.6 m/s.
## 4. Roles
- pickTarget: rank-and-file enemies skip the player while any fighting ally (maiden, Sarbinaz, townsman fighter — not captives) is within 20 m of them,
  unless she hit them in the last 5 s (provT) or there is nobody else; captives get +8 (raiders excepted). Named captains (`e.hunt`) and bosses prefer the player (−15).
- allies no longer attack sleeping camps on their own (they used to run past closed gates and wake camps ahead) and stay on the player's side of a closed gate.
- named captains: at mstart every posted group gets one hero target — its leader, else its elite (nayza/shaman/boribasi/elite), else (groups ≥3) the first askar/archer
  is promoted (HP ×2.2, size ×1.14, dmg ×1.3, plate "Júzbası" / "Sadaqshılar basshısı" — existing i18n keys, no new strings). Gold ground ring + name plate,
  HUD counter "🎯 k/n" under the rescue counter, off-screen edge chips "🎯 23 m", kill hint "🎯 k/n ✓"; clear()'s arrow prefers the nearest captain within 35 m.
## 3. Forward flow
- left-behind groups wake and are pulled AHEAD (see 1); freed captives now wait at the road side (x = ±(W−1.3..2.9)), never across the trail; 1-1 first roped line starts only when the
  player is 15 m away (it started during the mother's dialog, behind the gate). Mission layouts checked: rescue groups/doors/cages are already in route order in all v3 missions.
## A. Path never blocked by allies/civilians
- separation: player vs non-hostile is one-way (player weight 0, ally/civilian 1); bosses never shoved by the player (player gives way instead), bosses vs others 0.03.
## B. Bosses / fires
- heavy units (all bosses incl. Surtaysha): knockback zeroed every frame, soft re-centre when within 3 m of the side wall; nothing (player, units) can stand inside a ground fire (fires push out, radius 0.62·size + r).
## 5. End screen
- missions.js win(): "Keyingi tapsırma ▸" → next mission; chapter end (boss mission, or next mission is in another chapter, or last) → primary button "Karta ▸" opens the map, and the map opens by itself after 4.2 s; duplicate Map button hidden then. story.js chapterEnd() (legacy chapter flow) does the same.
## Later fixes in the same session
- rescues are part of the objective: `resFinish()` (wrapped around H.victory and at the start of win()) — when the fight is over but people are still locked in / held,
  all their clocks start, their guards/handlers become the awaited set (woken + pulled), the arrow points at the door / wounded / guards, and the victory banner waits.
  (6-1 used to end with 0/12 rescued and still gave 3 stars.) Stars now count people actually freed (S.saved), the saved-marking runs before the stars are counted.
- arrow: active rescue groups with a running clock (door to break, wounded to reach) come before ordinary enemies unless an enemy is within 6 m (`resAim`); hunt fallback only ≤34 m, never in the convoy; hunt edge chips only ≤28 m and on the player's side of the gate.
- enemies never target people locked in a burning house / cage, nor freed/safe people (wolves were mauling the freed villagers at the roadside).
- 2-3 blockade: the arrow points at the barricade from whichever side the player is on (after a wolf-leap over the stakes it used to send her back over them).
- bosses: soft re-centre to within 9 m of where they started (Surtaysha drifted 20 m back during the prologue fight); fires: min distance boss→fire edge in 0-2 = 1.6 m.
- BUG I introduced and fixed: an inline `//` comment swallowed the player's gate limit (collide) for a while — tests before ~11:15 had the player walking through gates.

## Test results (bot = real input, no god mode; LOWQ, 844x390, port 8861, snapshot /home/user/t/pfsnap)
- 1-1: end screen 3★ 6/6 rescued, hunt 2/2, 0 deaths; arrow >25 m in 1.6% of samples (7/428, max 37 m, was 66 m at start from the hidden-children markers), 25 pulls / 1 counted done; button "Keyingi tapsırma ▸" (→1-2). Latest run (all fixes) arrow >25 m 1/135 samples (run cut at TMAX by slow sandbox).
- 1-2: 3★ 5/5, button → 1-3.  2-3 (convoy): 3★, hunt 2/2, 37 pulls / 2 done, button → 2-4.  6-1: 12/12 rescued after resFinish (before: 0/12), button → 6-2.
- wolves: 0 run-in-place samples in every run (≈4000 wolf samples total).
- 0-2 (prologue duel): Surtaysha |x| ≤ 2.2, never closer than 1.6 m to a fire; after 0-2 (chapter end) the map opened by itself.
- 0 [pageerror] in all runs. Screenshots: /home/user/t/pf_1-1_25/35/50.jpg, pf_6-1_25.jpg, pf_6-1_70.jpg (end screen).
## Follow-up (coordinator): start banner + balance
- story.js bannerShow: while the mission-start banner is showing (G.mis not started yet) the world is frozen (G.freeze) — the player can't run past the first gate or wake a camp early; released when the banner ends. Verified: in 1-1 no group woke before the first objective (before: the bot was at z −35 beyond the gate spot and the first camp woke during the banner).
- kit: a sleeping group beyond a CLOSED gate no longer wakes by proximity (1-1: the horde behind gate −60 used to wake while the guards fight was on and got pulled over the gate). needTick waits 12 s (5 s when ≤3 left) before waking a far awaited group, so the player gets to approach it first.
- balance (`balanceGroups()` at mstart): with N fighting allies every posted group gets HP ×(1+0.22N, max 2.2) and +1 soldier (2–3 allies) / +2 (4+ allies, an archer if the group has archers); allies deal 50% damage to enemies (G.allyK), 25% to named captains; allies avoid the captains (+20 target score) — the captain is the hero's fight; leaders/elite captains HP ×1.3 (promoted ones ×2.2 as before).
  (A first version put the captain-avoid line before `let s` in pickTarget → ReferenceError every frame; caught by the test, fixed. Numbers from that run were discarded.)
- FINAL VERIFICATION 1-1 (all fixes, bot with real input, port 8863, 0 [pageerror]): played to the end screen — 3★, 🧍 6/6, 🎯 2/2, 0 deaths, total 161 s game time.
  Phases: camp + reinforcement wave 51 s (t 49.5→100.2), horde 38 s (101.4→139.5), júzbası duel ~20 s. No group woke during the start banner (first camp woke at t 53.6 after the objective);
  the horde behind gate −60 woke only after the gate opened (P.z −61). Arrow >25 m in 3/119 samples (max 35 m, only at objective start). Button "Keyingi tapsırma ▸".
  Still a bit under the 60–90 s/camp target — next knob if wanted: hpK cap 2.2→2.6 or G.allyK .5→.4 (20_kit.js balanceGroups).
- Note: twice my test server port was killed by someone's `pkill http.server` (runs died with ERR_CONNECTION_REFUSED → fallback-rig pageerror in rig.js, not a code bug); final run on port 8863.

