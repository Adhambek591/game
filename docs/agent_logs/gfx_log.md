# GFX agent log (in-level graphics upgrade)

## Files
- NEW `js/fx.js` — unit readability (rim/saturation shader patch per team, instanced contact-shadow blobs + team rings), waving cloth
  banners, instanced shader fire (flame/smoke/embers/ground glow), props (rigged idle horses, R_arava carts + wrecks, crates/jars/sacks/
  melons, wheels, bones, cairns, torches), `trailDress()`; per-frame driver = `scene.onBeforeRender` (no engine loop edit).
- `js/env.js` — `roadify(mat, opts)` (lane darkening/desaturation/contrast flattening + meandering caravan trail from
  `assets/env/tex/trail_det.jpg`), `roadX(z, amp)`, `groundMat()` now roadified; trail texture loaded in `loadEnv`.
- `js/scenery.js` — `ROADS` per-chapter trail config, `terrain()` roadifies its material, `trail()` dressing before each `done()`.
- `assets/env/tex/trail_det.jpg` — NEW (generated with seedream_v5_pro, use_unlim, then high-passed to a mean-0.5 detail map).
- `js/engine.js` hook edits ONLY: `import * as FX from './fx.js'`; `decor()` → `FX.prop(...) || placeProp(...)`;
  `crate()`, `banner()`, `fire()` bodies → `return FX.crate/banner/fire(...)`. Backups before edits: /home/user/agents/gfx/.
- Test harness: /home/user/t/gall.sh (in-game, port 8821, serves a consistent snapshot /home/user/t/gsnap), /home/user/t/gv.sh
  (prop viewer page gv.html, port 8822, `set=a|b|c|d`), shots in /home/user/t/gfx/.

## Session 2 (takeover agent, 04:25+)
- Status check: items 1-6 were already implemented by the previous agent in fx.js/env.js/scenery.js (see Files above).
- Convoy cart (missions 2-3): already built by the missions agent in missions.js `mkCart()` (R_arava body + makeHorse harnessed horse,
  shafts/arch/reins, wheels spin with distance, horse gait follows convoy speed) — no FX.convoyCart needed. For static scenes use
  `FX.cart(x, z, ry, burnt, { broken, scale, y, parent })`, `FX.horse(x, z, ry, { bare, coat, scale, y, parent })` (rigged idle).
- fx.js: engine hero point light (22, 9 m — tuned for night) is dimmed at runtime by sun intensity (x0.25 at sun >= 4) so the lane
  around the hero no longer blooms white by day (found in scene graph; no engine edit).
- fx.js: flames now use premultiplied over+add blending (outer flame occludes, hot core adds) — stays orange on bright sand
  instead of washing to white with additive + bloom.
- Lane ground darker / less saturated: scenery ROADS dark/desat lowered (ch2 .52/.42, ch3 .55/.45, ch4 .56/.48, ch5 .6/.5, ch6 .62/.5,
  rides likewise; ch7 unchanged), env.js roadify defaults .56/.48 (prologue/ch1 groundMat), trail colour x0.9.
- Harness: /home/user/t/gshot.js now snaps G.cam to the teleported player (camera used to lag at the level start under SwiftShader).

## Session 3 (takeover agent, 05:15+)
### FX.convoyCart() — API for the missions agent (js/fx.js)
```js
import * as FX from './fx.js';
const c = FX.convoyCart({
  coat: 'bay',          // horse coat (horse.js COATK names), default random
  scale: 2.1,           // R_arava scale (same as missions mkCart)
  driver: true,         // procedural seated driver (robe, sash, fur hat, beard, arms on the reins); false = empty seat
  load: true,           // sacks/jars/crate on the bed
  path: s => ({x, z}),  // optional: cart follows this path; c.s = distance travelled, advanced by c.speed every frame
  speed: 0,             // m/s; wheels spin = speed/R, horse gait follows speed (walk/trot), driver bobs, body sways
  parent: world, y: 0, auto: true
});
c.g        // THREE.Group, origin on the ground under the axle, forward = +z (horse in front)
c.speed    // set any time (0 = idle horse, cart stops)
c.place(x, z, yaw)   // manual placement (when no path); yaw = rotation.y (forward = +z rotated)
c.seat     // {x:0, y, z} local seat position, if you seat a spawned unit instead (driver:false)
c.update(dt)         // called automatically each frame while in the scene; set c.auto=false to drive it yourself
c.dispose()          // remove from scene + ticker
```
Returns null if R_arava is not loaded. Viewer: /home/user/t/gv.sh "set=e&x=-2&z=-11&k=1.1" gve (gfx/gve.jpg).
missions.js mkCart (2-3 convoy) already does the same with spawned driver units — no need to switch; convoyCart is for any other
moving cart (ambient caravans, cutscenes, other chapters).
### Session 3 changes
- fx.js: NEW `convoyCart()` (+ per-frame `tickConvoys`, procedural seated driver geometry `driverG`, own wheel texture, iron hubs, cargo
  load on the bed). Viewer set `e` in /home/user/t/mkgv.py.
