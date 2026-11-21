# models / assets agent log
Harness: /home/user/t/mdl (vs.sh <out.jpg> "<query>" -> turntable via www/view.html on port 8977, flock lockB; insp.mjs = gltf-transform inventory; extract.mjs = dump textures).
Nothing committed/pushed/deployed.

## Findings so far (session 1, before restart)
- Loader: env.js loadGLB = plain GLTFLoader (three r160), NO meshopt/draco decoder set. Core GLTFLoader supports KHR_mesh_quantization + EXT_texture_webp -> only those are usable without a loader change.
- R_* characters 1.6-3.3 MB each: geometry dominates (15-26k tris, 20-41k verts, float POSITION/NORMAL/UV/TANGENT/WEIGHTS) + an embedded 72-channel animation that is never used (loadGLB returns g.scene only; clips come from anims.json). Textures only 512-768 px JPG (~150-300 KB).
- Legacy GMAP GLBs (qiz/gulayim/allayar/sarbinaz/ona/yigit/askar/bori/kamonchi/shaman/tuyadev/qashqir/surtaysha .glb, ~9.5 MB) are ALL downloaded at startup by engine loadAssets although SkinRig (REAL) wins whenever the R_ file loaded. Only `camel` (tuyadev) really uses GlbRig. -> REQUEST below.
- Props: B_yurt 6/10 (fine), B_house 4/10 (plain box), B_wall 3/10 (box, stretched texture), B_tower 3/10 (cylinder, stretched grain), W_saber 6/10, W_shield 6/10 (4972 tris, heavy for a shield).
- Catapult (wave4.js catapult()) = R_arava + 2 BoxGeometry beams + a sphere cup -> worst prop in game.
- Do NOT quantize POSITION/NORMAL of rigs/horse: engine fistify() and horse.js write float positions/normals back (setXYZ / applyMatrix4 on cloned geometry) -> would clamp with normalized int attributes.

## Session 2 (after restart)
- NEW js/models_ext.js (sources /home/user/t/mdl/src/p1-p4.js, concatenated; version tag synced to engine's ?v=). Builders + enemy-variant system (see API section at the end).
- NEW assets/props/var/*.jpg: recoloured soldier atlases (python /home/user/t/mdl/recol.py): askar_r (oxblood), askar_b (indigo), askar_o (olive), askar_k (black), kamonchi_r/b/o, bori_s (sandy wolf), bori_g (silver wolf). ~55-85 KB each, loaded lazily only when a variant is used.
- GLB optimisation staged in /home/user/t/mdl/opt (opt.mjs): drop unused embedded animation + TANGENT, quantize TEXCOORD (uint16) + WEIGHTS (uint8) only (KHR_mesh_quantization, core GLTFLoader). POSITION/NORMAL stay float (fistify/horse.js write them). keepSolidTextures (black emissive maps kept -> hit flash unchanged).
  R_* chars + R_horse + R_arava: 43 MB -> 27 MB. Not deployed until tested in game.

## REQUESTS (I don't own these files; exact patches)
R1 (lead / index.html owner) — load the variety + props module once (it self-installs on engine's G, scans G.ents every 250 ms):
    index.html, after the wave4.js line:
    <script type="module" src="./js/models_ext.js?v=SAME"></script>
  (bust.py rewrites its ?v= like the others; the module imports './engine.js?v=…' with the same tag, so no second engine instance.)
  Kill switch at runtime: window.__MX.MX.on = false.
R2 (engine.js owner) — stop downloading ~9.5 MB of legacy GlbRig GLBs that SkinRig never uses. In loadAssets(), last line:
    Object.entries(GMAP).map(([t, [f]]) => A.glb[f] ? 0 : ...
  ->
    Object.entries(GMAP).filter(([t]) => !REAL[t] || !A.real[t]).map(([t, [f]]) => A.glb[f] ? 0 : ...
  (only `camel`/tuyadev.glb and any type whose R_ file failed still load a legacy GLB; LAZY types: ensureReal() loads R_ on demand, so also add them to the filter: `!REAL[t] || (!A.real[t] && !LAZY.has(t))`.)
R3 (wave4.js owner) — real catapult model instead of R_arava + 2 boxes + sphere. In catapult(x, z), replace from `const src = A.props && A.props.R_arava;` up to and including `e.o.add(g); e.w4arm = arm; e.w4cup = cup;` with:
    const B = window.__MXB; let arm, cup;
    if (B) { const c = B.put(g, 'catapult', 0, 0, 0, 'enemy'); arm = c.userData.arm; cup = c.userData.cup; }
    else { /* keep the old code path here */ }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(k); e.o.add(g); e.w4arm = arm; e.w4cup = cup;
  Same pivot (y 2.35), same arm convention (cup at -Z, rotation.x -0.6 rest .. +0.9 cocked), cup = the stone mesh. Ally catapult: put(..., 'catapult', x, z, ry, 'ally').
