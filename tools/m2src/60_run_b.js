// ===== CHAPTER 4 =====
RUN['4-1'] = async () => { const { DAY } = H.moods; await H.chapterIntro(4, 'nar8', 'ruins'); G.curCh = 3; mstart();
  G.mis.flag = await H.rideLevel('gulayim', DAY, 'o_ride4', [['askar', -4, -18], ['archer', 4, -24], ['askar', 0, -30], ['archer', -6, -38], ['askar', 6, -44], ['archer', 0, -50], ['askar', -3, -56]], 'flee'); return win(); };
// 4-2 the ships: shore camp → archers behind stakes (leap shortcut) → twist: a landing party from the water → the captain
RUN['4-2'] = async () => { const { DAY } = H.moods;
  const p = await gu(4, DAY, H.B[4], ['otbasqan'], 3, 3, 4, { allies: [['otbasqan', 2.6, 2]] });
  const gA = post([['askar', -2, -39.4, 's'], ['askar', 1.8, -40.2, 's'], ['heavy', 0, -45], ['askar', -6, -42, 'p', 2], ['archer', -8, -50], ['archer', 8, -50]], { fire: [0, -41.4] });
  const st = stakes(-66, -G.W, G.W, [-8.5, 2.2]); const gS = post([['archer', -3, -70], ['archer', 3, -70], ['archer', 0, -72], ['shaman', 6, -72]], { label: 'e_arch', face: 0 });
  const gB = post([['wolf', -6, -80, 'p', 2.5], ['wolf', 6, -81, 'p', 2.5], ['askar', -4, -86], ['askar', 4, -86], ['heavy', -2, -88], ['archer', 0, -93]], { label: 'mb_cap' }); leader(gB, 0, -85);
  page(9.6, -58); chest(-9.5, -96, 90);
  setMusic('calm'); await ban(3); mstart(); await say([['ot', 'x4a'], ['gu', 'x4b']]);
  H.objective('o_ships'); setMusic('battle'); const g0 = gate(-110);
  await clear(gA); H.hint('', 6, t('h_leap')); await clear(gS);
  await dead(rein([['askar', 10, p.z - 2], ['askar', 10, p.z + 3], ['wolf', 10, p.z - 6], ['wolf', -10, p.z + 5], ['archer', 10, p.z - 9]], 'ot', 'bk_rein'));
  gB.o.onWake = () => bark('ot', 'f13c'); await clear(gB); g0.open(); setMusic('off'); await H.victory(); return win(); };
// 4-3 the wolf chieftain: prowling packs, then the giant wolf (visible on his rock from the start)
RUN['4-3'] = async () => { const { DUSK } = H.moods;
  const p = await gu(4, DUSK, H.B[4], ['qashqir', 'otbasqan'], 3, 3, 4, { allies: [['otbasqan', 2.6, 2]], tod: 'dusk' });
  const g1 = post([['wolf', -6, -38, 'p', 3], ['wolf', 6, -40, 'p', 3], ['wolf', 0, -45, 'pz', 2], ['wolf', -9, -31, 'pz', 2], ['wolf', 9, -31, 'pz', 2]]);
  const g2 = post([['potion', 0, -58], ['wolf', -7, -55, 'p', 2], ['wolf', 7, -55, 'p', 2], ['askar', -3, -60], ['askar', 3, -60], ['archer', 0, -65]], { label: 'e_horde' });
  const g3 = post([['wolf', -8, -94, 'p', 2], ['wolf', 8, -94, 'p', 2], ['wolf', -4, -99], ['wolf', 4, -99], ['alpha', 0, -102]]);
  const b0 = preBoss('qashqir', 0, -113, 'mb_wolf', 'p_qa'); chest(9.5, -74, 90);
  setMusic('calm'); await ban(3); mstart(); bark('ot', 'bk_wolf');
  H.objective('mo_4_3'); setMusic('battle'); const g0 = gate(-70);
  await clear(g1); await clear(g2); await dead(rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['wolf', 0, p.z + 11]], 'ot', 'bk_back')); g0.open(); H.setCP(0, -64);
  const gx = gate(-130); await clear(g3); await H.goTo(-97);
  G.onBoss = b => { b.d = { ...b.d, name: 'mb_wolf' }; b.maxHp = b.hp = 2600; for (const m of b.mats || []) if (m.color) m.color.multiplyScalar(.8); };
  G.mis.flag = await H.bossFight('qashqir', 0, -113, [['ot', 'mb_ot1'], ['gu', 'mb_gu1']], H.qashqirAI); gx.open(); return win(); };
