# Missions v2 log (mission design fix after the author's play-test)

Owner files: js/missions.js (rebuilt from parts in /home/user/agents/m2/src/*.js via build.sh), js/map.js (fly-over logic only), js/story.js, js/i18n.js.
Backups before my edits: /home/user/agents/m2/{missions,map,story,i18n}.js. Nothing committed / pushed / deployed.
missions.js is generated: 00_head, 10_table (MLIST, stars, win/fail), 20_kit (encounter kit), 30_mid (sentry/raid/potion boss), 40_convoy, 50_run_a (ch 0-3), 60_run_b (ch 4-7 + test bot), 70_fly.
build.sh refuses to overwrite if another agent touched the live file (the meta agent's `__META.missionEnd` hook in win() is kept in 10_table.js).

## What changed (systems)
1. **Encounter kit** (20_kit.js) — `post(list, opts)` places a mission's enemies in the level BEFORE the intro fly-over: standing guard (slow look-around),
   patrolling (x or z), sitting round a camp fire, archers on a ridge (y offset). They wake when the hero comes within the wake radius, when one is hit,
   when the convoy comes near, or on script (`wake(g)`); "!" over the heads + horn. `clear(g…)` waits for them, points the arrow, then saves a checkpoint.
   `rein(list, who, barkKey)` = reinforcements / ambush that still pop in (used for the mid-mission twist). `leader(g,x,z)` = captain ("Júzbası"):
   big, tough; when he falls the rest of his group is staggered and loses 35% HP ("kill the leader first"). `preBoss()` = the boss stands idle in the arena
   from the start; story.js `bossFight()` adopts it. Role aliases: 'heavy' → combat agent's `nayza` (fallback potion soldier), 'alpha' → `boribasi` (fallback wolf).
   Engine quirk handled without touching engine.js: far enemies are teleported to the hero after 3 s (engine.js update()) — sleepers keep `farT = -1e9`.
   This also fixes the old stealth mission 3-3, whose sentries were being teleported onto the player.
2. **Direction arrow** (`#dir`, built by missions.js with inline styles so the UI agent can restyle it): explicit target → nearest awake enemy → last marker;
   shows distance in metres; red when it points at an enemy. Replaces the fixed "▲" (#goarrow is no longer toggled by story.js goTo).
3. **Intro fly-over** (map.js `flyFor`/`introFly(points, liveUnits)` + missions.js `flyPoints()`): keyframes are the real posted groups / bosses (max 5),
   camera low and close (6 m up, 10 m back; 5 m / 10.5 m for bosses), no rings, group name label / boss card above the units. The game is NOT paused during
   the fly-over (G.flying): guards patrol, fires burn; the hero is pinned, nothing can wake. Camera: glide that never stops dead (s − 0.6·sin(2πs)/2π per segment),
   exponential follow (inertia) on position and look-at, slow sway + a little hand-held breathing. Tap / Enter still skips. Legacy chapter fly-over (rings) only for `?legacy=1`.
4. **Checkpoints**: every `clear()` / `dead()` / escort ambush saves one (death → retry at the checkpoint, enemies stay dead). Convoy and 5-3 escort have stage
   checkpoints: a destroyed convoy restarts the current stage with ≥60% convoy HP instead of restarting the mission.
5. **Secrets**: `page(x,z)` = hidden page of the "Dástan kitabı" (rotating scroll, sparkle within 22 m, +25 gold, saved in localStorage `qq_pages`); new star rule `sec`
   ("found the hidden page") in 1-3, 2-2, 3-1, 4-2, 5-1, 6-1, 7-2 (replaces the "finish in 5:00" star there). `chest(x,z,gold)` = treasure chest off the main path.
6. **Onboarding**: 0-1 move → attack on 4 sleepy guards (2 sit by a fire) → `practiceDodge()` = a harmless telegraphed red circle (✓ +10 gold if you leave it) → skills on the
   next wave → boss. 1-1 one lone looter to practise on before the mother, skills 2-3 after the first camp, ulti with Sarbinaz. 1-4 wolf leap over the ravine (as before).
7. **Barks**: `bark(who,key)` = one-line non-blocking speech ("Sárbinaz: Artımızdan hújim etip atır!") at the twist; full dialogs only at start / end.
8. **End screen**: adds coins earned, pages found, and a preview line of the next mission (icon + name); "next mission" stays one tap.
9. **Prologue narrator card**: `lore_sur` shown after the v2 cutscene in mission 0-2 (and in the legacy prolog), 4 languages. Text only — voice later.

## Final mission list (30) — per-mission design
Format: **beats** (hook → escalation + twist → climax) · encounter plan (P = posted before the fly-over, R = reinforcement) · teach / new element · secret · stars.
"heavy" = nayza spearman (combat agent) or potion soldier; "captain" = Júzbası leader.

### Prologue (Allayar)
- **0-1 Sarkop kósheleri** — hook: night raid cutscene + first camp; twist: wolves + soldiers pour out after the dodge drill; climax: Camel-giant (stands in the square from the start) with 2 soldiers + 2 archers.
  P: 4 askar round a fire (2 sitting, 1 patrol) · R: 3 askar + 3 wolves · P: Camel-giant + 4 guards. Teaches move → attack → dodge (safe circle) → skills. Chest. Stars: win / no fall / HP>50%.
- **0-2 Surtayshaǵa qarsı** — hook: Surtaysha's guard blocks the square (P: 3 askar + 2 archers, Surtaysha visible behind them); escalation: the duel (20 s); twist: QTE you cannot win; then cutscene v2 + NEW narrator card `lore_sur`. Stars: win / held 20 s / resisted to the end.

### Chapter 1
- **1-1 Janıp atırǵan awıl** — hook: one lone looter to practise on, mother's story; escalation: guard camp (P: 2 sitting by fire + patrol + 2 archers), R: 3 askar + 2 wolves + archer when skills 2-3 unlock; Sarbinaz joins, ulti unlocks;
  climax: horde (P: 5 askar, 2 wolves, 2 archers) + twist R from behind (2 wolves + askar, "Artımızdan hújim etip atır!"). Side objective: 3 hidden children (+15 gold each) = star 2. Stars: win / 3 children / no fall.
- **1-2 Atxana** — hook: sorcerer's party at the stable (P: mage, 3 askar, wolf); escalation: break the door in 45 s under attack (3 enemies); twist: at 26 s three wolves from behind. Chest. Stars: win / door in time / no fall.
- **1-3 Awıldı azat etiw (NEW, replaces "survive the timer")** — clear countable goal "⛓ n/3": three guard camps hold villagers.
  Camp 1 (P: 2 sitting by fire, patrol, archer) → Camp 2 behind a stake fence with a gap (P: 3 askar, wolf, 2 archers) → twist: counter-attack from behind (R: 3 wolves + 2 askar) →
  Camp 3 = the captain's camp (P: captain, 4 askar (2 by fire), 2 archers, shaman). Freed villagers cheer and run home. Dialog start (Sárbinaz/Gúlayım), bark when the captain wakes, end line. Dusk light.
  Secret page + chest. Stars: win / hidden page / no fall. First mission with the captain mechanic and stakes.
- **1-4 Qasqır bek** — boss visible in the ruins with 3 wolves (P), fight, cutscene, then the wolf-leap tutorial over the ravine. Stars as before.

### Chapter 2 (new: potion soldiers, heavy, shaman; wolf leap usable)
- **2-1 Kárwan izi menen** — horseback chase (unchanged; breather after the boss).
- **2-2 Shóldegi duzaq** — hook: Bayimbet the traitor; twist: the ambush springs right after the talk (R: 4 wolves + askar around you);
  climax: raiders' camp (P: captain, 2 sitting, heavy, wolf, patrol) with archers + shaman behind a stake line — walk round through the gap or wolf-leap over (hint); R: heavy + 2 wolves + 2 askar. Page + chest. Stars: win / no fall / hidden page.
- **2-3 Duzlı shól arqalı (REWORKED convoy)** — see "Convoy" below.
- **2-4 Qum dáwi** — hook: outriders (P: 2 wolves, 2 askar, archer); boss stands in the arena; phases as before; chest on the short walk out (walk shortened −168 → −158).

### Chapter 3 (new: stealth, chain power)
- **3-1 Qul kárwanı** — camp by the fire (P: 2 sitting, potion, patrol, 2 archers) → captives' guards with a captain (P: 2 wolves, shaman, 2 askar) → twist R from the river side (2 askar, wolf, archer, heavy) → free captives. Page + chest. Stars: win / no fall / page.
- **3-2 Dárya boyındaǵı hújim** — horseback raid (unchanged).
- **3-3 Túngi basqın** — stealth; the 12 sentries are now in place before the fly-over (and no longer teleported by the engine), 2 camp fires, checkpoints at z −70 / −110, 2 chests off the path. Stars: win / never seen / no fall.
- **3-4 Shınjırshı jallad** — hook: gate guards (P: 2 askar, 2 archers, wolf); boss visible; after the boss the captives' guards (P: heavy, 2 askar, 2 wolves, archer, shaman) were standing there from the start.

### Chapter 4 (new: alpha wolf, water)
- **4-1 Jaǵa boylap quwıw** — horseback chase (unchanged).
- **4-2 Qalmaq kemeleri** — shore camp (P: 2 sitting, heavy, patrol, 2 archers) → archers + shaman behind stakes (leap or gap) → twist: landing party from the water side (R: 2 askar, 2 wolves, archer) → captain's group (P: captain, 2 wolves, 2 askar, heavy, archer). Page + chest. Stars: win / no fall / page.
- **4-3 Qasqırlar basshısı** — prowling pack (P: 5 wolves) → mixed (P: potion, 2 wolves, 2 askar, archer) → R 3 wolves from behind → pack with an alpha (P) → giant wolf chieftain visible on the fly-over. Chest.
- **4-4 Aydarha** — hook: shore guard (P: 2 askar, 2 archers, shaman); dragon visible in the water; chest.

### Chapter 5 (Sarbinaz; new: javelin, archer lines)
- **5-1 Taw darası** — camp (P) → R from both ends → captain's group (P) → R. Page + chest. Stars: win / no fall / page.
- **5-2 Oq-jayshılar sawashı** — four firing lines visible from the start, two behind stake fences with a gap; twist: 2 sorcerers join the last line. Chest. Stars: win / ≤2:30 / HP>50%.
- **5-3 Jaralanǵan qız** — the wounded maiden now RIDES (3.3 m/s, takes 30% damage, cannot be dismounted); 4 ambushes = checkpoints (fail → back to the last ambush with 60% HP, not a restart);
  climax: a captain's camp blocks the pass (P: captain, 2 sitting, 2 archers, heavy). Chest. Stars: win / maiden HP>50% and never lost / no fall.
- **5-4 Qunqar dáw** — hook: guards (P: 2 askar, 2 wolves, archer); boss visible.

### Chapter 6 (new: gate, defend)
- **6-1 Qashal kósheleri** — street guard (P: potion, 3 askar, 2 archers, shaman) → twist: side-street ambush (R: 2 askar, 2 wolves, archer) → captain's group (P: captain, heavy, 2 wolves, 2 askar, 2 archers, shaman). Page + chest. Stars: win / no fall / page.
- **6-2 Tutqınlardı qorǵaw** — first raid party visible (P) then 3 more waves from different sides each announced by a bark, potion-wolf mini-boss; checkpoint by the captives.
- **6-3 Temir dárwaza** — gate + 3 gate guards (P), harassers from behind every 13 s (alternating askar/archer and wolf parties); inside: captain's group (P) that wakes when the gate falls; chest. Stars: win / ≤3:20 / no fall.
- **6-4 Qarǵashıq patsha** — hook: 2 askar + 2 archers (P); boss visible.

### Chapter 7
- **7-1 Aqırǵı hújim** — horseback charge (unchanged).
- **7-2 Qanlı orda** — camp (P: heavy, 2 sitting, 2 wolves, 2 archers, shaman) → R from behind → stake line (leap/gap) → horde (P) with Qashqir (visible, boss bar when the horde wakes). Page + chest. Stars: win / no fall / page.
- **7-3 Qanlı totemler** — totems and their guards (P: askar + archer + wolf/shaman each) visible; summons only from totems near the hero; twist at 2 totems left: heavies from behind + checkpoint; final wave. Chest.
- **7-4 Surtaysha** — final boss visible on the fly-over; checkpoint at the arena.

### Campaign pacing (new element about every 2 missions; breather after each boss)
0-1 basics → 1-1 skills/ulti → 1-3 captain + stakes → 1-4 wolf leap → 2-1 ride (breather) → 2-2 potion/heavy/shaman + leap shortcut → 2-3 convoy → 2-4 boss + Earth slam → 3-1 ride-free breather camp → 3-3 stealth → 3-4 chain →
4-1 ride (breather) → 4-3 alpha wolf/mini-boss → 4-4 water shield → 5-1 new hero → 5-2 archer lines → 5-3 mounted escort → 5-4 giant → 6-1 city (breather) → 6-2 defend → 6-3 gate → 6-4 ghost rider → 7-1 ride → 7-3 totems → 7-4 final.

## Session 3 (takeover, 05:12+) — v3: rescue battles + duels (author's revised list)
Sources: build now = 00_head 10_table 20_kit 30_mid 40_convoy **45_rescue** 50_run_a 60_run_b **65_v3** 70_fly (build.sh updated). Backups: /home/user/agents/m2/src_pre_duel/, i18n.pre_v3.js, story.pre_v3.js.
Main's "Qashqir bek" → "Qashqir" rename ported into src (50_run_a comment) so build.sh stays in sync.
Earlier in this session (before the new direction): wolf skill (5) no longer locked in ch1 (on from 1-1 after the first camp with hint `h_skill5`; 1-2..1-4 start with it; 1-4 banner no longer says "new power"),
leap hint when the 1-3 stake camp wakes; convoy balance (storm wolves every 10 s, +25% convoy HP when the wheel is fixed). lore_sur card verified (4 languages, exact author text).

### Systems
- **Rescue kit** (45_rescue.js): `people(list, o)` = a group of people in danger (team ally, killable, enemies target them), kinds: `bound` / `cage` (carried off when the clock ends), `drag`
  (roped line pulled by handlers toward an exit — `dragGroup()`; ropes drawn; kill the handlers), `fire` (burning house/stable behind a breakable door — burn at 0), `altar` (sacrifice at 0),
  `wound` (wounded maidens — reach them), `walk` (captives crossing, halt when enemies are near), `ride` (captive on a fleeing rider's horse; escape = lost).
  Per-group world-space label "⛓ 3  ⏳ 24" (red under 10 s), clock starts when the hero comes near (or `auto`), freezes during the fly-over; freed people cheer and run to `G.mis.safe`;
  `guardR` picks the guards around the group when its clock starts; `raid` makes guards hunt the people (raidAI). HUD counter "🧍 saved/total ✖ lost". Groups show in the intro fly-over with labels.
  `rain(every, 'rock'|'fire')` = telegraphed rockfall / arrow-fire rain around the hero (G.mis.hazard).
- **Duel kit** (20_kit.js `duel(o)`, 65_v3 `champ(key,…)`): ring (stones + rope ring + two fires), opponent's men watch from the far half (team npc, cheer), own allies step back to
  the near half and watch, every other enemy holds still, hero and opponent are kept inside the ring, "JEKPE-JEK" name card + title + intro lines, boss bar, opponent = scaled unit with
  the boss move set (telegraphed charge / quake / volley via H.bossBrain) and poise; `nonLethal` (Bayimbet yields at 30%); after: crowd flees, stays, or attacks ('fight').
- **Stars (all missions except 0-2)**: 1 = mission done; 2 = ≥60% of the people to rescue survived (missions with nobody to rescue: at least half the maidens alive; convoy: caravan HP > 50%);
  3 = nobody lost and no maiden lost (convoy: never destroyed, HP > 70%, no maiden lost). Skill stars (no-hit, dodges, poise) were not added.
- Hooks: `G.mis.onLive` (after level build, in live()), `G.mis.onRide` (story.js rideLevel, after riders spawn), `G.mis.beforeWin` (start of win()).

### Mission list v3 (qq names)
0-1 Sarkop dárwazası (townsfolk held by the raiders, freed → run inside; camel giant) · 0-2 Surtayshaǵa qarsı (unchanged, + lore card)
1-1 Janıp atırǵan awıl (2 roped lines dragged off + mother sub-task + horde, ends with the yuzbashi duel) · 1-2 Atxana qamalı (NEW: burning stable 70 s, door, wolf shaman + wolves ring, boribasi twist) ·
1-3 Tar kópir (NEW: plank bridge with rails, 5-nayza phalanx advancing in step + archers, captive caravan driven off beyond it, captain) · 1-4 Qasqır (unchanged)
2-1 Atlı quwǵın (riders carry captives; 2 of 3 riders have one) · 2-2 Bayımbettiń sınawı (NEW: non-lethal duel in front of the camp, raiders fall on the onlookers, captain's camp) ·
2-3 Qudıq ushın sawash (convoy code, renamed) · 2-4 boss
3-1 Túngi lager (old stealth + 3 yurts with bound captives) · 3-2 Qul kárwanı (old camp + roped line led by 2 nayza) · 3-3 Kópirdi uslap tur (NEW: 8 captives cross, 5 boat landings
from both banks every 11 s, archer commander) · 3-4 boss
4-1 Jaǵadaǵı atlılar (riders with captives) · 4-2 Keme palubası (caged captives in the hold + deck duel with the ship captain) · 4-3 Qasqırlar basshısı (3 fishing-village groups + wolf chieftain) · 4-4 boss
5-1 Taw darasındaǵı duzaq (3 pairs of wounded maidens, rockfall, cliff archers) · 5-2 Sárbinaz jalǵız (NEW: 3 champion duels — spear, sword, strongman — each with a cage on a 70 s clock) ·
5-3 Sadaqshılar minarası (NEW: tower with archers on top, door, shepherds caged beneath, captain) · 5-4 boss
6-1 Tar kósheler (4 burning houses with doors along the street) · 6-2 Dárwaza qamalı (old gate mission + fire/arrow rain + burning quarter) · 6-3 Qapaslar (NEW: 3 guarded cages on clocks,
chain champion mini-boss roaming) · 6-4 boss
7-1 Aqırǵı hújim (unchanged) · 7-2 Sıyqırshılar sheńberi (old totems + 4 altar groups) · 7-3 Úsh qasqır batır (NEW: 3 boribasi champion duels, the last one's pack attacks after) · 7-4 boss

### New qq strings v3 (please check — Karakalpak Latin, reusing words already in i18n.js)
Kit/HUD: r_freed Azat etildi: {n} · r_taken Tutqınlardı alıp ketti! · r_lost_fire Keshigip qaldıńız — ot bárin jalmadı · r_lost_altar Keshigip qaldıńız — qurbanlıq etildi · r_bound Baylanǵan tutqınlar · r_drag Tutqınlardı alıp ketip baratır · r_fire Janıp atırǵan atxana · r_cage Qapastaǵı tutqınlar · r_altar Qurbanlıq · r_wound Jaralanǵan qızlar · r_walk Tutqınlar dáryadan ótip atır · r_ride Atlı tutqın alıp qashıp baratır · r_town Qala xalqı · r_yurt Otawdaǵı tutqınlar · r_hold Keme ishindegi tutqınlar · r_fish Balıqshılar · r_house Úyge qamalǵanlar · r_tower Minara astındaǵı shopanlar · duelT JEKPE-JEK · duelO {n} penen jekpe-jek · duelClean Bir soqqı da jemey jeńdińiz! · duelWon Qarsılas jeńildi! · s_most Kópshilik qutqarıldı · s_mostq Qızlardıń kópshiligi aman qaldı · s_all Hámmesi qutqarıldı, bir de bir qız joǵalmadı · s_allq Bir de bir qız joǵalmadı

Names/objectives: v3n_0_1 Sarkop dárwazası · v3o_0_1 Diywaldı uslap turıń — qala xalqı dárwaza ishine kirsin · v3n_1_1 Janıp atırǵan awıl · v3o_1_1 Arqanǵa baylap súyrelip baratırǵanlardı qaytarıp alıń hám júzbasını jeńiń · v3n_1_2 Atxana qamalı · v3o_1_2 Janıp atırǵan atxanadaǵı hayallar menen balalardı qutqarıń · v3n_1_3 Tar kópir · v3o_1_3 Nayzagerler qatarın buzıp ótiń — tutqınlar kárwanı alıp ketilmesin · v3n_2_1 Atlı quwǵın · v3o_2_1 Tutqın alıp qashıp baratırǵan atlılarǵa jetip alıń · v3n_2_2 Bayımbettiń sınawı · v3o_2_2 Bayımbet penen sınaw jekpe-jegi · v3n_2_3 Qudıq ushın sawash · v3o_2_3 Qum boranında azat etilgenlerdi qudıqqa shekem qorǵań · v3n_3_1 Túngi lager · v3o_3_1 Otawlardaǵı baylanǵan tutqınlardı birme-bir azat etiń · v3n_3_2 Qul kárwanı · v3o_3_2 Nayzagerler qorǵap baratırǵan qul kárwanın azat etiń · v3n_3_3 Kópirdi uslap tur · v3o_3_3 Tutqınlar dáryadan ótkenshe kópirdi uslap turıń · v3n_4_1 Jaǵadaǵı atlılar · v3o_4_1 Kemelerge aydalıp baratırǵan tutqınlardı tartıp alıń · v3n_4_2 Keme palubası · v3o_4_2 Keme ishindegi tutqınlardı shıǵarıń hám keme basshısın jeńiń · v3n_4_3 Qasqırlar basshısı · v3o_4_3 Balıqshılar awılın qasqırlar toparınan qutqarıń · v3n_5_1 Taw darasındaǵı duzaq · v3o_5_1 Jaralanǵan qızlardı tas qulawı hám oqlar astınan alıp shıǵıń · v3n_5_2 Sárbinaz jalǵız · v3o_5_2 Úsh qalmaq batırın izbe-iz jeńiń · v3n_5_3 Sadaqshılar minarası · v3o_5_3 Minara astındaǵı shopanlardı azat etiń · v3n_6_1 Tar kósheler · v3o_6_1 Úylerge qamalǵan qala xalqın birme-bir qutqarıń · v3n_6_2 Dárwaza qamalı · v3o_6_2 Oq hám ot jawını astında dárwazanı buzıń · v3n_6_3 Qapaslar · v3o_6_3 Shınjırshı batır qorǵaǵan qapaslardı waqıt pitkenshe ashıń · v3n_7_2 Sıyqırshılar sheńberi · v3o_7_2 Qurbanlıqqa tayarlanǵan tutqınlardı qutqarıń, totemlerdi buzıń · v3n_7_3 Úsh qasqır batır · v3o_7_3 Surtayshanıń úsh qasqır batırın maydan jekpe-jeginde jeńiń

Champions/titles: v3c_yuz Qalmaq júzbası · v3t_yuz Awıldı órtegen basshı · v3c_sham Qasqır sıyqırshısı · v3c_phal Nayzagerler qatarı · v3c_kap Keme basshısı · v3t_kap Jaǵa qaraqshılarınıń basshısı · v3t_bay Sınaw — ólimge shekem emes · v3c_ch1 Nayzager batır · v3c_ch2 Qılıshker batır · v3c_ch3 Palwan batır · v3t_ch1 Birinshi qalmaq batırı · v3t_ch2 Ekinshi qalmaq batırı · v3t_ch3 Úshinshi qalmaq batırı · v3c_w1 Kúlreń qasqır batır · v3c_w2 Qara qasqır batır · v3c_w3 Qanlı qasqır batır · v3t_w Surtaysha batırı · v3c_arch Sadaqshılar basshısı · v3c_tow Minara sadaqshıları · v3c_chain Shınjırshı batır

Dialog/barks/hints: v3d_yuz Sen awılımdı órtediń. Endi men menen jekpe-jekke shıq! · v3d_13 Kópirden arjaqta tutqınlardı aydap ketip baratır. Tezirek! · v3d_bay Kúshińdi kórset, Gúlayım. Qılısh penen, biraq ólimge shekem emes. · v3d_bay2 Jeter! Sen haqıyqıy batırsań. · v3d_33 Hámme kópirden ótkenshe bir adım da sheginbeymiz! · v3d_cap Tutqınlar kemede! Basshısın jıqsaq, qalǵanları qashadı. · v3d_cap2 Onda men onıń menen jekpe-jekke shıǵaman. · v3d_52 Qızlar artta qaldı. Batırlarǵa jalǵız ózim shıǵaman. · v3d_ch1 Nayzası uzın, biraq soqqısınan keyin ashılıp qaladı. · v3d_ch2 Bul tez. Asıqpayman — kútemen. · v3d_ch3 Eń kúshlisi. Jerge ursa, shetke sekiremen. · v3d_53 Shopanlar minara astında. Esikti buzsaq, sadaqshılar túsedi. · v3d_63 Qapaslardı shınjırshı batır qorǵap tur. Waqıt az! · v3d_73 Surtayshanıń qasqır batırları maydanda kútip tur. · v3d_73b Birme-bir shıqsın. Qırq qız gúwa bolsın! · v3d_w1 Birinshisi. Shaqqan, biraq kúshsiz. · v3d_w2 Ekinshisi jerdi silkindiredi. · v3d_w3 Aqırǵısı — eń jawızı. Onnan keyin topar hújim etedi! · v3b_phal Nayzagerler qatarı! Qaptaldan yamasa sekirip ótiń! · v3b_boat Qayıqlar! Eki jaǵadan da túsip atır! · v3b_arch Qırdaǵı sadaqshılar basshısı — áwele onı! · v3b_tow Esik buzıldı! Sadaqshılar túsip atır! · v3b_chain Shınjırshı batır oyandı! · v3h_phal Nayzagerlerdi aldınan buzıp bolmaydı — qaptalınan urıń yamasa Qasqır shaqqanlıǵı (5) menen sekiriń · v3h_tow Minara esigin buzıń — sadaqshılar tómenge túsedi

Also (earlier this session): h_skill5 Sheberlik túymelerin isletiń (1, 2, 3) — 5: Qasqır shaqqanlıǵı, alǵa atılıp joldaǵı dushpanlardı jıǵadı
Unsure words: jekpe-jek (duel), otaw (yurt), qapas (cage), palwan, nayzager, qılıshker, keme palubası, minara, shopan, sıyqırshılar sheńberi, súyrelip, jalmadı, gúwa.

### Tests (session 3; port 8831/8833, LOWQ, 844x390; consistent snapshot via /home/user/t/msnap.sh; scripts m2_run.js (logic), v3b.sh (batch), dv.js (teleport + screenshots), m4_vis.js, modchk.js)
- Played to the end screen with the test bot (god-mode, so balance is NOT verified): 1-1, 1-2, 1-3, 2-2, 2-3, 3-1*, 3-3, 4-2*, 4-3, 5-2, 5-3, 6-2, 6-3, 7-2, 7-3 — all 0 [pageerror], stars written to qq_stars.
  (* = 60 s smoke only.) 0-1, 2-1, 4-1, 5-1, 6-1 only smoke-loaded (0-1/6-1/2-1 sit behind intro cutscenes that the logic bot did not get past within the timeout); no pageerrors.
- All modules import in Chromium (modchk). The convoy (2-3) full run: dune ambush → ridge archers → wheel → storm → blockade, convoy bar, cart/horse/trail as before.
- Screenshots: dv52_1/2.jpg (5-2 duel: ring, cheering crowd, cage behind, boss bar, telegraph), dv12_0.jpg (1-2), dv43_0.jpg (rescue label clamped at the screen edge), v3v52_0.jpg.
- Bugs found and fixed while testing: groups were "freed" before their clock started (empty guard list) — now only after start and after mstart(); drag handlers showed as targets for the
  arrow before their group started (now asleep); 3-3 never ended if the captives arrived before all landings; labels were hidden whenever the group was off screen (now clamped to the edge);
  caged/bound people died to stray arrows (held people take 25% damage except from raiders); rescue HUD counter overlapped the portrait.

### Honest weaknesses / not done
- Balance unverified: the test bot is god-mode. Clocks (40–150 s), champion HP (800–2400) and the 25% "held" damage need a real play-test on a phone.
- Visual check is partial: under SwiftShader + other agents' browsers, page screenshots often time out. Not looked at: the 1-3 bridge/phalanx, the 5-3 tower, 6-1 doors, the 3-1 yurts, the 4-2 deck.
- New props are simple primitives (yurt cone/cylinder, cage bars, tower cylinder, plank deck); a graphics pass with real models would help.
- 2-3 "Battle for the well" is the convoy mission renamed — there is no well prop, and the freed people are still one shared HP pool, not individual people.
- 0-2 keeps its own stars (held 20 s / resisted). Missions with nobody to rescue (bosses, 7-1, 2-1/4-1 fall back only if no captive spawned) use the maiden rule.
- The duel keeps hero and opponent inside the ring by clamping positions (no visible wall); dash skills can look like they bump an invisible edge.
- Old i18n keys (mn_*/mo_* of the replaced missions) are still in i18n.js, unused by the table; the old in-mission objective lines (e.g. "Saqshılarǵa kórinbey tutqınlarǵa jetiń" in 3-1) are reused.
- Follow-up (after the usage reset): with the cutscene-skipping runner (/home/user/t/m2b_run.js, v3c.sh) 0-1 (3★), 2-1 (1★: the riders got away from the bot, so their captives counted as lost), 5-1 (3★) and 6-1 (2★: one burning house was lost)
  were played to the end screen with 0 [pageerror]. 4-1 not run (it uses the same code path as 2-1). In 6-1/3-1/4-2 the old in-mission objective line still shows after the opening banner.
