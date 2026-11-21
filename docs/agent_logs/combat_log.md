# Combat agent log (engine.js / skinrig.js / story.js gameplay / rig.js MAP)
Backups of originals: /home/user/agents/bak/
Own test runner (port 8781, avoids killing other agents' servers): /home/user/t/rtc.sh + runc.cjs

1. Prologue beast (Tuya-dev, type `camel`, GlbRig tuyadev.glb) slid: AI played `Walking_A` (speed 3 < 3.2) which had no entry in rig.js MAP -> idle pose. Added `Walking_A: 'run'` to rig.js MAP (used by GlbRig + old Rig); locomotion speed now scales the cadence.
2. Weapon grip: SkinRig now mounts every weapon at the centroid of the (fistified) hand vertices in bind pose (`fistC()`), instead of a fixed offset along the forearm. Fixes Sarbinaz spear floating outside the hand; same for saber/axe/bow/staff.
3. Locomotion anim follows measured displacement: Ent.play intercepts Idle/Walk/Run requests (`LOCO`), `locoPick()` chooses Idle(_Combat)/Walking_A/Running by real speed (smoothed, hysteresis, scaled by model size), timeScale ~ speed. Speed measured at end of update() after separation.
4. Crowding: separation radius `sepR()` (mounted 1.15 => 2.3 m between riders); melee surround slots (`slotGoal`/`relSlot`): 6 ring slots per target at attack reach, extra attackers wait/circle on an outer ring (+2.4 m, +3.6 m mounted) and only slot holders attack. Mounted reach/hit range +1.1 m.
5. Hero skills (`HERO_SK`, `heroSkill`, `HACT` in engine.js): Allayar b1 shield bash, b2 war cry (+40% dmg 7 s for him and allies, heal 12%, fear), b3 heavy cleave (b3 shown for him; sk2 enabled in prolog). Sarbinaz b1 spear thrust dash, b2 spin sweep, b5 javelin. Icons via skinButtons; HUD cooldown uses hero's own slot. Guloyim merged powers untouched.
6. Potion soldier: `potionAI` (engine) + `potionSoldier(x,z)` / wave type 'potion' (story). Askar drinks (hand-to-mouth pose via SkinRig.post + aimBone, glowing bottle, green/red smoke) then `transformEnt()` swaps it in place into a wolf (x1.3 size, x3.2 HP, spawn grow). Added to waves in ch2-ch7.
7. Destructibles: `breakable()` in engine: HP bar (enemy style), flash+shake+sparks on hit, cracks accumulating with damage + darkening, shatter into falling chunks with dust, then removed from scene and collision. `hitBreak()` called from all player attacks (kind 'atk') and slam ('slam'). Used for mission1 stable door (any attack), ch6 city gate (new wooden gate mesh + collision, Earth Slam only), ch7 blood totems (Earth Slam only).
8. Amulet: golden point-down triangle with engraved inner triangle mounted on Gulayim's chest (SkinRig `addAmulet`), b8 power button icon is now the triangle SVG (`AMU_SVG`), i18n "(🔱)" -> "(▼)". Boss defeat: `soulToAmulet()` dissolves the boss into golden particles flying into the amulet (bossFight, mission1 Qashqir, ch7 Surtaysha).

## Verification (Playwright, 844x390, LOWQ=1 via /home/user/t/rtp.sh <port>)
- pr2.js (prolog): camel = GlbRig, now plays 'run' pose with leg values changing while moving (spd ~3 m/s); Allayar buttons show 🛡/📯/🪓, skills fire (pw2-4.jpg).
- g6.js (ch6): J attacks do nothing to the gate ("noeffect"), slams 6->0, cracks visible, gate shatters into 26 chunks, removed from colB/scene, objective advances (g6b-d.jpg).
- c5s.js (ch5): Sarbinaz buttons 🗡/🌪/🎯, thrust/sweep/javelin fire (s5b-d.jpg); potion askar transformed into wolf (vs 1.46, boosted HP).
- am2.js (m1): askar hand-to-mouth drink with green bottle + smoke (p1.jpg); boss soul particles -> amulet, boss removed (a2/a3.jpg).
- cav.js (m1 mounted): min distance between riders 2.3 m (original code 1.8 m), spread out (cv1.jpg).
- amu2.js: golden triangle tumar on Gulayim's upper chest (amu2.jpg).
- Note: the sandbox renders ~1-3 frames/s right now (original code measured the same), so test waits use game time.
- Test hooks added: G.camK / G.camY camera zoom (engine render), __T.potion / __T.soul / __T.mount (story).

## Task 2: skinned horse (new file js/horse.js)
- No rigged horse exists in assets (R_horse.glb is a static 20k-tri Meshy mesh, black coat with red tack). horse.js auto-rigs it once at load:
  landmarks found from the vertices (legs clustered by side/front-back, saddle top, barrel), skeleton root > pelvis > spine1 > spine2 > chest > neck1 > neck2 > head(+end), tail1-3, 4 bones per leg (+tip);
  skin weights = inverse-distance^4 to bone segments, with region rules (legs only take their own quadrant, tail only behind the hips, neck/head only in front of the chest), max 4 bones/vertex.
- Shared geometry + one shared material per coat (black, bay, chestnut, grey, white, dun via shader recolour that keeps red tack/silver); one Skeleton per horse. Shadows off for non-player horses on q<2.
- Own Karakalpak saddle cloth (canvas texture: red felt, gold border, blue rhombus band, ram's-horn motifs), leather saddle, gold pommel, stirrups, rigid on spine2.
- Procedural gaits from measured speed: idle (breathing, head look/roll, tail swish, resting hind leg, random head toss), walk 4-beat, trot diagonal 2-beat, canter 3-beat, transverse gallop with spine flex/head bob; smoothed transitions; random tempo/phase per horse; rear on starting a gallop after standing / on abrupt stop (random); hit jolt; death: horse falls on its side, sinks, removed (G.corpses).
- engine.js: toggleMount uses makeHorse (coat: Guloyim white, Sarbinaz grey, enemies black/bay/dun, maidens random), horseTick() in render drives the horse and seats the rider on the saddle anchor (SkinRig.setSaddle -> body follows bob/pitch/rear); dying riders/horses leave a falling corpse; ghost riders (power 0) are galloping skinned horses too. Old shader-leg tickMount removed. Test hook G.camYaw.
- Verified: hs1-hs3.jpg (group idle/gallop, side yaw), h5a-e.jpg (close-ups, gallop side profile, falling corpse), r5b.jpg (rear). No pageerrors.

## Task 3: horse LOD for phones
- gltf-transform simplify alone could not reduce R_horse (Meshy UV atlas = every triangle its own UV chart; weld 32959->32940 verts, simplify stalled at ~13k tris).
- So /home/user/agents/gt/bake.py bakes the base-colour texture into vertex colours, welds by position (9810 verts / 20031 tris), then `npx @gltf-transform/cli simplify --ratio 0.18 --error 0.03` -> assets/props/R_horse_lo.glb (3556 tris, 63 KB) and `--ratio 0.05` -> assets/props/R_horse_far.glb (995 tris, 18 KB).
- horse.js: one rig base per source mesh (landmarks + weights recomputed per mesh); the far mesh reuses the lo skeleton and shares it (two SkinnedMeshes, one Skeleton), coat shader now applied after color_fragment so vertex-colour meshes recolour too.
- engine.js: player horse = full R_horse only on SET.q 2, else lo; all other horses lo with distance switch to far (>25 m, >14 m on q0); ghost riders use far. PROPN loads the two new props.
- Verified: hl1/hl2.jpg (m1, q0) standing + galloping group on lo/far meshes; legs, saddle cloth, riders OK; no pageerrors.