RUN['4-4'] = async () => { const { DAY } = H.moods;
  const p = await gu(4, DAY, H.B[4], ['aydarho', 'otbasqan'], -104, 3, 4, { allies: [['otbasqan', 2.6, 2]] }); const b0 = preBoss('aydarho', 0, -170.5);
  const gG = post([['askar', -4, -120], ['askar', 4, -120], ['archer', -8, -126], ['archer', 8, -126], ['shaman', 0, -128]]); chest(-9.5, -140, 100);
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_dragon'); setMusic('battle'); await clear(gG); await H.goTo(-134);
  const gD = gate(-163); G.onBoss = b => { b.maxHp = b.hp = 4500; b.weakHint = 'w_ay'; b.weak = () => (b.ashore > 0 ? 1.6 : H.RES()); b.onChain = () => { if (b.sub) return; b.ashore = 6; b.z = -165.5; H.openUp(b, 6, 'w_open'); }; };
  G.mis.flag = await H.bossFight('aydarho', 0, -170.5, [['ay', 'd_ay1'], ['gu', 'd_gu10']], H.dragonAI);
  await H.gainPower(8, 'pw8', 'pw8d'); return win(); };

// ===== CHAPTER 5 (Sarbinaz) =====
RUN['5-1'] = async () => { const { DUSK } = H.moods; await H.chapterIntro(5, 'nar9', 'ruins');
  const p = await sar(DUSK, H.B[5], [], 3);
  const gA = post([['askar', -1.8, -33.4, 's'], ['askar', 1.8, -34.2, 's'], ['heavy', 0, -38], ['wolf', 5, -40, 'p', 2], ['archer', -7, -46], ['archer', 7, -46]], { fire: [0, -35.4] });
  const gB = post([['heavy', 3, -64], ['wolf', -6, -60, 'p', 2], ['wolf', 6, -60, 'p', 2], ['shaman', 0, -72], ['askar', -4, -66], ['askar', 4, -66]], { label: 'mb_cap' }); leader(gB, 0, -68);
  page(-9.6, -52); chest(9.5, -84, 100);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x5a']]);
  H.objective('o_pass'); setMusic('battle'); const g0 = gate(-100);
  await clear(gA); await dead(rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['wolf', 0, p.z - 12], ['askar', -4, p.z - 13], ['askar', 4, p.z - 13]], 'sa', 'bk_back'));
  await clear(gB); await dead(rein([['wolf', -7, p.z - 10], ['wolf', 7, p.z - 10], ['archer', 0, p.z - 14]])); g0.open(); setMusic('off'); await H.victory(); return win(); };
// 5-2 archer duel: four firing lines seen from the start; rush them between volleys; twist: sorcerers join the last line
RUN['5-2'] = async () => { const { DUSK } = H.moods;
  const p = await sar(DUSK, H.B[5], [], 3, 3);
  const g1 = post([['archer', -6, -34], ['archer', 6, -34], ['archer', 0, -40], ['askar', -3, -29, 'p', 2], ['askar', 3, -29, 'p', 2]], { label: 'e_arch' });
  const s1 = stakes(-47, -G.W, G.W, [7.5, 2.4]); const g2 = post([['archer', -9, -51], ['archer', -4, -52], ['archer', 1, -52], ['archer', 6, -51], ['mage', -2, -56]], { label: 'e_arch', face: 0 });
  const g3 = post([['archer', -8, -88], ['archer', 8, -88], ['archer', -3, -94], ['archer', 3, -94], ['wolf', -6, -82, 'p', 2], ['wolf', 6, -82, 'p', 2]], { label: 'e_arch' });
  const s2 = stakes(-100, -G.W, G.W, [-7.5, 2.4]); const g4 = post([['archer', -9, -104], ['archer', 9, -104], ['archer', 0, -110], ['heavy', 0, -103.5], ['archer', 4, -106]], { label: 'e_arch', face: 0 });
  chest(-9.5, -64, 90);
  setMusic('calm'); await ban(3); mstart(); H.objective('mo_5_2'); setMusic('battle'); hint('ms_archint', 7);
  const g0 = gate(-60); await clear(g1); await clear(g2); g0.open(); H.setCP(0, -56);
  const gx = gate(-120); await clear(g3); rein([['mage', -6, -107], ['mage', 6, -107]], 'sa', 'bk_rein'); await clear(g4); await until(() => enemies().length === 0 || G.mis.force); gx.open();
  setMusic('off'); await H.victory(); return win(); };