R4 (missions owner, W4 camps / any scene) — use the camp / ford sets (window.__MXB.put(world, name, x, z, ry, ...args); add your own G.colC/colB):
    yurt camp:  put(world,'yurt',x,z,ry,'enemy') (grey felt, black/ochre band; r 2.75 -> colC r 3.0) ; 'tent' (3x2.4) ; 'campfire' (+ engine fire(x,z,1,.25)) ; 'weaponRack' ; 'tug' (horse-tail standard, use instead of banner for the enemy) ;
    tower camp: 'palisade', len, h (outside +Z; colB along X) ; 'watchtower' (3x3 footprint, colC r 1.8) ;
    ford:       'fordStones', len ; 'fordStakes', len (guide rope) ; 'reeds', n ; 'boat' (4.2 m, moored) ;
    archer line: 'mantlet' (1.6 m wicker pavise) ; 'arrowBasket' ;
    'catapult','enemy'|'ally' ; 'shield', paint0..3 ; 'helmet', 'cone'|'fur'|'lam', gold, plume.

## TOP PRIORITY (coordinator, bench_log): character decimation — DONE & DEPLOYED (session 2, ~20:45)
Tool: /home/user/t/mdl/dec2.mjs (gltf-transform + meshoptimizer 0.21). The usual simplify() could not go below ~22k verts because the Meshy atlases are
fragmented (UV seams everywhere act as locked borders). dec2 simplifies on the POSITION-welded topology, then for every output triangle picks, per corner,
the original split vertex whose UV is closest to the other corners (same UV island) -> real reduction; rare seam-crossing triangles show slight texture
smear (visible only up close on the maidens' skirts). Also removes the unused embedded 72-channel animation and TANGENT (three falls back to derivative TBN).
NOT quantized, NOT draco/meshopt: POSITION/NORMAL/TEXCOORD/JOINTS/WEIGHTS stay raw float/uint8 joints, separate (non-interleaved) buffers
(interleaved buffers broke fistify's getComponent -> found + fixed in a test). Skeleton (24 joints, 26 nodes), bone names, scale, origin, bbox, file names unchanged.
Originals: /home/user/agents/models/orig_glb/{models,props}/ (restore = copy back).
| file | verts before -> after | tris after | size before -> after |
| R_askar | 24154 -> 7760 | 10613 | 1897k -> 595k |
| R_kamonchi | 28276 -> 7796 | 9007 | 2199k -> 616k |
| R_shaman | 29136 -> 7940 | 9170 | 2254k -> 622k |
| R_bori | 24626 -> 7742 | 9796 | 1935k -> 593k |
| R_qiz | 22039 -> 7373 | 9460 | 1748k -> 559k |
| R_yigit | 19567 -> 7396 | 10752 | 1588k -> 571k |
| R_ona | 21706 -> 7388 | 9569 | 1733k -> 568k |
| R_otbasqan | 19345 -> 9024 | 12574 | 1571k -> 662k |
| R_gulayim (hero) | 33073 -> 12918 | 18537 | 2700k -> 1052k |
| R_allayar | 29958 -> 13422 | 20487 | 2474k -> 1069k |
| R_sarbinaz | 25405 -> 13659 | 18250 | 2159k -> 1087k |
| R_qashqir | 36959 -> 13305 | 17272 | 2970k -> 1105k |
| R_surtaysha | 39913 -> 13598 | 18797 | 3141k -> 1075k |
| R_qumdev | 32966 -> 12096 | 14713 | 2702k -> 1030k |
| R_qunqar | 26625 -> 13573 | 18452 | 2199k -> 1042k |
| R_qargashiq | 36933 -> 12677 | 17145 | 2915k -> 1021k |
| R_jallod | 41250 -> 13500 | 15379 | 3271k -> 1122k |
| R_aydarho (static) | 32181 -> 13490 | 19135 | 1595k -> 1001k |
| props/R_horse | 32959 -> 10569 | 12226 | 1525k -> 779k |
| props/R_arava | 28009 -> 7834 | 9398 | 1430k -> 767k |
R_* characters total 43.6 MB -> 16 MB (assets/models dir 52 MB -> 27 MB; the remaining 9.5 MB are the legacy GlbRig GLBs — see R2: with R2 applied
they are no longer downloaded at boot, so boot character download ~34 MB -> ~11 MB (non-lazy R_ set) ). Textures already <=1024 (512-768 for chars, 1024 horse/arava/aydarho).
Visual check: /home/user/t/mdl/d1s.jpg (original left / decimated right: askar, gulayim, qiz) — silhouettes and faces hold.

## Assets needed for title + tutorial 0-0 only (for lazy-loading; from engine loadAssets + missions.js tutorial block 1214-1551)
- Title: no 3D models (key art / video stills). Needs nothing from assets/models or assets/props.
- Tutorial 0-0: R_qiz (player in tutorial), R_gulayim (demonstrations), R_sarbinaz (sparring duel; LAZY type -> ensureReal), R_askar (training enemies / dummies),
  anims.json, props W_saber, W_shield (askar), W_spear (sarbinaz), W_bow (TU-S sniper step via archery.js), R_horse (+ R_horse_lo/R_horse_far LOD) and R_arava (decor + ride step),
  B_yurt, B_wall (tuYurt/tuWall), env (HDR + env/tex + env/mod) as already used.
- Everything else can load after the tutorial: R_allayar, R_yigit, R_ona, R_kamonchi, R_shaman, R_bori, R_otbasqan, all bosses (already LAZY: qashqir, qumdev,
  qunqar, qargashiq, jallod, aydarho, sarbinaz, otbasqan), R_surtaysha (not LAZY today but only appears in story chapters), B_house, B_tower, W_axe, all legacy GMAP *.glb,
  assets/props/var/* (variant atlases, loaded on demand by models_ext.js anyway).

## Inventory (gameplay-camera read; rating 1-10 before -> after my pass)
| asset | tris (before) | textures | rating | notes |
| R_gulayim (hero) | 25.9k -> 18.5k | 768 atlas (+blue swap gulayim_blue.jpg) | 7 | blue outfit via skinrig; amulet = skinrig.addAmulet (gold, point down, r .058) — only wearer; models_ext.amulet() = identical geometry for any other wearer |
| R_qiz (maidens) | 15.5k -> 9.5k | 512 | 5 -> 6.5 | all maidens were identical; now 4 dress colours (orig green, crimson qiz_r, ochre qiz_o, plum qiz_v) + scale .97-1.03 |
| R_sarbinaz | 20.7k -> 18.3k | 768 | 7 | |
| R_allayar | 25.9k -> 20.5k | 768 | 7 | |
| R_otbasqan | 15.6k -> 12.6k | 512 | 6 | |
| R_yigit (son/captives/bayimbet) | 15.6k -> 10.8k | 512 | 5 | shared by 3 roles |
| R_ona (mother/elder) | 15.4k -> 9.6k | 512 | 6 | |
| R_askar (askar/nayza/qilich/qalqan/cav/catapult crew) | 15.6k -> 10.6k | 512 | 4 -> 7 | was 1 look for 5 roles; now per chapter band 4 looks + role looks (helmet / atlas / pauldrons / shield paint / scale), captains gold |
| R_kamonchi (archer) | 15.4k -> 9.0k | 512 | 4 -> 6.5 | 3 atlases + Oirat fur caps + quiver |
| R_shaman | 15.3k -> 9.2k | 512 | 5 | untouched look (elite caster stands out already) |
| R_bori (wolf) | 15.6k -> 9.8k | 512 | 5 -> 6 | sandy / silver / dark coats, scale .92-1.07 |
| bosses qashqir/surtaysha/qumdev/qunqar/qargashiq/jallod | 17-26k -> 14.7-18.8k | 768 | 6-7 | unique already; only decimated |
| R_aydarho (static mesh) | 20.9k -> 19.1k | 1024 | 6 | |
| R_horse / _lo / _far | 20k -> 12.2k / 3.6k / 1k | 1024 | 6 / 4 / 3 | LOD chain exists |
| R_arava (cart) | 15k -> 9.4k | 1024 | 6 | |
| B_house | 280 tris | 512 | 4 -> 7 | Khorezm adobe house: battered walls, plinth, beam ends, reed roof edge, aywan porch with carved posts, carved door, lattice window, ladder, pots, firewood |
| B_wall | 72 tris | 512 stretched | 3 -> 7 | pakhsa/mud-brick battered wall, rounded merlons, slits, beam holes, rubble; world-scaled UVs |
| B_tower | 536 | 512 stretched | 3 -> 7 | round tapered Khorezm tower (Ayaz-qala type), 8 buttress ribs, overhang ring, 10 merlons, slits, door |
| B_yurt | 2.8k | 512 | 6 | kept (good); enemy grey-felt variant = BUILD.yurt('enemy') |
| W_shield | 4972 | 3x512 | 6 -> 6.5 | replaced by BUILD.shieldY (~0.6k tris, hide dome + painted ring + umbo + 4 bosses) — it is on every askar: -4.3k tris per soldier |
| W_saber / W_axe / W_bow / W_spear | 1.2k/0.5k/0.5k/0.2k | 512 | 6 | ok |
| catapult (wave4.js: R_arava + 2 boxes + sphere) | — | — | 2 -> 7 (builder, needs R3) | BUILD.catapult |
| enemy camp (engine yurts + crates + black banners only) | — | — | 4 -> 7 (builders, needs R4) | palisade / watchtower / tent / tug / weaponRack / campfire+qazan / enemy yurt |
| env mods (Poly Haven boulder, barrel, dead tree, branches, grass, stones) | 2.7-12k | 512 | 7 | fine |
Worst 15 (start of pass): catapult, B_wall, B_tower, B_house, identical askar soldiers, identical maidens, archer, wolf, W_shield tri cost, enemy camp sets (none),
ford set (none), legacy GMAP GLBs downloaded for nothing, R_horse_lo faceting, mission-built box props in missions.js/archery.js (not my files -> R4), R_yigit reused for 3 roles.

## In-game verification (lockM, coordinator-approved) — t/mdl/mx4_c.jpg, log t/mdl/mx4.log
- m1-1 with models_ext imported + 19 spawned types (askar x2, nayza, qilich, qalqan, archer x2, wolf, shaman, qiz x2, sarbinaz, allayar, otbasqan, mother,
  qashqir, surtaysha, qumdev, jallod) playing Walking_A + the level's own army: all decimated rigs animate, no exploded skin, no missing parts, weapons in hand,
  Gúlayım blue. VAR log: every soldier got a variant (_mx + helmet), wolves atlas/scale only, bosses/shaman untouched (by design). No pageerror.
- Fix found by the test: models_ext no longer imports engine.js (a ?v mismatch after another agent's bust.py created a SECOND engine instance in my
  harness). It now waits for window.__G (engine.js:21) and installs on it — zero risk in production.
- Tweaks after looking: sandy/silver wolf atlases were too bright (gain 1.7 -> 1.05), dark-steel helmets lightened, shield hide paints lighter,
  qalqan big shield 1.7x -> 1.45x.

## Aydarha skeleton (animation agent request) — DEPLOYED assets/models/R_aydarho.glb (orig in agents/models/orig_glb/models/)
Script /home/user/t/mdl/rig_dragon.mjs: geodesic centre-line from snout tip to tail tip (Dijkstra on the welded mesh, per-band connected component that
continues the previous joint, so the front legs don't drag the chain), 16 joints, smooth 2-bone blend along the chain, lower head -> Jaw.
Rest pose = identity rotations -> unposed it renders exactly like before (same bbox 1.18x1.11x1.90, origin, file name). Deformation test t/mdl/drr.jpg
(Jaw x+0.7, Neck1 y+0.5, Neck2 x-0.3, Spine3 y-0.3, Tail2/Tail4 y+0.6): clean bends, jaw opens.
Bones (parent): Armature > Root (body centre, ~y-0.06 z0.41) > Spine1 > Neck1 > Neck2 > Neck3 > Head > Jaw ;  Root > Spine3 > Spine4 > Tail1 > Tail2 > ... > Tail7.
Model axes: +Z = head/forward, +Y up. Jaw opens with rotation.x (+ = open, ~0.5-0.8 rad). Neck/tail sway: rotation.y; neck lift: rotation.x (negative = up).
No humanoid names -> anims.json clips don't bind (SkinRig builds no tracks) — animate procedurally by bone name. Known minor: one dorsal spine piece near
the tail is weighted to a far tail bone (thin spike flicks out at big tail bends).

## NEW quadruped wolf (animation agent request) — assets/models/R_bori4.glb (622 KB, 4.7k verts / 9k tris) — NOT wired (new file)
Free 3D generation is not available on this account (only image/video/audio are in the unlim set; every 3D model costs credits), so it is procedural:
/home/user/t/mdl/wolf.mjs = SDF of smooth-unioned capsules/ellipsoids (deep chest, ruff, skull + muzzle + separate lower jaw, ears, 4 legs with
real digitigrade back legs/hocks, bushy tail) -> surface nets -> meshopt simplify -> vertices projected back onto the SDF with SDF-gradient normals ->
cylindrical UVs (seam split) + strand fur texture/normal map (tex/wolf_fur*.jpg) + vertex colours (grey-ochre steppe coat, dark saddle, cream belly/throat/
cheeks, dark nose, ear backs, amber eyes, dark tail tip) + distance-based 4-bone skin weights. Shots: t/mdl/wolf2.jpg (turntable), wolf1.jpg (pose test:
jaw open, neck/head turn, legs, tail — skin deforms cleanly).
Size: shoulder height ~0.78 m, nose-to-tail 1.72 m, origin on the ground under the body centre, +Z = head, +Y up (same convention as other models).
Bones (parent): Armature > Hips > Spine > Chest > Neck > Head > Jaw ; Hips > Tail1 > Tail2 ;
  Chest > LeftFrontUpLeg > LeftFrontLeg > LeftFrontFoot (same for Right) ; Hips > LeftBackUpLeg > LeftBackLeg > LeftBackFoot (same for Right).
  "Left" = -X. Rest pose = identity rotations (bind pose = the modelled stance). Leg swing = rotation.x of UpLeg (+ = forward), knee/hock = Leg rotation.x,
  Jaw open = rotation.x + (~0.4), head look = Head rotation.y, tail wag = Tail1/Tail2 rotation.y, tail up = Tail1 rotation.x -.
Wiring (engine/animation owners): REAL.wolf = ['R_bori4', null, 0, 1.0] (+ the 'boribasi' chieftain via mdl 'wolf' then scales x1.55) and a procedural
gait (anims.json humanoid clips will not bind to these names). Keep R_bori.glb as fallback.

## Props deployed (session 2) — exported from models_ext builders via /home/user/t/mdl/www/export.html (GLTFExporter r160, bump -> generated normal maps), then
textureCompress -> WebP (EXT_texture_webp, core GLTFLoader) + dedup/weld (/home/user/t/mdl/webp.mjs). Origins/axes/nominal sizes match the old files.
| B_house.glb | 45 KB -> 191 KB | 280 -> 2.5k tris | front (door/porch) +X as before; body centred, porch adds ~0.6 m at +X |
| B_wall.glb | 33 KB -> 57 KB | 72 -> 556 tris | merlons on the +Z side |
| B_tower.glb | 52 KB -> 83 KB | 536 -> 1.0k tris | door +Z |
| W_shield.glb | 168 KB -> 26 KB | 4972 -> 798 tris | dome +Y like before (-4.2k tris per shield-carrying soldier) |
Old files in /home/user/agents/models/orig_glb/props/. Viewer shots: t/mdl/b2a.jpg (house/wall/tower), dr.jpg (shield).

## Size summary
- assets/models: 52 MB -> 28 MB (R_* characters 43.6 -> 16 MB; incl. new R_bori4 0.6 MB and the 9.5 MB legacy GLBs that R2 stops downloading).
- assets/props: 3.7 MB -> 3.1 MB (horse/arava decimated, shield, buildings).
- New: assets/props/var/*.jpg 12 atlases ~0.8 MB total, loaded lazily per variant actually used (askar_r/b/o/k, kamonchi_r/b/o, bori_s/g, qiz_r/o/v).
- Boot (with R2 applied): character GLBs ~34 MB -> ~11 MB. anims.json (1.9 MB, animation agent's) could drop ~50% by rounding keys to 4 decimals — suggestion only.

## models_ext.js API (js/models_ext.js; sources /home/user/t/mdl/src/p1-p4.js -> build with /home/user/t/mdl/src/build.sh)
- Auto: once loaded (R1) it waits for window.__G and every 250 ms decorates new enemies + allied maidens (type 'qiz', never the player):
  askar per chapter band (ch1-2 raiders: Oirat fur caps with red tassel / open cone helmets; ch3-4: cone helmets with mail aventail + nasal, fur caps with
  ear flaps, lamellar helmets with plume; ch5-7: dark lamellar/plumed, black-red), 4 atlases, scale .95-1.04; nayza = cone + aventail + pauldrons;
  qilich = lamellar + plume (3 colours); qalqan (shield bearer) = cone helmet + pauldrons + big painted qalqan (x1.45); cavalry (d.name 'w4_cav') = fur cap
  with flaps, 3 colours; archers = fur caps + quiver + 3 atlases; captains (e.hunt / d.name *cap* / d.cap) = GOLD cone helmet + red horsehair plume + gold
  pauldrons + 1.06 scale; wolves = 3 coats + scale; maidens = 4 dress colours + scale. Shields repainted per soldier. Bosses/shaman untouched.
  Runtime: window.__MX.MX.on=false disables; window.__MX.vary(e) to force.
- window.__MXB.put(parent, name, x, z, ry, ...args) and BUILD.<name>(...args) — names/args listed under R4. Each build is cached per (name,args) and cloned
  (shared geometry + canvas textures, 1-3 draw calls per prop after bake()). Collision is the caller's (G.colC / G.colB).
  catapult: userData.arm (pivot y 2.35, cup at -Z, rotation.x -0.6 rest .. +0.9 cocked), userData.cup (stone mesh to hide on release).
- amulet(S): canonical tumar (golden down-pointing triangle, identical to skinrig.addAmulet) for any other wearer.

## Not done / wish list
- Cavalry horses: enemy riders are dressed (fur caps) but the horse (engine makeMount) has no enemy caparison yet — needs an engine hook or a mount
  callback (I can supply BUILD.caparison if the mount group is exposed).
- Paid 3D generation (NOT used; free unlim covers only image/video/audio): best value would be (1) a real quadruped wolf from Meshy/Tripo image-to-3D
  (textured, ~10k tris) to replace my procedural R_bori4, (2) Aydarha with wings/better topology, (3) 3 distinct enemy soldier bodies (light raider,
  lamellar heavy, archer) so variety is not only helmets/atlases, (4) Surtaysha horse + captain horse. Credit price was not quoted (no estimate tool for
  3D); one generate_3d dry-run quote per model before deciding.
