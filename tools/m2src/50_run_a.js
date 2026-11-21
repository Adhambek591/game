// ---------- runners ----------
const RUN = {};
const flyPt = (x, z, label, es = []) => (G.mis.groups = G.mis.groups || []).push({ es, awake: true, o: {}, x, z, label });
// freed villagers cheer, then run home (back down the road) and leave the level
function freeRun(es) { for (const c of es) { c.play('Cheer', { force: true }); burst(c.x, 1.5, c.z, 0xffe0a0, 1.5); } Sfx.pick(); setTimeout(() => { for (const c of es) { if (c.dead || c.gone) continue; c.team = 'ally'; c.d = { ...c.d, team: 'ally', follow: false }; c.hp = c.maxHp = 1e9; const z1 = c.z + 26; c.custom = (e, dt) => { e.z += 5 * dt; e.x += (Math.sign(e.x || 1) * 8 - e.x) * dt * .5; e.rot = 0; e.play('Running_A'); if (e.z > z1 || e.z > 8) { e.dead = true; e.remove(); } return true; }; } }, 1500); }
const obj = s => { H.objective(''); $('obj').textContent = s; };
// ===== PROLOGUE (Allayar) — teaches: move, attack, dodge (safe practice), skills =====
RUN['0-1'] = async () => { const { NIGHT } = H.moods;
  await H.fadeTo(true); try { await H.bannerShow('📜 ' + t('w4_tale'), t('w4_flash'), t('w4_play_al'), 3.2); } catch (e) { }   /* flashback card: the messenger's tale, the player is Allayar */
  await H.lore('lore0'); clearLevel(); setMood(NIGHT); G.emberDown = false; H.buildProlog(); setMusic('off'); G.freeze = false; G.stats.deaths = 0; setBoss(null); G.chGold = 0;
  const p = makePlayer('allayar', 0, 3); G.sk[1].on = true; G.sk[2].on = true; G.sk[3].on = true; refreshSkills(); H.setHero('al'); H.setDeath(); H.setCP(0, 3); H.objective('');
  $('hud').classList.add('on'); G.paused = true;
  spawn('son', -2.8, 1); spawn('son', 2.8, 1); H.skirmish(-9, -8); H.skirmish(9, -24); H.skirmish(-9.5, -44); H.skirmish(9, -66);
  const g1 = post([['askar', -1.6, -29.6, 's'], ['askar', -5.4, -30.4, 's'], ['askar', 4, -26, 'p', 2.5], ['askar', 0, -33]], { fire: [-3.5, -30.6] });
  const g3 = post([['askar', -6, -66], ['askar', 6, -66], ['archer', -9, -72], ['archer', 9, -72]], { nofly: true, wake: 0 }); chest(9.3, -17, 50);
  // wave4 / missions audit: no Camel Dev here (off-plan). The finale is the plan's beat: Allayar holds the line while the townsfolk flee past him into the town.
  const folk = ['mother', 'child', 'elder', 'asir', 'mother', 'child', 'elder', 'asir', 'mother', 'asir'].map((ty, i) => { const sd = i % 2 ? 1 : -1, e = spawn(ty, sd * (7.2 + (i % 3) * .9), -53 - (i >> 1) * 1.7, 'npc', true); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); e.rot = 0; e.farT = -1e9; e.w4folk = 1; e.play('Sit_Floor_Idle'); return e; });
  await H.cutscene('v1', 'nar1', 'p_su'); live();   /* STORY: the still behind the clip must not be the keyart (Gúlayım is not in Sarkop) */ setMusic('battle'); await ban(3); mstart();
  await wait(.6); await say([['al', 'd_al1']]);
  H.objective('o_move'); H.hint('h_move', 7); const g1g = gate(-42); const mk = marker(0, -13);
  await H.reach(0, -13, 4); mk.remove(); H.objective('o_defend'); H.hint('h_attack', 7, t('h_attack_al')); wake(g1);   /* Allayar has no bow */
  await clear(g1); await practiceDodge(); await wait(.8);
  H.hint('h_skill', 7); await dead(rein([['askar', -6, -30], ['askar', 6, -30], ['wolf', 0, -35], ['wolf', -9, -27], ['wolf', 9, -27], ['askar', 2, -37]]));
  g1g.open(); H.setCP(0, -34); p.hp = Math.min(p.maxHp, p.hp + 250); H.objective('o_square'); const g2 = gate(-78);
  await H.goTo(-46); setMusic('battle'); Sfx.horn(); await H.bannerShow('', '🛡 ' + t('w4_hold_o'), '', 2.2); H.objective('w4_hold_o'); H.setCP(0, -44); wake(g3, true);
  const WV = [[['askar', -6, -75], ['askar', 6, -75], ['askar', 0, -76.5]], [['askar', -8, -75], ['wolf', -3, -76.5], ['wolf', 3, -76.5], ['askar', 8, -75], ['archer', 0, -77]], [['askar', -7, -75], ['askar', 7, -75], ['askar', -2, -76.5], ['askar', 2, -76.5], ['archer', -9, -77], ['archer', 9, -77]]];
  let wi = 0, cur = g3.es.slice(), safeN = 0, lostN = 0, goT = 1, gi = 0, lp = '', brk = new Set();
  G.mis.aim = () => near(cur.filter(e => !e.dead)) || { x: 0, z: -52 };
  G.tick = dt => { goT -= dt; if (goT <= 0 && gi < folk.length) { goT = 2.6; const e = folk[gi++]; e.w4run = 1; }
    for (const e of folk) { if (!e.w4run || e.gone || e.dead) continue; const tx = Math.sign(e.x) * 4.8,   /* inner lanes: the street-side skirmishes at x = ±9 blocked the outer ones */  v = 4.3 * (e.type === 'elder' ? .8 : 1); e.x += (tx - e.x) * Math.min(1, dt * 2); e.z += v * dt; e.rot = 0; e.play('Running_A');
      e.w4t = (e.w4t || 0) + dt; if (e.z > 9 || e.w4t > 24) {   /* 24 s failsafe: nobody stays stuck in the street */ if (e.z <= 9) burst(e.x, 1, e.z, 0xc8a070, 1.6, true); e.gone = true; e.dead = true; e.o.visible = false; safeN++; } }
    for (const e of enemies()) if (!e.dead && e.z > -36 && !brk.has(e) && e.custom !== sleepAI) { brk.add(e); const v = folk.find(q => q.w4run && !q.gone && !q.w4lost) || folk.find(q => !q.gone && !q.w4lost); if (v) { v.w4lost = 1; v.w4run = 0; v.gone = true; lostN++; v.play('Death_A', { once: true, force: true }); hintRaw('⚠ ' + t('w4_hold_lost')); } }
    const s2 = '🛡 ' + t('w4_wave', { n: Math.min(3, wi + 1), m: 3 }) + ' — ' + t('w4_hold_hud', { n: safeN, m: folk.length - lostN }); if (s2 !== lp) { lp = s2; $('obj').textContent = s2; } };
  for (wi = 0; wi < 3 && !G.mis.force; wi++) { try { Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } if (wi) { cur = rein(WV[wi], 'al', null); for (const e of cur) { e.state = 'chase'; e.farT = 0; } } else cur = cur.concat(rein(WV[0], 'al', null));
    await until(() => cur.every(e => e.dead) || G.mis.force); cp(); if (wi < 2) await wait(1.5); }
  for (const e of folk) if (!e.gone) e.w4run = 1; await until(() => folk.every(e => e.gone) || G.mis.force); if (G.mis.force) for (const e of enemies()) e.die();
  G.tick = null; G.mis.aim = null; setMusic('off'); g2.open(); await H.bannerShow('', '🛡 ' + t('w4_hold_win'), '', 2); await wait(.6); await H.victory(); return win(); };
