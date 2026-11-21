# urgent5 log — sound control, clean start, arrow-hit text, narration vs video, missions audit
Backups (state before my patches): /home/user/agents/u5bak/ (audio.js story.js archery.js i18n.js engine.js index.html)
Test files: /home/user/t/u5/ (run.cjs = runp.cjs + HOOK=1 audio logger u5/hook.js, RET=1 returning-player storage; rt.sh)

## Patch locations (for wave4)
All patch scripts: /home/user/agents/u5/p_*.py (small exact-string replaces, each asserts the old text once).

### js/audio.js (p_audio.py) — owner: me
- top: `VOL` {master,music,sfx,voice} 0-100 (localStorage `qq_vol`; defaults 80/50/60/100; migrates old SET.mus/snd = 0), `volOf(kind)`, `setVolume(k,v)`,
  `bindMedia(el,kind,base)` / `unbindMedia(el)` (live volume for <video>/<audio>), legacy `setVol()` is now a no-op.
- buses: master -> {duckG -> musicG, sfxG, voiceG}; trims MUS_K .9, SFX_K .9, VOX_K 1. `duck()` now ramps duckG (sliders keep working during cutscenes).
- SMAP wrapper: per-sound trims SVOL (hit/swing .8, big .75, neigh .45, horn .55, death .7, howl .75, hurt .85; roar .8, cry .55/.45), repeat cooldowns CD
  (neigh 3.5 s, horn 1.5 s, howl 1.2 s), and NO sfx while `#fade.in` (level is being built behind the black fade).
- Sfx.hoof gallop sample .55 -> .4 and silent during the black fade.
- playTrack: `go()` refuses to start a 2nd copy of the same track (two pending fetches of calm.mp3 both started = double-loud music; seen in the log).
- NEW at the end: `playVoice(key)` (narration on the WebAudio voice bus, safety timeout, HTMLAudio fallback), `preloadVoice`, `voiceBusy`, `waitVoice(maxS)`, `stopVoice`.
### js/i18n.js (p_i18n.py)
- `t()` replaced: fallback lang -> uz -> en -> qq; a key-like token that exists nowhere returns '' (console.warn once '[i18n] missing key'); all {x} replaced
  (split/join), undefined/NaN values -> '', leftover {x} stripped. NEW `has(k)`. Callers that used `t(k) === k` as an existence test were switched to has().
### js/archery.js (p_arch.py)
- imports `has` (i18n) and `volOf` (audio). `tt()` never returns a raw key. LS gets `ar_hit` / `ar_bull` (4 langs). thwack volume = volOf('sfx')*.8 (was SET.snd on/off).
### js/engine.js (p_eng.py) — one line
- `num()`: first statement returns when text is null/''/contains NaN|undefined|{x}.
### js/story.js (p_story.py, p_story2.py)
- imports: `has`; `VOL, setVolume, playVoice, waitVoice, preloadVoice, bindMedia, unbindMedia` from audio.js.
- `cutscene()` rewritten (same signature/return): waits for a narration line still playing; video poster = still; narration via playVoice; video sound .35 while the line
  plays, 1.0 after; ends only when video AND line are done; skip ignored until the video is really playing (+0.8 s); 1st skip drops the video but the line finishes
  (still + subtitle), 2nd skip ends all; reuses a prefetched src.
- `lore()`: `!has(k)`; `gainPower()`: `has('use'+k)`; `fadeTo()`: sets `#fade[data-l]` = t('loading').
- settings: setTexts() labels sl_s = t('setFx'), sl_vm = t('setMa'), sl_vo = t('setVo') + volUI(); new block before `$('bset').onclick`: VT strings (setMa/setFx/setVo, 4 langs,
  injected into L only if missing), volUI(), slider handlers (initAudio, setVolume, preview swing/hit on sfx/master).
- end of file: tplay click listener prefetches v1.mp4 + nar1 when Start leads to 0-1; `texts()` once more (shop button text was empty during loading).
### index.html (p_html.py + one CSS tweak)
- #set: the two on/off rows (mus, snd) replaced by 4 `.vrow` range rows: sl_vm/master, sl_m/music, sl_s/sfx, sl_vo/voice.
- CSS after `#fade.in{opacity:1}`: loading spinner + text on #fade (:before/:after, visible after .8 s), slider styles (#set .vrow ...).
- CSS: `#cut video{background:transparent}` (still/poster visible until the first frame).

## Root causes found
1. Sound: only on/off toggles (SET.mus/snd); sfx bus 0.9x0.9 = 0.81 vs music 0.45; real samples all at 1.0 (neigh/horn/slam as loud as hits); archery thwack on its own
   AudioContext straight to destination at 0.9; narration was `new Audio()` at volume 1 with no control; cutscene video volume hard-coded (.3/1).
   Also found: the same music track could start twice (two pending fetches both called go()) = double-loud music (seen: calm.mp3 started at 25.9 s and 27.0 s).
