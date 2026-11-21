# GFX2 agent log (graphics / rendering pass, Nov 20-21)
Owner files: js/fx.js, js/scenery.js, js/env.js, assets/env. Backups before this pass: /home/user/agents/gfx2/{fx,env,scenery}.js
Harness: /home/user/t/g2/run.sh <name> <mission> [z] [x] (env QSET, VARS, WIDE, SPAWN) + g2/shot.js (MET = draw calls / tris / frame ms, TOP = triangle breakdown).
## Baseline (before any patch; swiftshader ms are only relative)
- 0-0 q2: game 421 calls / 2096k tris, wide 689 / 2218k
- 1-1 q2: game 392 calls / 2025k tris, wide 1167 / 2605k
- 2-3 q1: game 272 calls / 1650k tris, wide 396 / 1770k
- 6-1 q1: game 386 calls / 1982k tris, wide 950 / 2128k
Shots: /home/user/t/g2/b_0-0_a/_w.jpg, b_1-1_a.jpg, b1_2-3_a/_w.jpg, b1_6-1_a/_w.jpg
## Patches
- fx.js (p_fx1.py): import EffectComposer (+ prototype.render hook to reach the engine's private composer); buildGD pebble clusters 240 -> 60 tris;
  NEW section 10 before the per-frame driver: PF quality ladder (pfApply/tickPerf), tickShadowLOD, varyPatch/propKind/scanVary/wallTowers;
  tick(): calls tickPerf/tickShadowLOD/tickCine; scan block: scanVary() after scanBurnt().
- fx.js (p_fx2.py): tickCine() - hides ground rings (map.js zone rings, markers, hero ring, team rings) while #fly.on.
- scenery.js (p_scn1.py): town() builds each house at the origin and rotates it (b.ry or hash jitter +-8.6 deg); _ch6: two extra back tiers of houses.
- scenery.js (p_scn2.py): ROADS dark/desat raised (+.3/+.4, ch7 unchanged), ch2 gt golden tint; paving() colour 0x94867a -> 0xb09c88.
- env.js (p_env1.py): roadify defaults dark .82 / desat .85 / flat .25 + new uGT ground tint uniform (o.gt); groundMat day colour 0xcfae82;
  GRADE_FS vignette .42 -> .26; SPLIT shadows less blue; LIGHTS ch1-ch6: hemi x1.6 (ch5 x1.35), exp +.07 (ch2 +.11), sat 1.2, osat .95,
  con .3 / cmul 1.1 / piv .4; sky tops deeper blue, horizons warmer; buildDress: at q1 only boulders / trunks cast shadows.
- fx.js (p_fx3.py): CAMP / lowYurtG / lowHouseG / campBack (background field of instanced yurts or houses behind real camps; scanVary feeds it).
- scenery.js paving colour -> 0x9aa0a0 (less red); env.js ch6 osat .82.
- Harness: g2/snap.sh (own snapshot, all dirs symlinked), run.sh adds pf=0 (locks the ladder at level 0 for screenshots), GRP output.
## After (q1 = phone quality, pf=0)
- 6-1: game 327 calls / 1372k tris (was 386 / 1982k); wide 941 / 1540k (was 950 / 2128k) -> g2/a1_6-1_a/_w.jpg
- 2-3: game 261 / 1411k (was 272 / 1650k); wide 409 / 1615k (was 396 / 1770k) -> g2/a1_2-3_a/_w.jpg
- env.js: fog colours warmer / farther for ch1, ch2, ch3, ch6 (atmospheric perspective without the white wash).
- scenery.js (p_scn3.py): town() houses - battered walls, wooden porch on some, corner turrets with blue caps on tall ones (same merged draws).
- fx.js: pfApply deferred via setTimeout (pfDo); scanVary no longer skips plain Mesh roots.
- scenery.js riverMat: deeper blue mid-stream, roughness .2 -> .3 (less blown sun glare).
- fx.js (p_fx4.py): NEW section 11 static batching (BT / pureMat / batchScan / batchFree / tickBatch), called from the scan block (3 s after a
  level change) and every frame; varyPatch made instancing-aware (fxM), tickGD keeps lvlT. `?nobatch=1` disables it.
- fx.js: wallTowers sparser + smaller; fireAt per-fire flame proportions (width x.78-1.25, height x.75-1.35). env.js default ground tint [.97,1.04,.87], ch1 sat 1.14 / osat .9.
- scenery.js paving colour final 0xc2b6a6, env.js ch6 osat .9.
- 6-1 with batching: game 244 calls / 1287k tris, wide 601 / 1402k -> g2/c1_6-1_a/_w.jpg
- 1-1 (q1): game 283 calls / 971k (372 / 969k before batching, 392 / 2025k at q2 baseline), wide 849 / 1513k (1223 / 1550k before batching) -> g2/c1_1-1_a/_w.jpg

## REQUESTS (other owners)
- engine.js: export `composer` (fx currently reaches it by hooking EffectComposer.prototype.render) and add an "Auto" entry to the quality setting;
  the fx ladder (G.pf = { lvl, fps }) already scales resolution / shadows / bloom from measured fps and stores the level in sessionStorage.qq_pf.
- engine.js: per-unit draw calls. Every unit is ~8 meshes (c1 "Group/Buffer7760 x13 -> 100 meshes"), plus 84 SphereGeometry meshes under 4
  actor groups and 65-115 PlaneGeometry meshes under fxg groups (health bars?). After static batching these are now the main draw-call cost
  (6-1 wide: 601 calls, of which ~330 are units / bars). Merge unit accessories into the body mesh or instance the bars.
- models agent: unit GLBs are ~15.5k triangles each (hero 26k); 33 units = 508k triangles before the shadow pass. A <= 5k LOD for units
  beyond ~15 m / for q <= 1 would roughly halve the triangle count. More than one house model (B_house is one GLB; fx only varies
  tone / height / rotation).
- missions: houses / yurts / walls are placed on exact grids and mirrored left-right; add position jitter at placement (fx can only jitter
  rotation / scale without breaking the colliders). 1-1 has ~90 debris beams and 8 identical campfires in view.
- all agents: both.sh holds /home/user/t/lockA for 5-8 minutes per run; my level tests waited 3-6 minutes each time.
- fx.js: campBack skipped on paved (city) levels; G.fxCamp debug counter; scanEnv: engine water() roughness .18 -> .42 (white sun glare).
  scenery.js riverMat roughness .44. env.js ch3 sat 1.16 / osat .88.
- 3-3 (q1): game 250 calls / 1009k tris, wide 412 / 1161k, 140 background yurts -> g2/d1_3-3_a/_w.jpg
- 6-1 final (q1, more props from other agents by now): game 305 / 1436k, wide 692 / 1519k -> g2/d1_6-1_a/_w.jpg
- 0-0 (q1): game 301 / 945k (baseline q2 421 / 2096k) -> g2/c1_0-0_a.jpg
- fx.js: campBack limited to the real ground mesh width; batching keys materials by fingerprint (matKey) so per-placement material clones batch, and frees a source whose material colour / emissive is changed. env.js compatLight osat .7 (old-format mission presets were too red).
- 1-3 (q1, before matKey batching): game 334 calls / 1005k, wide 1001 / 1411k (21 clones x 13 meshes of another agent's new "AuxScene" prop
  were unbatched) -> g2/d1_1-3_a/_w.jpg
- Ladder test 2-3 with ?pf=3 (60 % resolution, sun shadows off): game 142 calls / 719k tris (level 0: 261 / 1411k), wide 263 / 880k,
  no errors -> g2/d1_2-3_a/_w.jpg
- fx.js charPatch: lighter scorched-brown / soot / ash look instead of near-black, instancing-aware (burnt props now batch).
- Final checks (q1): 1-3 game 367 calls / 1015k, wide 853 / 1370k (1016 before the burnt props batched) -> g2/f1_1-3_a/_w.jpg, g2/e1_1-3_w.jpg (before
  the lighter char look); 1-1 with the other agents' newer content: game 388 / 1118k, wide 937 / 1566k -> g2/e1_1-1_a/_w.jpg.
- No [pageerror] and no "fx ..." warnings in any g2 run. bust.py run after the last edit. Nothing committed.
## Not verified / weak spots
- fps ladder thresholds are untested on a real phone (swiftshader frames are > 0.2 s and are ignored by the ladder on purpose); only ?pf=3 was run.
- 0-0 wide view and all q2 "after" shots were not re-taken (0-0 needed 240 s to get ready in the last runs).
- Fly-over ring hiding (tickCine), flag waving and the wall towers on a real fortress wall were not looked at in a screenshot.
- 1-1 / 1-3: the new burnt house model (AuxScene, another agent) has a dotted texture pattern; fx only recolours it.
- 48 single-mesh groups with 1350 vertices each (probably scanBoxes plank geometry, one geometry per box) are still one draw each.

# Round 2 (coordinator follow-up). Backups: /home/user/agents/gfx2/{fx,env,scenery}.r2.js. Harness: g2/r2.sh + g2/s2.js (lockG, one shot, <= 100 s).
- env.js (p_r2a.py): OVR.m_dusk golden-hour override applied in applyLight over the missions TOD object (sun/hemi/fog/grade/sky);
  roadify: uRip dune-ripple uniform (o.rip), large-scale patch variation (pv), cache key road3.
- fx.js (p_r2a.py): TEAM rims (ally warm gold k 1.35, hero k .9, enemy thin red-orange k .5, elite k 1.0); rimPatch uses the geometric
  normal vNormal (no normal-map speckle), key fxrim2; scanBurnt recognises houses / yurts by geometry (propKind) so the new models get
  the ruin replacement; scanBoxes caches plank geometry per size (GEOS pb*) so plank props batch; ground tufts / pebbles +30 %.
- scenery.js (p_r2b.py): ROADS rip for ch2 / ch4; paving() new 'pave2' texture (packed earth + irregular worn flagstones, repeat 9 m,
  colour 0xe2d8c8); stalls() position / size / angle jitter; town(): upper storey on some houses, cloth awnings (pick3 colours).
- Shot: g2/r_1-3w.jpg (1-3 golden hour, ruins instead of the dotted burnt boxes).
- scenery.js: paving colour 0xc6b8a2 + darker joints; seaMat (key sea2): more opaque shallows, brighter turquoise, wider / stronger shore foam; ride ch4 (4-1) shoreline moved from x 14.5 to 13 with a second wobble. Shots: g2/r_6-1w.jpg, r_1-1g.jpg, r_4-1w.jpg (4-1 before the sea change).
- fx.js gdMat: grass / thorn tufts use an up-facing normal (lit like the ground; from above they were dark specks). Fly-over verified: g2/r_fly.jpg (no ground rings; the upright gold hoops are the ride mission's own targets).
- scenery.js seaMat (key sea3): shore distance computed per fragment (SD in the fragment shader; foam no longer depends on the 1.8 m mesh),
  lighter turquoise shallows, alpha .8+. Verified: g2/r_4-1w2.jpg (640x296). Gameplay view g2/r_4-1g.jpg / r_4-1g2.jpg: the sea is still only
  at the screen edge - the lane is 11.5 m wide and the shore is at x 13; REQUEST (missions/engine): shift the lane or camera towards the
  shore on shore levels (e.g. G.lkx offset) if the sea must be in frame.
- Verified by screenshot (round 2): fly-over without ground rings g2/r_fly.jpg; flag waving g2/r_flag.jpg vs r_flag2.jpg (0.4 s apart,
  cloth shape differs); fortress wall with irregular towers g2/r_wall.jpg; q2 view g2/r_q2_1-1.jpg; city g2/r_6-1w.jpg (844) and
  r_6-1w2.jpg (final paving, 640); 1-3 golden hour + ruins g2/r_1-3w.jpg; allies rim g2/r_1-1g.jpg.
- NOT verified: 0-0 wide (tutorial needs > 110 s to become ready), enemy rim tone close-up (spawned enemies were not in frame),
  draw-call numbers after round 2 (no metric runs under the 110 s limit), ground tuft normal fix (applied after the last ground shots).
- No [pageerror] / fx warnings in the round-2 runs. bust.py run. Nothing committed.
