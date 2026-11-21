# anim / combat-feel log (anim agent)
Backups before my edits: /home/user/agents/anim/bak/{skinrig,glbrig,horse,engine}.js. Patch script: /home/user/agents/anim/p_skin.py. Tools: /home/user/t/anim (run.cjs = manual rAF stepping, lib.js, mont.sh; fk/ = offline FK stick-figure + numeric clip analysis, no browser).
## Patch locations
- js/skinrig.js: SEG table + constants after MAP; ctor (layer state before first play); play() replaced (+ _act/_fade/_shot/_warp/setBow/motion/recoil/_add/_aim/_loco/_layer); update() head; last line = lazy import of feel.js.
- js/feel.js: NEW (wraps Ent.prototype.damage / die, own rAF pass). engine.js / index.html NOT edited.
## Audit (before my changes; all real models share ONE 16-clip mocap library assets/models/anims.json via SkinRig; GlbRig/Rig are only the ?oldrig fallback)
Clips: idle 4.0 s, combat 1.7, walk 4.2 (3 cycles), run 0.5 (1 cycle), slash 3.2 (2 swings at .78/1.38 s, then 1.6 s of standing), attack 2.8 (overhead chop, contact 1.15), judg 4.4 (jump chop 1.07),
spin 5.7 (jump spin, strike 1.67, then 3 s frozen crouch), heavy 1.9 (contact 1.6), slam 3.0 (contact 1.8), hit 1.7 (weak sway), dead 3.0 (stands 1.3 s, kneels, falls 2.1), roll 1.9, cast 2.7, taunt 4.8, triple 4.4 (unused).
| unit | idle | walk/run | attack chain | strong/spin | bow | dodge/roll | parry | hit | knockdown/get-up | death | victory | ride |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Gulayim | ok (mocap) but head never tracks | SKATING: engine assumed walk 1.45 / run 5.6 m/s, clips really do 1.02 / 4.25 (at her size) -> feet 24-42 % too slow; backward walk = forward clip (moonwalk); strafe slides | ROBOTIC: whole 3-4 s clip squeezed into .5 s (6x speed) and cut at 70 %; no anticipation; contact not on the hit frame; .08 s pop in | spin: .2 s blur then frozen crouch | MISSING: 'cast' crouch clip, saber stays in hand, no bow | sidestep = walk clip at 2.6x; roll ok but 1/3 is a slow crouch | procedural arm pose (engine) | weak sway, same from every direction | falls like a death (1.4 s) then POPS upright in .2 s | stands ~.6 s before falling | taunt: almost no motion | legs posed, upper body idle |
| maidens / warriors (qiz, son, w4bat, otbasqan, sarbinaz) | same clip, random phase/speed (ok), frozen gaze | same skating | same 2 clips (slash/attack) compressed | - | w4arc: same cast crouch | - | block = engine state, no pose | same | same | same | watchers: idle + rare taunt | same |
| soldiers (askar, nayza, qilich, qalqan, captains) | identical to allies | same skating; circling sideways slides | wind-up = clip played slowly from frame 0: no held pose, telegraph only readable from the ground wedge | - | archer: cast crouch, bow never drawn | - | - | same | same | same | - | cav: same |
| shaman/mage | same | same | cast clip whole | - | - | - | - | same | same | same | - | - |
| wolves (R_bori = biped wolf-man on the same humanoid rig) | same human idle | human run | human slash | - | - | - | - | same | same | same | - | - |
| bosses qashqir/surtaysha/jallod/qumdev/qunqar/qargashiq | same clips scaled up | same skating (worse: big bodies) | E_Attack/E_Slam whole clip, slam contact 8 % early | - | - | - | - | none (heavy = no flinch) | - | same | - | - |
| aydarho (dragon) | STATIC mesh, no skeleton, no animation at all (engine moves the body only) | | | | | | | | | | | |
| civilians (ona, child, elder, asir) | idle clip; sitting = standing idle (no sit clip) | same skating | - | - | - | - | - | - | - | - | - | - |
| horses (horse.js, procedural, not my file) | idle life ok | speed-driven walk/trot/canter/gallop with per-horse phase/tempo: OK, no change made | | | | | | rear on hit ok | | corpse ok | | |
Hit-stop only paused the game logic: all bodies kept animating through it.
## What changed
### js/skinrig.js
1. SEG table: every one-shot action plays a WINDOW of its mocap clip through a time-warp: start -> anticipation peak -> contact -> recovery. Contact lands on the engine's hit moment
   (hero combo .14/.14/.19/.27 s; enemy wind-ups: 42 % of the passed dur; slam 55 %; hero heavy 52 %). Wind-ups >= .35 s are "raise fast (30 %) - hold the raised pose (46 %) - whip down (24 %)" = readable telegraph pose.
   Hero combo: 1 = slash swing A, 2 = slash swing B (continues from 1), 3 = overhead lunge chop ('attack'), 4 = jump-spin finisher ('spin' .75-1.9 s only, no frozen crouch). Heavy cleave = 'heavy' .75-1.87.