2. Black start + neigh: fresh player -> Start -> tutorial 0-0: fadeTo(black) then a long level build (ensureReal + populate) with NO loading indicator; during the build
   populate() mounts two ambient riders: toggleMount() -> Sfx.neigh() (hook stack: playS < Sfx.neigh < toggleMount engine.js:778 < populate missions.js:1251) => a neigh on
   a black screen. Returning player (0-1): v1.mp4 (6.4 MB) only started downloading when the cutscene began; `#cut video{background:#000}` covered the still => black frames
   (readyState 0 for seconds), and v1 itself opens with ~1.5 s of near-black frames.
3. Arrow hit code text: archery.js target hits call `msg(tt(h.head ? 'ar_bull' : 'ar_hit'))`; neither key existed in any language and `tt()` fell back to the raw key
   => "ar_hit" / "ar_bull" on screen in the fix3 tutorial bow range (TU-S) (static key scan /home/user/t/u5/keys.js: the only 2 missing keys used by archery.js).
   Generic: i18n `t()` returned the key itself for any missing key, replaced only the first {x}, and printed "undefined" for missing values.
4. Narrator cut off: narration was an HTMLAudio element started 0.9 s into the video; on iOS Safari starting another media element with sound (the cutscene <video>) pauses
   the playing <audio>; play() of an Audio created outside a gesture can also be rejected (then it silently never plays); any Enter / skip tap (also a 2nd Enter that
   closed the lore card, or a key queued during the long first frame) ran fin() which paused the voice mid-sentence.
   Also (missions, NOT fixed, wave4): chapter 3's intro (lore3 + c3.mp4 + nar7) plays at the START OF 3-2, not 3-1, because RUN['3-2'] = OLD['3-1'] (65_v3.js) and the old
   3-1 runner contains H.chapterIntro(3,...); 3-1 (= OLD['3-3'] night camp) has no intro.