- fx.js unit readability: blobs/rings follow the Hips bone (world pos) when it is within 4 m of e.x/e.z (robust against root-motion
  offsets); no ring/blob while an enemy is still in its spawn-grow (`e.spawnT > .2`) — test runs showed rings floating under
  not-yet-visible enemies.
- fx.js: engine hero point light dimmed harder by day: factor clamp(1.3 - sun/3, .1, 1) (night sun ~1.2 → .9; golden hour 3.6-3.9 → .1).
- env.js roadify: caravan-trail colour darker / flatter (`* (.2 + rt*1.3) * .7` instead of `* (.1 + rt*1.6)`) — the trail read as a
  near-white bloom streak in ch1/viewer; now packed darker earth with ruts still visible.
- scenery.js ch6 `paving()`: bricks less saturated/darker (base 150/114/90, colour 0x94867a) + dust/grime blotches to break the
  regular pattern behind units.
- Harness: /home/user/t/gall2.sh + gshot2.js (ready check no longer needs window.__SCN, which ch1/prologue never set → each ch1
  shot used to wait the full 240 s). Env PROBE=1 dumps transparent meshes, PROBE2=1 dumps player materials. Shots gfx/*_k.jpg, *_m.jpg.
- Note for reviewers: the golden glowing hero in some harness shots is the engine's level-up effect (gshot kills all enemies → XP → level
  up), not a material bug — shots with badge "1" show the hero normally.

## Session 3, pass 2 (coordinator review, 06:20+)
- Markers (fx.js tickUnits/tickHud, runtime restyle — engine untouched):
  - removed the ally and normal-enemy rings (soft contact blob + rim light stay);
  - elites: thin dark-red ring, or the engine `aura()` restyled to dark red, normal blending, 58% size;
  - player `heroMark` ring scaled to 1.5 (was 2.6) at opacity .5, triangle 70%;
  - target-lock ring: dark red, 78% size;
  - objective `marker()`: the 7 m light column is hidden, the ring shrunk to .9 m and pulsing, plus a small bobbing, spinning gold arrow.
- Cargo (fx.js cargoG): crate variants replaced. 0 = barrels (staves + iron hoops), 1 = wicker baskets + saddle bags + sacks,
  3 = sacks + felt rolls, 4 = basket of melons, 6 = carpet pile (3 patterned rolls + folded carpet + felt), 7 = barrels/felt/jar/saddle bag.
  `crate()` picks among them; trail dressing and wreck spill include them.
- Boxes: `scanBoxes()` now walks the whole world tree. Every plain brown BoxGeometry mesh (story/missions doors, the missions.js chest, story
  planks) gets planked geometry: doors = vertical planks + iron straps + studs; chests = plank rows + iron corners + straps + lock.
  The material is edited in place (wood maps + vertex colours), so the breakable hit-flash clones keep working.
- Ground detail (fx.js buildGD/tickGD; built per level ~1.2 s after the world is cleared, around the player z+30..z−330):
  - one draw each for dry-grass tufts and camel thorn (crossed alpha quads, wind sway in the vertex shader), dense along the lane edges and
    sparse inside the lane; the trail centre (roadX) is kept clear;
  - instanced pebble clusters and dark ground patches;
  - counts by SET.q: tufts 420/1000/1500, pebbles 250/600/900, patches 40/90/120.
  Heights come from scenery's heightfield via `G.groundH` (set in scenery begin()).
- env.js roadify: large-scale macro variation (two scales of the trail detail map, ×0.78–1.22) so the ground isn't one flat colour.
- Chapter 1 haze: the fire ground-glow (additive, ~6 m per fire) is now scaled by sun intensity (×0.04 at sun 4.6, up to ×0.55 at night).
  The many burning-village fires in ch1 overlapped into a whitish wash.
- Salt flat (scenery saltTex): irregular cells (jittered + extra points), wavy crack edges, thinner and lower-contrast cracks, bump 2 → 1.1.
- horse.js (not my file, small edit, logged): chestnut coat 0x8a4218 → 0x4a2a16; `smoothN()` averages normals of vertices sharing a position in
  `horseBase`. FX static horses use the full R_horse mesh when SET.q > 0 (the lo mesh looks faceted up close).
- Backups: /home/user/agents/gfx/fx.before_pass2.js, horse.before_pass2.js.

## Session 4 (author playtest fixes, 10:25+) — colour design, Guloyim blue, burnt ruins
Backups before edits: /home/user/agents/gfx/s4/ (env, fx, scenery, skinrig, glbrig). No engine.js edit.
- Guloyim BLUE: NEW `assets/env/tex/gulayim_blue.jpg` = her baked atlas with crimson cloth -> deep royal blue (skin / silver armour /
  trim kept; script /home/user/t/gu/blue.py). skinrig.js: `blueOutfit()` swaps the map for the rig built with `o.amulet` (= gulayim only).
  Portrait to match: NEW `assets/img/p_gu_blue.jpg` (same recolour of p_gu.jpg). NOT wired — map.js/meta.js/story.js use p_gu.jpg
  (UI/gameplay agents' files): either point them at p_gu_blue.jpg or copy it over p_gu.jpg.
- Player outline: fx.js `outlineHero()` — skinned hull sharing the hero skeleton, expanded in clip space (~1.5 px, scales with buffer
  height), DoubleSide + small depth push (the Meshy models have mixed winding: BackSide alone drew over the body), gold 0xffd76e. Hero
  rim/tint neutralised (TEAM.hero tint [1,1,1.03]) so the blue isn't warmed.
- Burnt houses/yurts: fx.js `scanBurnt()` (every 1.5 s, max 6 per pass, nearest first) finds engine `yurt()/house()` GLB clones with the
  flat 0x2a2420 burnt material, hides them and builds a procedural ruin at the same transform (engine collision unchanged):
  yurt = charred kerege lattice arcs (~50% survive, burnt tops), scorched felt remnants with jagged burnt edge, door frame with red paint
  remnant, roof poles (standing to a tilted crown ring / snapped with ember tips / fallen), heap of burnt felt + sticks, ash decal,
  pulsing embers, thin smoke (`smokeAt`); house = clay walls with smooth broken top profile + breach, soot only near tops / above door,
  clay-coloured broken tops, charred roof beams (spanning / snapped / fallen), roof-debris heap, embers, smoke. 4 draws per ruin.
  Other burnt GLB props (FX carts, wreck wheels, anything with the 0x2a2420 material) get `charPatch()` (texture kept; brown char /
  coal / grey ash variation in world space). Ruin groups carry userData.ruin = 'yurt'|'house'.
- Colour design (env.js): new LIGHTS for every chapter + `ch1` (day missions without scenery) and `pro` (prologue / NIGHT mood) —
  fx `tickMood()` applies them when a level's fog has no preset marker (applyLight sets scene.fog.userData.fxL). Warm gold sun vs cool
  blue hemisphere sky + cooler fog (complementary warm/cool), IBL lowered (G.envI -> envMapIntensity on non-metal standard materials,
  `scanEnv`; scene.environmentIntensity does not exist in this three build), new grade: saturation + hue-selective orange/ochre
  desaturation (`osat`, kills the orange wash while keeping red/blue/green clothes saturated), multiplicative split-tone (shadows cool,
  highlights warm), contrast pivot/gain + S-curve, stronger vignette. ch1 ground 0xe2cfa4 -> 0xc2a07a, caravan-trail tint darker,
  ch2 salt flat cooler/darker and roadified (lane darkening continues over the salt).
- Compatibility: presets in the old format (missions.js TOD night/dusk: additive shc/hic, no osat) are converted once by
  `compatLight()` — before this they threw in applyLight (L.sh undefined) inside missions' try{}, leaving a half-applied look.
- Harness: /home/user/t/g3.sh <name> <ms> <z|""> <x> <vars.json> [port] + gshot3.js + runp4.cjs (QSET=1 phone quality): one page
  load, then N JS variants (get env/fx/engine modules) each screenshotted -> gfx/<name>_<i>.jpg. Before shots gfx/*_pb.jpg, after *_pa.jpg.
- Later in session 4: ground-detail tufts brighter (they read as black ink under the new grade); daytime falling ash (engine mood ember
  0x5a5550) restyled to light grey 0xb4aca4 in fx tickMood; ch4 exp .84 / osat .7; prologue `pro` less orange (sun 0xffc088, osat .7);
  orange-desaturation hue band starts at ~8 deg so the red-orange dawn ground is caught as well (crimson clothes are not affected).
- Shots (844x390): before /home/user/t/gfx/{0-1,1-1,2-3,3-1,4-2,5-1,6-1}_pb.jpg (7-2 before = 7-2_o.jpg); after
  {1-1,2-3,3-1,4-2,5-1,6-1,7-2}_pa.jpg, 0-1_pa2.jpg, 1-1_pa2.jpg; Guloyim + outline close-up v6_0.jpg; ruins v2_0.jpg (yurt),
  v6_1.jpg (charred cart, yurt), v7_0.jpg (house). No [pageerror] in any run. bust.py run after the edits.
- Open: portrait p_gu_blue.jpg not wired (see above); engine debris() beams still use the black TX.char texture (engine file).
