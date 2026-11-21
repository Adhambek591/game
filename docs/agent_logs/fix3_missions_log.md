# fix3 — MISSIONS part of the author's 2nd phone play-test (Nov 20)
Agent: fix3-missions. Owner files: /home/user/agents/m2/src/*.js (→ js/missions.js via m2/src/build.sh) and js/i18n.js.
Backups before my edits: /home/user/agents/fix3/src.orig/ (all parts), /home/user/agents/fix3/i18n.orig.js, /home/user/agents/fix3/missions.orig.js.
Nothing committed / pushed / deployed. bust.py runs inside build.sh after every build.

## Files
- NEW /home/user/agents/m2/src/69_fix3.js (built after 67_tutorial.js; build.sh list updated): side alert, boss-solo watcher, rideRun() + RUN['2-1'|'4-1'|'7-1'], RUN['2-3'] (caravan rework), RUN['3-3'] (bridge rework).
- 10_table.js: enemy budget F3_CAP = 40 (sp() counts every spawned enemy in G.mis.nE); MLIST objective keys for 2-1, 2-3, 2-4, 3-3, 4-1, 7-1 (7-1 stars: win | in time | all rings).
- 20_kit.js: rein() trims a wave to the remaining budget; balanceGroups() extra soldiers stop at the budget.
- 45_rescue.js: freed people RUN (4.8 m/s, elders 3.8, Running_A for all); the 'ride' captive label has no countdown.
- 50_run_a.js: 1-4 wolves are fought BEFORE Qashqir (no wake during the boss); 2-4 / 3-4 boss brains without 'summon'; 2-4 objective "Qum dáwin jeńiń".
- 60_run_b.js: 5-4 / 6-4 / 7-4 brains without 'summon', 6-4 ghost-rider phase removed (speed-up instead); 7-2 totem spawns go through sp() and stop at the budget (were endless every 11 s).
- 67_tutorial.js: tutorial rework (see 1).
- js/i18n.js: two lines per language block `// fix3 missions/tutorial (fix3 agent)` (+1 line tu3_o).

## Per item
1. Tutorial 0-0 (also the coordinator's new direction): the PLAYER is a young trainee maiden, Aysulıw (qiz model, portrait md_aysuliw, name n_ays);
   Gúlayım is the teacher (npc 'gulayim', speaks as 'gu'), Sárbinaz is the sparring partner (partner type 'sarbinaz') and the final opponent; at the end
   (súren) a hint + banner subtitle "Endi Gúlayım bolıp oynaysız" and 0-1 follows with Gúlayım.
   8 steps: move → 3-hit combo → strong attack (shield dummy) → dodge → block ×2 + parry ×1 → lock-on → bow (archery agent's TU-S range) → duel.
   Removed: roll, jump, amulet, walk-to-range, ride rings.
   Each step: Gúlayım shows it first (card "👀 Qara — áwele men kórsetemen", she walks/strikes/breaks her own demo shield dummy; for dodge/block Sárbinaz strikes HER),
   then "Endi sen!" → big card at top centre (17 px, step k/8), 46 px animated hand on the exact button (drag animation on the joystick), the button pulses with a gold glow,
   gold ground ring at the target, big green ✓ in the middle of the screen on success.
   Generous timing: combo gap 1.7 s (or 7 light hits); dodge counts if ➤ was pressed any time within 1.7 s before her strike; block/parry: her wind-up 1.7 s, parry counts if
   the shield went up within 1.1 s before the hit; fallbacks: shield dummy breaks after 7 tries, dodge after 4 misses, parry after 3 misses (Gúlayım: "Jaqsı! Keyin úyrenip alasań").
   Duel: Sárbinaz wind-up 1.0 s (was .72), cd 1.9.
2. Hostages: freed people RUN (4.8 m/s, elders 3.8). 3-3 no longer waits for a 0.8 m/s walk: the captives are bound beyond the bridge; when the guards fall they are counted
   saved at once and run back over the bridge (waypoints through the deck); the mission goes on with the landings, not with them walking.
3. Rides (2-1, 4-1, 7-1): rideRun() — no enemy on horseback at all. 2-1/4-1: three riders (team npc) gallop away with a captive each; ride up beside one (4.3 m, 0.2 s)
   and he drops the captive and veers off the road; 6 golden rings (saqıyna), 6 rocks to steer round, end marker; 7-1: 8 rings + 45 s timer (stars: in time / all rings).
   Horse speed in rides ≈ 8.3 m/s, riders 5.5–5.7 m/s with rubber band. HUD: "🐎 objective ⛓ k/3 ◯ r/6".
4. Caravan 2-3: FX.convoyCart (horse in front, faces and moves forward along the trail, real spoked wheels spinning; driven from G.tick with game time — fx.js only ticks on render),
   3.1 m/s, stops ONLY while an ambush is alive or an enemy is within 9 m of the lead cart. 4 scripted ambushes (left / right / behind / front with a captain), 18 enemies total,
   each announced with a big flashing side alert (◀ Shep tárepten hújim! etc.) + horn; objective shows metres to the well. No fail state (caravan health only affects stars).
5. Bosses: 'summon' removed from every boss brain in missions (2-4, 3-4, 5-4, 6-4, 7-4; 6-4 ghost riders removed); 1-4 wolves are fought before Qashqir;
   during a boss fight the objective reads "⚔ <boss> penen jekpe-jek". Soldiers: the combat agent's engine watcher ring handles them (my first version made them leave — removed on request).
6. Bridge 3-3: layout uses the ch3 bridge at z −78 (deck x ±6, colliders beyond): guards + captives at z −92..−101 on the far bank, landings at x ±9 / z −91..−97 (far bank) and
   z −58..−66.5 (near bank) — nothing spawns inside the river colliders any more (the old waves spawned at x ±11 next to the bridge). Objectives: "Kópirden ótip, tutqınlardı azat etiń" → "Qayıqlar jaǵaǵa kelip atır — kópirdi qorǵań!".
7. Budget: F3_CAP 40 per mission (sp() counter; rein()/balance/7-2 totem spawns stop). Endless loops fixed: 7-2 totems, old convoy storm wolves (gone). Arrow: focusOf() —
   nearest enemy within 25 m, else the nearest group (enemy with company within 8 m), never a lone far straggler (used by clear()/dead() aims and the default arrow).
   0-2: the clinch no longer drags Surtaysha to the player: the player is clamped mid-arena (x ±2.5, z −100.5..−97, as story.js does) and Surtaysha placed in front.

## Tests (own ports 8921–8957, snapshot per run via /home/user/t/f3/run.sh, LOWQ, 844x390, NO god mode)
Bots: /home/user/t/f3/tu3.js (tutorial: key events + doAct, no teleports; skips only the archery agent's TU-S range by setting its done flag), /home/user/t/pf/play.js (missions).
- 0-0 (tu_g.log, final build): move@5.7 light@16.2 heavy@46.5 dodge@64.3 (counted, no fallback) block+parry@84.0 lock@85.2 bow@100.6 duel won → hook → end screen @139.5; 0 [pageerror].
  Screenshots: tu_b_move/light/heavy/dodge.jpg (big card, hand on the button, gold target ring, Sárbinaz's red wedge), tu_g_demo*.jpg (Gúlayım's demos with "Qara — áwele men kórsetemen",
  gold arrow on the teacher), tu_c_duel.jpg (trainee vs Sárbinaz in the ring, English). After tu_e/f the card moved from the top to the bottom centre: at the top it covered the demo spot.
- 2-1 (r21_c.log): riders caught at t 20.6 / 23.4 / 27.5, rings 3/6 (bot ignores rings), end screen 3★ "Hámmesi qutqarıldı", 0 [pageerror]; r21_c_28.jpg (dropped captive on the ground, rider veering off, rock).
- 7-1 (r71_a.log): end screen ★ win ★ in time ☆ all rings, 0 [pageerror].  4-1 uses the same rideRun (not run separately).
- 2-3 (c23_b.log): 4 ambushes at t 7.5 / 47.3 / 70.7 / 91.4, caravan reached the well at t 114 (≈1:55 game time), end screen 3★, 0 [pageerror]; c23_b_50.jpg / c23_b_110.jpg: cart faces forward, horse leads, spoked wheels.
- 3-3 (b33_a.log): captives freed 5/5 at t≈39, landings, end screen 3★ at t 70, 0 [pageerror]; b33_a_60.jpg: fight on the bridge deck.
- 2-4 (q24_a.log): pre-boss group, then boss alone ("⚔ Qum dáwi penen jekpe-jek", en=1 the whole fight), q24_a_60.jpg. Run cut at TMAX (bot is weak vs the giant: 2 deaths), no end screen.
- Bugs found while testing (fixed): npc riders got no AI calls from the engine (now driven from G.tick); FX.convoyCart only ticks on render (now driven with game time from G.tick);
  two inline `//` comments swallowed code on the same line (fixed before the final runs); demo card at the top hid the demo spot; red arrow pointed at the sparring partner between drills.

## Honest weaknesses
- Rides are short (2-1 ≈25 s of riding, 7-1 ≈15 s): the ride level is 200 m. Could add a longer level later.
- 2-4 not played to the end by the bot; bosses' own AIs in story.js (qashqirAI / dragonAI) still contain wolf summons — the combat agent's engine turns kit summons off during duels (their log).
- The arrow change (focusOf) was not re-measured on 1-1 after the combat agent's walking stragglers.
- Gúlayım's demo moves are scripted animations (no real hit detection); demo dummy for the strong attack is a second shield dummy.

## New qq strings (please check — Karakalpak Latin; reused words: quwırshaq, saqıyna, súren, Barekelle, ájapa, jarıs not used)
Rides: f3o_2_1 Atlılarǵa jetip alıń — tutqınlardı qutqarıń · f3o_4_1 Jaǵa boylap atlılarǵa jetip alıń · f3o_7_1 Qarańǵı túskenshe dushpan lagerine jetiń ·
f3_h_ride Atlınıń qasına barıń — ol tutqındı taslap qashadı. Altın saqıynalar arasınan ótiń. · f3_h_ride7 Altın saqıynalar arasınan shawıp ótiń hám waqıtında jetiń ·
f3_caught Jetip aldıńız! Tutqın azat. · f3_esc Bir atlı tutqını menen qashıp ketti… · f3_late Keshiktińiz — biraq jol dawam etedi! · f3_s_time Waqıtında jetip keldińiz ·
f3_s_rings Barlıq saqıynalar arasınan óttińiz · f3_ride_end Jetip keldik!
Caravan: f3o_2_3 Kárwandı qudıqqa shekem aman alıp barıń · f3_cv_go Kárwan jolǵa shıqtı. Onıń qasında júriń. · f3_cv_m Qudıqqa shekem {n} m · f3_amb_l Shep tárepten hújim! ·
f3_amb_r Oń tárepten hújim! · f3_amb_b Arttan hújim! · f3_amb_f Aldıda jol tosıldı! · f3_cv_stop Kárwan toqtadı — hújimshilerdi jeńiń! · f3_cv_on Jol ashıq — kárwan dawam etedi
Bridge / boss: f3o_3_3 Kópirden ótip, tutqınlardı azat etiń · f3_33b Qayıqlar jaǵaǵa kelip atır — kópirdi qorǵań! · f3o_2_4 Qum dáwin jeńiń
Tutorial: tu3_o Gúlayımnan batırlıq ónerin úyreniń · tu2_watch Qara — áwele men kórsetemen · tu2_you Endi sen! · tu2_p Barekelle! · tu2_easy Jaqsı! Keyin úyrenip alasań. ·
tu2_move Joystikti jılıstırıń — altın sheńberge barıń · tu2_combo ⚔ túymesin 3 ret tez basıń — quwırshaqqa 3 soqqı · tu2_heavy Qalqanlı quwırshaq: KÚSHLI soqqı túymesin basıń ·
tu2_heavyH Qalqanlı quwırshaq: ⚔ túymesin BASIP TURIŃ — kúshli soqqı · tu2_dodge {n} qılısh kóterse — ➤ túymesin basıń (2 ret) · tu2_block Qalqan túymesin BASIP TURIŃ — soqqını toqtatıń (2 ret) ·
tu2_parry Endi qılısh túskende qalqan túymesin basıń — soqqını qaytarıń! · tu2_lock Nıshan túymesin basıń — {n} nıshanǵa alınadı · tu2_bow Sadaq penen nıshanalarǵa atıń ·
tu3_d1 Qayırlı tań, Aysulıw! Búgin saǵan batırdıń tiykarǵı ónerlerin úyretemen. · tu3_d2 Tayarman, Gúlayım ájapa! · tu3_d3 Men kórsetemen — sen qaytalaysań. Qáne, basladıq! ·
tu3_spar Al endi men menen, Aysulıw. Qorıqpa — aqırın uraman. · tu3_ok Tayarman! · tu3_duel1 Sońǵı sınaw: Sárbinaz benen jekpe-jek. Úyrengenlerińniń hámmesin isle! ·
tu3_win Barekelle, Aysulıw! Endi sen haqıyqıy qırq qızdıń birisiń. · tu3_horn Esitip tursızlar ma… súren! Kópir tárepten! · tu3_next Endi Gúlayım bolıp oynaysız
Unsure: "ájapa" as the trainee's address to Gúlayım, "hújimshilerdi", "qaytalaysań", "Úyrengenlerińniń". Reused old lines in the duel: tu_d_gu3 "Meni ayama, Sárbinaz" is now said by the trainee.
