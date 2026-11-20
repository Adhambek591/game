# Qırq qız — handoff for Claude Code

Author: Adham Omirzakov (Nukus Animation). **Always reply in Uzbek.** Karakalpak texts must be real Karakalpak (not Kazakh) and sent to him to check.

## What this is
three.js browser/mobile action game based on the Karakalpak epic "Qırq qız". Target: 7–8/10 world-market quality, then Google Play (TWA).

- Public build: https://test.zagara.app — this repo (`Adhambek591/game`), folder `public/`, deployed by Cloudflare Workers Builds on every push to `main` (`wrangler.jsonc`).
- Working copy with history and tools: Higgsfield sandbox repo `/home/user/website-5ef0831fd120367c52df72c9/app/public` (website id `d1a2581d-7a5f-4695-94fd-8fc7cf16e1ff`, also live at https://qirq-qiz.higgsfield.app, login required).
- `js/missions.js` is BUILT from `/home/user/agents/m2/src/*.js` via `build.sh` (sandbox). Edit sources, not missions.js.
- After edits run `python3 /home/user/t/bust.py` (cache-busting `?v=`). Service worker cache name is in `sw.js` (`qq-3`); bump it when images change.
- Agent logs (full history of every change): `/home/user/agents/*_log.md` in the sandbox — wave4 (controls/army/upgrades/camps/siege/balance), qa, urgent5 (audio/start/i18n/narration), gfx2, ui2, anim, models, audio, bench (benchmark + Play prep), video_v2.
- Release materials: `/home/user/agents/release/` (store texts 4 languages, privacy, twa-manifest draft, icons, feature graphic).

## Story (author's script — authoritative)
1. Gúlayım is at **Qıran tawı** training her forty maidens; she is NOT in Sarkop during the attack.
2. Surtaysha (Qalmaq khan, 40,000 army, golden helmet no arrow/sword passes) attacks Sarkop. **Allayar bay** and his six sons fight and lose; Allayar passes his power into the amulet; people are led away in chains.
3. A **messenger (shabarman/chopar)** brings Gúlayım the news. Only then she rides out with the maidens and finds Sarkop burnt; her mother gives her the father's amulet.
4. Chapters: 1 Qasqır (wolf chieftain) · 2 salt desert caravan, sand giant (Bayımbet the coward gives directions) · 3 river, freeing **Otbasqan** (Uzbek: O'tbosqan; ally, never enemy), Jallad · 4 sea shore, ships, Aydarha · 5 Darbent pass, giant Qunqar strikes down Otbasqan, Sárbinaz takes revenge · 6 Qashal fortress, Qarǵashıq · 7 Surtaysha's horde, bloody totems, final duel. Epilogue: monster soldiers turn back to men; people return; Sárbinaz carves names in stone; Gúlayım at her father's grave.
5. Defeated monsters' spirit turns to gold light flowing **INTO** the amulet.

## Design rules from the author
- 3 on-screen buttons: Attack (auto-target; near = sword combo hitting 2–3, far = 3–4 arrow volley; hold = spin), Dodge (timed = parry + counter), Amulet power. Desktop: mouse / Space / E.
- Missions are rescue BATTLES, not chores. Stars: 1 done, 2 ≥60% saved, 3 all saved, no maiden lost.
- Gúlayım fights main bosses ALONE; general battle afterwards. Bosses must be dangerous (no stun-lock).
- Rescued male warriors join the army; enemies grow each mission; coin upgrades with per-chapter caps (cap is just enough for that chapter); under-upgraded should lose.
- Enemy camps along the route (60–150 soldiers, waves 1/2/3, captain); siege with catapult carts and archers.
- No spawning from nowhere; civilians keep away from fights; bridges span water/ravine; horse sections = riding only, no combat.
- Gúlayım wears BLUE. Amulet = small gold triangle pointing DOWN, identical everywhere.
- Sarkop = huge nomad yurt city (many widely spaced yurts, irregular towers), not Turkish/European.
- Few, clear menus; sound sliders; no fake ads.

## Video rules (cutscenes, Higgsfield)
- FREE generation only (unlim); never spend credits without asking.
- Only these 14 clips are approved (style reference): ids 2a1cd048, 01d06536, 63675757, eae88c6b, 8a8b253a, fd1c26e0, 22beb001, 6a12c6a9, 2cb2ce4e, f30164ab, 02936dfd, 1f9ffaa6, d32053b9, 904bd7aa (CloudFront `hf_<date>_<time>_<id>…mp4`).
- Real 3D depth (foreground/mid/background, haze, DoF); semi-realistic faces, never cartoonish; faces and style identical across shots; a named character appears once per shot and on the right side; horses and background people all different, not moving in unison; physics-correct falls; eye-lines to the interacting character; correct bow poses; no English text/speech; no blood.
- Show prompts to the author and get OK; check every clip frame by frame before sending.

## Karakalpak words he corrected
Qırq qız · Gúlayım · Otbasqan (uz O'tbosqan) · Qasqır / Qashqir (no "bek") · quwırshaq · saqıyna · súren · dubılǵa · "ósh alıw jaqın" · "bir de bir" · Barekelle · jarıs · aydarha · shabarman.

## Deploy recipe
Sandbox: commit snapshot via git worktree → `website_repo_access push` → `deploy_website`. Public: zip `public/` (exclude `_raw/`, `_v.html`), upload via media_upload, download here, replace `public/`, commit, `git -c push.negotiate=true push origin main`. Never deploy a snapshot made with symlinks (QA's `/home/user/qa_snap` uses symlinked assets).
