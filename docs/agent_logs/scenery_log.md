# Scenery agent log

## Files owned / changed
- NEW `js/scenery.js` — chapter scenery builders: `ch2() ch3() ch4() ch5() ch6() ch7() ride(curCh)` (+ `heightAt(x,z)`, `WATER`, `RIVER`).
  Each export is wrapped in try/catch (a scenery failure never breaks a level). Debug: `?scdbg=off|nosky|nosea|noflora|noterr|nolight`.
- `js/env.js` — (a) `dressGround` now draws its ground props as InstancedMeshes (one draw per model part instead of ~350 meshes),
  new export `redress(world, hf, wet)` re-seats them on relief / hides under water; (b) NEW `LIGHTS` per-chapter lighting presets +
  `applyLight(key, {scene, renderer, grade, G})` (sun/hemi/fog/exposure + extends the engine's existing grade pass with contrast/split-tone
  uniforms at runtime — no engine.js edit). Original saved at /home/user/agents/env.js.orig.
- No engine.js edits.

## story.js edits (exact)
1. after `import { place } from './env.js?v=…';` added: `import * as SC from './scenery.js?v=…';`
2. appended at the end of each level builder body (just before its closing `}`):
   - buildCh2: ` SC.ch2(); `   - buildCh3: ` SC.ch3(); `   - buildCh4: ` SC.ch4(); `
   - buildCh5: ` SC.ch5(); `   - buildCh6: ` SC.ch6(); `   - buildCh7: ` SC.ch7(); `
3. rideLevel's build lambda: `... fire(8, -140, 1); SC.ride(G.curCh); }`
4. buildCh4: REMOVED the old box-ship loop line
   `  for (const z of [-40, -80, -120]) for (const s of [-1, 1]) { const b = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 9) ... world.add(b); }`
   (procedural ships from scenery.js replace it). Backup before edits: /home/user/agents/story.before_scenery.js

## What scenery.js builds (all outside the lane |x|<G.W unless noted; lane stays height 0)
- Common: `terrain()` replaces engine `ground()` planes with a relief mesh (dense near the lane edges, Q-scaled), vertex tint +
  `tint` attribute (luminance-preserving recolour: sand / wet sand / grass / salt / rock strata); `settle()` lifts existing level props
  onto the relief and removes ones standing in water (also removes the old invisible engine `water()` planes); `redress()` re-seats the
  instanced env.js ground props. Flora are procedural (branch skeleton + crossed alpha leaf cards from one canvas atlas, wind sway in
  vertex shader, alpha-tested shadow depth material), instanced in 2-3 variants per species: saxaul, dead saxaul, tamarisk (julgun,
  pink plumes), turanga (Populus euphratica), pyramidal poplar (terek), elm (qarağash), juniper (archa), camel-thorn bush, reeds, grass.
  Painted sky dome (gradient + canvas clouds + sun glow/rays; storm variant), warm dust motes (Q>0), per-frame ticker via an invisible mesh.
- ch2: dunes rising from the lane edge, white salt flat z -84..-176 (tileable voronoi crack texture overlay), saxaul/dead saxaul/camel thorn, boulders.
- ch3: side river (left, x≈-20) + crossing river at z=-78 joining it, flowing-water shader with bank foam; walkable timber bridge
  (12 m wide, deck at y≈0.06, piles, railings, braces) at z=-78; G.colB blocks the water on both sides of the bridge; a small funnel
  nudges NPCs toward the bridge in that z band so the squad never gets stuck; tugai: reeds (dense), turanga, tamarisk, elms, poplar row, green grass; grass/wet bank tints.
- ch4: animated sea along the right side (x>≈14) and ahead of the dragon arena (z<-167): vertex waves, analytic normals, ripples,
  depth colour, shore foam + swash bands, whitecaps; sand beach + wet sand strip; two timber piers; 10 procedural ships (lofted curved
  hull with plank texture & tarred bottom, deck, thwarts, cargo, rails, curled prow, stern post, steering oar, mast, yard, billowed
  striped sail or furled sail, 12 oars, painted shields, rope rigging), bobbing/pitching/rolling on the same wave function, some drifting;
  a beached fishing boat; scanned boulders/stones on the shore, driftwood, reeds, tamarisk, saxaul. Old box ships removed.
- ch5: Darbent pass — steep layered rock walls rising right at both lane edges (16-30 m, rock strata tints), junipers, boulders, stones,
  two hanging rope bridges high across the pass (z -58, -150).
- ch6: brick-paved street over the lane, bazaar stalls (striped awnings, melons, pots, carpets; instanced) along both lane edges (skipping
  fires), Khorezm mud-brick houses with parapets/beam ends/doors/windows, iwan portals and blue-tiled domes (merged per material), two
  minarets with tile bands, poplars and elms.
- ch7: black-felt yurt horde along both sides, skull/horn/horsetail totems, dark banners, horse pen with fence + horses, campfires,
  rolling steppe hills, cold storm-grey sky.
- rides (ch2/ch4/ch7 horseback levels): ch2 dunes, ch4 ride runs along the coast with sea + ships, ch7 steppe + totems; saxaul/tamarisk/bush.

## Lighting (env.js LIGHTS / applyLight, called by scenery begin())
Golden-hour presets ch2..ch6 (low warm sun mostly ahead of the camera for backlight/rim, warm hemi, warm fog/haze, grade: sat 1.38-1.42,
warm tint, S-curve contrast, blue shadows / gold highlights); ch7 cold steel-grey storm (desaturated, cold split tone, storm clouds).
Grade = the engine's existing gradePass (SET.q>0 only) with uniforms added at runtime; SET.q 0 has no composer so no extra pass.
Note: the gameplay camera looks down ~38° with fov 34, so the horizon/sky is not visible during play (only ~±15 m around the lane);
the sky dome/sun glow matter for any other camera (map/intro).

## Testing notes
- Harness collisions: other agents' rt.sh kill `http.server 8765`; I used my own copies: /home/user/t/myrt.sh + myrun.cjs (port 8777)
  and a scenery preview page /home/user/t/www/pv.html (port 8778, symlinks to public js/assets; regenerate with `python3 /home/user/t/mkpv.py`
  after bust.py; `?ch=2..7|r2|r4|r7&x=&z=&hi=3` builds a level without the story flow; `hi` raises the camera for layout views).
  Scripts: /home/user/t/sc_gen.js (in-game: SCN=<ch> Z= PX= NAME=), /home/user/t/pv.js, /home/user/t/scall.sh.
- The sandbox has 1 CPU shared by all agents + SwiftShader, so fps numbers there are meaningless (G.fps is clamped >= 20); I tracked
  structure instead: e.g. ch4 ≈ 166 meshes / 548 instances, ch3 ≈ 146 meshes, ch5 ≈ 70 meshes (window.__R() prints meshes/instances/ktris).
  The env.js instancing change cut ground-prop meshes from ~350 to ~25 per level.
- Screenshots (844x390): in-game /home/user/t/sc_g3.jpg, sc_game5.jpg, sc_game6.jpg, sc_game7.jpg, sc_game4r.jpg;
  preview game-camera sc_game2s.jpg (salt flat), sc_game2d.jpg (dunes), sc_g4.jpg / sc_game4.jpg (beach, pier, ships), sc_g5b.jpg, sc_g6.jpg;
  raised-camera layout views sc_h3.jpg (rivers+bridge+tugai), sc_h4.jpg (sea, pier, ship), sc_h5.jpg (canyon + rope bridge), h7.jpg (horde).
- No [pageerror] from scenery in any run (the one `tickChunks is not defined` error seen once came from an in-progress engine.js edit by another agent).