// 5-3 the wounded maiden rides (faster than walking); ambushes are checkpoints, never a full restart
async function escortRide(z0, zGoal, hp, ambush, hintKey, objKey) {
  const e = spawn('qiz', 0, z0, 'ally'); e.maxHp = e.hp = hp; e.d = { ...e.d, follow: false }; e.rot = Math.PI; toggleMount(e, true); e.horseHp = e.horseMax = 1e9; G.mis.esc = e; let failed = false, ever = false, cpZ = z0, wt = 0, ev = 0;
  const d0 = e.damage.bind(e); e.damage = (a, s, o) => { if (failed || G.mis.force) return 0; const r = d0(a, s, o); if (e.hp <= 0 || e.dead) { e.dead = false; e.hp = 1; failed = ever = true; } return r; }; e.die = () => { failed = ever = true; e.hp = 1; };
  const amb = ambush.map(a => ({ ...a, done: false }));
  e.custom = (e, dt) => { const P = G.player, thr = enemies().some(f => f.custom !== sleepAI && hyp(f.x - e.x, f.z - e.z) < 8), nearP = P && !P.dead && hyp(P.x - e.x, P.z - e.z) < 14; e.far = !nearP;
    const want = (!thr && nearP && e.z > zGoal && !failed) ? 3.3 * FAST() : 0; ev += (want - ev) * Math.min(1, dt * 2); e.z -= ev * dt; e.x += (0 - e.x) * Math.min(1, dt * .6); e.rot = Math.PI; e.play('Idle');
    for (const a of amb) if (!a.done && e.z < a.z) { a.done = true; cpZ = e.z; cp(); const es = rein(a.w.map(([ty, x, dz]) => [ty, x, e.z + dz]), 'sa', a.bark); for (const f of es) f.rf = true; }
    return true; };
  hint(hintKey, 7); G.mis.aim = () => e.far ? e : null;
  G.tick = dt => { wt -= dt; if (wt <= 0) { wt = .5; obj(t(objKey) + '  ❤ ' + Math.max(0, Math.round(e.hp / e.maxHp * 100)) + '%'); } };
  for (;;) { await until(() => failed || e.z <= zGoal || G.mis.force); if (!failed || G.mis.force) break;
    await H.bannerShow('', t('ms_fail'), '', 2.4); for (const f of G.ents) if (f.rf && !f.dead) { f.dead = true; f.remove(); } e.z = cpZ + 3; e.hp = e.maxHp * .6; for (const a of amb) if (a.z <= cpZ + 3.5) a.done = false; const P = G.player; P.x = 2.5; P.z = e.z; P.hp = P.maxHp; failed = false; }
  G.tick = null; G.mis.aim = null; G.mis.flag = !ever && e.hp > e.maxHp * .5; e.custom = e2 => { e2.play('Idle'); return true; }; await until(() => enemies().filter(f => f.custom !== sleepAI).length === 0 || G.mis.force); return true; }
RUN['5-3'] = async () => { const { NIGHT } = H.moods;
  const p = await sar(NIGHT, H.B[5], [], 3, 3, { tod: 'night' });
  const gF = post([['askar', -2, -139.4, 's'], ['askar', 1.8, -140.2, 's'], ['archer', -7, -144], ['archer', 7, -144], ['heavy', 0, -145]], { fire: [0, -141.4], label: 'mb_cap', wake: 14 }); leader(gF, 0, -143.5); chest(9.5, -62, 90);
  setMusic('calm'); await ban(3); mstart(); H.objective('mo_5_3'); setMusic('battle');
  await escortRide(-1, -128, 800, [
    { z: -14, w: [['wolf', -7, -14], ['wolf', 7, -14], ['wolf', 0, -18]], bark: 'bk_wolf' },
    { z: -40, w: [['askar', -5, -14], ['askar', 5, -14], ['archer', -8, -20], ['archer', 8, -20]], bark: 'bk_arch' },
    { z: -66, w: [['wolf', -9, 9], ['wolf', 9, 9], ['heavy', 0, -14], ['askar', -4, -12]], bark: 'bk_back' },
    { z: -96, w: [['shaman', 0, -20], ['askar', -6, -12], ['askar', 6, -12], ['wolf', -3, -16], ['wolf', 3, -16]], bark: 'bk_rein' }], 'ms_eschint2', 'mo_5_3');
  obj(t('o_horde')); await clear(gF); await until(() => enemies().length === 0 || G.mis.force); setMusic('off'); await H.victory(); return win(); };
