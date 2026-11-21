# Videos vs. the game: every cutscene slot checked against its level

Date: 2026-11-21. Written in reply to the author's complaint: "In the training game the practice is INSIDE the Miywali fortress, but in the video the messenger arrives OUTSIDE in an open field. In the game he came over a BRIDGE. The two don't match at all."

Sources: `tools/m2src/67_tutorial.js` (0-0), `public/js/scenery.js` `_ch3()` (the river scenery the tutorial reuses), `tools/m2src/50_run_a.js` and `public/js/story.js` (where each `cutscene()` is called), `public/assets/video/*.mp4` (frames cut with ffmpeg at 8 points per clip, plus 0.3/0.7 of each duration to compare with `docs/approved_video_frames/`), `docs/agent_logs/video_all_log.md`, `docs/agent_logs/video_v2_log.md`, `docs/author_script_uz_qq.txt`.

No video or image was generated for this report. Every prompt below is a DRAFT. Each one **needs the author's OK** before anyone generates it, and it must use free (unlim) generation only.

---

## 1. What the tutorial 0-0 actually shows (the reference the author is using)

From `67_tutorial.js` `build()` and `scenery.js` `_ch3()`:

| Element | In the game |
|---|---|
| Place | A training camp on a river field. The code comment says "river field by Miywali". The messenger's line `w4_ms1` says he rode "to **Qıran tawı**". `lore0` says Gúlayım "built a **qorǵan** (fortress) at Miywali". |
| Walls | Mud-brick wall `wall(-30,30,13, 2.2)` right behind the start point (≈3.3 m high, with corner towers). A second, higher wall `wall(-30,30,-176, 4)` (≈6 m, towers) at the far end. Both run across the whole field, so the player is between two fortress walls. No side walls: a river runs along the left side and a row of yurts along the right. This is why the author reads the camp as "inside the fortress". |
| Camp dressing | Small round yurts (right-hand row plus 3 inside the field), coloured banners, spear racks, hay bales, two horses, a cart, archery targets, sparring pairs, two mounted maidens riding laps, onlookers. Tugai river scenery: reeds, tamarisk, turanga, elm and poplar. Bright day (`DAY` mood, fog 60–170). |
| Bridge | Plank bridge at z = −78 over a river that crosses the field (`bridge(ZC=-78, 6, 15.6)`, water surface −1.05). The river is walled off by colliders, so the bridge is the only way across. |
| Duel | Sárbinaz sparring duel in a ring of maidens at z = −60, just on the near side of the bridge. |
| Messenger entry | After the duel: music off, hoof sound. The rider (model `son`, mounted) spawns at **x 1.4, z −104, beyond the bridge, still inside the far wall**. He gallops straight down the lane, **over the bridge**, kicking up dust, and stops 3.4 m in front of the player. Everyone turns to face him. Bubble "Gúlayım! Gúlayım!", then dialogue `w4_ms1..3`. |
| Camera | Normal third-person follow. For the messenger, a scripted cinematic (`tuCam`) lifts to behind-right of the player (+3.4, 3.2 m, +5.2) and looks north past the bridge toward the rider. HUD and buttons are hidden during it. |
| Player / Gúlayım | The player controls **Aysulıw** (`qiz` model). Gúlayım is an NPC (`gulayim` model, BLUE). |
| No video | 0-0 plays **no video at all**. The messenger scene is in-engine only. |

The author's description is accurate: in the game the messenger rides **inside the walled camp, over the bridge**.

## 2. Where each video slot is played