2. Cross-fades: into an attack .07 (.09 from another attack), hit react .05, attack -> locomotion .16, -> idle .24-.28, walk <-> run .22 with phase carried over; a re-triggered clip uses a 2nd action so it blends instead of popping.
3. Locomotion: walk/run clip and its speed are chosen from the measured ground speed (clip speeds measured from the foot tracks: walk .86, run 3.6 m/s for a 1.75 m body), stride lengthened up to 30 %
   (thigh swing amplified) before the cadence rises; backward movement plays the walk reversed; sideways movement turns the hips into the direction of travel and counter-turns the chest (strafe / circling without sliding).
4. Additive layer after the mixer (base pose restored each frame, so nothing accumulates): breathing, slow idle weight shift (per-unit phase), head/neck/chest look-at (lookY/lookP set by feel.js),
   torso recoil spring (rig.recoil), lean into acceleration + bank into turns (body tilt, visual only), bow draw/release arm overlay (archers + the hero, who now shows a bow instead of the saber while shooting),
   cheer overlay (weapon arm raised and pumping).
5. Death = clip from 1.3 s (kneel, fall, lie) in 1.0 s; knockdown = quick fall, then a get-up (clip reversed, .5 s) before the next action; death while already down stays down.
6. Hit-stop now freezes the bodies as well (dt x .05 while G.hitStop > 0).
### js/feel.js (new, loaded lazily from skinrig.js)
- Ent.damage wrapper: directional torso recoil scaled by the blow; hit-stop when the hero is hit (45 ms light / 80 ms heavy; the engine's own 70/130 ms on her hits kept); FOV punch (push-in up to 3.3 deg, eases back);
  extra sparks at the contact side on heavy hits; dust on knockdown/launch; in a duel the watching ring cheers (30 %) when the boss is hurt badly and winces when the hero is.
- Ent.die wrapper: marks the rig dead (death vs knockdown), bigger FOV punch + zoom kick on elite/boss kills (the engine's last-kill / boss slow-motion kept).
- Per-frame: look-at targets (own target; watchers look at the boss or the hero; allies and civilians glance at the hero within 7 m; the hero looks at her lock / nearest enemy within 9 m);
  blade trails (additive ribbon from the real weapon, Catmull-Rom smoothed, <= 6 at once, only the hero and units within 15 m).
### Benchmark §3 items (coordinator, 20:30)
- Single hit-stop / shake table = `FEEL` exported from js/feel.js (also G.feel.table): light .05 s/.15, 3rd combo hit .08/.3, heavy-spin-finisher hit .11/.45, kill .09/.25, parry .07/.2 (engine's own parry stop .06-.12 is left as is),
  hero hit .05/.2, heavy hit on hero .08/.35, boss hit on hero .12/.6, execution .18/.8. Stacking is max(), never a sum. Shake = trauma^2 x 0.35 m, decay 2.2/s; feel.js writes G.shake every frame from the trauma value,
  so any `G.shake = Math.max(G.shake, x)` elsewhere in the engine is folded in by max (no need to remove those lines). The damage wrapper discards the hit-stop/shake the engine set inside damage() for hero-involved hits and applies the table instead. Hit-stop is capped at .2 s.
  MECHANICS AGENT: do not add another table; to trigger an impact from your code use `G.feel && (G.feel.trauma = Math.max(G.feel.trauma, x))` and `G.hitStop = Math.max(G.hitStop, s)`.
- Four new playable action names (procedural, no new mocap exists): `Dodge_Side` (.35 s low dash; the engine's sidestep `Walking_A` ts 2.6 is mapped to the same motion automatically), `Hit_Front`, `Hit_Back` (.3 s, 0.02 s fade-in, quick start / slow end,
  torso whip in the right direction), `Block_Impact` (.25 s guard arms + small recoil). The engine still calls `Hit_A`: feel.js renames it to Hit_Front / Hit_Back from the direction of the blow (rig.kind shows which), and a blocked hit triggers the block overlay (rig.blockT) without any engine call.
- Haptics through the engine's vib() (honours SET.vib, guards navigator.vibrate): 15 ms light, 35 ms heavy, [30,40,60] execution / elite kill.
- Elite / captain kill within 7 m of the hero: .6 s slow motion (engine G.slow, .3x), zoom kick G.zk .12 (~12-14 % closer), FOV punch. Boss kill keeps the engine's 1.2 s slow motion + bigger punch.
## REQUESTS
- AUDIO: a short cloth/whoosh for Dodge_Side, a wooden/metal "clack" for Block_Impact (now the same hit sample), a body-fall thud at knockdown/death contact (~0.6 s after death starts), bow creak + string twang for the hero volley.
- MODELS: R_aydarho.glb has no skeleton at all (static mesh): the dragon cannot animate (needs at least jaw/neck/tail bones or 3 morph poses). A real quadruped wolf (the current R_bori is a biped wolf-man on the human rig). A sitting pose/clip for captives (Sit_Floor_Idle falls back to standing idle).
  Real mocap for: side dodge, block impact, front/back hit, get-up, bow draw, victory cheer — current ones are procedural.
- MECHANICS (engine.js): enemy `E_Attack` contact is now exactly at the end of the wind-up; hero combo timings unchanged. If you add a parry-counter animation call `p.play('1H_Melee_Attack_Stab', ...)` or any SEG name; unknown names fall back to idle.
  Sidestep could call `p.play('Dodge_Side', {once:true, force:true, dur:.34})` directly instead of the Walking_A hack (both work).
- UI: none.
## Verification (manual-rAF studio /home/user/t/anim: run.cjs + scen.js, m1-1, 844x390 LOWQ, frames stepped at fixed 33 ms game time, 66 ms between cells; decimated R_*.glb of 20:34 loaded fine — same bone names)
AFTER sheets (/home/user/t/anim): a_combo.jpg (hero 1-2-3: slash, back slash, lunging chop; round blade trails), a_strong.jpg (hold = heavy cleave with raised anticipation; knocked askar gets up), a_dodge.jpg (low side dash), a_roll.jpg,
a_bow.jpg (upright draw, bow in hand, saber back afterwards), a_enemyatk.jpg (askar: raise - hold - strike - recover, 2nd hit of the string), a_hit.jpg (blocked hit + recoil), a_death.jpg (kneel, fall, lies flat), a_run.jpg (upright run, long stride),
a_wolf.jpg (pounce), a_boss.jpg (Qashqir wind-up, strike, low recovery = punish window). Earlier iteration kept in /home/user/t/anim/old1 (before the trail / run-lean / bow fixes).
BEFORE sheets: b_*.jpg from the snapshot /home/user/t/anim/base (original skinrig.js, no feel.js) — only present if the baseline job got through the test lock (see final report).
No [pageerror] in a.log; G.feel present, G.feel.err undefined in every scenario.
## Not done / honest limits
- Not play-tested by hand or on a phone; all judgement is from stepped contact sheets. Parry-counter was not captured separately (it reuses the combo-4 path), horses were audited only (horse.js not mine, gait code already speed-driven).
- Wolves and bosses still use the human clip library (no other source); the dragon is a static mesh.
- Cloth/hair spring bones: the Meshy rigs have no cloth/hair bones and RIBS is empty, so nothing was added there.
- Turn-to-face smoothing is the engine's e.face(); untouched. Hero movement inertia is visual only (lean/bank), the engine's instant velocity is unchanged.
- The boss low recovery after a slam lasts ~.4 s (clip pose); fine as a punish window, but tune SEG.E_Slam[4..5] in skinrig.js if it reads as "stuck".
- BEFORE sheets captured 21:02-21:11: /home/user/t/anim/b_combo.jpg b_strong.jpg b_bow.jpg b_enemyatk.jpg b_death.jpg b_run.jpg (9 of 10 cells) b_dodge.jpg b_hit.jpg (no baseline for roll / wolf / boss: the job hit the 15-min limit behind the lock queue).

## Session 3 — quadruped wolf + Aydarha skeleton (coordinator task, 21:3x)
Backups: /home/user/agents/anim/bak/skinrig.v1.js (before this session), engine.before_wolf.js.
### Patch locations
- js/engine.js line 70, REAL table, ONE entry (marked `/* feel hook (anim agent) ... */`): `wolf: ['R_bori', null, 0, .95]` -> `wolf: ['R_bori4', null, 0, 1.0]`. Nothing else in engine.js. 'boribasi' (mdl 'wolf', x1.55) and the hero's spirit wolf follow automatically. 'wolf' was already in NOFIST; no weapon is mounted (no RightHand bone).
- js/skinrig.js: ctor — `this.proc` = 'wolf' (has LeftFrontUpLeg) | 'dragon' (Tail7 + Jaw, no Hips) | null; proc rigs build NO mocap tracks (the humanoid library would otherwise bind to Hips/Spine/Head) and no additive bones;
  play() first line (proc rigs only remember the action name/time/options); update() (proc branch); new methods _pb, _spring, _wolf, _dragon before setMount.
  Wolf only: the material's `map` is locked in the ctor, because models_ext.vary() swaps in bori_s / bori_g atlases painted for the old wolf-man UVs (see REQUESTS).
### Wolf (_wolf)
- Gait from measured ground speed: walk (< 1.7 m/s, 4-beat lateral), trot (< 4.4, diagonal pairs), gallop (rotary, spine flexion, body bob/pitch, tail streaming); cadence = speed / stride so paws do not skate; banks and bends the spine in turns.
- Idle (breathing, head drift, tail wag, look-at), Idle_Combat = low snarling crouch (this is the engine's pre-pounce "crouch" state), Jump_Full_Long = stretched pounce (the engine carries the body), any *Attack*/E_Slam = crouch -> lunge bite -> recover
  (contact at 42 % of the passed dur, like the soldiers), Hit = flinch + yelp + recoil spring, Cheer = howl, Death_A = falls on its side and lies flat (knockdown = same, gets back up when the next action arrives).
### Aydarha (_dragon)
- Idle: breathing, neck and tail S-wave, jaw breathing; neck/head follow the look-at target feel.js already sets (the hero).
- E_Attack (kit 'bite'): neck coils up/back while the jaw opens, strikes down-forward at wd, snaps shut. 2H_Melee_Attack_Spin (kit 'tail'): tail + hind spine curl to one side, whip across at wd, damped wave after.
  Spellcast_Shoot / *_Shoot (kit 'jet' and story volleys): rears, opens wide, levels the neck at 1.1 s and holds trembling 1.5 s. Hit_A with ts < 1 (kit 'dive'): head and neck plunge. Rising out of the water (root y speed > 2.5 m/s) or Cheer: roar pose.
  Other Hit_*: short recoil + open jaw. Death: neck collapses, jaw slack, tail still.
### models_ext attachments
- Helmets / plumes / pauldrons / quivers are parented to bones with bone.attach(), so they follow the mixer AND the additive layer (look-at, recoil, bow, block) automatically — nothing to fix. vary() returns early for wolves (only texture + body scale).
### Verification
- Standalone creature studio (no game boot, 30 s per run): /home/user/t/anim/www/crea.html + run2.cjs + crea.sh (lockN). Sheets: /home/user/t/anim/c_walk.jpg c_trot.jpg c_gallop.jpg c_wbite.jpg c_wpounce.jpg c_wdeath.jpg, c_didle.jpg (old camera, mostly hidden by the ground) c_dbite.jpg c_dtail.jpg c_djet.jpg c_ddive.jpg; ddeath was run but its sheet not reviewed.
- In-game smoke test (diag.js, m1-1): spawn wolf + boribasi + aydarho, play Running/Idle_Combat/Jump/Hit/E_Attack, damage, kill -> no exception, rig.proc wolf/wolf/dragon, own fur map kept, feel layer on. NOT captured inside a real fight (game boot alone took 70-100 s of the 110 s budget).
### REQUESTS (session 3)
- MODELS: models_ext.vary() line ~287 — skip `varMap(VARTEX.wolf…)` when `rig.proc === 'wolf'` (I lock the map from my side meanwhile), or paint variants for R_bori4. Dragon: the neck chain is short, so bite reach is modest; rest pose has the mouth half open.
- MECHANICS: the potion brute (transformEnt(e, 'wolf')) now turns a soldier into the quadruped; its grab / ground slam read oddly on four legs. If the brute should stay a wolf-man add a type with mdl pointing at R_bori (e.g. REAL.bori2 = ['R_bori', null, 0, .95]) and transform into that.
  Wolf Ent height e.h still comes from T.wolf.scale (2.56): HP bar floats ~1.3 m above the animal; consider h = 1.5 for wolves.
- AUDIO: wolf snarl on Idle_Combat, yelp on hit, dragon jaw snap at the bite.