RUN['5-4'] = async () => { const { DUSK } = H.moods;
  const p = await sar(DUSK, H.B[5], ['qunqar'], -96); const b0 = preBoss('qunqar', 0, -136);
  const gG = post([['askar', -4, -108], ['askar', 4, -108], ['wolf', -7, -111, 'p', 2], ['wolf', 7, -111, 'p', 2], ['archer', 0, -114]]);
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_qunqar'); setMusic('battle'); await clear(gG); await H.goTo(-116);
  G.onBoss = b => H.weakWhile(b, () => G.player.shield > 0, 'w_qu');
  G.mis.flag = await H.bossFight('qunqar', 0, -136, [['qu', 'd_qu1'], ['sa', 'd_sa2']], H.bossBrain({ dmg: 52, every: 2.9, moves: ['quake', 'charge', 'charge'], col: 0xff4422, phases: [[[1, .6], e => { e.spdMul = 1.15; }], [[2, .3], e => { e.dmgMul = 1.3; e.spdMul = 1.3; }]] }));
  await H.gainPower(9, 'pw9', 'pw9d'); return win(); };

// ===== CHAPTER 6 =====
const SAR6 = { allies: [['sarbinaz', 2.6, 2]] };
RUN['6-1'] = async () => { const { DAY } = H.moods; await H.chapterIntro(6, 'nar10', 'ruins');
  const p = await gu(6, DAY, H.B[6], ['sarbinaz'], 3, 5, 4, SAR6);
  const gA = post([['potion', 3, -38], ['askar', -6, -34, 'p', 2], ['askar', 6, -34, 'p', 2], ['askar', 0, -40], ['archer', -8, -46], ['archer', 8, -46], ['shaman', 0, -50]]);
  const gB = post([['heavy', -3, -82], ['wolf', -6, -72, 'p', 2], ['wolf', 6, -72, 'p', 2], ['askar', -3, -86], ['askar', 3, -86], ['archer', -8, -96], ['archer', 8, -96], ['shaman', 0, -100]], { label: 'mb_cap' }); leader(gB, 0, -84);
  page(9.4, -62); chest(-9.4, -24, 100);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x6a'], ['gu', 'x6b']]);
  H.objective('o_city'); setMusic('battle'); const g0 = gate(-60);
  await clear(gA); g0.open(); const g1 = gate(-112); await dead(rein([['askar', -10, p.z - 4], ['askar', 10, p.z - 4], ['wolf', -10, p.z + 4], ['wolf', 10, p.z + 4], ['archer', 0, p.z - 14]], 'sa', 'bk_amb'));
  gB.o.onWake = () => bark('sa', 'f13c'); await clear(gB);
  setMusic('off'); await H.victory(); return win(); };
