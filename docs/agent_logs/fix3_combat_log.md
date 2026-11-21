# fix3 combat/AI log (author's phone play-test list, items 1-10) — engine.js, story.js (+ audio.js sword sfx)
Backups: /home/user/agents/f3/engine.orig.js, story.orig.js, audio.orig.js (HEAD bd5cd7b state at my start). Patches: /home/user/agents/f3/p1.py..p4.py (python str.replace with asserts).
Test bot + runner: /home/user/t/fix3c/play.js, /home/user/t/fix3c/run.sh <port> "<missions>" TMAX (real input, no god mode, LOWQ, 844x390). Port 8911/8912.
NOTE: another agent also uses /home/user/t/f3 — my files live in /home/user/t/fix3c (I briefly put files in t/f3 by mistake; moved).

## Baseline (deployed build) measured before my changes
- 0-2 prologue duel (b2_0-2): Surtaysha starts at z -100, ends at (4.3,-111.8) = pushed 12 m back toward the back houses/fire, x up to 5.5.
  Cause: heavy units' slotGoal kept the boss exactly at reach distance from the target, so every lunge of the hero (3.4 m) made him walk BACKWARD; the 9 m soft re-centre was the only limit.
- player displacement per single action: attack 3.7-6.2 m (lunge 3.4 + counter teleport 7), dodge 5.5-7 m.
- allies engaged with enemies >12.5 m from the hero: 10-50% of samples (farEng/engS).

## Changes (engine.js unless noted)
1. Target assist / lunges: aim() rewritten — melee soft lock max 6 m, only enemies inside the stick cone (cos>.5) or, without stick, the facing cone (cos>.3); an enemy within 1.4 m always counts;
   enemies a maiden is fighting (ally.tg === e within 3.5 m) are skipped unless next to her / hard-locked. Ranged skills (javelin, chain, b2 cast) keep their range (rng flag).
   Lunge per attack max 2 m (1.3 into an unbroken elite/boss), the counter "teleport" lunge (was 7 m) now also 2 m; dash skill 4.8 -> 2.2 m; Sarbinaz thrust 6.7 -> 2.2 m; jump-plunge homing max 2 m. Nothing moves her on its own.
2. Allies: pickTarget — allies only take enemies within 10 m of the hero (12.5 m hysteresis for the current target), so they drop a fight that drifts away and come back;
   drift() spots are now BEHIND her (oz +1.8..+6.5, x ±5.5) — she leads, they follow after their own delay; the battle-line system no longer moves maidens to a midpoint ahead (only the enemy side forms a line, anchored on the hero).
3. Sound (audio.js — no other owner): swing -11 dB, hit noise -11 dB, thump -9 dB, metallic ring -13 dB, big -3 dB; random pitch ±14%; max 2 swings/90 ms, 2 hits/100 ms, 2 bigs/150 ms.
   engine sv(a,b): other units' fights (strike, wolf pounce, cavalry) play at 0.55 max and fade with distance (1.2/(1+0.3 d)); the hero's own hits stay at full (new, lower) level.
4. HP bars: ROOT CAUSE of "what colour is inside the red": the fill was opaque and the background semi-transparent, so three.js drew the black background AFTER the fill (transparent pass) and darkened it.
   Now every layer is transparent with its own renderOrder, toneMapped:false: black frame, dark grey track, white damage-lag segment (decays after 0.2 s), bright fill — enemies red 0xff2a1e, allies green 0x35e05c (shown while hurt in the last 6 s or under 50 %),
   elites/captains/bosses plate: gold frame + same fill + separate poise strip below. Bar 1.5 x 0.17 (was 1.24 x 0.1). Damage numbers: own hits 24 px (crit 34), other units' fights 15 px / 72 % opacity (class "o").
