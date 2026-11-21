# Missions expansion log (8 levels → 30 missions)

Plan doc (Claude Doc ff561dea…) was not readable from this session ("not shared") — plan designed here following the epic's story order.

## Architecture
- NEW `js/missions.js` — mission table `MLIST` (30 missions), runners `RUN[id]`, star rules, end screen, mission types
  (survive timer, escort, stealth sentries, raiders-vs-captives, potion-wolf mini-boss, time-of-day relight), per-mission fly-over
  points `INTRO_M`, test helper `__MS.auto()`. Story helpers are handed in once from story.js (`initMissions(H)`), so
  story.js only got small hooks. Existing chapter functions (prolog/mission1/chapter2..7) are left untouched as legacy
  (`?legacy=1&start=chN` still runs them); mission runners copy their segments 1:1 (same dialogs, waves, bosses, cutscenes).
- Chapter intro cutscene + lore play in the FIRST mission of each chapter (0-1, 1-1, 2-1 … 7-1); the boss mission (N-4) ends the chapter
  (saveProg(N+1)); 7-4 → epilogue (cutscenes e1/e2 + credits) exactly as before.
- Stars saved per mission in `qq_stars` under keys "c-k" (e.g. "2-3"); old numeric chapter keys + `qq_ch` still unlock all missions
  of chapters finished before this update (legacy saves keep progress).
- Time of day: `tod('night'|'dusk')` registers presets in env.js `LIGHTS` at runtime and calls `applyLight`, then recolours the
  scenery sky dome uniforms (no scenery.js / env.js edits).

## story.js (python str.replace, asserted; backup: /home/user/agents/ms/story.before_missions.js)
- import `saveStars` from map.js; import `{ initMissions, runMission }` from ./missions.js
- `$('tplay')` → `runMission('0-1')`
- before `initMap(...)`: `initMissions({...helpers, setCP, B: buildCh2..7, moods})`; `initMap({ CHAP, prolog, begin, run: runMission })`
- `window.__T.ms = runMission`
- `?start=` parsing: `m2-3` / `2-3` → mission; `chN` → mission N-1; `prolog` → 0-1; `legacy=1` keeps the old behaviour
- epilogue "replay" → runMission('0-1')

## map.js (backup: /home/user/agents/ms/map.before_missions.js)
- imports MLIST/byCh/midx/TYICON/INTRO_M from missions.js
- unlock/done/current now per mission (`munlocked`, `mdone`, `curMission`); chapter node unlocked when its first mission is
- node shows 4 (2 for prologue) mission pips (done = gold, current = pulsing, locked = faded) + "★ k/12"; total "★ x/90"
- tapping a chapter opens the card with the chapter's mission list: type icon, id, name, objective, stars or ▸ / 🔒; tap a row to play;
  the card's Play button starts the first unfinished mission of that chapter; `startMission(id)` (from title or end screen)
- progress line advances per mission
- `flyFor`: when a mission is running, uses `INTRO_M[mission]` (chapter boss portrait for 'B', Qashqir portrait + "Wolf chieftain" for 'B:wolf');
  ride missions / prologue have no fly-over (as before)

## i18n.js
- 57 new keys × 4 languages, one line at the top of each language block (`// missions.js …`)

## Test hooks (test-only)
- `__MS.auto(on, fast=8, steps=4, ts=2)` — god-mode auto-play (dialogs, kills, breakables, teleports to markers / escortee);
  `__MS.win()` sets `G.mis.force`; `__MS.run(id)`; `?start=m3-2`