RUN['6-2'] = async () => { const { DAY } = H.moods;
  const p = await gu(6, DAY, H.B[6], ['sarbinaz'], -70, 5, 4, { ...SAR6, tod: 'dusk' });
  const caps = [[-3, -88], [0, -89], [3, -88], [-1.5, -91.5], [1.5, -91.5]].map(([x, z]) => { const c = spawn('asir', x, z, 'ally'); c.maxHp = c.hp = 620; c.rot = 0; c.custom = c2 => { c2.play('Sit_Floor_Idle'); return true; }; return c; }); flyPt(0, -89, 'e_cap');
  const gW = post([['askar', -6, -106], ['askar', 6, -106], ['wolf', 0, -108, 'p', 3], ['archer', -8, -110]], { wake: 0 });
  setMusic('calm'); await ban(3); mstart(); bark('sa', 'bk_rein');
  G.mis.flag = true; let lost = 0, wt = 0; G.tick = dt => { const n = caps.filter(c => c.dead).length; if (n > lost) { lost = n; G.mis.flag = false; hintRaw(t('s_nocap') + ' ✗'); } wt -= dt; if (wt <= 0) { wt = .5; $('obj').textContent = t('mo_6_2') + '  ⛓ ' + (caps.length - lost) + '/' + caps.length; } };
  const g0 = gate(-112); setMusic('battle'); hint('ms_defhint', 6); const raid = raidAI(caps); H.setCP(0, -84);
  const W = async (list, es0) => { const es = es0 || list.map(([ty, x, z]) => { const e = sp(TY(ty), x, z); if (!e.potion) e.custom = raid; return e; }); G.mis.aim = () => near(es); await until(() => es.every(e => e.dead) || caps.every(c => c.dead) || G.mis.force); G.mis.aim = null; };
  wake(gW); for (const e of gW.es) e.next = raid; await W(null, gW.es);
  const WV = [[[['wolf', -9, -74], ['wolf', 9, -74], ['askar', -4, -70], ['askar', 4, -70]], 'bk_back'], [[['askar', -7, -106], ['askar', 7, -106], ['heavy', 0, -104], ['wolf', -3, -110], ['wolf', 3, -110], ['shaman', 0, -111]], 'bk_rein'], [[['wolf', -9, -96], ['wolf', 9, -96], ['askar', -9, -80], ['askar', 9, -80], ['archer', 0, -110]], 'bk_amb']];
  for (const [w, bk] of WV) { if (caps.every(c => c.dead)) break; await wait(1.5); bark('sa', bk); await W(w); }
  if (caps.every(c => c.dead) && !G.mis.force) return fail();
  const b = potionBoss(0, -104); for (const [ty, x, z] of [['askar', -6, -104], ['askar', 6, -104]]) { const e = spawn(ty, x, z); e.custom = raid; }
  await until(() => (b.dead && enemies().length === 0) || caps.every(c => c.dead) || G.mis.force); if (caps.every(c => c.dead) && !G.mis.force) return fail();
  setBoss(null); G.tick = null; g0.open(); for (const c of caps) if (!c.dead) c.play('Cheer', { force: true }); setMusic('off'); await H.victory(); return win(); };
RUN['6-3'] = async () => { const { DAY } = H.moods;
  const p = await gu(6, DAY, H.B[6], ['sarbinaz'], -100, 5, 4, SAR6); const gt = H.gateDoor(0, -120); flyPt(0, -120, 'e_gate');
  const c = await H.captives([[-8, -132], [-6, -134], [6, -134], [8, -132]]);
  const gI = post([['askar', -5, -140, 'p', 2], ['askar', 5, -140, 'p', 2], ['shaman', 0, -146], ['wolf', -3, -136], ['wolf', 3, -136], ['archer', -7, -150], ['archer', 7, -150]], { label: 'mb_cap', wake: 0 }); leader(gI, 0, -142);
  const gO = post([['askar', -4, -112], ['askar', 4, -112], ['askar', 0, -110, 'p', 3]], { nofly: true }); chest(9.4, -156, 110);
  setMusic('battle'); await ban(3); mstart();
  H.objective('o_gate'); H.hint('', 6, t('h_gate')); let nw = 9, k = 0; G.mis.aim = () => near(alive(gO)) || { x: 0, z: -118 };
  G.tick = dt => { nw -= dt; if (nw <= 0 && !gt.dead) { nw = 13; if (enemies().filter(e => e.custom !== sleepAI).length < 6) { k++; rein(k % 2 ? [['askar', -9, p.z + 9], ['askar', 9, p.z + 9], ['archer', 0, p.z + 12]] : [['wolf', -9, p.z + 8], ['wolf', 9, p.z + 8], ['askar', 0, p.z + 11]], 'sa', k === 1 ? 'bk_back' : null); } } };
  await until(() => gt.dead || G.mis.force); G.tick = null; G.mis.aim = null; if (!gt.dead) gt.shatter(); H.setCP(0, -124); gI.wakeR = 14; wake(gI);
  await clear(gI); await until(() => enemies().length === 0 || G.mis.force); await H.freeCaptives(c);
  setMusic('off'); await wait(1.4); await H.victory(); return win(); };
