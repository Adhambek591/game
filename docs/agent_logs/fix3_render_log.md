# fix3 — archery + rendering fixes (author's phone playtest), log

Backups of my files before this pass: /home/user/agents/fix3/{archery,fx,env,scenery,skinrig,glbrig}.js
Patch scripts (python str.replace with asserts): /home/user/agents/fix3/p_arch1.py, p_scn1.py, p_fx1.py
Test harness: /home/user/t/fx3/ (snap.sh = parse-checked snapshot of the repo per port; rt.sh = mission screenshots + spawned enemies;
rta.sh + ax.js = archery visual run (view / 2x / 5x / flight / impact / bot play-out)). Ports 8931/8932. Nothing committed/pushed/deployed.

## 1. Archery (js/archery.js)
- No wind, no drop: GRAV 0, KW 0, wind forced 0 every tick (S.wind/S.wS), TU-S far target no longer gets wind; wind pill hidden.
- Fast arrows: V0 150 m/s (100 m in ~0.67 s); straight flight.
- 🔍 zoom button (left of the shoot button): 1x / 2x / 5x (fov 52 / 24 / 11), smooth lerp; also mouse wheel / Z key. Scope ring shows from 2x.
  Pins, wind ticks and level bubble removed from the sight.
- Aim assist: dashed circle around the reticle (radius max(34 px, 12% of screen height)); turns red when a target is inside, gold when the
  head is the nearest part. On release the nearest guard / range target / rope inside the circle is hit: the arrow is launched straight at it
  (lead for walkers; head if the reticle is closer to the head than to the body centre, else body). If a wall blocks both the head and the body
  line, the raw aim is used (honest miss into the wall).
- Auto steady: no sway / breathing; breath button hidden. Hold to draw, release shoots (tap >= 0.12 s also shoots).
- Every arrow: glowing sprite at the head (constant screen size, scaled with zoom) + bright warm trail whose width keeps ~3 px at any
  distance/zoom; trail fades 0.5 s after impact.
- Arrow cam only for the final required kill / last rope / last range target, real-time flight (no slow-mo), 0.4x impact beat, hard cap 1.2 s,
  tap to skip (unchanged). Toggle in ⚙ unchanged.
- Hit marker (X at the reticle: white hit, red kill, gold headshot) + own WebAudio impact "thock" (+ ring for headshots), volume = SET.snd.
- Arrow count also as a badge on the shoot button; arrows pill larger.
- New local strings (qq to be checked by the author): arz_zoom, arz_assist; tu_t_bow2 / tu_t_bow3 overridden locally (the i18n ones talk
  about lead / drop / wind).
- Water: archery uses G.waterY (set by scenery) instead of the fixed -0.32.

## 2. Mission 2-3 "huge flat yellow-beige ellipse with floating brown chunks"
- Cause: missions (m2/src/50_run_a.js) builds the archers' ridge as an untextured MeshStandardMaterial SphereGeometry scaled (3.6, 1.45, 8.5)
  at (10.2, -66) with boulders/archers on it -> under the top-down camera it is a flat beige ellipse with the dark archers/boulders as
  "floating chunks". Not a sandstorm mesh (storm() is a DOM overlay + fog + bursts).
- Fix without touching the missions file: fx.js scanShapes() (every 1.5 s, flag userData.fxR) finds flattened untextured spheres
  (scale.x > 1.5, y < 0.7 * min(x, z)), turns them into a real terrain mound via G.scn.reshape (smooth plateau profile, same ground
  texture/lighting), hides the sphere and re-seats props standing on it. Verified: gfx/fx3_23b_1.jpg (same spot as the bug, no ellipse).
## 3. Blue speckled enemies
- Cause: fx.js TEAM.enemy rim = blue 0x6fb4ff with k 1.25 + blue tint [.74,.8,.98] and desaturation (session-4 "cool enemy rim"):
  the rim term on noisy Meshy normals + dark steel textures read as blue speckle. Now enemy: rim 0xcfc6b8 k .22, sat .95, tint ~neutral;
  elite: red rim k .7 (was 1.9), tint ~neutral. Guloyim keeps her own blue atlas (skinrig blueOutfit, only o.amulet rigs).
  Verified gfx/fx3_23b_0.jpg + crop gfx/fx3c_e.jpg (askar / nayza / qilich / wolf / archer: dark steel, no blue, no speckle).