5. Spawns/stragglers: spawn() no longer scales enemies up from nothing with a dark puff. arrive(): an awake reinforcement spawned inside the camera view is moved to an off-screen spot on the road (ahead past the top of the screen, short of a closed gate; else behind her) and runs in, with a horn (one per wave; missions' rein() horns count);
   in a closed arena with no off-screen spot they come in at the closed gate ahead. straggle(): no teleport any more — a far/out-of-contact enemy is sent to walk to the hero (provT, tg = hero); only a unit stuck for 16 s (6 s behind a closed gate) is moved, and only when both its spot and the new spot are off-screen.
6. Civilians: civAvoid() for freed captives (vict, not 'held') and npc civilians (asir/mother/child/elder): they run away from any awake enemy within 8 m (and from the hero's feet within 2.6 m, 8 m while she fights), biased to the road side.
7. Decks: deckY(x,z) — flat box meshes in the world (e.g. 1-3 plank deck, top 0.225) are auto-detected as walk surfaces; on the ch3 river bridge (lane over the river channel) units stand at 0.07. Applied to every unit's model height.
8. Wolf spirit (b5): in a fight = short strike (<= 4 m to the target, 2.5 m without one, low hop) + the old landing knockdown ring + 6 s buff; the 12 m leap only when a ravine is ahead (G.ravineAhead or a ravine collider within 9 m). Sand giant onLeap opening still works (landing near him).
9. Duels: duelTick() — a heavy boss/monster (any d.heavy, plus the wolf chieftain) that is G.boss, targets the hero or is within 9 m starts a duel when within 16 m (ends at 30 m / death);
   watchAI(): all other awake allies AND enemy soldiers walk out to a ring ~10-11 m around the duel and watch (face it, idle/cheer), no attacks; the boss only targets the hero; straggle pulls stop; kit summons (wolves/summon) and story bossBrain 'summon' are skipped during a duel.
   After the boss dies the watchers resume the general battle. (The missions agent also has its own soloTick in 69_fix3.js for boss missions; both coexist — theirs turns enemy soldiers into leaving npcs.)
10. Surtaysha push: ROOT CAUSE slotGoal() for heavy units returned a point at reach distance from the target ON THE BOSS'S SIDE, so whenever the hero lunged inside his reach he walked backward — every combo pushed him toward the wall (9 m soft re-centre was the only limit).
    Now a heavy unit inside reach stands still; Surtaysha's home radius 3 m (others 9). story.js prolog: the QTE clinch is placed mid-arena (player clamped to x ±2.5, z -100.5..-97 before the boss is put in front of him). (missions.js 0-2 has the same "su.x = p.x; su.z = p.z - 3.4" line — with the boss no longer pushed it now happens mid-arena too.)

## Verification (bot = real key input + doAct, NO god mode, LOWQ, 844x390; logs + shots in /home/user/t/fix3c; 0 [pageerror] in all 6 runs)
The sandbox was extremely slow (5-10 game s per real minute, two short outages), so missions were played to the relevant part, not always to the end screen.
- 10 Surtaysha (b0-2 vs baseline b2_0-2): boss z -103..-99.8, x -1.2..0 over the whole 20 s duel (baseline: pushed to (4.3,-111.8)). b0-2_47 (Allayar vs Surtaysha mid-arena, nobody else near), b0-2_53 (QTE clinch mid-arena).
- 9 duels: b0-2_47 (sons/soldiers on the ring, not in the fight; duelNear 22/732 samples = only the walk-out moment), c2-4_30 / c2-4_55 (sand giant, Gulayim alone, no adds, giant at 20 %).
- 1 target assist: per-action displacement (d1-1/b1-1): attack <= 3.2-4 m incl. stick movement and enemy knockback (lunge itself <= 2 m), wolf strike 4.15 m, dash 2.5 m (baseline attack up to 6.2 m). Dodge/roll 5.5-6.4 m is player-chosen (unchanged).
- 2 allies: maidens engaged with an enemy > 12.5 m from the hero: 0.6-2 % of samples (baseline 10-50 %); maidens ahead of her with no enemy within 12 m: 0.16-0.9 %. Shots b3-3_30 (maidens behind her), b1-1_60/75, d1-1_52/56.
- 4 bars: b1-1_45/60/75, d1-1_56, b3-3_52: enemy red + white lag, allies green, elites gold frame + poise strip; a0-2_44/48/52 show the old black-covers-fill bug before p5.
- 5 spawns: d1-1: the 6-unit reinforcement wave of 1-1 (rein at z -48..-57, hero at -41.6, all in view) was relocated by arrive() (G.arrived = 6) and walked in (the bot's VISSPAWN lines are logged before the first update moves them). 0 teleports (G.pulls 0) in all runs.
- 6 civilians: share of samples where a freed captive / civilian is within 8 m of an awake enemy: 2.2-2.5 %, min 1.3-1.9 m (enemies that chase them).
- 7 bridge: b3-3_14, b3-3_52 + crop52.png: Gulayim and maidens fighting on the plank bridge, boots on the deck.
## Not done / for others
- missions.js 0-2 still has "su.x = p.x; su.z = p.z - 3.4" for the QTE (missions agent's file); with the push fixed it is mid-arena anyway. The story.js prolog copy is clamped.
- The missions agent's 69_fix3.js soloTick removes enemy soldiers in boss missions (they run to the lane edge and vanish with a puff) — overlaps my watcher ring; consider letting them watch instead.
- Mission arrow (not mine) was > 25 m in 60 % of samples in the last 1-1 run (was 14 % in b1-1) — stragglers now walk in instead of teleporting; worth a look by the missions/arrow owner.
- Telegraph rings / hero ring are drawn at y 0.07 — on the 1-3 deck (top 0.225) they may hide under the planks.

## Follow-up (coordinator): no adds in main-monster fights (story.js)
- qashqirAI phase 2 (HP < 50 %): the 4 wolves it summoned are removed (howl / speed / damage buff / colour change kept).
- dragonAI dive: the 3 wolves spawned when it submerges are removed (dive itself kept). Backup before: /home/user/agents/f3/story.before_adds.js. story.js parses.
- (bossBrain 'summon' was already skipped during a duel; engine kit summons too.)
- Verify 1-4 (fix3c/e1-4.log, bot real input, no god mode): pre-boss wolves/askars fought by the mission first (t 18-43); boss phase "Qasqır penen jekpe-jek" t 43-82: enemy count stayed 1 (only Qashqir) the whole time,
  through phase 2 down to 1.2 % HP and the kill; 0 adds (BOSSADD counter 0), allies stayed out (duelNear 1/111 samples); then ravine leap with b5 (12 m) worked and the map opened. 0 [pageerror].