RUN['6-4'] = async () => { const { DAY } = H.moods;
  const p = await gu(6, DAY, H.B[6], ['qargashiq', 'sarbinaz'], -126, 5, 4, SAR6); const b0 = preBoss('qargashiq', 0, -160);
  const gG = post([['askar', -4, -140], ['askar', 4, -140], ['archer', -8, -144], ['archer', 8, -144]]);
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_king'); setMusic('battle'); await clear(gG); await H.goTo(-143);
  G.onBoss = b => H.weakWhile(b, () => G.player.giant > 0, 'w_qg');
  G.mis.flag = await H.bossFight('qargashiq', 0, -160, [['qg', 'd_qg1'], ['gu', 'd_gu11']], H.bossBrain({ dmg: 56, every: 2.6, moves: ['charge', 'quake', 'charge', 'volley'], col: 0x221111, phases: [[[1, .5], e => { e.spdMul = 1.15; }], [[2, .2], e => { e.dmgMul = 1.3; }]] }));
  await H.gainPower(0, 'pw0', 'pw0d'); return win(); };

// ===== CHAPTER 7 =====
const ALL7 = { allies: [['sarbinaz', -2.6, 2], ['otbasqan', 2.6, 2]] };
RUN['7-1'] = async () => { const { DUSK } = H.moods; await H.chapterIntro(7, 'nar11', 'ruins'); G.curCh = 6; mstart();
  await H.rideLevel('gulayim', DUSK, 'o_ride7', [['askar', -5, -40], ['askar', 5, -42], ['askar', 0, -46], ['archer', -7, -52], ['archer', 7, -52], ['askar', -3, -58], ['askar', 3, -60], ['askar', 0, -66]], 'fight'); return win(); };
RUN['7-2'] = async () => { const { DUSK } = H.moods;
  const p = await gu(7, DUSK, H.B[7], ['qashqir', 'sarbinaz', 'otbasqan'], 3, 6, 3, ALL7);
  const gA = post([['heavy', 0, -38], ['askar', -2.2, -33.4, 's'], ['askar', 2, -34.2, 's'], ['wolf', -6, -40, 'p', 2], ['wolf', 6, -40, 'p', 2], ['archer', -8, -48], ['archer', 8, -48], ['shaman', 0, -52]], { fire: [0, -35.4] });
  const st = stakes(-66, -G.W, G.W, [8.5, 2.2]);
  const gB = post([['heavy', -2, -76], ['potion', 2, -76], ['wolf', -6, -72, 'p', 2], ['wolf', 6, -72, 'p', 2], ['askar', -4, -80], ['askar', 4, -80], ['archer', -7, -70], ['archer', 0, -69.5]], { label: 'n_qa' });
  const qa = preBoss('qashqir', 0, -88, 'n_qa', 'p_qa'); page(-9.6, -58); chest(9.5, -98, 120);
  setMusic('calm'); await ban(3); mstart(); await say([['gu', 'x7a'], ['sa', 'x7b'], ['ot', 'x7c']]);
  H.objective('o_horde'); setMusic('battle'); const g0 = gate(-110);
  await clear(gA); H.hint('', 6, t('h_leap')); await dead(rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['askar', -9, p.z - 3], ['askar', 9, p.z - 3]], 'sa', 'bk_back'));
  gB.o.onWake = () => { qa.custom = H.qashqirAI; qa.asleep = false; qa.maxHp = qa.hp = 1800; setBoss(qa); bark('ot', 'f13c'); }; await clear(gB); await until(() => qa.dead || G.mis.force); if (!qa.dead) qa.die(); setBoss(null); await until(() => enemies().length === 0 || G.mis.force);
  g0.open(); setMusic('off'); await H.victory(); return win(); };