RUN['0-2'] = async () => { const { NIGHT } = H.moods;
  await H.fadeTo(true); clearLevel(); setMood(NIGHT); G.emberDown = false; H.buildProlog(); setMusic('off'); G.freeze = false; G.stats.deaths = 0; setBoss(null); G.chGold = 0;
  const p = makePlayer('allayar', 0, -70); G.sk[1].on = G.sk[2].on = G.sk[3].on = true; refreshSkills(); H.setHero('al'); H.setDeath(); H.setCP(0, -70); H.objective('');
  spawn('son', -2.8, -68); spawn('son', 2.8, -68); H.skirmish(-9, -80); H.skirmish(9, -86);
  const gg = post([['askar', -3, -84], ['askar', 3, -84], ['askar', 0, -86.5, 'p', 3], ['archer', -6, -89], ['archer', 6, -89]]);
  const su = preBoss('surtaysha', 0, -103, 'n_su', 'p_su'); su.invuln = true;
  live(); setMusic('battle'); await ban(3); mstart();
  H.objective('o_square'); await clear(gg); const mk2 = marker(0, -94); await H.reach(0, -94, 4.5); mk2.remove();
  su.custom = null; su.asleep = false; su.invuln = T.surtaysha.invuln; su.rot = 0; setBoss(su); G.noDeath = true; setMusic('boss'); Sfx.horn();
  await wait(.8); await say([['su', 'd_su1'], ['al', 'd_al2']]); H.objective('o_duel');
  const t0 = G.time; await until(() => G.time - t0 > 20 || p.hp < p.maxHp * .3 || G.mis.force); G.mis.flag = G.time - t0 > 20;
  await say([['su', 'd_su2']]); H.objective('o_resist');
  for (const e of G.ents) if (e.team === 'ally' && e !== p) e.die(); G.tele.forEach(o => o.dead = true);
  G.freeze = true; p.x = Math.max(-2.5, Math.min(2.5, p.x)); p.z = Math.max(-100.5, Math.min(-97, p.z)); su.x = p.x; su.z = p.z - 3.4; su.rot = 0;   /* fix3: clinch mid-arena like story.js (the boss is no longer dragged to wherever the player stood) */ p.rot = Math.PI; p.act = null; p.y = 0; p.play('Block', { force: true }); su.play('2H_Melee_Idle', { force: true });
  let lv = 50; G.tick = () => { if (G.qte) lv = Math.min(lv, G.qte.v); }; await qte(qs.get('fast') ? 1 : 6.5, 36, 5.5); G.tick = null; G.mis.flag2 = lv > 0;
  flash(.9); Sfx.big(); G.shake = 1; p.play('Death_A', { once: true, force: true }); await wait(1.3);
  G.freeze = false; await say([['al', 'd_al3']]);
  await H.fadeTo(true); setBoss(null); $('hud').classList.remove('on'); setMusic('off'); G.paused = true;
  await H.cutscene('v2', 'nar2', 'p_al'); await H.lore('lore_sur'); try { localStorage.setItem('qq_prog', 'm1'); } catch (e) { } return win(); };