| Slot | Called from | Moment in the game | Narration |
|---|---|---|---|
| v1 | `50_run_a.js` 0-1 start / `story.js prolog()` | Prologue start (after the tutorial's messenger), Sarkop at night, player = Allayar | nar1 |
| v2 | end of 0-2 | Allayar falls, then `lore_sur` | nar2 |
| v3 | 1-1 start, after `lore1` | Chapter 1 opening (Gúlayım comes to burnt Sarkop) | nar3 "during the attack Gúlayım was training at Qıran tawı…" |
| v4 | Qashqir defeated (end of chapter 1) | Spirit flows into the amulet | nar4 |
| c2..c7 | `chapterIntro(n)` | Before chapters 2–7 | nar6..nar11 |
| e1, e2 | `epilogue()` | After the final duel | nar12, nar13 |

No slot is tied to the tutorial. The "messenger video" the author saw was not in the build: no current mp4 contains a messenger. It must be either (a) the `v3_msg` shot planned in `video_v2_log.md` (it says "Green plateau of Qiran mountain… open", with no wall and no bridge), which was shown or described to him, or (b) the current `v3.mp4`, which shows the training in an open steppe right after he has played the walled camp. **Both contradict the game.** Correcting either one fixes the complaint.

## 3. Which current clips are among the 14 approved

The ids map to `docs/approved_video_frames/01..14` in the order listed in CLAUDE.md. This was checked against the job ids in `video_all_log.md`: 09 = 2cb2ce4e, 10 = f30164ab, 11 = 02936dfd, 12 = 1f9ffaa6, 13 = d32053b9, 14 = 904bd7aa. I then compared frames at 0.3 and 0.7 of each game mp4 with the approved stills.

| Game file | Approved? | Matching approved clip |
|---|---|---|
| v1.mp4 | **YES** | 01 = 2a1cd048 (khan drinks the potion, red-eyed men, wolf, horde) |
| v2.mp4 | no | (approved 03 = 63675757 and 07 = 22beb001 cover the same moment but are NOT used) |
| v3.mp4 | no | (approved 10 = f30164ab, archers on a plateau, not used) |
| v4.mp4 | no | none |
| c2.mp4 | no | (approved 11 = 02936dfd, caravan on the salt flat, not used) |
| c3.mp4 | **YES** | 06 = fd1c26e0 (chained Otbasqan by the river, riders in reeds) |
| c4.mp4 | no | (approved 13 = d32053b9, prisoners on a pier, not used) |
| c5.mp4 | no | none |
| c6.mp4 | no | (approved 14 = 904bd7aa, cages on a wall, not used) |
| c7.mp4 | no | none |
| e1.mp4 | **YES** | 05 = 8a8b253a (khan crumbles, wolf-men turn back into men) |
| e2.mp4 | no | none |

Approved clips not used anywhere: 02, 03, 04, 07, 08, 09, 10, 11, 12, 13, 14. Only 3 of the 12 game videos are approved. The other 9 break CLAUDE.md "only these 14 clips are usable".

## 4. Scene by scene: game vs. video

Legend: OK = matches, ✗ = mismatch. "A" = change the game (or swap in an already-approved clip, which needs no generation). "B" = new video prompt that matches the game (needs author OK).

### 4.0 Tutorial 0-0: the messenger (the author's complaint)

| | Game | Video (current v3 / planned v3_msg) | Match? |
|---|---|---|---|
| Location | Walled camp (Miywali qorǵan), river, tugai trees, yurts | Open green steppe / plateau, snow peaks, no wall | ✗ |
| Messenger entry | Rides in from the far end of the camp, **over the plank bridge** | v3: no messenger at all, she "sees smoke" instead. v3_msg: reins in on an open plateau, no bridge | ✗ |
| Story | No alarm, no smoke: news comes only from the messenger | v3 shows a **smoke column** on the horizon (the old version of the story) | ✗ |
| Gúlayım's clothes | BLUE | v3 close-ups: **red** headscarf and red dress | ✗ |
| Amulet | She should not have it yet (mother gives it in ch. 1) | v3: none visible (OK) | OK |
| Faces / clones | — | v3: a line of ~15 identical archers (cloned), 3 different "heroine" faces | ✗ |

- **Option A (change the game):** move the training out of the walls onto an open plateau and remove the bridge. **Not recommended.** It contradicts the author's own description, and no approved clip shows a messenger anyway, so nothing would be gained.
- **Option C (no video):** keep the in-engine messenger cinematic that already exists, because it matches by definition. Polish it: dusty wounded rider, the horse stumbles, he slides down. **Recommended as the immediate fix.**
- **Option B (new prompt, needs author OK):** only if the author wants a filmed version:

> **B-0-0 "Shabarman at Miywali" (8–10 s), needs author OK.** Cinematic semi-realistic stylized 3D animated film look, matching the approved clips: detailed skin, real fur, individually modelled lamellar plates, volumetric light, shallow depth of field. No text, no subtitles, no speech, no blood. Bright late morning inside Miywali fortress: a training field enclosed by a plain mud-brick wall with pointed merlons and irregular towers, round felt yurts with patterned bands along one side, a calm river crossing the field under a low wooden plank bridge, reeds and poplars on the banks, haze over the far wall. Foreground, out of focus: a wooden spear rack and a hay bale. Midground: one exhausted messenger, a dust-grey young man in a torn brown chapan with a bandaged forearm, gallops over the plank bridge toward the camera on a sweat-lathered dun horse; the hooves drum on the planks. He reins in hard on the near bank; the horse stumbles, he slides heavily from the saddle with real weight, catches the mane and lands on one knee. On the right side of frame stands Gúlayım (approved identity element 51673ed0, no pendant) in her deep-blue dress, blue headscarf, two long black braids and steel lamellar cuirass, a practice saber lowered; she steps toward him, eyes on him, her face turns from surprise to dread. Background at three different distances: a few maidens in red, green and cream dresses lower their bows and swords one after another, not in unison. 50 mm, slow handheld push-in. Sound: hooves on planks, wind, horse breath.

### 4.1 v1: Sarkop attacked (prologue start)
| | Game (0-1) | Video v1 (approved 01) | Match? |
|---|---|---|---|
| Location | Sarkop at night: walled street of yurts and houses, fires | Aerial of a walled yurt city, torch army, khan on horseback | OK |
| Time | Night | Night, but the last shot is a **sunrise** charge | small ✗ |
| Faces / style | — | Approved style | OK |

**Recommendation: keep it** (approved). Optional A: none needed.

### 4.2 v2: Allayar falls, amulet drops, captives (end of 0-2)
| | Game | Video v2 (not approved) | Match? |
|---|---|---|---|
| Location | Burning Sarkop | Burning yurts and palisade | OK |
| Amulet | Small gold triangle pointing DOWN | **Round gold coin medallion** | ✗ |
| Captives in chains | Script: yes | Distant crowd, no chains readable | ✗ |
| Approved | — | **no** | ✗ |

- **A (swap, no generation): recommended.** Replace with approved **03 (63675757)**, Allayar vs. the khan, followed by approved **07 (22beb001)**, Allayar on the ground with his hand on a small flat gold triangle. Needs a 2-clip concat (ffmpeg, no credits).
- B: the `v2_fall` and `v2_chain` prompts already in `video_v2_log.md` (they need author OK) can be added later for the chained captives.

### 4.3 v3: before chapter 1 (training at Qıran / Miywali)
| | Game | Video v3 (not approved) | Match? |
|---|---|---|---|
| Location | The player has just seen the **walled river camp** (0-0) | Open steppe, snow peaks | ✗ |
| Story | Messenger told her; no smoke | Smoke column = "she sees the smoke" (old story) | ✗ |
| Gúlayım | BLUE | Red headscarf and dress in close-ups; faces change between shots | ✗ |
| Crowd | — | Cloned archer line, identical bay horses in unison | ✗ |

Problem of order: after 0-0 (messenger) → 0-1/0-2 (the messenger's tale), v3 replays the training. What belongs here is the **ride-out**: she leaves Miywali and reaches burnt Sarkop.

- A: swap in approved **10 (f30164ab)**, archers on an open plateau. This still shows an open field, so it repeats the author's complaint. **Not recommended.**
- **B (recommended, needs author OK):**

> **B-v3 "Ride-out from Miywali" (8–10 s), needs author OK.** Cinematic semi-realistic stylized 3D animated film look, matching the approved clips: detailed skin, real fur, lamellar plates, volumetric light, shallow depth of field. No text, no subtitles, no speech, no blood. Afternoon at Miywali fortress: the open wooden gate in a plain mud-brick wall with pointed merlons, a plank bridge over the river just outside the gate, reeds and poplars, round felt yurts inside the wall behind. Foreground, out of focus: the gate post and a hanging felt strap. Midground, on the right side of frame: Gúlayım (approved identity element 51673ed0, no pendant) in her deep-blue dress, blue headscarf and black braids, on a dark bay horse, rides out through the gate and onto the bridge, jaw set, eyes on the road ahead. Half a length behind her ride exactly three other maidens, clearly different women: stocky in red on a white horse, tall in green with a fur-trimmed cap on a chestnut with a white blaze, young in cream on a dappled grey; every horse in a different stride phase, hooves loud on the planks. Far background: more riders as small dust-veiled shapes strung out unevenly behind the wall. 35 mm, low angle from the far bank, slow pan following them. Sound: hooves on planks, wind.

The in-engine narration nar3 ("…was training at Qıran tawı") still fits as voice-over.

### 4.4 v4: Qashqir's spirit enters the amulet (end of chapter 1)
| | Game | Video v4 (not approved) | Match? |
|---|---|---|---|
| Location | Burnt Sarkop | Burning walled city | OK |
| Gúlayım | BLUE | **Burgundy/red** dress and headscarf | ✗ |
| Amulet | Small gold triangle pointing DOWN | Large glowing triangle that appears to point UP | ✗ |
| Extra | — | A giant ghost **Surtaysha** in the sky (not in the script here) | ✗ |
| Style | Approved = semi-realistic 3D | **Painterly** 2D-like look (style drift) | ✗ |

- A: no approved clip shows the wolf. (Approved 09 shows the khan, not the wolf; it belongs to e1.)
- **B (recommended):** the `v4_seal` prompt in `video_v2_log.md`. Before it goes to the author for OK, add one line: "on the right side of frame; the amulet is a small flat plain gold triangle pointing DOWN, no engraving, no eye".

### 4.5 c2: salt desert, caravan
| | Game ch2 | Video c2 (not approved) | Match? |
|---|---|---|---|
| Location | Salt desert, caravan trail | Dunes and salt flat | OK |
| Gúlayım | BLUE | Red | ✗ |
| Crowd | — | Evenly spaced row of identical riders (clones); a far "conveyor" line of captives | ✗ |

**A (swap): recommended.** Use approved **11 (02936dfd)**, the varied captive caravan on the salt flat. B: `c2_track` from `video_v2_log.md` (needs OK) if a Gúlayım shot is wanted.

### 4.6 c3: river, chained Otbasqan
| | Game ch3 | Video c3 (approved 06) | Match? |
|---|---|---|---|
| Location | River camp, reeds, bridge | River at sunset, reeds | OK |
| Amulet | Only Gúlayım's, pointing DOWN | **Otbasqan wears a glowing gold triangle pointing UP** | ✗ |
| Gúlayım | BLUE | Red, in the reeds | ✗ |

Approved, but it breaks two hard rules. **A (swap, recommended):** approved **08 (6a12c6a9)**, chained Otbasqan by the campfire with no amulet, plus approved **12 (1f9ffaa6)**, BLUE Gúlayım and Sárbinaz whispering in the reeds with enemy fires across the river. Both are approved, both match the level, and neither breaks a rule. Ask the author before dropping 06.

### 4.7 c4: sea shore, ships, Aydarha
| | Game ch4 | Video c4 (not approved) | Match? |
|---|---|---|---|
| Ships | Steppe boats | **Viking longships** with round shields (European) | ✗ |
| Gúlayım | BLUE, rides | **Red**, runs on foot; amulet appears to point UP | ✗ |
| Aydarha | Sea dragon | Dragon rising, chained | OK |

**A (swap) + B:** approved **13 (d32053b9)**, prisoners driven along a pier, then the `c4_aydarha` prompt (needs OK) for the dragon. Note: 13 has junk-style sails, which the author already approved.

### 4.8 c5: Darbent pass, Qunqar strikes Otbasqan, Sárbinaz
| | Game ch5 | Video c5 (not approved) | Match? |
|---|---|---|---|
| Location | Mountain pass | Rocky pass at dusk | OK |
| Physics | — | Otbasqan is **thrown flat through the air** (the throw/flight the rules forbid) | ✗ |
| Qunqar | Giant | Horned minotaur-like giant | check vs. game model |
| Sárbinaz | — | White headscarf, spear, eyes on the giant | OK |

**B (recommended):** the `c5_qunqar` prompt in `video_v2_log.md` (shield splinters, knee buckles, falls on his side) needs OK. No approved clip exists for this scene.

### 4.9 c6: Qashal fortress, Qarǵashıq, cages
| | Game ch6 | Video c6 (not approved) | Match? |
|---|---|---|---|
| Location | Mud-brick Qashal | Mud-brick wall, burning yurts | OK |
| Style | — | **Painterly**, a giant ghost head in the sky | ✗ |
| Gúlayım | BLUE | **Red**; the riders behind her are her clones | ✗ |

**A (swap) + B:** approved **14 (904bd7aa)**, cages on the red wall, then the `c6_qarg` prompt (needs OK).

### 4.10 c7: Surtaysha's horde, bloody totems
| | Game ch7 | Video c7 (not approved) | Match? |
|---|---|---|---|
| Location | Horde camp, totems | Black yurts, carved totems, red sorcery | OK |
| Totems | Plain carved | Glowing **rune-like symbols** (close to "text") | small ✗ |
| Approved | — | no | ✗ |

**B:** the `c7_ritual` prompt (needs OK). Until then, ask the author whether this clip is acceptable as it is. It has no heroine and no amulet, so it breaks fewer rules than the others.

### 4.11 e1: Surtaysha falls, monster soldiers become men
| | Game | Video e1 (approved 05) | Match? |
|---|---|---|---|
| Content | Khan defeated, soldiers turn back into men | Yes | OK |
| Spirit INTO the amulet | Script rule | Not shown | ✗ |
| Gúlayım (last shot) | BLUE | **Red** dress | ✗ |

**A (swap/trim, recommended):** open with approved **09 (2cb2ce4e)**, the khan crumbling to gold that flows INTO BLUE Gúlayım's down-pointing amulet, then approved 05 trimmed before its last shot (the red-dress Gúlayım).

### 4.12 e2: people return, names on stone, father's grave
| | Game | Video e2 (not approved) | Match? |
|---|---|---|---|
| Text | No text | **Readable pseudo-Cyrillic letters** carved on the stone | ✗ |
| Gúlayım | BLUE | **Red**; amulet points UP with an **eye** symbol | ✗ |
| Crowd | — | ~20 **identical maidens** in a row (clones) | ✗ |

**B (recommended):** the `e2_return` and `e2_grave` prompts in `video_v2_log.md` (need OK). Leave out the carving, or show only the chisel and stone dust with no letters.

## 5. Problems that run through many clips
1. **Gúlayım not in blue** in v3, v4, c2, c3, c4, c6, e1 (end) and e2. The only blue Gúlayım in any clip is in approved 09 and 12, and neither is used.
2. **Amulet wrong**: round coin (v2); pointing UP or with an eye (c3, c4, e2, probably v4); worn by Otbasqan (c3).
3. **Style drift**: v4 and c6 are painterly. Heroine faces differ between v3, v4, c2, c4, c6 and e2.
4. **Clones / unison**: v3 archers, c2 riders, c6 riders, e2 maidens.
5. Side note (game, not video): the tutorial has a step where Gúlayım uses "your father's amulet" (`tu_b_amu`, `tu_t_amu`), but the story gives her the amulet only in chapter 1, from her mother. Ask the author whether that step should become a "light shield" without naming the father's amulet.
6. Place name: the messenger says **Qıran tawı**, `lore0` says **Miywali qorǵan**, the author says "Miywali fortress". Suggest one wording, e.g. "Qıran tawı etegindegi Miywali qorǵanı". Send it to the author as a Karakalpak text to check.

## 6. Recommended plan (no credits needed for steps 1–3)
1. **Tutorial messenger: keep in-engine, no video** (option C). Optionally polish the rider: dust, a bandage, a stumble on arrival.
2. **Swap in approved clips (ffmpeg concat/trim only):** v2 ← 03+07; c2 ← 11; c3 ← 08+12 (ask the author first, because 06 is approved but has Otbasqan wearing the up-pointing amulet); c4 ← 13; c6 ← 14; e1 ← 09 + 05 trimmed.
3. **Until a new video exists**, set the slots with no approved clip (v3, v4, c5, c7, e2) to the still image + narration. `cutscene()` already falls back to the still when the video fails to load.
4. **Send these prompts to the author for OK:** B-v3 "Ride-out from Miywali" (this answers his complaint directly), then v4_seal, c5_qunqar, c4_aydarha, c6_qarg, c7_ritual, e2_grave and e2_return, adding the line "on the right side of frame; small flat plain gold triangle pointing DOWN". B-0-0 only if he wants the messenger filmed.

## Done (Nov 21): swap to approved clips only (ffmpeg trim/concat, no generation, no credits)
| slot | now | source (approved) |
|---|---|---|
| v1 | unchanged | 01 2a1cd048 |
| v2 | 03 + 07 (10.1 s) | 63675757 + 22beb001 |
| c2 | 11 (8.1 s) | 02936dfd |
| c3 | 08 + 12 (13.1 s) — 06 dropped (Otbasqan wore an up-pointing amulet, Gúlayım in red) | 6a12c6a9 + 1f9ffaa6 |
| c4 | 13 (8.1 s) | d32053b9 |
| c6 | 14 (8.1 s) | 904bd7aa |
| e1 | 09 cut at 4.8 s (before the close-up: its amulet hangs point UP) + 05 cut at 8.8 s (before the red-dress shot) (13.7 s) | 2cb2ce4e + 8a8b253a |
| v3, v4, c5, c7, e2 | still image + narration (story.js NOVID) until a new clip is approved | — |
All outputs 1280x720, 24 fps, h264 + aac, faststart. Frames checked: Gúlayım only in blue, no up-pointing amulet visible, no text. story.js VIDV = 2 busts the browser cache for replaced files.
Note for the author: approved 09 shows the amulet pointing UP in its close-up (cut out here).
