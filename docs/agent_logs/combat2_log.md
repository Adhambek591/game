# Combat2 log
Backup of engine.js before my edits: /home/user/agents/c2/engine.orig.js; patch scripts /home/user/agents/c2/p*.py, code blocks ai_block.js dmg_block.js help_block.js

## What changed (engine.js only; horse.js / skinrig.js untouched)
1. Allies decoupled from the player. Old follow code (formation column/row offsets from P, speed tied to P.mounted) deleted. New `drift()`: each ally has her own loose spot near the player, notices the player moved only after her own 0.5-3 s delay, picks a random offset, WALKS (2.3 m/s x personal pace), sprints only when left 18-25 m behind (personal threshold), stops sprinting at ~9 m. `idleAct()`: stand / look around / guard stance / face a neighbour / watch the player / short stroll / cheer, random 2-6 s.
2. Targeting: `pickTarget()` + `countTargets()`: every unit keeps its own target, max 2 allies per ordinary enemy (3 elite, 5 boss), sticky, re-evaluated every 0.7-1.6 s. Enemies also spread (crowd penalty) instead of all going for the player. Surplus allies stay in reserve.
3. Melee brain `meleeAI`: approach at own pace (run far, walk into contact), slot ring, wind-up -> strike -> optional 2nd hit of a string -> recover -> random sidestep / backstep / guard / press on. Per-unit `pers()` (pace, tempo, side, guard, nerve). Individual retreat only for askar/archer under 30% HP with 22% nerve roll, 2.5-4.5 s, then returns. No group flee.
4. Attack tokens `tokOK()`: 2/3/4 (easy/normal/hard) enemies may attack the player at once; others feint or circle.
5. Cavalry `cavAI` + `steer()`: limited turn rate (v/4.2 rad/s, 0.8..2.4), own acceleration; charge to a pass point beside the target, strike in passing, ride out 5-10 m, wheel in an arc, charge again. Horse archers orbit and shoot. Horses rear when hit (55%, player's horse 30%).
6. Unit table: askar 95 HP, 2-hit string, 22% frontal block; archer 3-arrow volley with red aim line, repositions sideways after each volley, runs from melee; nayza (NEW spearman, askar model + spear, x1.17): 300 HP, frontal armour x0.4, 1.15 s telegraphed lane thrust with lunge, 1 s recovery window, poise 130; mage/shaman: elite plate + purple aura, heals 20% + buffs nearby allies, ground curse zone (telegraph 1.1 s, 4.5 s), summons 2 wolves (max twice), poise 90; wolf 100 HP flanker: circles to the side, crouch telegraph, 17 m/s pounce, darts away; boribasi (NEW wolf chieftain, wolf model x1.55, red glow + aura + name plate): 950 HP, howl (+30% dmg/speed to wolves 8 s), telegraphed leap slam r3.4, poise 200; potion wolf gets a green aura + name plate.
   Auto variety in `spawn()`: every 4th askar of a level -> nayza, 5th wolf (then every 9th) -> boribasi. Opt out: `G.noVar = true`, or pass 5th arg `raw`.
7. Wolf spirit skill (button 5): spectral wolf runs ahead, 12 m dash that damages (x2 crit) and knocks down everything on the line, landing blast, still clears ravines; then 6 s buff (+30% move, +25% damage, faster light attacks), button glows while active; cooldown 7 s on the button.
8. Genre layer: red wedge telegraph that follows the attacker; perfect dodge (dodge within 0.3 s of a hit landing) -> slow-mo + counter window 1.8 s (next attack teleports in, x2.6 crit, breaks guard); poise on elites and bosses (yellow bar; break = 2.4-3 s stun, x1.5 damage); heavy attack by holding Attack (cleave knockdown / sweep / launcher depending on light hits before it); knockdown, launch + juggle cap 3, 4-5 s knockdown immunity; directional hit lean; soft lock toward stick direction + lock ring + longer lunge; input buffer 380 ms and dodge-cancel; camera zoom kick on finishers / break / boss intro; shake scaled by damage; weapon-coloured sparks; low-HP red vignette; off-screen attacker arrows; generic boss phases at 66% / 33% (roar + shockwave, then pursuing quake / fissure line of quakes).

## Session 3 (resume, 05:12-06:10) - engine.js only; backup /home/user/agents/c3/engine.before_c3.js, patches c3/p1..p6.py
State found: previous agents' work (above) present and parsing; game runs (m1-1), no [pageerror] in any of my runs.
Verified with screenshots (/home/user/t): y2_0..2 foot clash (10 mixed enemies vs 5 maidens, player standing back):
  maidens pick own targets at staggered times (2 charge at t=1, the others 0.5-1.5 s later), enemies spread across a ~12 m front, fight breaks into 2-on-1 duels
  (nayza vs 2 maidens, wolf vs 2), curse zone + heal ring visible; elite name plates (y4_1: 'Qasqırlar basshısı', 'Baqsı').
  y3_0/y3_1 mounted clash (player + 5 mounted maidens vs 7 riders): first contact is a dense knot, then riders pass through, ride out and wheel; horses rear, killed horses fall, riders continue on foot.
  y4_0/1 player fight vs nayza/askar/archer/wolf/boribasi/shaman/potion soldier: telegraph wedges, boribasi slam ring, poise break.
Fixes this session:
  1. cavAI: the 'wheel' phase was skipped (out->wheel->charge in the same frame because df was measured on the old 'out' waypoint). Now wheel lasts >=0.25 s and until facing the target (wheel samples 0 -> ~20% of mounted time).
  2. Archers back off / run from ANY hostile melee unit within 3.6 m (before: only from their own target, so they stood shooting inside the melee).
  3. Horse rearing on hit: 50% (player 30%) with a 1.5-3 s per-rider cooldown (was 55% every hit -> riders stuttered constantly; 13 rears in 6 s).
  4. Name plate / HP bar follows e.y (pounce, leap slam, juggle).
  5. Flinch resistance: an enemy hit by 3 light hits within 2.2 s (easy 5 / hard 2) ignores flinch from light hits for 1.2 s (easy .7 / hard 1.6); heavy/crit/knockdown/launch still flinch. Ends button-mash stun-lock.
  6. Late wind-up hyper-armour: a hit interrupts the first half of a wind-up 70%, the second half only 30% on normal (60% easy, 15% hard).
Difficulty measurements (y6/y7/y8, normal, 11 enemies incl. nayza, boribasi, shaman, 2 archers, wolf):
  player idle: ~30-35 HP/s lost (500 HP -> dead in ~15 s); 2 archers + boribasi + askar alone ~25 HP/s.
  player mashing attack (bot, 0 dodges) BEFORE fixes 5/6: 55 HP lost in 11 s while killing most of the group -> too easy. (after: see below)
  7. Attack tokens: an elite (nayza, boribasi, shaman...) may take a token even when the 3 ordinary tokens are used, as long as no other elite holds one (elites were left circling behind the askars).
  After fixes 5-7 (y9, same group, mashing bot, 0 dodges): 102 HP lost in 14.5 s (88 in 8.7 s), about double the earlier figure; nayza 36 and wolves 30 now land. y9_1/y9_3: player surrounded, red wedges from several attackers, nayza plate, potion-wolf plate, wolf pounce lane.
No [pageerror] in y2/y3/y4/y6-y9 (one y9 attempt hit a SyntaxError in js/fx.js that the graphics agent was editing at the time; it parsed again 3 min later and the rerun was clean).
Note: someone else changed js/horse.js (smoothN normals + chestnut coat colour). I left it alone; it parses.
Honest weaknesses left:
  - Boribasi hardly ever hurts a player who keeps attacking: its leap slam aims at where the player was, and constant lunges move the player away. Its bites are the threat, not the leap.
  - Archers' 3-arrow volley aims at the current position with no lead; a player who keeps moving takes almost no arrow damage.
  - The first contact in a mounted clash is a dense knot of horses (y3_0) before riders spread into passes and wheels.
  - The foot "front" comes from targeting and slots, not from formation logic; with a small group it reads as several duels more than a battle line.
  - The difficulty numbers come from a bot that never dodges; I did no manual play-feel test. Mission balance (owned by the missions agent) was not retuned.

## Session 3b (coordinator follow-up) - engine.js; backup c3/engine.before_c3b.js, patches c3/p8..p11.py
- Velocity tracking for every unit (e.vx/e.vz, smoothed) + lead(o, t, k) helper.
- Wolf chieftain: leap landing spot = player's predicted position at landing (0.85 lead, max 14 m); the red landing ring tracks it until take-off, then locks.
  On landing: if the player is within 4.6 m -> fast follow-up swipe (0.42 s wind-up, red wedge); otherwise a 1.4 s roar = punish window (player hits x1.35 damage, x2 poise).
  y14: player strafing right from x 6.2; chieftain landed at x 10.1 (wall clamp), 1.5 m from the player, and went straight into the swipe (y14_0 marker ahead of the player, y14_1 swipe).
- Player lunge into an unbroken elite/boss capped at 1.3 m (was 3.4 m).
- Archers lead the target (travel time, 0.6-0.95 lead, ±0.25 m jitter; 3-arrow volley spread 1.25 m across the predicted path); shaman orbs lead 0.5.
- Battle lines (frontTick/frontHold): when maidens (d.follow) and enemy melee are 8-34 m apart, both sides get a shared line (gap 2.7 m each side of the midpoint, 5.5 m when mounted),
  units are spaced along it (1.7 m foot / 2.7 m mounted, keeping left-right order), walk / canter to it, hold 0.6-1.3 s, then charge in waves (random release 0-1.7 s).
  A unit is released early if a hostile is within 2.6 m (4 m mounted). Wolves, chieftain, ranged, bosses, potion soldiers, NPCs/captives are not part of it. G.noFront = true disables it.
  y10_0 (foot): two lines forming; y10_1: lines meeting. y13_0/1 (mounted): maidens in one rider line; y13_2: two rider lines facing; y13_3: clash in two separate fights, no single knot.
- Difficulty (normal): engagement delay 0.5-2.2 s when an enemy first switches onto the player; ranged tokens (1/2/3 shooters aim at the player at once);
  melee tokens 1/2/3 (+1 elite); player takes x0.65 damage from enemies on normal (easy .42, hard 1.15); counter-hit x1.1 (normal) / x1.3 (hard) when hit mid-attack.
  Bot vs 11 enemies (all NPCs removed so every enemy targets the player; earlier measurements were skewed by enemies attacking captives):
    before these changes, mashing: 419 HP in 11.8 s. After (x0.72 build): 269 HP in 16 s (first hit ~4 s); x0.65 final build should land ~240 / 16 s.
    Dodging bot (dodges melee/wolf/leap/ranged wind-ups, attacks less): 43 HP in 12.5 s.
No [pageerror] in y10-y14; all js files parse.
Weaknesses: battle lines are tight in the 23 m corridor (two rows rather than one long line with 10+ maidens); the ally line is visible, the enemy line is looser.
The player x0.65 damage factor also affects mission balance (others own missions). The final x0.65 value was not re-measured separately.