// ===== CHAPTER 1 =====
async function ch1Start(z, sk, mood) { const { DAY } = H.moods; await H.fadeTo(true); await ensureReal(['qashqir', 'sarbinaz']); clearLevel(); setMood(mood || DAY); G.emberDown = true; H.buildMission(); setMusic('off'); G.freeze = false; G.stats.deaths = 0; G.chGold = 0;
  const p = makePlayer('gulayim', 0, z); for (let i = 0; i < 5 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), z + 2 + (i >> 1) * 1.2); for (const k of sk) G.sk[k].on = true; refreshSkills(); H.setHero('gu'); H.setDeath(); H.setCP(0, z); H.objective(''); setBoss(null); return p; }
// 1-1 teaches: attack (one lone looter = safe practice), skills 2-3, the ulti. Side objective: 3 hidden children.
RUN['1-1'] = async () => {
  const p = await ch1Start(3, [1]); $('hud').classList.add('on'); G.paused = true; let kidsN = 0;
  const kids = [[-9.5, -12], [9.5, -34], [-9.5, -62]].map(([x, z]) => ({ e: spawn('child', x, z, 'npc'), m: Object.assign(marker(x, z, 0x66ff88, 1), { opt: true }), x, z, found: false })); kids.forEach(k => { k.e.rot = 0; k.e.play('Sit_Floor_Idle'); });
  const mo = spawn('mother', 2, -23, 'npc'); mo.rot = 0; flyPt(2, -23, 'n_mo');
  const g0p = post([['askar', 4.5, -12, 'p', 2]], { nofly: true, wake: 7 });
  const gA = post([['askar', -2.2, -46.4, 's'], ['askar', 1.4, -47.2, 's'], ['askar', 5, -50, 'p', 2.5], ['archer', -8, -54], ['archer', 8, -54]], { fire: [-.5, -48.4] });
  const gC = post([['askar', -6, -74], ['askar', 6, -74], ['askar', -3, -79, 'p', 2], ['askar', 3, -79], ['askar', 0, -82], ['wolf', -9, -72, 'pz', 2], ['wolf', 9, -72, 'pz', 2], ['archer', -8, -83], ['archer', 8, -83]]);
  await H.lore('lore1'); await H.cutscene('v3', 'nar3m'); live();   /* STORY: after the messenger's tale — v3 (Qıran, the ride, smoke on the horizon) = she rides home to Sarkop; nar3 ('she was training at Qıran') was already shown by the tutorial */ setMusic('calm'); await ban(3); mstart();
  G.tick = () => { for (const k of kids) if (!k.found && hyp(p.x - k.x, p.z - k.z) < 2.4) { k.found = true; kidsN++; k.m.remove(); k.e.play('Cheer'); Sfx.pick(); addGold(15, k.x, k.z); hintRaw(t('childFound') + ' ' + kidsN + '/3'); } };
  G.noAmulet = true; H.objective('o_mother'); H.hint('h_attack', 6);   /* STORY: the amulet (and its button) only after her mother gives it */ const g0 = gate(-30); const mm = marker(2, -23, 0xffd060, 1.6);
  await H.reach(2, -23, 3.6); mm.remove(); mo.face(p.x - mo.x, p.z - mo.z); p.act = null; p.play('Idle');
  await say([['mo', 'd_mo1'], ['gu', 'd_gu1'], ['mo', 'd_mo2'], ['mo', 'd_mo3'], ['gu', 'd_gu2']]); Sfx.power(); flash(.3); G.noAmulet = false;
  g0.open(); H.setCP(0, -26); H.objective('o_guards'); const g1 = gate(-60); setMusic('battle');
  await clear(gA, g0p);
  G.sk[2].on = G.sk[3].on = G.sk[5].on = true; refreshSkills(); H.hint('', 9, t('h_skill5'));
  await dead(rein([['askar', -6, -48], ['askar', 6, -48], ['askar', 0, -54], ['wolf', -9, -44], ['wolf', 9, -44], ['archer', 0, -57]]));
  g1.open(); H.setCP(0, -52); p.hp = Math.min(p.maxHp, p.hp + 200); H.objective('o_go'); setMusic('calm'); const ms = marker(0, -64);
  await H.reach(0, -64, 4); ms.remove(); const sa = spawn('sarbinaz', 5, -58, 'ally'); sa.rot = Math.PI;
  await wait(.5); await say([['sa', 'd_sa1'], ['gu', 'd_gu3']]);
  G.sk[4].on = true; G.ulti = 100; refreshSkills(); H.hint('h_ulti', 9); H.objective('o_horde'); const g2 = gate(-88); setMusic('battle'); wake(gC);
  await until(() => alive(gC).length <= 4 || G.mis.force); rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['askar', 0, p.z + 11]], 'sa', 'bk_back');
  await clear(gC); await until(() => enemies().length === 0 || G.mis.force);
  g2.open(); G.tick = null; G.mis.flag = kidsN >= 3; setMusic('off'); await H.victory(); return win(); };