## Mission list (id · name uz / qq · type · stars)  — star 1 is always "mission complete"
| id | uz | qq | type | star 2 | star 3 |
|---|---|---|---|---|---|
| 0-1 | Sarkop ko'chalari | Sarkop kósheleri | defend village + Camel-giant (prolog part 1, plays lore0 + v1) | no fall | HP>50% |
| 0-2 | Surtayshaga qarshi | Surtayshaǵa qarsı | duel (scripted loss) + QTE, ends with v2 | held 20 s | resisted QTE to the end |
| 1-1 | Yonayotgan ovul | Janıp atırǵan awıl | story: mother, guards, Sarbinaz, horde (lore1 + v3) | 3 children found | no fall |
| 1-2 | Otxona | Atxana | rescue: sorcerer + break stable door before timer | door in time | no fall |
| 1-3 | Qo'rg'on xarobasi | Qorǵan xarabası | NEW survive 100 s, dusk | no fall | HP>50% |
| 1-4 | Qashqir bek | Qasqır bek | BOSS + v4 + wolf leap + ravine + nar5 → chapter end | boss w/o falling | HP>50% |
| 2-1 | Karvon izidan | Kárwan izi menen | horseback chase (flee), intro c2 | nobody escaped | HP>50% |
| 2-2 | Cho'ldagi pistirma | Shóldegi duzaq | Bayimbet + ambush waves | no fall | ≤5:00 |
| 2-3 | Sho'rxok cho'l orqali | Duzlı shól arqalı | NEW escort captives' cart (5 ambushes) | escortee HP>50% | no fall |
| 2-4 | Qum devi | Qum dáwi | BOSS Qum dev + Earth slam → chapter end | boss w/o falling | HP>50% |
| 3-1 | Qul karvoni | Qul kárwanı | camp waves + free captives, intro c3 | no fall | ≤5:00 |
| 3-2 | Daryo bo'yidagi hamla | Dárya boyındaǵı hújim | NEW horseback raid (fight, 11 riders) | no fall | HP>50% |
| 3-3 | Tungi bosqin | Túngi basqın | NEW stealth night raid (12 sentries, vision cone, silent takedown, alarm → reinforcements) | never seen | no fall |
| 3-4 | Shinjirchi jallod | Shınjırshı jallad | BOSS Jallod + Otbasqan + free captives → chapter end | boss w/o falling | HP>50% |
| 4-1 | Qirg'oq bo'ylab quvish | Jaǵa boylap quwıw | horseback chase (flee), intro c4 | nobody escaped | HP>50% |
| 4-2 | Qalmoq kemalari | Qalmaq kemeleri | waves to the ships | no fall | ≤5:00 |
| 4-3 | Bo'rilar sardori | Qasqırlar basshısı | NEW mini-boss: wolf waves + wolf chieftain (qashqir, 2600 HP), dusk | boss w/o falling | HP>50% |
| 4-4 | Aydarho | Aydarha | BOSS sea dragon + water shield → chapter end | boss w/o falling | HP>50% |
| 5-1 | Tog' darasi | Taw darası | Sarbinaz: pass waves, intro c5 | no fall | ≤5:00 |
| 5-2 | Kamonchilar jangi | Oq-jayshılar sawashı | NEW archer duel (4 archer/mage waves) | ≤2:30 | HP>50% |
| 5-3 | Yarador qiz | Jaralanǵan qız | NEW escort wounded maiden, night | escortee HP>50% | no fall |
| 5-4 | Qunqar dev | Qunqar dáw | BOSS Qunqar + giant power → chapter end | boss w/o falling | HP>50% |
| 6-1 | Qashal ko'chalari | Qashal kósheleri | city street waves, intro c6 | no fall | ≤5:00 |
| 6-2 | Asirlar himoyasi | Tutqınlardı qorǵaw | NEW defend 5 captives from raiders (4 waves) + potion-wolf mini-boss, dusk; all captives dead → fail/retry | no captive lost | no fall |
| 6-3 | Temir darvoza | Temir dárwaza | break city gate (Earth slam) under harassment + free captives | ≤3:20 | no fall |
| 6-4 | Qarg'ashiq podsho | Qarǵashıq patsha | BOSS Qargashiq + ghost rider power → chapter end | boss w/o falling | HP>50% |
| 7-1 | So'nggi hamla | Aqırǵı hújim | horseback charge (fight), intro c7 | no fall | HP>50% |
| 7-2 | Qonli o'rda | Qanlı orda | horde waves | no fall | ≤5:00 |
| 7-3 | Qonli totemlar | Qanlı totemler | NEW break 4 totems (they keep summoning) + final wave, night | ≤4:00 | no fall |
| 7-4 | Surtaysha | Surtaysha | FINAL BOSS (helm/totems/QTE) → epilogue e1/e2 + credits | boss w/o falling | HP>50% |
(boss mission names use the existing n_xx keys; escort fail → "mission failed" banner and restart)

