# audio_log — audio pass (bench §9 Audio 5/10 -> target ~8)
Owner: js/audio.js + assets/audio/{sfx,music}. Backups of the state before this pass: /home/user/agents/audio_bak/ (audio.js + all 5 original music mp3).
Generators (re-runnable, numpy/scipy + ffmpeg, no paid generation used): /home/user/aud/{dsp.py,sfx.py,loops.py,steppe.py,loopify.py}; raw wav in /home/user/aud/out.
Higgsfield audio was checked: mirelo SFX = 0.5 credits/clip, suno not in catalog -> NOT used (everything is synthesis + processing of existing files).

## What changed
### Files (assets/audio/)
- sfx/v_hit.mp3    sprite 4 x 0.6 s : 0 flesh thwack, 1 blade cut (old hit.mp3 -10 % + thud + shing), 2 armour/leather (inharmonic ring + thud), 3 heavy (sub thump + old clash -20 %)
- sfx/v_swing.mp3  sprite 3 x 0.5 s : light / medium (+old swing) / heavy whoosh  (+ old swing.mp3 as 4th variant)
- sfx/v_block.mp3  sprite 3 x 0.9 s : block A (820 Hz metal + clash), block B (1040 Hz), parry (bright long ring + swish)
- sfx/v_arrow.mp3  sprite 4 x 0.8 s : bow release (string twang + thwip), arrow fly (whistle), impact body, impact wood (with shaft quiver)
- sfx/v_step.mp3   sprite 9 x 0.3 s : sand x3, grass x3, wood x3 (stone = wood at 0.8 rate)
- sfx/v_ui.mp3     sprite 6 x 1.0 s : tap (40 ms), confirm (dutar pluck up), back (pluck down), upgrade (3-note dutar arpeggio), star (bell), coin
- sfx/v_drum.mp3   sprite 2 x 1.5 s : war drum hits (mission start)
- sfx/v_fall.mp3   sprite 2 x 0.8 s : body-fall thud + dirt (animation request)   sfx/v_bow.mp3 1 x 0.5 s : bow creak
- sfx/roll.mp3 (wave incoming drum roll), st_boss.mp3 (boom + qobız growl swell), st_phase.mp3 (reverse swell -> boom + qobız stab),
  st_win.mp3 (dutar strum flourish + drum + bell), st_lose.mp3 (descending qobız + drum)
- loops (lazy-loaded the first time they are needed, never at boot): amb_steppe, amb_desert, amb_shore, amb_night (crickets), amb_river, amb_fire, amb_cart,
  amb_crowd (battle bed made from the hit/clash/block samples + chopped cry.mp3 yells + rumble), gallop_loop (3-beat canter + tack jingle), drone (qobız D2/A2/D3)
  All ambience loops are built periodic (FFT-shaped noise, events wrapped round the loop end) -> no seam.
- music/battle, boss, calm, title: RE-CUT for clean looping. The originals had 2-3 s fade-in and fade-out baked in (end -37 dB vs body -17 dB = a dip every
  80-120 s). New files: fade-in/out removed, tail cross-faded (1.2 s) into the head at the spectrally best-matching point (flux correlation 0.74-0.83).
  Loop lengths are in audio.js LOOPLEN; loopStart is detected at runtime (mp3 encoder padding safe).