// 1-2 the stable: kill the sorcerer, then break the door before the timer; twist: wolves from behind while the door burns
RUN['1-2'] = async () => {
  const p = await ch1Start(-84, [1, 2, 3, 4, 5]); const sa = spawn('sarbinaz', 3, -82, 'ally');
  const gS = post([['mage', 4, -104], ['askar', 0, -100, 'p', 2.5], ['askar', -4, -103], ['askar', 6, -96], ['wolf', -8, -98, 'pz', 2]], { label: 'e_mage' }); flyPt(7.8, -100, 'e_cap'); chest(-9.3, -93, 60);
  live(); setMusic('calm'); await ban(3); mstart();
  let door = null, doorT = 0, bk = null, tw = false;
  G.tick = dt => { if (door) { doorT -= dt * FAST(); $('timer').textContent = Math.max(0, Math.ceil(doorT)); if (doorT < 26 && !tw) { tw = true; rein([['wolf', -7, p.z + 9], ['wolf', 0, p.z + 11], ['wolf', 7, p.z + 9]], 'sa', 'bk_back'); } } };
  H.objective('o_stable'); const g3 = gate(-112); setMusic('battle'); await clear(gS);
  door = new THREE.Mesh(new THREE.BoxGeometry(.35, 2.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 1 })); door.position.set(7.8, 1.3, -100); door.castShadow = true; world.add(door); bk = breakable({ mesh: door, x: 7.8, z: -100, hp: 420, dmg: { slam: 120, any: 60 }, barY: 3.4, rad: 1.4, showNum: true, dust: 0x6a4a2a, spark: 0xffcc88, chunks: 16 }); const dm = marker(6.4, -100, 0xff8844, 1.5);
  doorT = 45; H.objective('o_door'); $('timer').style.display = 'block'; Sfx.horn(); G.mis.aim = () => ({ x: 6.4, z: -100 });
  spawn('askar', -6, -108); spawn('askar', 6, -108); spawn('wolf', 0, -110);
  await until(() => bk.dead || doorT <= 0 || G.mis.force); G.mis.aim = null; G.mis.flag = bk.dead; $('timer').style.display = 'none'; if (!bk.dead) bk.shatter(); dm.remove(); door = null; burst(7.8, 1.5, -100, 0xffcc88, 4);
  [[5.6, -99], [5.2, -101], [4.4, -100]].forEach(([x, z], i) => { const c = spawn(i ? 'child' : 'mother', x, z, 'npc'); c.rot = -Math.PI / 2; c.play('Cheer'); });
  Sfx.pick(); await H.bannerShow('', t(G.mis.flag ? 'saved' : 'savedLate'), '', 2.4); await until(() => enemies().length === 0 || G.mis.force); g3.open(); G.tick = null; setMusic('off'); return win(); };
// 1-3 NEW "Free the village": three guard camps hold the villagers; twist: a counter-attack from behind; climax: the captain's camp
RUN['1-3'] = async () => { const { DUSK } = H.moods;
  const p = await ch1Start(3, [1, 2, 3, 4, 5], DUSK); tod('dusk'); spawn('sarbinaz', 3, 5, 'ally');
  const C1 = await H.captives([[-6.5, -33.5], [-5, -35], [-7.5, -35.5]]), C2 = await H.captives([[6, -66], [7.5, -67.5], [5, -68]]), C3 = await H.captives([[-2, -103], [0, -104.5], [2, -103], [0, -101.5]]);
  const g1 = post([['askar', -.4, -30.2, 's'], ['askar', -3.6, -29.6, 's'], ['askar', 3, -33, 'p', 3], ['archer', -8.5, -30]], { fire: [-2, -31.6] });
  const st = stakes(-58.5, -G.W, G.W, [-7, 2.4]);
  const g2 = post([['askar', -7, -56, 'p', 1.6], ['askar', 2, -62], ['askar', -2, -64, 'p', 3], ['wolf', 8, -61, 'pz', 2], ['archer', 3, -66], ['archer', 9, -64.5]], { label: 'e_arch' });
  const g3 = post([['askar', -4.6, -95.6, 's'], ['askar', 3.2, -96.4, 's'], ['askar', -7, -99, 'p', 2], ['askar', 7, -99, 'p', 2], ['archer', -8, -104], ['archer', 5, -106.5], ['shaman', -4, -106.5]], { fire: [-.6, -97.4], label: 'mb_cap' }); leader(g3, 0, -99.5);
  page(9.6, -47); chest(-9.6, -81, 70);
  live(); setMusic('calm'); await ban(3); mstart(); await say([['sa', 'f13a'], ['gu', 'f13b']]);
  let n = 0; const O = () => obj(t('mo_1_3') + '  ⛓ ' + n + '/3'); O(); setMusic('battle'); const gt = gate(-112);
  G.mis.aim = () => near(g1.es) || C1[0]; await clear(g1); freeRun(C1); n = 1; O(); p.hp = Math.min(p.maxHp, p.hp + 150);
  g2.o.onWake = () => H.hint('', 6, t('h_leap')); await wait(1.2); await clear(g2); freeRun(C2); n = 2; O(); p.hp = Math.min(p.maxHp, p.hp + 150);
  await wait(1); await dead(rein([['wolf', -8, p.z + 10], ['wolf', 8, p.z + 10], ['wolf', 0, p.z + 12], ['askar', -4, p.z + 12], ['askar', 4, p.z + 12]], 'sa', 'bk_back'));
  g3.o.onWake = () => bark('sa', 'f13c'); await clear(g3); await until(() => enemies().length === 0 || G.mis.force); freeRun(C3); n = 3; O(); gt.open();
  setMusic('off'); await wait(1.4); await say([['gu', 'f13d']]); await H.victory(); return win(); };