## 5. Missions audit — plan (Claude Doc ff561dea…, section "Yangi reja: 7 bob, 30 missiya") vs game (m2/src: 10_table 50_run_a 60_run_b 65_v3 66_w4camps 67_tutorial 69_fix3 75_archery)
Effective runner = last definition (65_v3 wraps OLD[...] = 50/60 runners; 69_fix3 overrides 2-1/4-1/7-1/2-3/3-3). Code-read audit (missions not replayed one by one).
| id | plan says | game does now | gap |
|---|---|---|---|
| 0-0 | (not in the plan) | tutorial (wave4 3-button rework in progress) | extra |
| 0-1 | Sarkop gate: Allayar holds the wall, townsfolk must flee INTO the town in time | old prologue street (gates, skirmishes, practice dodge) + 2 groups of BOUND townsfolk to free (55/70 s) + **Camel Dev boss** | not a hold-the-wall / evacuation timer; people are captives to untie; extra camel boss not in plan |
| 0-2 | Allayar vs Surtaysha, scripted loss | square fight -> duel 20 s -> clinch QTE -> loss -> v2 | OK |
| 1-1 | burning village: villagers roped and dragged away, take them back, fight the yuzbashi | old 1-1 + 2 dragGroups + yuzbashi champion duel at the end | OK |
| 1-2 | stable siege: women/children inside, sorcerer + wolves outside | door to break + fire timer, shaman (boss bar) + wolves, wolf wave from behind | OK |
| 1-3 | narrow bridge: break the spear phalanx before the caravan crosses | new bridge deck, phalanx AI, captive dragGroup on the far side, captain | OK |
| 1-C1/C2 | (not in plan) | wave4 camps (60/80 soldiers) before the boss | extra (plan total 30 -> game now 52 incl. 18 camps, 3 sniper, tutorial) |
| 1-4 | Qashqir + ravine leap | old 1-4 (wolves before the boss, then leap tutorial) | OK; plan's video v5 "Iz quvish boshlanadi" after ch1 does not exist (no v5.mp4) |
| 2-1 | mounted chase: catch riders carrying captives | rideRun: 3 npc riders with captives, ride beside -> captive dropped, 6 rings, rocks | OK but ~25 s of riding (short) |
| 2-2 | Bayimbet trial duel | arena duel (non-lethal) + raid twist + camp | OK |
| 2-3 | battle for the well: defend freed people from attacks on two sides in a sandstorm | caravan escort to the well, 4 scripted ambushes (L/R/back/front), no fail; storm removed | escort instead of a defence AT the well; no sandstorm |
| 2-4 | Sand giant | boss, no summons | OK |
| 3-1 | night camp: free bound captives yurt by yurt, alarm -> big battle | OLD 3-3 night stealth level (sentries, alarm) + 3 bound groups at yurts | mechanics OK; **chapter-3 intro missing here** (it plays in 3-2) |
| 3-2 | slave caravan guarded by heavy armoured spearmen | OLD 3-1 "free the camp captives" (2 posts, captives at stakes, rein wave) + one dragGroup with 2 nayza | not a caravan mission, only 2 spearmen; **starts with the chapter-3 intro (lore3 + c3 + nar7)** |
| 3-S | (not in plan) | sniper bow mission | extra |
| 3-3 | hold the bridge while captives cross; raiders land from boats | fix3 rework: free captives beyond the bridge, they run back; landings on both banks | OK |
| 3-4 | Executioner, free chained Otbasqan | old boss | OK |
| 4-1 | shore CAVALRY CLASH: take captives back from riders driving them to the ships | same rideRun as 2-1 (npc riders, nobody fights on horseback) | no clash/fight at all; identical to 2-1 |
| 4-2 | ship deck fight: captives out of the hold, duel the ship captain | old shore camp -> archers -> landing party; a cage + a 16x16 plank "deck" box on the shore level; captain duel | there is no ship / hold / deck level |
| 4-3 | wolf chieftain: save the fishing village from the pack (dusk) | old 4-3 + 3 "bound" villager groups | OK (villagers "bound" by wolves is odd) |
| 4-4 | Dragon | old boss | OK |
| 5-1 | pass ambush: carry wounded maidens out under rockfall + archers | old 5-1 + 3 wounded pairs + rock rain + ridge archers | OK |
| 5-S | (not in plan) | sniper bow | extra |
| 5-2 | Sarbinaz alone: 3 champion duels in a row | 3 arenas + cages (captives carried off) | OK |
| 5-3 | archer tower: free shepherds held under the tower | tower + door + top archers + cage | OK |
| 5-4 | Qunqar giant | boss | OK |
| 6-1 | narrow streets: free townsfolk locked in houses one by one | old 6-1 + 4 burning houses with doors | OK |
| 6-S | (not in plan) | sniper bow | extra |
| 6-2 | gate siege under arrow + fire rain | OLD 6-3 gate + fire rain + people in burning quarter | OK |
| 6-3 | cages guarded by the chain champion, timed | 3 cages + chained jallod boss | OK |
| 6-4 | Qarg'ashiq | boss | OK |
| 7-1 | cavalry charge: forty maidens vs Kalmyk cavalry, big clash | rideRun: 8 rings + 45 s timer, NO enemies (fix3: "no enemy on horseback at all") | biggest gap: no battle at all |
| 7-2 | shamans' circle: save sacrifice captives, break totems | OLD 7-3 totems + altar captives | OK |
| 7-3 | Surtaysha's 3 wolf-champions, arena duels | 3 arenas + cages | OK |
| 7-4 | Surtaysha, 2 phases (helmet, chain wrestle) | 3 phases (helmet via chains, totem heal, wrestle QTE) | OK (+1 phase) |
| extras | 1 challenge mission per chapter ("40 enemies in 3 min", "no maiden falls"); NG+ (harder replay after the story); weekly boss | none of the three exist (meta.js has weekly QUESTS, not a weekly boss) | missing |
| stars | 1★ done, 2★ most people alive, 3★ all saved + no maiden lost | 'win' / 'most' (60% saved) / 'all' everywhere except 0-2 and 7-1 (flags) | OK |
Cross-cutting: every mission of a chapter is built on the same corridor level (H.B[ch]) with props added; the plan's distinct places (ship, well, tower, slave caravan
road) are only approximated — likely what the author means by "not done". Suggested assignment for wave4: 7-1 cavalry battle, 4-1 cavalry clash (different from 2-1),
4-2 real ship deck, 3-2 slave caravan + move the ch3 intro to 3-1, 0-1 hold-the-wall evacuation (drop the camel), 2-3 defend-the-well + sandstorm, v5 video, the 3 extras.

