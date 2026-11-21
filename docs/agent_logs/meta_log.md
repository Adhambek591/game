# Meta agent log (js/meta.js — progression / Camp)
Own file: js/meta.js (new). Staging copy + helpers: /home/user/agents/mt/. Test port 8851.

## Hook edits in shared files (python str.replace with asserts)
1. index.html — after the line `<script type="module" src="./js/story.js?v=…"></script>` added one line:
   `<script type="module" src="./js/meta.js?v=…"></script>`
2. js/missions.js — in `async function win()`, right after the line
   `const M = G.mis, m = M.m, st = starsOf(), k = st.filter(Boolean).length, i = midx(m.id), next = MLIST[i + 1];` added one line:
   `try { window.__META && window.__META.missionEnd(m.id, k); } catch (e) { }`
   (optional: without it meta.js falls back to watching the #end screen / qq_stars)
No other shared file is touched. engine.js is NOT patched: meta.js imports its exports and drives G.dmgBoost / G.sk[k].max / HERO_SK[h][k][1] from its own rAF tick.

## What js/meta.js contains
- Save: localStorage `qq_meta` (JSON, `v:1`). Fields: xp, sk{track:tier}, eq{slot:item}, chest{stars:1}, team[ids], ach{id:1}, seen{id:1}, st{lifetime counters}, q{daily/weekly}, fin. Missing key = migration: every mission already finished in qq_stars/qq_ch gives 300 XP; items/maidens/chests are *derived* from qq_stars so old players get them at once (chests still have to be tapped). Coins stay in the game's own `qq_save` (SAVE.gold) — no second currency.
- Hero level: 1..30, XP need = 60+40*level. XP: kill 5–12, heavy/boss 80, mission 80+25*stars+10*chapter. Per level +1.5% HP, +1% damage, coins 20+10*level. Level-up in combat: flash, two rings, burst, slow-mo .45 s, heal 35%, +25 call charge, banner `#mt-lvup`.
- Skill tracks (3 tiers, 120/300/600 coins): Guloyim blade (spin/slam), bow (rain/chain), dash, leap, call (ulti/amulet); Allayar bash, cry, cleave; Sarbinaz thrust, sweep, javelin.
- Equipment: 4 slots x 3 items (saber, bow, armour, tumar). Sources: boss missions 1-4…6-4 and star chests.
- Maidens: 12 (bring 3), one perk each. Unlock by mission or total stars.
- Quests: 3 daily (+100 for all three), 2 weekly, 16 achievements, 8 star chests (6/15/27/40/54/68/80/90).
- Camp screen `#mt-camp` (tabs: hero, skills, equip, maids, quests, book). Opened from title (`#tcamp`), map header (`.mt-mapbtn`), end screen (`.mt-endbtn`).

## API for the combat code: window.__META
- `mul(key)` -> number, default 1. Keys: `hero.hp`, `hero.dmg`, `gold`, `xp`, `cd`, `ulti.gain`, and per skill `<kind>.dmg`, `<kind>.cd`, `<kind>.r` where kind is one of spin, slam, rain, chain, dash, leap, ulti, amulet, bash, cry, cleave, thrust, sweep, javelin.
- `add(key)` -> number, default 0. Keys: `spin.hits`, `slam.hits`, `sweep.hits` (1 = one extra hit), `rain.waves` (2 extra volleys), `chain.targets` (1 extra target), `dash.wave`, `bash.wave`, `cleave.wave`, `thrust.wave` (1 = end shockwave), `ulti.heal`, `amulet.heal`, `cry.heal` (fraction of max HP).
- Until the combat code reads them, meta.js emulates everything from outside (own rAF, no engine patch):
  dmg -> writes `G.dmgBoost` every frame (base captured after makePlayer x hero.dmg x current act's `<kind>.dmg`); cd -> `G.sk[k].max` and `HERO_SK[h][k][1]`; hp -> `p.maxHp` once per new player; extras -> extra ring hits via e.damage()/ringFx, follow-up entry pushed to `G.rains`.
- If the combat code starts applying a group itself, call once `__META.native('dmg' | 'cd' | 'extras' | 'hp')` and meta.js stops emulating that group (otherwise it would be applied twice).
- `missionEnd(id, stars)`, `openCamp(tab?)`, `closeCamp()`, `claimChest(n)`, `addXp(n)`, `level()`, `state`, `derived`, `bonus`, `refresh()`.

## CSS: variables and class names (all rules live in the `<style id="mt-css">` injected by meta.js)
Root class `.mt` carries the variables: `--mt-bg --mt-bg2 --mt-panel --mt-panel2 --mt-line --mt-line2 --mt-gold --mt-text --mt-dim --mt-accent --mt-accent2 --mt-ok --mt-lock --mt-r --mt-fs --mt-font`.
Do NOT use the class name `on` inside these elements: index.html has a global `.on{display:block!important}`. Selected state is `.sel`, open state is `.open`.
- Camp: `#mt-camp(.open)` > `.mt-top` (`.mt-back`, `.mt-title`, `.mt-lvl` > `.mt-lvn` + `.mt-bar` > i, `.mt-gold`) and `.mt-body` > `.mt-tabs` (`.mt-tab(.sel)` with `b` icon, `span` label, `.mt-dot` badge) + `.mt-pane`.
- Shared: `.mt-card`, `.mt-cols`, `.mt-h` (section title), `.mt-btn(.poor/.done/.go)`, `.mt-bar(.ok)`, `.mt-note`, `.mt-chip`, `.mt-new`, `.mt-dot`.
- Hero: `.mt-hero`, `.mt-port`, `.mt-stat`, `.mt-chips`, `.mt-row`, `.mt-pips`.
- Skills: `.mt-seg` (hero chips, `.sel`), `.mt-sk`, `.mt-skn`, `.mt-ic`, `.mt-tiers`, `.mt-tier(.sel/.next)`.
- Equipment: `.mt-eq`, `.mt-slot`, `.mt-item(.r1/.r2/.r3, .sel, .lk)`.
- Maidens: `.mt-md`, `.mt-maid(.sel/.lk)`, `.mt-av` (portrait; art can be supplied by adding `img:'file'` in MAIDS -> assets/img/file.jpg).
- Quests: `.mt-q(.cl)`, `.mt-rw`, `.mt-chs`, `.mt-ch(.go/.cl)`.
- Book: `.mt-book`, `.mt-bl`.
- Outside the camp: `#tcamp` (title button, class `btn alt`), `.mt-mapbtn` (map header), `#mt-chestbar` > `.mt-cst`, `.mt-cb(.go/.cl)` (map), `#mt-xp` (HUD level badge + XP bar), `#mt-end` > `.mt-x`, `.mt-got`, `.mt-endbtn` (end screen), `#mt-toasts` > `.mt-toast`, `#mt-lvup(.open)`.

## Session 2 (takeover, 2026-11-20 ~04:28–05:05)
**Found:** live js/meta.js had been overwritten at 04:27 by an OLDER build (used class `.on`, which index.html's global `.on{display:block!important}` breaks — camp rendered as display:block). Staging copy /home/user/agents/mt/meta.js (04:09, `.sel`/`.open`) was the correct one -> restored it to the live file (reverted copy kept at mt/meta.public_reverted_0427.js). If anyone restores meta.js from a snapshot (e.g. mt/snap), the camp breaks again — copy from the live file, not from snap.
Also: a stale `mt4.js` run from the previous session held port 8851 serving the old snapshot; killed it.

**Hook edits (engine.js, python str.replace with asserts; backup mt/engine.before_metahook.js):**
3. `const pd = () => {…}` -> `const pd = (kk) => {… * (window.__META && __META.pdMul ? __META.pdMul(kk) : 1); };`
4. arrow-rain tick: `hitCircle(r.x, r.z, r.r, () => pd() * .8, …)` -> `() => pd('rain') * .8`
So every hit of every skill now reads the meta multiplier natively at hit time (hero level + equipment + maiden perks + per-skill tier dmg + boss/last-stand perks). meta.js fetches engine.js once and, if it contains `__META.pdMul`, switches its own G.dmgBoost emulation off (no double counting; if the hook ever disappears the emulation comes back by itself). G.dmgBoost is no longer touched when the hook is present.
Cooldowns are read natively already (engine does `s.cd = s.max` / heroSkill uses HERO_SK def; meta writes those). Extras (extra hits, area rings, volleys, waves, heals) remain applied by meta.js from outside (scheduled ring hits) — no engine edit.

**meta.js changes:**
- `export function pdMul(kk)`; API adds `__META.pdMul`, `__META.isNative(group)`.
- Save VER 2: new field `auto` (ids already auto-placed). v1->v2 migration: on load, freshly unlocked items go into empty slots (saber/bow/armour also replace a weaker one), maidens fill free squad places. Verified: v1 save {eq:{},team:[sarbinaz]} -> eq {bow:bow1}, team 3/3.
- Map chest strip is compact: only unclaimed chests that matter now (claimable + next goal, min 3) + "+N" counter; hidden when all claimed (it covered chapter labels before).
- RU quest strings re-phrased as grammatical noun phrases ("Пройденные задания: {n}", "Побеждённые враги: {n}", "Собранные звёзды: {n}", …).

**Tests (port 8851, LOWQ=1), all without [pageerror]:** mt5 (title, migration, all 6 camp tabs, buy tier, ru/en/uz), mt6 (mission 2-2: native flag true, pdMul spin 1.296 = lvl/maid 1.08 x tier 1.2, rain 1.452; level-up banner+heal 35%+maxHp up; end screen row; map; chest claim gives sab1), mt7 (v1->v2 migration, map strip, chest claim auto-equips, camp from map, back). Screens: /home/user/t/m5_*.jpg, m6_*.jpg, m7_*.jpg.

**qq strings:** full list unchanged in /home/user/agents/mt/qq_list.md (all keys, qq + uz original). No new qq strings this session.