// 1-4 boss Qashqir (visible in his arena from the start, with his pack); then the wolf-leap tutorial over the ravine
RUN['1-4'] = async () => {
  const p = await ch1Start(-116, [1, 2, 3, 4, 5]); spawn('sarbinaz', 3, -114, 'ally');
  const q = preBoss('qashqir', 0, -140); const gw = post([['wolf', -5, -134, 'p', 2], ['wolf', 5, -135, 'p', 2], ['wolf', 0, -131, 'pz', 1.5]], { nofly: true, wake: 0 });
  live(); setMusic('calm'); await ban(3); mstart();
  H.objective('o_boss'); const g4 = gate(-150); await H.goTo(-123); wake(gw); setMusic('battle'); await clear(gw);   // fix3: the wolves first, the boss alone
  q.custom = H.qashqirAI; q.asleep = false; G.freeze = true; p.act = null; p.play('Idle'); await wait(.6);
  await say([['qa', 'd_qa1'], ['gu', 'd_gu4']]); G.freeze = false; setBoss(q); setMusic('boss'); Sfx.howl(); H.setCP(0, -124); const d0 = G.stats.deaths;
  await until(() => q.dead || G.mis.force); if (!q.dead) q.die(); H.soul(q); G.mis.flag = G.stats.deaths === d0; for (const e of enemies()) e.die(); setMusic('off'); await wait(1.2); await H.victory();
  await H.fadeTo(true); G.paused = true; await H.cutscene('v4', 'nar4'); G.paused = false; setBoss(null);
  G.sk[5].on = true; refreshSkills(); Sfx.power(); flash(.5); setMusic('calm'); await H.bannerShow('', t('wolf'), t('wolfDesc'), 3.6);
  g4.open(); H.setCP(0, -146); H.objective('o_gap'); H.hint('o_gap', 9); G.ravineAhead = true; const mf = marker(0, -180, 0xbfe3ff, 2);
  await until(() => (p.z < -169 && !p.leaping) || G.mis.force); G.ravineAhead = false; H.objective('o_trail'); await until(() => p.z < -175.5 || G.mis.force); mf.remove();
  await H.fadeTo(true); G.paused = true; $('hud').classList.remove('on'); await H.cutscene(null, 'nar5', 'ruins'); return win(); };

// ===== CHAPTER 2 =====
RUN['2-1'] = async () => { const { HOT } = H.moods; await H.chapterIntro(2, 'nar6', 'ruins'); G.curCh = 1; mstart();
  G.mis.flag = await H.rideLevel('gulayim', HOT, 'o_ride2', [['askar', -4, -16], ['askar', 4, -20], ['archer', 0, -26], ['askar', -6, -32], ['archer', 6, -36], ['askar', 0, -42]], 'flee'); return win(); };
// 2-2 Bayimbet's trap: hook = the traitor, twist = wolves spring the ambush around you, climax = the raiders' camp behind stakes (wolf leap shortcut)
RUN['2-2'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], [], 3, 1); const ba = spawn('bayimbet', 6, -30, 'npc'); ba.rot = 0; flyPt(6, -30, 'n_ba');
  const st = stakes(-71, -G.W, G.W, [8.5, 2.2]);
  const gA = post([['askar', -2.2, -62.6, 's'], ['askar', 1.6, -63.4, 's'], ['heavy', 5, -66], ['wolf', -7, -64, 'pz', 2], ['askar', -5, -67, 'p', 2]], { fire: [-.4, -64.4] });
  const gB = post([['archer', -6, -75], ['archer', 0, -76], ['archer', 6, -75], ['shaman', 0, -79]], { label: 'e_arch', wake: 0, face: 0 }); leader(gA, 0, -67);
  page(-9.6, -46); chest(9.4, -84, 80);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x2a'], ['gu', 'x2b']]);
  H.objective('o_trail2'); const g0 = gate(-40); const mb = marker(6, -30);
  await H.reach(6, -30, 3.4); mb.remove(); ba.face(p.x - ba.x, p.z - ba.z); p.face(ba.x - p.x, ba.z - p.z); p.act = null; p.play('Idle'); await say([['ba', 'd_ba1'], ['gu', 'd_gu5'], ['ba', 'd_ba2'], ['gu', 'd_gu6']]);
  H.objective('o_ambush'); setMusic('battle'); await dead(rein([['wolf', p.x - 7, p.z - 3], ['wolf', p.x + 4, p.z - 7], ['wolf', p.x - 5, p.z + 6], ['wolf', p.x + 6, p.z + 5], ['askar', 0, p.z - 9]], 'sa', 'bk_amb')); g0.open();
  const g1 = gate(-90); gA.o.onWake = () => { wake(gB, true); H.hint('', 6, t('h_leap')); }; await clear(gA, gB);
  await dead(rein([['heavy', -4, p.z - 9], ['wolf', -9, p.z + 2], ['wolf', 9, p.z + 2], ['askar', -3, p.z - 12], ['askar', 3, p.z - 12]], 'sa', 'bk_rein')); g1.open(); setMusic('off'); await H.victory(); return win(); };
// 2-3 the convoy
async function cvRetry(cv) { $('timer').style.display = 'none'; storm(false); await H.bannerShow('', t('ms_fail'), '', 2.4); for (const e of G.ents) if (e.rf && !e.dead) { e.dead = true; e.remove(); }
  cv.s = cv.cpS; cv.pool = Math.max(cv.cpPool, cv.max * .6); cv.failed = false; cv.halt = false; cv.slow = 1; cv.creep = 0; cv.v = 0; cv.extra = null; for (const c of cv.carts) { c.tiltZ = 0; for (const w of c.wheels) if (w.userData.off) w.userData.fix(); } cv.snap(); const P = G.player; P.x = cv.x + 3; P.z = cv.z - 2; P.hp = P.maxHp; H.setCP(P.x, P.z); }