## RESUMED (urgent5b, 2026-11-21)
State check on resume: `node --check` OK for every js/*.js and sw.js. All 7 patch scripts (/home/user/agents/u5/p_*.py) are fully applied (markers present: audio.js VOL/qq_vol/bindMedia/playVoice/waitVoice; i18n.js has()/new t(); archery.js ar_hit/ar_bull + volOf;
story.js cutscene/volUI/slider handlers; index.html 4 `.vrow` sliders + CSS). Nothing was cut mid-patch; no repair needed. sw.js diff is NOT mine (another agent: offline shell/page) — left untouched.
Remaining <audio>/<video>/AudioContext sources checked: only #cut video (bindMedia 'music'), narration fallback Audio (bindMedia 'voice'), archery AC (volOf('sfx')); engine/wave4/meta/map have none.
i18n: keys that look missing in a static scan (w4_*, tu4_*, arz_*, meta st_/up_ ...) are injected at runtime by their own modules' dictionaries; t() now returns '' (not the key) for any unknown key_like token.

### Settings elements for the UI designer (index.html #set)
`#set .row.vrow` x4, each: `<span id=sl_vm|sl_m|sl_s|sl_vo>` label + `<input type=range min=0 max=100 step=5 data-vk=master|music|sfx|voice>` (CSS var --p = fill %) + `<b class="vv">` value text.
CSS block: index.html lines ~272-278 (`#set .vrow ...`). Loading indicator on the black fade: `#fade:before/:after` (text from `#fade[data-l]`).

### missions gap table
(Plan = Claude Doc ff561dea…, "Yangi reja: 7 bob, 30 missiya", as read by urgent5 on 2026-11-20; game = m2/src effective runners. Only rows with a gap; all other plan missions match. Owner: mechanics agent.)
| id | plan | game now | gap / to do |
|---|---|---|---|
| 0-1 | Sarkop gate: Allayar holds the wall, townsfolk flee INTO town against a timer | prologue street + bound townsfolk to untie + Camel Dev boss | no hold-the-wall/evacuation timer; captives instead of fleeing crowd; extra camel boss |
| 1-4 → ch2 | video v5 "Iz quvish boshlanadi" after chapter 1 | no v5.mp4 | video missing |
| 2-1 | mounted chase, catch riders with captives | rideRun, ~25 s | OK but very short |
| 2-3 | defend freed people AT the well, attacks from 2 sides, sandstorm | escort to the well, 4 scripted ambushes, no fail, no storm | defence-at-well mechanic + sandstorm missing |
| 3-1 | night camp + chapter-3 intro | night stealth camp, NO intro | ch3 intro (lore3 + c3.mp4 + nar7) plays in 3-2 instead (RUN['3-2']=OLD['3-1'] contains H.chapterIntro(3)) |
| 3-2 | slave caravan guarded by heavy armoured spearmen | camp-captives level + 1 dragGroup with 2 spearmen; starts with ch3 intro | no caravan; too few heavy spearmen; move the intro to 3-1 |
| 4-1 | shore cavalry clash vs riders driving captives to ships | identical rideRun to 2-1, no fighting | needs mounted combat; currently a copy of 2-1 |
| 4-2 | ship deck fight, captives out of the hold, captain duel | shore level + cage + 16x16 plank box + captain | no ship / hold / deck level |
| 4-3 | save fishing village from wolf pack | + 3 "bound" villager groups | minor: villagers "bound" by wolves is illogical |
| 7-1 | cavalry charge, forty maidens vs Kalmyk cavalry, big clash | rideRun: 8 rings + 45 s timer, no enemies | biggest gap: no battle at all |
| extras | 1 challenge mission per chapter ("40 enemies in 3 min", "no maiden falls"), NG+, weekly boss | none (meta.js has weekly quests only) | all three missing |
| (not in plan) | — | 0-0 tutorial, 18 wave4 camps (x-C1/C2), 3 sniper missions (3-S/5-S/6-S) | extras beyond the 30-mission plan (52 total) — keep, but note |
Cross-cutting: every mission of a chapter reuses the same corridor level (H.B[ch]); the plan's distinct places (ship, well, tower, caravan road) are only approximated.

### Verification on resume (snapshot /home/user/u5snap, bust 1795204654, LOWQ, HOOK audio logger; logs in /home/user/t/u5/)
- fresh + fast=1 (ff.log): title -> Start -> black fade WITH spinner "Yuklanmoqda..." -> tutorial; NO neigh during the build (before the fix fr.log had neigh.mp3 at 19.0 s from populate->toggleMount); one calm.mp3 only.
- fresh, no fast (f2.log, previous run): same, no neigh, single music start.
- returning + fast=1 (rf.log): title -> lore -> cutscene still (video skipped by fast) -> 0-1; no sound before visuals.
- returning, no fast (rn.log): v1.mp4 plays at vol .14 (= master .8 x music .5 x .35 while narration), nar1 starts on the voice bus, video reaches its end (15.1 s) and WAITS
  (paused, still on screen) until "nar ENDED nar1", then the cutscene closes -> narration is never cut. sk.log (previous run): double Enter ignored, 1st skip drops video but the line finishes.
  Note: in the sandbox nar1 started 4-8 s after the video (fetch+decode on a CPU-starved swiftshader box); on devices the 900 ms delay + tplay prefetch apply.
- arrow hit (tus/tus2/tbow logs): target hit shows "Rosa markazga!" / "В яблочко!" / "Dál ortasına!" — no raw key. raw.log: DOM leaf-text scan for key_like/undefined/NaN/{x}
  during the fresh tutorial (6 samples, 48 s): only a false positive (inline <script> text in #uiskin), no visible raw text.
- settings (set.log): sliders save to localStorage qq_vol and apply live (sfx 25% -> effective .25), labels translated.