RUN['7-3'] = async () => { const { NIGHT } = H.moods;
  const p = await gu(7, NIGHT, H.B[7], ['sarbinaz', 'otbasqan'], 3, 6, 3, { ...ALL7, tod: 'night' });
  const TP = [[-7, -40], [7, -58], [-7, -80], [7, -98]], tt = TP.map(([x, z]) => H.totem(x, z)); TP.forEach(([x, z], i) => { const s = x > 0 ? -1 : 1; const g = post([['askar', x + s * 2.5, z + 1.5], ['archer', x + s * 1, z - 2.5], [i % 2 ? 'shaman' : 'wolf', x + s * 4, z - 1, i % 2 ? 'g' : 'p', 2]], { label: 'mn_7_3', nofly: i === 1 || i === 2, wake: 10 }); });
  chest(9.5, -30, 120);
  setMusic('calm'); await ban(3); mstart();
  H.objective('mo_7_3'); setMusic('battle'); const g0 = gate(-112); H.hint('', 6, t('h_totem')); let nw = 8, tw = false;
  G.mis.aim = () => near(tt.filter(o => !o.dead).map(o => ({ x: o.x, z: o.z })));
  G.tick = dt => { nw -= dt; const up = tt.filter(o => !o.dead); if (!tw && up.length <= 2) { tw = true; rein([['heavy', -3, p.z + 10], ['heavy', 3, p.z + 10], ['wolf', 0, p.z + 12]], 'sa', 'bk_back'); cp(); }
    if (nw <= 0) { nw = 11; if (enemies().filter(e => e.custom !== sleepAI).length < 7 && (G.mis.nE || 0) < F3_CAP) for (const o of up.filter(o => Math.abs(o.z - p.z) < 26).slice(0, 2)) { sp(Math.random() < .5 ? 'askar' : 'wolf', o.x + (o.x > 0 ? -2 : 2), o.z + 1.5); burst(o.x, 2, o.z, 0xff2010, 2); } } };
  await until(() => tt.every(o => o.dead) || G.mis.force); G.tick = null; G.mis.aim = null; for (const o of tt) if (!o.dead) o.shatter(); for (const g of G.mis.groups) if (g.es.length && !g.awake && g.o) wake(g, true);
  await dead(rein([['heavy', -3, p.z - 12], ['heavy', 3, p.z - 12], ['shaman', 0, p.z - 18], ['askar', -6, p.z - 10], ['askar', 6, p.z - 10]], 'ot', 'bk_rein')); await until(() => enemies().length === 0 || G.mis.force); g0.open();
  setMusic('off'); await H.victory(); return win(); };
RUN['7-4'] = async () => { const { DUSK } = H.moods;
  const p = await gu(7, DUSK, H.B[7], ['surtaysha', 'sarbinaz', 'otbasqan'], -112, 6, 3, ALL7);
  const s = preBoss('surtaysha', 0, -150); s.invuln = true; s.helm = 3; s.maxHp = s.hp = 9000;
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_final'); await H.goTo(-122);
  G.freeze = true; p.act = null; p.play('Idle'); await wait(.5);
  await say([['su', 'd_su5'], ['gu', 'd_gu12'], ['su', 'd_su6']]); G.freeze = false; s.asleep = false; setBoss(s); setMusic('boss'); const d0 = G.stats.deaths; H.setCP(0, -124);
  H.objective('o_helm'); H.hint('', 6, t('h_helm')); s.onChain = () => { if (s.helm > 0) { s.helm--; burst(s.x, 4, s.z, 0xffd060, 3); num(s, t('helm') + ' ' + (3 - s.helm) + '/3', 'c'); Sfx.big(); } };
  s.custom = H.bossBrain({ dmg: 50, every: 2.6, moves: ['quake', 'volley', 'charge'], col: 0xaa0010 });
  await until(() => s.helm <= 0); s.invuln = false; flash(.5); await H.bannerShow('', t('helmOff'), '', 2);
  H.objective('o_totem'); H.hint('', 6, t('h_totem')); const tt = [H.totem(-8, -140), H.totem(8, -140), H.totem(-8, -162), H.totem(8, -162)];
  G.tick = dt => { if (s.dead) return; if (tt.some(o => !o.dead)) { s.hp = Math.min(s.maxHp, s.hp + dt * 40 * ([.35, 1, 1.2][SET.diff] ?? 1)); } };
  await until(() => tt.every(o => o.dead) && s.hp < s.maxHp * .35); G.tick = null;
  G.freeze = true; s.invuln = true; await say([['su', 'd_su7'], ['gu', 'd_gu13']]); H.objective('o_wrestle'); await qte(9, 14, 9); G.freeze = false; s.invuln = false; s.damage(s.hp + 10, p, { crit: true }); H.soul(s);
  G.mis.flag = G.stats.deaths === d0; await wait(1.4); setMusic('off'); await H.victory(); return win(); };