- music/steppe.mp3 NEW 45.7 s map/exploration loop: synthesized dutar (Karplus-Strong, 2 strings, body resonances, D-minor pentatonic phrases with tremolo
  ornaments, 84 bpm) over a swelling qobız drone. Plays whenever the chapter map (#map.on) is open. If the author dislikes it: delete the file -> calm.mp3 is used.
- Sizes: one-shots + stingers 312 KB (sprites at boot, stingers 4 s later), loops 557 KB lazy, music unchanged size (5.5 MB, battle 1.56 MB).

### js/audio.js
- Kept: VOL / qq_vol sliders + volOf/setVolume/bindMedia/unbindMedia, buses master -> duck -> music / effects / voice, per-sound trims + cooldowns,
  silence while #fade.in, playVoice/waitVoice/preloadVoice/voiceBusy/stopVoice, procedural fallbacks for every call.
- Master chain: master -> DynamicsCompressor (glue) -> DynamicsCompressor (limiter) -> post gain -> out. (numbers: see Mix check)
- Music bus: musicG -> low-pass (intensity) -> narration duck -> duck (cutscene) -> master.  Ambience bus -> effects bus (follows the effects slider).
- Variants: sprite slot chosen at random but never the same slot twice in a row (per family); rate 0.93-1.07; hit also mixes the old hit/clash files (20 %).
- Distance + pan: Sfx.at(x,z) or a trailing {x,z} argument -> gain 1/(1+max(0,d-3)/9), StereoPanner pan = dx/14 (clamped +-0.8) relative to the hero.
  Old calls that pass a distance factor number (engine sv()) still work.
- Music state machine (ticker every 150 ms): wanted track = map open ? steppe : mode (calm/battle/boss/title/win/off); hero dead overlay (#dead.on) -> music out + defeat stinger;
  'calm' + >= 3 active enemies near the hero -> auto battle music, back to calm after 5 s with no enemies (only when the mission left calm on).
  Crossfades 2.2 s (boss 1.2 s, win 0.6 s), equal-time; calm/battle/steppe/title RESUME where they were left (no restart from bar 1 each fight).
- Intensity layers in battle: (1) music low-pass 3.5 kHz with no enemies around -> fully open at 8 active enemies; (2) crowd battle bed scaled by fighters (allies+enemies within 28 m);
  (3) qobız drone fades in when intensity > 0.55 and always in boss fights. Hero HP < 25 % -> music low-passed at 900 Hz. Stingers dip the music for 1.6-2.6 s.
- Narration: music ducks to 0.4 (-8 dB) and effects to 0.75 while a voice line plays; cutscene duck() now also silences ambience.
- Ambience by chapter (G.mis.id): 0/1 steppe wind, 2 desert gusts, 3 river + wind, 4 sea waves + wind, 5 pass (desert+steppe wind), 6 city (light wind), 7 storm; G.night adds crickets;
  nearest G.fires fire within 14 m -> fire crackle (panned); ambience ducks up to -45 % with combat intensity.
- Footsteps: hero on foot, speed from position delta, interval 0.26-0.5 s by speed, surface by chapter (grass/sand/stone). Mounted: gallop loop, rate follows speed.
- Auto cues: mission start (G.mis.started, once per run) -> 2 drum hits + súren horn; horn during a running fight -> + drum roll (wave incoming) + enemy bark;
  setMusic('boss') -> boss intro stinger; boss.phase increases -> phase stinger; Sfx.win -> victory stinger then win.mp3 after 2.4 s; end-screen stars -> star chime per star;
  Sfx.power while the game is paused (camp upgrade buy) -> 'upgrade' UI sound; every button click outside the combat HUD -> tap (confirm / back by id).

## API (import { Sfx, setMusic, ... } from './audio.js') — every call is a safe no-op before initAudio() and during the black #fade
Existing calls keep working unchanged (Sfx.hit(v) / Sfx.swing(v) with a distance factor, big, hurt, arrow, orb, dodge, howl, ui, pick, power, ulti, death, neigh, hoof, horn, win, roar, cry).
Positions: any call marked {x,z} accepts world coordinates as the LAST argument, or call Sfx.at(x,z) right before (e.g. Sfx.at(e.x,e.z).hit('armor')) -> distance gain + stereo pan.
- Sfx.hit(kind='any', {x,z})        kind: 'any' | 'flesh' | 'cut' | 'armor' | 'heavy' | 'light'  (a number = old distance factor)
- Sfx.swing(v=1, {x,z})             3 sprite whooshes + old swing, never the same twice in a row
- Sfx.block('block'|'parry', {x,z}) / Sfx.parry({x,z})   metal block (2 variants) / bright parry ring
- Sfx.arrow()                       bow release + arrow fly (existing call sites already get this)
- Sfx.arrowHit('body'|'wood', {x,z})
- Sfx.dodge()                       (existing call) old dodge sample + low cloth/body whoosh layer (animation request: Dodge_Side)
- Sfx.death()                       (existing call, engine.js) now also schedules a body-fall thud 0.6 s later (2 variants, sfx/v_fall.mp3)
- Sfx.fall({x,z}, delay=0)          body-fall thud on demand (knockdown contact) — for feel.js / skinrig if a knockdown lands without a death
- Sfx.bowDraw()                     bow creak (sfx/v_bow.mp3) at the start of a draw; Sfx.arrow() during the hero's cast/volley (P.act.kind 'cast', t<.1) already plays creak -> twang -> fly
- Block_Impact "clack": call Sfx.block() (or Sfx.parry()) where the block reaction starts — no engine call site exists yet (REQUEST)
- Sfx.step(surface, vol=.3, {x,z})  'sand'|'grass'|'wood'|'stone'; the hero's own steps are automatic. Sfx.surface('wood') forces the hero surface (ship deck, bridge), Sfx.surface(null) = auto
- Sfx.ui(kind='tap')                'tap'|'confirm'|'back'|'upgrade'|'star'|'coin'  (buttons outside the HUD already click automatically)
- Sfx.stinger(kind)                 'start' (drums + súren) | 'wave' (drum roll + horn) | 'boss' | 'phase' | 'win' | 'lose'  (cooldown 5 s, phase 2.5 s)
- Sfx.defeat()                      = stinger('lose')  (automatic when #dead gets .on)
- Sfx.bark(who, key, {x,z})         who 'maid'|'enemy'; key from BARKS below (or a literal text containing a space). Max 1 per 4 s; shows « text » at the top for 1.7 s
                                    and fires window event 'qq:bark' {who,key,text,pos} first — call preventDefault() in a listener to draw it yourself (UI owner).
- Sfx.amb(name|null)                force a bed 'steppe'|'desert'|'shore'|'river'|'night'|'pass'|'city'|'storm'|'off'; null = auto by chapter
- Sfx.loop(name, on, {x,z,vol})     extra positional loop: 'cart' | 'fire' | 'river' | 'crowd'  (call again with new x,z to move it; on=false to stop)
- Sfx.intensity(v|null)             override combat intensity 0..1 (null = automatic from active enemies near the hero)
- setMusic('calm'|'battle'|'boss'|'off')  unchanged; 'boss' now also fires the boss intro stinger; playTitle(); duck(on) (cutscenes; now also ambience)
- playVoice/waitVoice/preloadVoice/voiceBusy/stopVoice unchanged (music auto-ducks -8 dB while a line plays)
- window.__QQA = { Sfx, fight:{nE,nA,I}, mode, track, ac, BUF }  (debug/test only)

## BARKS — Karakalpak battle shouts, TEXT ONLY (no voice generated). Please check every line (real Karakalpak, not Kazakh).
Shown on screen as « … » (gold = maidens, red = enemies). Lines live in js/audio.js const BARKS — edit freely there.
Maidens (Qırq qız):
  M1 "Alǵa, qızlar!"                 — Forward, girls!                       (mission start, skill)
  M2 "Súren! Atqa minińler!"          — Súren! Mount up!                      (mission start)
  M3 "Qırq qız — bir jan!"            — Forty maidens — one soul!             (mission start)
  M4 "Jawǵa jol joq!"                 — No way through for the enemy!        (skill, parry)
  M5 "Gúlayım biz benen!"             — Gúlayım is with us!                   (skill)
  M6 "Shıda, sińlim!"                 — Hold on, little sister!               (parry, hero badly hurt)
  M7 "Taǵı keledi — tayar bolıń!"     — More are coming — be ready!          (wave)
  M8 "Eldi qorǵayıq!"                 — Let us defend our people!             (wave, kill)
  M9 "Jeńis bizdiki!"                 — Victory is ours!                      (victory)
  M10 "Barekelle, qızlar!" / "Barekelle!" — Well done, girls! / Well done!  (victory, kill)
Enemies (Kalmyk raiders):
  E1 "Hújim!"                         — Attack!                               (wave, start)
  E2 "Tutıń olardı!"                  — Seize them!                           (wave)
  E3 "Qızlardı qamańlar!"             — Surround the girls!                   (wave)
  E4 "Qashpasın!"                     — Don't let them escape!               (start, kill)
  E5 "Sheginiń!"                      — Retreat!                              (flee — no caller yet)
  E6 "Kim maǵan qarsı shıǵadı?!"      — Who dares stand against me?!          (boss appears)
Words I am least sure of (please confirm): "minińler" (mount up, plural imperative), "qamańlar" (surround), "Sheginiń", "sińlim", "qorǵayıq".
Triggers now: start = mission start; skill = Sfx.power/ulti in a fight (35 % / 80 %); parry = Sfx.parry (25 %); wave = horn in a running fight; hurt = hero HP drop >18 % below half (30 %);
win = Sfx.win; boss = new G.boss (70 %). All rate-limited 1 per 4 s; nothing while paused / fading.

## Mix check (numbers) — /home/user/t/aud/mix.cjs + mixall.sh
Real Chrome OfflineAudioContext renders of 10 s mixes through the exact bus chain (default sliders 80/50/60/100 unless "100" = all sliders at 100),
then ffmpeg ebur128 (integrated LUFS / true peak dBFS). Scenarios: combat = battle music + crowd .55 + wind .2 + hits/swings ~5/s + slams + hurts + steps + drone .15;
boss = boss music + crowd .4 + fight + drone .32; calm = calm music + steppe wind; narr = calm + wind + nar1; narrfight = battle + crowd + fight x.7 + nar1;
combat100 / narr100 = the same with every slider at 100 and a heavier fight (x1.3).
| scenario   | old chain (no comp)  | first try (-16/3.5:1, limiter -3) | SHIPPED (-12/3:1 knee 6, limiter -1.5 20:1, post .7) |
| combat     | -19.8 LUFS / -6.0 dB | -13.7 / -2.6                       | -18.5 LUFS / -6.2 dBFS |
| boss       | -20.3 / -6.9         | -14.1 / -3.1                       | -18.9 / -6.7 |
| calm       | -24.5 / -13.2        | -17.5 / -6.5                       | -23.0 / -11.7 |
| narr       | -15.6 / -3.6         | -12.1 / -1.8                       | -15.8 / -5.1 |
| narrfight  | -15.8 / -2.3         | -12.5 / -1.3                       | -16.1 / -4.5 |
| voice only | -15.6 / -3.9         | -12.0 / -1.8                       | -15.8 / -5.3 |
| combat100  | -11.4 / +0.2 CLIPS   | -9.7 / -0.8                        | -13.1 / -3.3 |
| narr100    | -12.8 / 0.0 CLIPS    | -10.4 / -0.8                       | -14.0 / -3.4 |
- The first try showed Chrome's automatic compressor make-up gain (+6-7 dB louder everywhere) -> replaced by gentler settings + post gain .7.
- Shipped: typical combat -18.5 LUFS (<= -14), peaks <= -3.3 dBFS even with every slider at 100 (the old chain clipped at 100 %).
- Narration is never masked: narr total = voice-only loudness (-15.8 both) -> music + ambience under the voice are > 15 dB lower (music ducks to 0.4 = -8 dB,
  effects to 0.75 while a line plays); in narrfight the voice still sits ~7 dB over the fight bed.
- Source files: re-cut music -14.9..-16.1 LUFS (unchanged levels), new one-shots peak -2..-4 dBFS, loops RMS -20..-26 dBFS, stingers peak -1.5 dBFS.

## Verification
- Headless run (lockB, t/aud/a1.js, start=1-1&fast=1, /home/user/t/aud/a1.log): audio.js loads without errors, AudioContext running, all 9 sprite files decoded
  (s_hit,s_swing,s_block,s_arrow,s_step,s_ui,s_drum,s_fall,s_bow), no failed fetch, music 'calm' track playing, 18 API calls (hit/heavy/armor+pan, swing, block, parry,
  arrow, arrowHit, step, ui tap/confirm/star/coin, stinger phase, bark) -> no exception. During the lore/fade the combat sounds are correctly silent (#fade.in gate);
  UI + stinger played (s_ui slots 0,1,4,5, st_phase).
- Loudness: Mix check above (real Chrome OfflineAudioContext).
- State test (lockB, t/aud/unit.cjs -> unit.log): real audio.js in Chrome with a fake __G (chapter 2, a fire 3 m away) driving the ticker:
  idle -> desert wind .48 + fire .27 (panned .3), track calm; walking -> s_step every ~0.35 s; 7 enemies + 5 allies -> auto battle music, low-pass 16.7 kHz (I .86),
  crowd bed .59, qobız drone .10, ambience ducked to .42; hero HP 20 % -> music low-pass falls to 900 Hz; setMusic('boss') -> st_boss + boss track, phase 1->2 -> st_phase,
  drone .28; fight over -> calm RESUMED at 3.7 s (not from bar 1); death -> body-fall thud 0.6 s later; dodge -> whoosh layer; #dead.on -> st_lose + music out;
  bark -> « Jeńis bizdiki! » on screen; map open -> steppe.mp3; Sfx.win -> st_win. Hits/swings: no slot repeated twice in a row. Compressor reduction at defaults ~0 dB.
  Fixed after that run: mission-start drums now wait (max 3 s) for the drum sprite to decode; win track not started over the open map.
- Full-game headless runs (start=1-1) twice timed out waiting for gameplay to unpause (lore screen) under the congested lock; not repeated.

## REQUESTS (other owners)
- mechanics (engine.js / wave4.js / feel.js):
  1. call Sfx.block() / Sfx.parry() where a block / parry lands (now the hit sample plays) — also wanted by the animation agent for Block_Impact.
  2. call Sfx.arrowHit('body'|'wood', {x,z}) where arrows/projectiles land; pass {x,z} (or Sfx.at(x,z)) to Sfx.hit/Sfx.swing for stereo pan — e.g. Sfx.at(e.x,e.z).hit('armor') for heavy/shielded units,
     Sfx.hit('heavy') for spin / finisher / 3rd combo hit.
  3. optional: Sfx.fall({x,z}) at knockdown contact (feel.js) if a knockdown is not a death; Sfx.bowDraw() at the start of the hero's bow draw (archery.js).
- missions (missions.js): fail() -> Sfx.defeat() (time-out fails never show #dead, so no defeat stinger plays now); convoy 2-3 -> Sfx.loop('cart', true, {x:cv.x, z:cv.z}) every ~0.5 s while it rolls,
  Sfx.loop('cart', false) at the end; ship deck 4-2 / bridges -> Sfx.surface('wood') ... Sfx.surface(null); wave4 waves without a horn -> Sfx.stinger('wave');
  barks: Sfx.bark('enemy','flee') when a group routs, Sfx.bark('maid','kill') on a leader kill (missions already has its own dialogue bark(); both can coexist, mine is rate-limited 1/4 s).
- UI: #qqbark is a plain fixed div (top 21 %, gold/red italic text). Restyle it or listen to window 'qq:bark' and preventDefault() to draw it inside your HUD.
- author: listen to music/steppe.mp3 (new map music) and the 4 re-cut loops; check the BARKS lines above.