RUN['2-3'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], [], -13, 1, 3); trailMesh(12, -184); const cv = convoyBuild(-10, 1600); p.x = cv.x + 3.5; H.setCP(p.x, p.z); cv.go = z => { cv.goalS = cv.z0 - z; }; cv.go(-10);
  const R = l => { const es = rein(l); for (const e of es) e.rf = true; return es; }, U = async c => { await until(() => c() || cv.failed || G.mis.force); return cv.failed && !G.mis.force; };
  let si = 0; const SKIP = +(new URLSearchParams(location.search).get('cvs') || 0), S0 = [-10, -40, -84, -84, -136];  // ?cvs=N: test only, start at stage N
  const stage = async fn => { if (si < SKIP) { if (si === 0) for (const e of gW.es) e.die(); if (si === 1) for (const e of gR.es) e.die(); si++; if (si === SKIP) { cv.s = cv.z0 - S0[si]; cv.snap(); p.x = cv.x + 3; p.z = cv.z - 2; } return; } si++; for (;;) { cv.cpS = cv.s; cv.cpPool = cv.pool; cp(); await fn(); if (!cv.failed || G.mis.force) return; await cvRetry(cv); } };
  // posted before the fly-over: wolves on the trail, archers on the ridge, the blockade
  const gW = post([['wolf', TR(-32) - 2, -32, 'p', 3], ['wolf', TR(-35) + 3, -35, 'p', 2], ['wolf', TR(-38), -38, 'pz', 2]], { wake: 11 });
  const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 1 })); dune.scale.set(3.6, 1.45, 8.5); dune.position.set(10.2, -.05, -66); dune.receiveShadow = true; world.add(dune); for (const [x, z, s] of [[8.2, -59.5, 1.3], [8, -72.5, 1.5], [11, -66, 2.4]]) place(world, 'boulder_01', x, z, s);
  const gR = post([['archer', 9, -61.5], ['archer', 9.6, -64.5], ['archer', 9.2, -67.5], ['archer', 9.7, -70.5], ['askar', 6.2, -63, 'pz', 2], ['askar', 6, -69, 'pz', 2]], { y: 1.3, label: 'e_arch', wake: 0, noCv: true, face: -Math.PI / 2 });
  const bz = -161, bx = TR(bz); const st = stakes(bz, -G.W, G.W, [bx, 2.3]);
  const bm = new THREE.Group(), wdm = new THREE.MeshStandardMaterial({ color: 0x5a3c20, roughness: 1 }); for (const y of [.35, .85, 1.35]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, 4.6, 8), wdm); l.rotation.z = Math.PI / 2; l.position.set(0, y, (y - .85) * .25); l.castShadow = true; bm.add(l); } for (const sx of [-1.7, 0, 1.7]) for (const k of [-1, 1]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 2.3, 6), wdm); s.position.set(sx, .95, 0); s.rotation.x = k * .5; s.castShadow = true; bm.add(s); } bm.position.set(bx, 0, bz);
  const bar = breakable({ mesh: bm, x: bx, z: bz, w: 4.6, d: 1, hp: 380, dmg: { slam: 130, any: 45 }, barY: 2.5, rad: 2.6, showNum: true, dust: 0x6a4a2a, spark: 0xffcc88, chunks: 14 });
  const gB = post([['askar', bx - 3, bz + 7.2, 's'], ['askar', bx + 3, bz + 6.6, 's'], ['askar', bx - 6.5, bz + 5, 'p', 2], ['heavy', bx + 6, bz + 4], ['archer', bx - 4.5, bz - 3.5], ['archer', bx + 4.5, bz - 3.5], ['shaman', bx, bz - 5.5]], { fire: [bx, bz + 8.6], label: 'mb_cap', wake: 13, noCv: true }); leader(gB, bx, bz + 4.5);
  chest(-9.6, -96, 80);
  setMusic('calm'); G.tick = dt => { cv.tick(dt); if (cv.extra) cv.extra(dt); }; await ban(3); mstart(); await say([['sa', 'cv_d1'], ['gu', 'cv_d2']]); obj(t('mo_2_3')); setMusic('battle'); H.hint('', 7, t('cv_start'));
  G.mis.aim = () => cv.far ? { x: cv.x, z: cv.z + 4 } : null; let farT = 0;
  // 1) wolves on the trail, then raiders burst out of the dunes
  await stage(async () => { cv.go(-40); if (await U(() => cv.z <= -39.6 && alive(gW).length === 0)) return; const cz = cv.z;
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) burst(s * 10.5, .6, cz + rnd(-6, 6), 0xd8b070, 3);
    const a = R([['askar', -10.5, cz - 3], ['askar', -10.5, cz + 2], ['askar', -10, cz + 7], ['askar', 10.5, cz - 1], ['askar', 10.5, cz + 5], ['potion', 10, cz - 6]]); bark('sa', 'bk_amb'); if (await U(() => a.every(e => e.dead))) return; });
  // 2) archers on the ridge shoot the caravan while it keeps rolling
  await stage(async () => { cv.go(-84); if (await U(() => cv.z <= -50 || gR.awake)) return; wake(gR); H.hint('', 6, t('cv_arch')); if (await U(() => alive(gR).length === 0 && cv.z <= -83.6)) return; });
  // 3) a wheel breaks: hold the ground until it is repaired
  await stage(async () => { const c = cv.carts[0], w = c.wheels[0]; cv.halt = true; c.tiltZ = .11; w.userData.off = true; const wp = w.position.clone(); w.userData.fix = () => { w.userData.off = false; w.position.copy(wp); w.rotation.set(0, 0, 0); c.tiltZ = 0; }; w.position.set(wp.x - 1.1, .12, wp.z - .6); w.rotation.set(0, 0, Math.PI / 2 - .12);
    Sfx.big(); G.shake = .5; burst(cv.x, .5, cv.z, 0xd8b070, 4); bark('sa', 'cv_wheel1'); H.hint('', 6, t('cv_wheel')); const tm = $('timer'); tm.style.display = 'block'; let T0 = 36, k = 0, es = []; const cz = cv.z;
    const W = [[36, [['askar', -4, cz - 15], ['askar', 4, cz - 16], ['askar', 0, cz - 18], ['archer', -7, cz - 20], ['archer', 7, cz - 20]]], [24, [['wolf', -8, cz + 17], ['wolf', 8, cz + 17], ['wolf', -3, cz + 19], ['wolf', 3, cz + 19]], 'bk_back'], [12, [['heavy', -9, cz - 10], ['shaman', -10, cz - 14], ['askar', 9, cz - 8], ['askar', 9.5, cz - 12]], 'bk_rein']];
    cv.extra = dt => { T0 -= dt * FAST(); tm.textContent = '🔧 ' + Math.max(0, Math.ceil(T0)); if (k < W.length && T0 <= W[k][0]) { es = es.concat(R(W[k][1])); if (W[k][2]) bark('sa', W[k][2]); k++; } };
    const bad = await U(() => T0 <= 0 && es.every(e => e.dead)); cv.extra = null; tm.style.display = 'none'; if (bad) return; w.userData.fix(); cv.halt = false; cv.pool = Math.min(cv.max, cv.pool + cv.max * .25); Sfx.pick(); H.hint('', 5, t('cv_fixed')); });
  // 4) sandstorm: wolves come out of the dust in pairs while the caravan crawls on
  await stage(async () => { storm(true); cv.slow = .72; cv.creep = .45; cv.go(-146); H.hint('', 6, t('cv_storm')); let nw = 3, hv = false, es = [];
    cv.extra = dt => { nw -= dt * FAST(); if (nw <= 0 && cv.z > -128 && es.filter(e => !e.dead).length < 4) { nw = 10; const s = Math.random() < .5 ? -1 : 1; es = es.concat(R([['wolf', s * 10.5, cv.z - 4], ['wolf', -s * 10.5, cv.z + 6]])); } if (!hv && cv.z < -116) { hv = true; es = es.concat(R([['heavy', 0, cv.z - 14], ['askar', -3, cv.z - 15], ['askar', 3, cv.z - 15]])); bark('sa', 'bk_rein'); } };
    const bad = await U(() => cv.z <= -136); cv.extra = null; storm(false); cv.slow = 1; cv.creep = 0; if (bad) return; if (await U(() => es.every(e => e.dead))) return; });
  // 5) the blockade: break through (or leap over the stakes) and beat the captain
  await stage(async () => { cv.go(-146); if (await U(() => cv.z <= -145.6 || gB.awake)) return; wake(gB); H.hint('', 6, t('cv_block')); obj(t('cv_block')); setTimeout(() => { if (!bar.dead && G.mis.cv === cv) H.hint('', 6, t('h_leap')); }, 9000);
    G.mis.aim = () => cv.far ? { x: cv.x, z: cv.z + 4 } : bar.dead ? near(gB.es) : (near(gB.es.filter(e => (e.z - bz) * (G.player.z - bz) > 0)) || { x: bx, z: G.player.z < bz ? bz - 1.5 : bz + 1.5 });  // from whichever side she is on: never sends her back over the stakes  // behind the stakes → point at the barricade first
    if (await U(() => alive(gB).length === 0 && bar.dead)) return; });
  if (G.mis.force && !bar.dead) bar.shatter(); st.open(); obj(t('mo_2_3')); G.mis.aim = () => cv.far ? { x: cv.x, z: cv.z + 4 } : null; bark('gu', 'bk_done'); cv.go(-175); await U(() => cv.z <= -174.6);
  G.mis.flag = !cv.everFailed && cv.pool > cv.max * .5; G.tick = null; G.mis.aim = null; for (const e of cv.mem) if (!e.cart) e.custom = e2 => { e2.play('Cheer'); return true; };
  setMusic('off'); await wait(.8); await say([['gu', 'cv_d3']]); hpBar(null); await H.victory(); return win(); };