## Bridges (coordinator extra: "every bridge must span real water or a ravine")
- scenery.js new API on G.scn (also usable by missions/combat):
  - G.scn.reshape(fn(x,z,h)->h, box)   edit relief after the level is built (terrain meshes in place, or relief-ify flat engine ground).
  - G.scn.bridgeGap({ z1, z2, deckW, deckY, deckTop, hw, bank, wy, water, piles, straight, deck })   carve a river/ravine across the field
    under a deck spanning z1..z2, add flowing water (riverMat ribbon), piles + cross beams, optional plank deck over a flat mission box
    (`deck` mesh gets hidden), drops props onto the banks / hides those that would stand in water, registers the deck.
  - G.scn.deckAt(x, z) -> deck top y or null.  **For the combat agent**: units standing on a deck should use this height (lane is y 0
    elsewhere). Registered decks: ch3 bridge (|x|<6.2, z -85.8..-70.2, y .06), 1-3 deck (|x|<3.2, z -94..-60, y .225), 6-S drawbridge
    (|x|<2.3, z -116.2..-110, y ~.14 once lowered). G.waterY = level water surface (ch3 -1.05, 1-3 -1.15, 6-S -1.25), undefined elsewhere.
- ch3 river (3-3 bridge, tutorial bridge, all ch3 levels): surface RIVER -0.42 -> -1.05, banks 3.6 m wide sloping, bed ~ -2.4; bridge
  15.6 m long (was 13) with longer piles; side colliders z +-7.2 (was 5.6); laneDip widened. Shots gfx/fx3_br33_0/1.jpg.
- 1-3 narrow bridge (mission builds a flat 6.4 x 34 m box on flat ch1 ground): fx scanShapes detects long thin wooden decks lying on
  flat ground (BoxGeometry depth >= 12, width <= 9, height <= .5, |x| < 2, wood hue) and calls bridgeGap: river 18 m wide with banks,
  piles + braces, plank deck. Shot gfx/fx3_br13b_0.jpg (before: gfx/fx3_br13_0.jpg).
- 6-S drawbridge: archery.js digs a water moat in front of the gate (bridgeGap straight, no piles); maidens charging over it walk on the
  deck (archery groundY consults G.scn.deckAt first).
- ch5 rope bridge already hangs over the pass (only built where the gorge is >= 9 m high) - unchanged.

## Rings on decks (coordinator, after the combat agent raised units onto decks via engine deckY)
- fx.js deckH(x,z) mirrors engine deckY (engine G.decks boxes, + G.scn.deckAt, + lane-over-river-channel = .07).
- Unit blob shadows / team rings (fx tickUnits) now sit at the unit's foot height (e.o.position.y - e.y), not at y .05.
- New tickRings(): hero ring (p.mark.g) lifted to the hero's deck height every frame; engine attack telegraphs (G.tele[].g, drawn at
  .07/.08) lifted by deckH at their position (idempotent whether or not the engine re-sets y each frame). No engine.js edit.
- Note: my 1-3 plank deck hides the mission's flat box but leaves it in the world, so engine scanDecks still finds it (top .225 =
  plank top). Consistent with the combat agent's deckY.

## Tests (844x390, swiftshader; sandbox has 1 CPU shared with other agents -> 1-2 min per screenshot)
- Logic (render stubbed, bot aims with a random reticle offset up to 0.8 x assist radius, 2x zoom), fx3/axl.js:
  3-S 6 shots / 6 guard hits (5 head), no alarm, win; 6-S 9 shots = 7 guards + 2 ropes, no alarm, win (moat code ran);
  5-S 7 shots / 7 hits, no alarm, win. No [pageerror].
- Visual: fx3/a3_0view (1x, HUD: 🔍 1x, arrows badge, assist circle locked), a3_2zoom5 (5x scope, red lock, 83 m), a3_3fly (trail),
  a3_5imp (kill, sparks, counter 1/6); a6_0view (6-S, zoom tip), a6_2zoom5.
- More shots: 6-S moat + lowered drawbridge fx3/m6_0.jpg (ch6 paved lane is re-meshed to follow the moat); 1-3 deck with units, blob
  shadows and hero ring on the planks gfx/fx3_r13_0.jpg; 1-3 bridge gfx/fx3_br13b_0.jpg; 3-3 bridge gfx/fx3_br33b_0.jpg.
- Tutorial bow step (TU-S) was NOT reached in the harness (driving the tutorial's dialogues to the sniper step timed out in this
  sandbox, fx3/tu_0view.jpg = first dialogue). TU-S only changed in data (no wind on the far target, new tips) and shares all code paths
  with 3-S/5-S/6-S, which were tested.
- bust.py run after the edits. No [pageerror] in any of my runs (the one "Unexpected token export" at ~15:33 was engine.js mid-edit by
  the combat agent; snap.sh now refuses snapshots that don't parse).