// ---------- test helper (never used in normal play) ----------
// auto(on, fast, steps, ts, soft): god-mode auto-play. soft = bot mode: the hero walks toward the arrow target and fights at a human-like pace (for pacing checks)
function auto(on = true, fast = 8, steps = 4, ts = 2, soft = false) { clearInterval(auto.iv); if (!on) { G.steps = 1; G.ts = 1; G.misFast = 1; return; } G.misFast = fast; G.steps = steps; G.ts = ts; let lt = G.time;
  auto.iv = setInterval(() => { try { const dT = Math.min(3, G.time - lt); lt = G.time;
    if (G.onEnter && !$('end').classList.contains('on')) G.onEnter();
    if ($('lore') && $('lore').classList.contains('on')) $('lore').querySelector('button').click();
    if ($('dead') && $('dead').classList.contains('on')) $('dretry').click();
    if (G.qte) G.qte.v = 100;
    const p = G.player; if (!p || G.paused || G.flying) return; p.hp = p.maxHp; if (p.horseHp !== undefined) p.horseHp = 999;
    const b = G.boss;
    if (soft) { let n = 0; for (const e of G.ents) if (e.team === 'enemy' && !e.dead && !e.bg && !e.invuln && e.spawnT <= 0 && e !== b && e.custom !== sleepAI && !e.asleep && Math.hypot(e.x - p.x, e.z - p.z) < 5 && n++ < 3) e.damage(45 * dT, p);
      if (b && !b.dead) { if (b.helm > 0 && b.onChain) b.onChain(); else if (!b.invuln && !b.asleep && Math.hypot(b.x - p.x, b.z - p.z) < 7) b.damage(120 * dT, p); }
      for (const o of G.breakables || []) if (!o.dead && Math.hypot(o.x - p.x, o.z - p.z) < 4) o.hit(o.only || 'slam');
      let tg = G.mis && G.mis.aim && G.mis.aim(); if (!tg) { let bd = 1e9; for (const e of G.ents) { if (e.team !== 'enemy' || e.dead || e.bg || e.custom === sleepAI || e.asleep) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; tg = e; } } } if (!tg && G.markers && G.markers.length) tg = G.markers[G.markers.length - 1]; if (!tg && G.ravineAhead) tg = { x: 0, z: -176 };
      if (!tg && G.mis && G.mis.cv) tg = { x: G.mis.cv.x + 3, z: G.mis.cv.z - 3 }; if (!tg && G.mis && G.mis.esc) tg = { x: G.mis.esc.x + 2, z: G.mis.esc.z - 2 };
      if (tg) { const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz); if (d > 2.2) { const st = Math.min(d - 1.8, 6.5 * dT); p.x += dx / d * st; p.z += dz / d * st; if (G.ravineAhead && p.z < -158 && p.z > -170) p.z = -171; } } return; }
    for (const e of G.ents) if (e.team === 'enemy' && !e.dead && !e.bg && !e.invuln && e.spawnT <= 0 && e !== b && !e.asleep) e.damage(1e6, p);
    if (b && !b.dead) { if (b.helm > 0 && b.onChain) b.onChain(); else if (!b.invuln && !b.asleep && b.spawnT <= 0) b.damage(Math.max(400, b.maxHp * .2), p); }
    for (const o of G.breakables || []) if (!o.dead) o.hit(o.only || 'slam');
    const tg = G.mis && G.mis.aim && G.mis.aim();
    if (G.mis && G.mis.esc && !G.mis.esc.dead) { p.x = G.mis.esc.x + 2.5; p.z = G.mis.esc.z - 1; }
    else if (tg) { p.x = tg.x + 1; p.z = tg.z + 1.5; }
    else if (G.markers && G.markers.length) { const m = G.markers[G.markers.length - 1]; p.x = m.x; p.z = m.z + .5; }
    else if (G.ravineAhead) { p.z = -172; }
  } catch (e) { console.warn('[auto]', e.message); } }, 600); }