## New qq strings (please check)
Names: mn_0_1 Sarkop kósheleri · mn_0_2 Surtayshaǵa qarsı · mn_1_1 Janıp atırǵan awıl · mn_1_2 Atxana · mn_1_3 Qorǵan xarabası · mn_2_1 Kárwan izi menen · mn_2_2 Shóldegi duzaq · mn_2_3 Duzlı shól arqalı · mn_3_1 Qul kárwanı · mn_3_2 Dárya boyındaǵı hújim · mn_3_3 Túngi basqın · mn_4_1 Jaǵa boylap quwıw · mn_4_2 Qalmaq kemeleri · mn_4_3 Qasqırlar basshısı · mn_5_1 Taw darası · mn_5_2 Oq-jayshılar sawashı · mn_5_3 Jaralanǵan qız · mn_6_1 Qashal kósheleri · mn_6_2 Tutqınlardı qorǵaw · mn_6_3 Temir dárwaza · mn_7_1 Aqırǵı hújim · mn_7_2 Qanlı orda · mn_7_3 Qanlı totemler
Objectives: mo_1_3 Qorǵan xarabasında waqıt pitkenshe qorǵanıń · mo_2_3 Azat etilgen tutqınlardıń arbasın shól arqalı alıp ótiń · mo_3_2 Dárya boyındaǵı qalmaq atlıların janshıp taslań · mo_3_3 Saqshılarǵa kórinbey tutqınlarǵa jetiń · mo_4_3 Qasqır toparın hám olardıń basshısın jeńiń · mo_5_2 Taw jolındaǵı oq-jayshılardı joq etiń · mo_5_3 Jaralanǵan qızdı taw jolınan aman alıp ótiń · mo_6_2 Tutqınlardı basqınshılardan qorǵań · mo_7_3 Qanlı totemlerdi buzıń hám dushpandı jeńiń
Stars: s_win Tapsırma orınlandı · s_nodeath Bir ret te jıǵılmadıńız · s_hp50 Janıńız yarımınan kóp qaldı · s_time {t} ishinde pitkerildi · s_noesc Hesh kim qashıp qutılmadı · s_hold Surtayshaǵa 20 sekund qarsı turdıńız · s_resist Aqırına shekem qarsılıq kórsettińiz · s_esc Qorǵawdaǵı adamnıń janı yarımınan kóp qaldı · s_noalarm Saqshılar sizdi kórmedi · s_nocap Bir de bir tutqın óltirilmedi
UI/hints: ms_next Keyingi tapsırma ▸ · ms_list Tapsırmalar · m_locked2 Aldıńǵı tapsırmanı pitkeriń · ms_fail Tapsırma orınlanbadı — qaytadan urınıp kóriń · ms_alarm Saqshılar sizdi kórdi! Dushpan oyandı! · ms_sneak Saqshılarǵa artınan jasırın jaqınlap urıń — olar tek aldındaǵını kóredi · ms_eschint Arbaǵa jaqın júriń — dushpan joq waqıtta ǵana ol alǵa júredi · ms_eschint2 Jaralanǵan qızdan alıslamań — dushpan joq waqıtta ǵana ol alǵa júredi · ms_defhint Basqınshılardı tutqınlarǵa jaqınlatpań! · ms_survhint Waqıt pitkenshe shıdam beriń! · ms_archint Oq-jayshılarǵa tez jaqınlań hám oqlardan shetke sekiriń (K) · mb_wolf Qasqırlar basshısı · mb_pot Sıyqırlı qasqır
Dialog (4-3): mb_ot1 (Otbasqan) "Qarańlar! Attay úlken qasqır topardı baslap kiyatır!" · mb_gu1 (Gúlayım) "Basshısın jeńsek, topar tarqaydı! Qızlar, artımnan!"
Unsure words: "tapsırma" for mission, "Atxana", "awıl", "attay úlken", "sekund".

## Tests (port 8790, LOWQ, 844x390; scripts /home/user/t/ms_run.js, ms_smoke.js, ms_batch.sh, ms_full.sh, ms_map.js)
- Smoke: all 30 missions started via `?start=mX-Y` and ran ~20 s with auto-play: 0 [pageerror] / [error] (logs ms_b1/b2/b3.log).
- Played to the end screen (auto god-mode): 2-3 escort, 6-2 guard + potion wolf, 4-3 wolf chieftain, 7-3 totems, 1-3 survive, 2-4 boss,
  3-3 stealth, 3-2/4-1/7-1 ride — all show correct stars and save qq_stars["c-k"].
- Map: ms_map.jpg (pips + ★x/90), ms_map_card.jpg / ms_map_card1.jpg (mission list), locked-row toast, row → mission start verified.
- Screenshots: ms_23_end, ms_6_2_play/_end, ms_4_3_play/_end, ms_7_3_play/_end, ms_1_3_play/_end, ms_2_4_end, ms_3_3_play(end).
- Not done: real-player balance pass (auto mode is god mode); night/dusk relight only checked at low quality.
- Note: main agent's commit 6a55ced already includes the story/map/i18n hooks; js/missions.js shows modified (latest = /home/user/agents/ms/missions.js).