RUN['2-4'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], ['qumdev'], -84, 1); const b0 = preBoss('qumdev', 0, -132);
  const gO = post([['wolf', -5, -100, 'p', 2.5], ['wolf', 5, -101, 'p', 2.5], ['askar', -2, -104], ['askar', 2, -104], ['archer', 0, -107]]); chest(9.4, -156, 90);
  setMusic('calm'); await ban(3); mstart(); bark('sa', 'bk_wolf');
  obj(t('f3o_2_4')); const g2 = gate(-150); setMusic('battle'); await clear(gO); await H.goTo(-112); H.hint('', 4, t('h_sand'));
  G.onBoss = b => { H.weakWhile(b, () => b.openT > 0, 'w_qd'); b.onLeap = () => H.openUp(b, 7, 'w_open'); };
  G.mis.flag = await H.bossFight('qumdev', 0, -132, [['qd', 'd_qd1'], ['gu', 'd_gu7']], H.bossBrain({ dmg: 44, every: 3.2, moves: ['quake', 'quake', 'charge'], col: 0xd8b070, phases: [[[1, .55], e => { e.spdMul = 1.2; }], [[2, .25], e => { e.dmgMul = 1.25; }]] }));
  await H.gainPower(6, 'pw6', 'pw6d'); g2.open(); H.objective('o_go'); await H.goTo(-158); return win(); };

// ===== CHAPTER 3 =====
RUN['3-1'] = async () => { const { DAY } = H.moods; await H.chapterIntro(3, 'nar7', 'ruins');
  const p = await gu(3, DAY, H.B[3], [], 3, 2);
  const gA = post([['askar', -1.8, -35.4, 's'], ['askar', 1.8, -36.2, 's'], ['potion', 4, -40], ['askar', -6, -38, 'p', 2], ['archer', -8, -46], ['archer', 8, -46]], { fire: [0, -37.4] });
  const c1 = await H.captives([[-5, -62], [-3, -63], [3, -63], [5, -62]]);
  const gB = post([['wolf', -6, -56, 'p', 2.5], ['wolf', 6, -57, 'p', 2.5], ['shaman', 0, -60], ['askar', -2, -57], ['askar', 2, -57]], { label: 'e_cap' }); leader(gB, 0, -55.5);
  page(9.6, -26); chest(-9.4, -50, 70);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x3a'], ['gu', 'x3b']]);
  H.objective('o_camp'); setMusic('battle'); const g0 = gate(-70);
  await clear(gA); gB.o.onWake = () => bark('sa', 'f13c'); await clear(gB);
  await dead(rein([['askar', -10, p.z + 2], ['askar', -10, p.z - 3], ['wolf', -9, p.z + 6], ['archer', -10, p.z - 7], ['heavy', 9, p.z - 4]], 'sa', 'bk_rein'));
  await H.freeCaptives(c1); g0.open(); setMusic('off'); await wait(1.6); await H.victory(); return win(); };
RUN['3-2'] = async () => { const { DUSK } = H.moods; G.curCh = 2; mstart();
  await H.rideLevel('gulayim', DUSK, 'mo_3_2', [['askar', -4, -30], ['askar', 4, -32], ['archer', 0, -38], ['askar', -6, -50], ['askar', 6, -52], ['archer', -3, -60], ['archer', 3, -60], ['askar', 0, -72], ['askar', -5, -84], ['askar', 5, -86], ['archer', 0, -94]], 'fight'); return win(); };
RUN['3-3'] = async () => { const { NIGHT } = H.moods;
  const p = await gu(3, NIGHT, H.B[3], [], 3, 2, -99, { tod: 'night' }); G.mis.st = { alarm: false }; G.mis.flag = true;
  const S = [['askar', -4, -28, 4], ['askar', 6, -36, 0], ['archer', -7, -50, 0], ['askar', 2, -58, 5], ['askar', -6, -74, 0], ['archer', 6, -80, 3], ['askar', 0, -96, 6], ['askar', -7, -112, 0], ['askar', 7, -114, 0], ['archer', 0, -126, 5], ['askar', -4, -138, 0], ['askar', 4, -140, 0]].map(([ty, x, z, pt]) => sentry(ty, x, z, pt));
  for (const e of S) { e.spawnT = 0; e.o.scale.setScalar(e.vs || 1); } fire(-8.5, -74, 1); fire(8.5, -113, 1); flyPt(0, -32, 'e_horde'); flyPt(0, -96, 'e_horde'); flyPt(0, -152, 'e_cap'); chest(9.5, -66, 80); chest(-9.5, -120, 80);
  const cs = await H.captives([[-4, -150], [-1.5, -152], [1.5, -152], [4, -150], [0, -155]]);
  setMusic('calm'); await ban(3); mstart(); H.objective('mo_3_3'); hint('ms_sneak', 8); const mk = marker(0, -148, 0x66ff88, 2);
  G.tick = () => { if (p.z < -70 && !G.mis.st.cp1) { G.mis.st.cp1 = 1; cp(); } if (p.z < -110 && !G.mis.st.cp2) { G.mis.st.cp2 = 1; cp(); } };
  await H.reach(0, -148, 3.5); mk.remove(); G.tick = null; if (G.mis.st.alarm) await until(() => enemies().length === 0 || G.mis.force); if (G.mis.force) for (const e of enemies()) e.die();
  await H.freeCaptives(cs); setMusic('off'); await wait(1.6); await H.victory(); return win(); };
RUN['3-4'] = async () => { const { DAY } = H.moods;
  const p = await gu(3, DAY, H.B[3], ['jallod', 'otbasqan'], -66, 2); const b0 = preBoss('jallod', 0, -108);
  const gG = post([['askar', -3, -80], ['askar', 3, -80], ['archer', -7, -84], ['archer', 7, -84], ['wolf', 0, -83, 'p', 3]]);
  const c2 = await H.captives([[-5, -150], [-2, -152], [2, -152], [5, -150], [0, -155]]);
  const gC = post([['heavy', 0, -146], ['askar', -6, -140, 'p', 2], ['askar', 6, -140, 'p', 2], ['wolf', -3, -144], ['wolf', 3, -144], ['archer', 0, -160], ['shaman', -7, -158]], { label: 'e_cap', wake: 0 });
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_otbasqan'); const g1 = gate(-125); setMusic('battle'); await clear(gG); await H.goTo(-88); H.hint('', 5, t('h_chain'));
  G.onBoss = b => { H.weakWhile(b, () => b.openT > 0, 'w_ja'); b.onSlam = () => { H.openUp(b, 6, 'w_open'); b.stagger = 1.5; }; };
  G.mis.flag = await H.bossFight('jallod', 0, -108, [['ja', 'd_ja1'], ['gu', 'd_gu8']], H.bossBrain({ dmg: 40, every: 2.8, moves: ['charge', 'quake', 'charge'], col: 0xaa3322, phases: [[[1, .5], e => { e.spdMul = 1.25; }]] }));
  await H.gainPower(7, 'pw7', 'pw7d'); const ob = spawn('otbasqan', 0, -118, 'ally'); ob.rot = 0; await say([['ot', 'd_ot1'], ['gu', 'd_gu9'], ['ot', 'd_ot2']]); g1.open(); H.setCP(0, -120);
  H.objective('o_free'); setMusic('battle'); gC.wakeR = 13; await clear(gC); await H.freeCaptives(c2);
  setMusic('off'); await H.goTo(-158); return win(); };
