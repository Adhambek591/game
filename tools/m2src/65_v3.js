// ======================================================================
// MISSIONS v3 (author's list, Nov 20): rescue battles + duels. Earlier mission code is reused where the beat survives (OLD[...]),
// new beats are added through hooks: G.mis.onLive (level built), G.mis.onRide (riders spawned), G.mis.beforeWin (final duel).
// ======================================================================
const OLD = { ...RUN };
const SAFE_BACK = z => ({ x: 0, z });
function yurt(x, z, s = 1) { const g = new THREE.Group(), fm = new THREE.MeshStandardMaterial({ color: 0xcdb48a, roughness: 1 }), dk = new THREE.MeshStandardMaterial({ color: 0x5a3c20, roughness: 1 });
  const w = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.7, 18, 1, true), fm); w.position.y = .85; const r = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.3, 18), fm); r.position.y = 2.3; const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4), dk); d.position.set(0, .7, 2.41);
  for (const m of [w, r]) { m.castShadow = m.receiveShadow = true; m.material.side = THREE.DoubleSide; } g.add(w, r, d); g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g); return g; }
function doorAt(x, z, ry = 0, hp = 300) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, .35), new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 1 })); m.position.set(x, 1.3, z); m.rotation.y = ry; m.castShadow = true; world.add(m);
  return breakable({ mesh: m, x, z, hp, dmg: { slam: 120, any: 60 }, barY: 3.3, rad: 1.4, showNum: true, dust: 0x6a4a2a, spark: 0xffcc88, chunks: 14 }); }
function cageAt(x, z) { const g = new THREE.Group(), im = new THREE.MeshStandardMaterial({ color: 0x3a3430, metalness: .6, roughness: .5 }); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, b = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.2, 5), im); b.position.set(Math.cos(a) * 1.6, 1.1, Math.sin(a) * 1.6); g.add(b); }
  const top = new THREE.Mesh(new THREE.TorusGeometry(1.6, .06, 6, 24), im); top.rotation.x = Math.PI / 2; top.position.y = 2.2; g.add(top); g.position.set(x, 0, z); world.add(g); return g; }
const crowdOf = (a, b, c) => [['askar', a], ['archer', b || 0], ['wolf', c || 0]].filter(x => x[1]);
// duel opponents ("champions"): a base unit scaled up, with a boss move set (telegraphed charge / quake / volley)
const CH = {
  yuz: { type: 'askar', scale: 1.42, hp: 900, name: 'v3c_yuz', title: 'v3t_yuz', brain: { dmg: 30, every: 3.4, moves: ['charge', 'quake'] } },
  bay: { type: 'bayimbet', scale: 1.05, hp: 800, name: 'n_ba', title: 'v3t_bay', nonLethal: .3, brain: { dmg: 24, every: 3.2, moves: ['charge'] } },
  cap: { type: 'askar', scale: 1.5, hp: 1500, name: 'v3c_kap', title: 'v3t_kap', brain: { dmg: 34, every: 3, moves: ['charge', 'quake', 'charge'] } },
  ch1: { type: 'nayza', scale: 1.3, hp: 1100, name: 'v3c_ch1', title: 'v3t_ch1', brain: { dmg: 34, every: 3.2, moves: ['charge'] } },
  ch2: { type: 'askar', scale: 1.55, hp: 1400, name: 'v3c_ch2', title: 'v3t_ch2', brain: { dmg: 34, every: 2.8, moves: ['charge', 'quake'] } },
  ch3: { type: 'jallod', scale: .68, hp: 1900, name: 'v3c_ch3', title: 'v3t_ch3', heavy: true, brain: { dmg: 36, every: 2.6, moves: ['quake', 'charge', 'volley'], col: 0xaa3322 } },
  w1: { type: 'boribasi', scale: 1.1, hp: 1500, name: 'v3c_w1', title: 'v3t_w', brain: { dmg: 30, every: 3, moves: ['charge'] } },
  w2: { type: 'boribasi', scale: 1.2, hp: 1900, name: 'v3c_w2', title: 'v3t_w', brain: { dmg: 32, every: 2.7, moves: ['charge', 'quake'] } },
  w3: { type: 'boribasi', scale: 1.32, hp: 2400, name: 'v3c_w3', title: 'v3t_w', brain: { dmg: 36, every: 2.4, moves: ['charge', 'quake', 'charge'], col: 0x8822aa } },
};
const champ = (k, x, z, o = {}) => duel({ ...CH[k], x, z, R: 7.5, ...o });
const arenaOf = (k, x, z, o = {}) => arena({ ...CH[k], x, z, R: 7.5, ...o });

// ---------- PROLOGUE ----------
// 0-1 Sarkop gate: townsfolk flee inside while Allayar holds the square
RUN['0-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: 9 };
    people([['mother', -8, -27], ['child', -7, -28.5], ['elder', -9, -29]], { kind: 'bound', T: 55, guardR: 11, near: 26, label: 'r_town' });
    people([['asir', 7, -50], ['mother', 8.5, -51], ['child', 6.5, -52]], { kind: 'bound', T: 70, guardR: 13, near: 30, label: 'r_town' }); };
  return OLD['0-1'](); };
// ---------- CHAPTER 1 ----------
// 1-1 Burning village: roped villagers are dragged off; take them back, find mother, then the yuzbashi duel
RUN['1-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 2, z: -18 };
    dragGroup([['asir', -3, -41], ['mother', -4, -42], ['child', -2, -42.5]], [['askar', -2.5, -38.5]], { x: -G.W - 3, z: -60 }, { speed: 1.25, near: 15, label: 'r_drag' });
    dragGroup([['asir', 4, -86], ['elder', 5, -87], ['asir', 3, -87.5]], [['askar', 4, -84], ['askar', 6, -84.5]], { x: G.W + 3, z: -98 }, { speed: 1.2, near: 26, label: 'r_drag', safe: { x: 0, z: -64 } }); };
  let A = null; const ol = G.mis.onLive; G.mis.onLive = () => { ol(); A = arenaOf('yuz', 0, -96, { crowd: crowdOf(5, 2) }); };
  G.mis.beforeWin = async () => { await champ('yuz', 0, -96, { arena: A, after: 'flee', intro: [['gu', 'v3d_yuz']] }); await wait(.8); await H.victory(); };
  return OLD['1-1'](); };
// 1-2 Stable siege: women and children locked in the burning stable; a shaman and his wolves ring it
RUN['1-2'] = async () => {
  const p = await ch1Start(-84, [1, 2, 3, 4, 5]); spawn('sarbinaz', 3, -82, 'ally'); G.mis.safe = { x: 0, z: -84 };
  fire(9.6, -97.5, 1.3); fire(9.8, -102.5, 1.2);
  const door = doorAt(7.8, -100, Math.PI / 2, 420);
  const gS = post([['shaman', 2, -106], ['wolf', -4, -98, 'p', 2], ['wolf', 5, -94, 'pz', 2], ['wolf', -6, -104], ['askar', 0, -100, 'p', 2.5], ['wolf', 4, -108]], { label: 'e_mage', wake: 14 });
  const sh = gS.es[0]; sh.maxHp = sh.hp = 520; sh.d = { ...sh.d, name: 'v3c_sham' }; sh.vs *= 1.2;
  const st = people([['mother', 9.6, -99], ['child', 9.8, -100.6], ['child', 9.4, -101.8], ['mother', 9.9, -98], ['elder', 9.7, -102.6]], { kind: 'fire', T: 70, door, near: 28, label: 'r_fire', face: -Math.PI / 2 });
  chest(-9.3, -93, 60); live(); setMusic('calm'); await ban(3); mstart();
  obj(t('v3o_1_2')); setMusic('battle'); const g3 = gate(-114); G.mis.aim = () => door.dead ? near(enemies()) : { x: 6.6, z: -100 };
  wake(gS); setBoss(sh); let tw = false; G.tick = () => { if (!tw && st.T < 45) { tw = true; rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['boribasi', 0, p.z + 12]], 'sa', 'bk_back'); } };
  await until(() => (door.dead || st.done) && enemies().length === 0 || G.mis.force); if (G.mis.force && !door.dead) door.shatter(); G.tick = null; setBoss(null); G.mis.aim = null; g3.open(); setMusic('off'); await wait(1); await H.victory(); return win(); };
// 1-3 Narrow bridge: a spearmen phalanx holds the bridge while the captive caravan is driven away on the far side
function phalanxAI(row) { return (e, dt) => { const P = G.player; if (e.hp < e.maxHp * .92 || row.broken || (P && hyp(P.x - e.x, P.z - e.z) < 3.2)) { row.broken = row.broken || e.hp < e.maxHp * .5; e.custom = null; return false; } if (!row.go) { e.play('Idle_Combat'); return true; }
  e.z += .55 * dt * FAST(); e.rot = 0; e.play('Walking_A', { ts: .55 }); e.farT = -1e9; return true; }; }
RUN['1-3'] = async () => { const { DUSK } = H.moods;
  const p = await ch1Start(3, [1, 2, 3, 4, 5], DUSK); tod('dusk'); spawn('sarbinaz', 3, 5, 'ally'); G.mis.safe = { x: 0, z: -40 };
  // the bridge: plank deck between rails (colliders keep everyone on it)
  const dk = new THREE.Mesh(new THREE.BoxGeometry(6.4, .25, 34), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: .95 })); dk.position.set(0, .1, -77); dk.receiveShadow = true; world.add(dk);
  const rm = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 1 }); for (const sx of [-3.3, 3.3]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(.18, .18, 34), rm); rl.position.set(sx, 1.05, -77); world.add(rl); for (let z = -60; z >= -94; z -= 1.7) { const po = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 1.15, 6), rm); po.position.set(sx, .58, z); po.castShadow = true; world.add(po); G.colC.push({ x: sx, z, r: .5 }); } for (let z = -60; z >= -94; z -= 1.3) { G.colC.push({ x: Math.sign(sx) * 5.5, z, r: 2.2 }); G.colC.push({ x: Math.sign(sx) * 9.6, z, r: 2.5 }); } }
  const g1 = post([['askar', -.4, -30.2, 's'], ['askar', -3.6, -29.6, 's'], ['askar', 3, -33, 'p', 3], ['archer', -8.5, -30], ['wolf', 6, -27, 'pz', 2]], { fire: [-2, -31.6] });
  const row = { go: false, broken: false }; G.noVar = true;
  const ph = post([['nayza', -2, -63], ['nayza', 0, -63], ['nayza', 2, -63], ['nayza', -1, -65], ['nayza', 1, -65], ['archer', -1.5, -69], ['archer', 1.5, -69]], { label: 'v3c_phal', wake: 0, face: 0 });
  for (const e of ph.es) e.next = e.type === 'nayza' ? phalanxAI(row) : null;
  const gC = post([['askar', -3, -100], ['askar', 3, -101], ['archer', 0, -104]], { label: 'mb_cap', wake: 9 }); leader(gC, 0, -102); G.noVar = false;
  const cv = dragGroup([['asir', -1, -99], ['mother', 1, -100], ['child', 0, -101], ['asir', -1, -102], ['elder', 1, -103]], [['askar', 0, -97]], { x: 0, z: -124 }, { speed: .95, near: 42, label: 'r_drag' });
  page(9.6, -47); chest(-9.6, -50, 70);
  live(); setMusic('calm'); await ban(3); mstart(); await say([['sa', 'f13a'], ['gu', 'v3d_13']]);
  obj(t('v3o_1_3')); setMusic('battle'); const gt = gate(-128);
  await clear(g1); H.hint('', 7, t('v3h_phal')); await until(() => p.z < -50 || G.mis.force); wake(ph); row.go = true; bark('sa', 'v3b_phal');
  G.mis.aim = () => near(ph.es) || near(cv.hand); await until(() => alive(ph).length === 0 || G.mis.force); if (G.mis.force) for (const e of ph.es) if (!e.dead) e.die(); cp();
  wake(gC); await until(() => (alive(gC).length === 0 && (cv.done || cv.freed || cv.hand.every(e => e.dead))) || G.mis.force); G.mis.aim = null; await until(() => enemies().length === 0 || G.mis.force);
  gt.open(); setMusic('off'); await wait(1.4); await H.victory(); return win(); };
// ---------- CHAPTER 2 ----------
// 2-1 / 4-1 mounted chase: riders carry captives — catch them before they escape
const rideCaps = (es, k = 2) => { es.forEach((f, i) => { if (i % 3 === k % 3) return; people([['asir', f.x, f.z]], { kind: 'ride', guards: [f], auto: true, T: 999, label: 'r_drag' }); }); G.mis.noResHud = false; };
RUN['2-1'] = async () => { G.mis.onRide = es => rideCaps(es, 2); return OLD['2-1'](); };
RUN['4-1'] = async () => { G.mis.onRide = es => rideCaps(es, 1); return OLD['4-1'](); };
// 2-2 Bayimbet's trial: a non-lethal test duel in front of the camp — then raiders fall on the onlookers
RUN['2-2'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], [], 3, 1); G.mis.safe = { x: 0, z: -14 };
  const gA = post([['askar', -2.2, -62.6, 's'], ['askar', 1.6, -63.4, 's'], ['heavy', 5, -66], ['wolf', -7, -64, 'pz', 2], ['archer', -6, -70], ['archer', 6, -70], ['shaman', 0, -73]], { fire: [-.4, -64.4] }); leader(gA, 0, -67);
  const A = arenaOf('bay', 0, -32, { crowd: [['asir', 4], ['elder', 2], ['mother', 2]] }); chest(9.4, -84, 80); page(-9.6, -46);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x2a'], ['gu', 'x2b']]);
  obj(t('v3o_2_2')); const mk = marker(0, -24); await H.reach(0, -24, 4); mk.remove();
  const r = await champ('bay', 0, -32, { arena: A, after: 'stay', intro: [['ba', 'd_ba1'], ['gu', 'd_gu5'], ['ba', 'v3d_bay']] });
  await say([['ba', 'v3d_bay2'], ['gu', 'd_gu6']]); H.objective('o_ambush');
  // the twist: raiders burst in on the onlookers
  const vil = people([['asir', -6, -36], ['elder', -5, -37.5], ['mother', 6, -36], ['child', 5, -37.5], ['asir', 0, -40]], { kind: 'bound', T: 40, auto: true, label: 'r_town' });
  const am = rein([['wolf', -9, -30], ['wolf', 9, -30], ['askar', -9, -42], ['askar', 9, -42], ['wolf', 0, -46]], 'sa', 'bk_amb'); vil.guards = am; for (const e of am.slice(0, 3)) e.custom = raidAI(vil.ps);
  setMusic('battle'); await dead(am); const g1 = gate(-90); gA.o.onWake = () => bark('sa', 'f13c'); await clear(gA);
  await until(() => enemies().length === 0 || G.mis.force); g1.open(); setMusic('off'); await H.victory(); return win(); };
// 2-3 Battle for the well: the freed people's caravan through the sandstorm (convoy code), raiders hold the well
RUN['2-3'] = async () => OLD['2-3']();
// ---------- CHAPTER 3 ----------
// 3-1 Night camp: free the bound captives yurt by yurt; an alarm turns it into a big battle
RUN['3-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -10 };
    [[-8.5, -62], [8.5, -104], [-8, -132]].forEach(([x, z], i) => { yurt(x + (x > 0 ? 1.8 : -1.8), z - 1.5, .9); people([['asir', x, z], ['mother', x + (x > 0 ? -1 : 1), z + .8], ['child', x, z + 1.6]], { kind: 'bound', T: 75 + i * 15, guardR: 12, near: 20, label: 'r_yurt' }); }); };
  return OLD['3-3'](); };
// 3-2 The slave caravan: armoured spearmen guard the roped line
RUN['3-2'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -12 }; G.noVar = true;
    dragGroup([['asir', 4, -47], ['asir', 5, -48.2], ['mother', 4, -49.4], ['child', 5, -50.6]], [['nayza', 4.5, -44.5], ['nayza', 6, -45], ['nayza', 3, -52], ['nayza', 6.6, -51.5]], { x: G.W + 3, z: -66 }, { speed: .9, near: 26, label: 'r_drag' });
    // wave4 / missions audit: a second roped line further up the road, guarded by armoured spearmen and swordsmen — the caravan is the fight of this mission
    dragGroup([['asir', -4, -92], ['asir', -5, -93.2], ['elder', -4, -94.4], ['asir', -5, -95.6]], [['nayza', -4.5, -89.5], ['nayza', -6, -90], ['askar', -3, -97], ['askar', -6.2, -97.5]], { x: -G.W - 3, z: -112 }, { speed: .9, near: 26, label: 'r_drag' });
    G.noVar = false; };
  return OLD['3-1'](); };
// 3-3 Hold the bridge: captives cross the river while boats land raiders from both banks; an archer commander on the ridge
RUN['3-3'] = async () => { const { DAY } = H.moods;
  const p = await gu(3, DAY, H.B[3], [], -30, 2); G.mis.safe = { x: 0, z: -20 };
  const cr = people([['asir', -1, -84], ['mother', 1, -85], ['child', 0, -86], ['asir', -1, -87.5], ['elder', 1, -88.5], ['mother', 0, -90], ['child', -1, -91], ['asir', 1, -92]], { kind: 'walk', speed: .8, auto: true, safe: { x: 0, z: -26 }, label: 'r_walk' });
  const cm = post([['archer', 9.2, -55], ['archer', 9.5, -61], ['archer', 9.2, -67]], { y: 1.3, label: 'v3c_arch', wake: 0, face: -Math.PI / 2 });
  const boss = cm.es[1]; boss.maxHp = boss.hp = 700; boss.vs *= 1.35; boss.o.scale.setScalar(boss.vs); boss.d = { ...boss.d, name: 'v3c_arch' };
  chest(-9.5, -44, 90);
  setMusic('calm'); await ban(3); mstart(); await say([['gu', 'v3d_33']]); obj(t('v3o_3_3')); setMusic('battle');
  G.mis.aim = () => { const al = cr.ps.filter(c => !c.dead && !c.lostP && !c.saved); const e = near(enemies().filter(e => al.some(c => hyp(c.x - e.x, c.z - e.z) < 14))); if (e) return e; if (!al.length) return near(enemies()); return { x: al[0].x, z: al[0].z }; };
  let k = 0, nw = 4; const B = [[['askar', -11, 0], ['askar', -11, 3], ['wolf', -11, -3]], [['askar', 11, 0], ['heavy', 11, 3], ['archer', 11, -3]], [['wolf', -11, 0], ['wolf', 11, 2], ['askar', -11, 4], ['askar', 11, -2]], [['heavy', -11, 0], ['shaman', -11, 3], ['askar', 11, 1]], [['askar', -11, 0], ['askar', 11, 0], ['wolf', -11, 3], ['wolf', 11, 3], ['archer', 11, -3]]];
  G.tick = dt => { cr.halt = enemies().some(e => cr.ps.some(c => !c.dead && hyp(c.x - e.x, c.z - e.z) < 3)); nw -= dt * FAST(); const al = cr.ps.filter(c => !c.dead && !c.lostP && !c.saved); if (nw <= 0 && k < B.length && al.length) { nw = 11; const z0 = al.reduce((s, c) => s + c.z, 0) / al.length; const es = rein(B[k].map(([ty, x, dz]) => [ty, x, z0 + dz]), 'gu', k % 2 ? 'v3b_boat' : null); es.forEach((e, i) => { if (i < 2) e.custom = raidAI(cr.ps); }); burst(-11, .5, z0, 0x88aacc, 3); burst(11, .5, z0, 0x88aacc, 3); if (k === 1) { wake(cm); setBoss(boss); bark('gu', 'v3b_arch'); } k++; } };
  await until(() => (cr.done && enemies().length === 0) || G.mis.force); G.tick = null; setBoss(null);
  setMusic('off'); await wait(1); await H.victory(); return win(); };
// ---------- CHAPTER 4 ----------
// 4-2 Ship deck: get the captives out of the hold, then duel the ship's captain on deck
RUN['4-2'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -60 };
    people([['asir', 7.5, -88], ['mother', 8.5, -89.5], ['child', 7, -90.5], ['asir', 9, -91]], { kind: 'cage', T: 110, guardR: 11, near: 30, label: 'r_hold', exit: { x: G.W + 4, z: -96 } }); cageAt(8, -89.5); };
  let A = null; const ol = G.mis.onLive; G.mis.onLive = () => { ol(); const dk = new THREE.Mesh(new THREE.BoxGeometry(16, .3, 16), new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: .9 })); dk.position.set(0, .12, -102); dk.receiveShadow = true; world.add(dk); try { w4Boat(0, -102); } catch (e) { console.warn(e); } A = arenaOf('cap', 0, -102, { crowd: crowdOf(5, 3) }); };
  G.mis.beforeWin = async () => {
    await champ('cap', 0, -102, { arena: A, after: 'flee', intro: [['ot', 'v3d_cap'], ['gu', 'v3d_cap2']] }); await H.victory(); };
  return OLD['4-2'](); };
// 4-3 Wolf chieftain: the fishing village at dusk — save the villagers from the pack
RUN['4-3'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: 0 };
    people([['asir', -8, -42], ['mother', -9, -43.5], ['child', -7.5, -44.5]], { kind: 'bound', T: 50, guardR: 13, near: 28, label: 'r_fish' });
    people([['elder', 8, -62], ['asir', 9, -60.5], ['child', 7.5, -61]], { kind: 'bound', T: 60, guardR: 12, near: 26, label: 'r_fish' });
    people([['mother', -8, -96], ['child', -9, -97], ['asir', -7, -98]], { kind: 'bound', T: 60, guardR: 12, near: 24, label: 'r_fish', safe: { x: 0, z: -70 } }); };
  return OLD['4-3'](); };
// ---------- CHAPTER 5 ----------
// 5-1 Pass ambush: carry the wounded maidens out under rockfall and archer fire
RUN['5-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -2 }; G.mis.hazard = rain(4.2, 'rock');
    people([['qiz', -8, -40], ['qiz', -7, -41.5]], { kind: 'wound', T: 60, near: 26, label: 'r_wound' });
    people([['qiz', 8, -58], ['qiz', 7, -60]], { kind: 'wound', T: 70, near: 26, label: 'r_wound' });
    people([['qiz', -7.5, -80], ['qiz', -8.5, -82]], { kind: 'wound', T: 80, near: 26, label: 'r_wound', safe: { x: 0, z: -50 } });
    post([['archer', -10.5, -50], ['archer', 10.5, -66], ['archer', -10.5, -86]], { y: 2, label: 'e_arch', wake: 18 }); };
  const r = await OLD['5-1'](); G.mis.hazard = null; return r; };
// 5-2 Sarbinaz alone: three Kalmyk champions, one after another; each holds a cage of captives his men will carry off
RUN['5-2'] = async () => { const { DUSK } = H.moods;
  const p = await sar(DUSK, H.B[5], ['jallod'], 3, 0); G.mis.safe = { x: 0, z: 0 };
  chest(9.5, -84, 100); const AR = {}, CG = {};
  for (const [k, z, cz] of [['ch1', -30, -40], ['ch2', -62, -72], ['ch3', -94, -104]]) { AR[k] = arenaOf(k, 0, z, { crowd: crowdOf(5, 2) }); cageAt(0, cz); CG[k] = people([['asir', -.6, cz], ['mother', .6, cz + .5], ['child', 0, cz - .6]], { kind: 'cage', T: 70, near: 15, guards: [AR[k].foe], label: 'r_cage', exit: { x: 0, z: cz - 30 } }); }
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'v3d_52']]);
  for (const [k, z, cz] of [['ch1', -30, -40], ['ch2', -62, -72], ['ch3', -94, -104]]) {
    obj(t('v3o_5_2')); const mk = marker(0, z + 6); G.mis.aim = () => ({ x: 0, z: z + 6 }); await H.reach(0, z + 6, 4.5); mk.remove(); G.mis.aim = null;
    await champ(k, 0, z, { arena: AR[k], after: 'flee', intro: [['sa', 'v3d_' + k]] }); p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .4); }
  setMusic('off'); await H.victory(); return win(); };
// 5-3 Archer tower: shepherds are held in the pit under the tower; archers on top, a door at its foot
RUN['5-3'] = async () => { const { DUSK } = H.moods;
  const p = await sar(DUSK, H.B[5], [], 3, 4); G.mis.safe = { x: 0, z: -20 };
  const tw = new THREE.Group(), sm = new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 1 }), wm = new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.1, 6.2, 14), sm); body.position.y = 3.1; const pl = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, .35, 14), wm); pl.position.y = 6.3; tw.add(body, pl); for (const m of [body, pl]) { m.castShadow = m.receiveShadow = true; } tw.position.set(0, 0, -78); world.add(tw); G.colC.push({ x: 0, z: -78, r: 3.1 });
  const door = doorAt(0, -74.7, 0, 520);
  const top = post([['archer', -1.6, -77], ['archer', 1.6, -77], ['archer', 0, -79.4]], { y: 6.5, label: 'v3c_tow', wake: 26 });
  const gA = post([['askar', -2, -42, 's'], ['askar', 2, -43, 's'], ['heavy', 0, -47], ['wolf', -6, -45, 'p', 2], ['archer', 7, -50]], { fire: [0, -44] });
  const gB = post([['askar', -4, -68], ['askar', 4, -68], ['heavy', 0, -70], ['shaman', -6, -72]], { label: 'mb_cap', wake: 12 }); leader(gB, 3, -71);
  const sh = people([['asir', -1.2, -73], ['elder', 0, -72.5], ['asir', 1.2, -73], ['child', 0, -73.6]], { kind: 'cage', T: 120, near: 40, label: 'r_tower', exit: { x: -G.W - 4, z: -90 } }); cageAt(0, -73.1); sh.guards = [...top.es, ...gB.es]; sh.door = door;
  chest(-9.5, -60, 100); setMusic('calm'); await ban(3); mstart(); await say([['sa', 'v3d_53']]);
  obj(t('v3o_5_3')); setMusic('battle'); const g0 = gate(-96); await clear(gA); H.hint('', 6, t('v3h_tow'));
  G.mis.aim = () => door.dead ? near([...top.es, ...gB.es]) : { x: 0, z: -73 };
  await until(() => door.dead || G.mis.force); if (!door.dead) door.shatter(); for (const e of top.es) if (!e.dead) { e.y = 0; e.z = -73; e.x += (Math.random() - .5) * 3; burst(e.x, 3, e.z, 0x9a8a70, 2); } bark('sa', 'v3b_tow');
  await until(() => enemies().length === 0 || G.mis.force); G.mis.aim = null; g0.open(); setMusic('off'); await wait(1); await H.victory(); return win(); };
// ---------- CHAPTER 6 ----------
// 6-1 Narrow streets: townsfolk locked in burning houses, one after another; attacks from every side street
RUN['6-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: 0 };
    [[-9.3, -30, 55], [9.3, -54, 65], [-9.3, -78, 70], [9.3, -100, 80]].forEach(([x, z, T0]) => { const d = doorAt(x - Math.sign(x) * .6, z, Math.PI / 2, 260); fire(x + Math.sign(x) * .6, z - 1.6, .9);
      people([['mother', x + Math.sign(x) * 1.2, z - .8], ['child', x + Math.sign(x) * 1.4, z + .6], ['asir', x + Math.sign(x) * 1.1, z + 1.6]], { kind: 'fire', T: T0, door: d, near: 22, label: 'r_house', face: -Math.sign(x) * Math.PI / 2 }); }); };
  return OLD['6-1'](); };
// 6-2 Gate siege under arrow and fire rain (the old gate mission), people locked in the burning quarter behind it
RUN['6-2'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -104 }; G.mis.hazard = rain(3.6, 'fire');
    people([['mother', 4, -128], ['child', 5, -129], ['asir', 3, -129.5], ['elder', 6, -128.5]], { kind: 'fire', T: 150, guardR: 16, near: 34, label: 'r_house' }); };
  const r = await OLD['6-3'](); G.mis.hazard = null; return r; };
// 6-3 Cages: the chain champion guards the cages; open them before the captives are carried off
RUN['6-3'] = async () => { const { DAY } = H.moods;
  const p = await gu(6, DAY, H.B[6], ['sarbinaz', 'jallod'], -60, 5, 4, SAR6); G.mis.safe = { x: 0, z: -62 };
  const C = [[-7, -84, 70], [7, -98, 85], [-6, -112, 100]].map(([x, z, T0]) => { cageAt(x, z); const g = post([['askar', x + (x > 0 ? -3 : 3), z + 1.5], ['archer', x + (x > 0 ? -1 : 1), z - 3], ['wolf', x + (x > 0 ? -4 : 4), z - 1, 'p', 1.5]], { label: 'r_cage', wake: 11 });
    return people([['asir', x - .6, z], ['mother', x + .6, z + .4], ['child', x, z - .6]], { kind: 'cage', T: T0, guards: g, near: 32, raid: 0, label: 'r_cage', exit: { x: x > 0 ? G.W + 4 : -G.W - 4, z: z - 12 } }); });
  const b = preBoss('jallod', 0, -100, 'v3c_chain'); b.maxHp = b.hp = 3200; b.vs *= .82; b.o.scale.setScalar(b.vs); b.d = { ...b.d, name: 'v3c_chain' }; chest(9.4, -124, 110);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'v3d_63']]); obj(t('v3o_6_3')); setMusic('battle'); const g0 = gate(-124);
  await until(() => p.z < -88 || b.hp < b.maxHp || G.mis.force); b.asleep = false; b.custom = H.bossBrain({ dmg: 36, every: 2.8, moves: ['charge', 'quake', 'charge'], col: 0xaa3322 }); G.mis.preBoss = null; setBoss(b); setMusic('boss'); Sfx.horn(); bark('sa', 'v3b_chain');
  G.mis.aim = () => near([b, ...C.flatMap(g => g.guards)]); await until(() => (b.dead && enemies().length === 0) || G.mis.force); if (!b.dead) b.die(); setBoss(null); G.mis.aim = null;
  g0.open(); setMusic('off'); await wait(1); await H.victory(); return win(); };
// ---------- CHAPTER 7 ----------
// 7-2 Circle of shamans: captives are bound at the totems for the sacrifice — break the totems in time
RUN['7-2'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: 0 };
    [[-7, -40, 60], [7, -58, 75], [-7, -80, 90], [7, -98, 105]].forEach(([x, z, T0]) => { const s = x > 0 ? -1 : 1; people([['asir', x + s * 1.6, z + 2.6], ['mother', x + s * 2.6, z + 1.8]], { kind: 'altar', T: T0, guardR: 7, near: 26, label: 'r_altar' }); }); };
  return OLD['7-3'](); };
// 7-3 Surtaysha's three wolf-champions: arena duels in a row (each holds captives his pack will drag away)
RUN['7-3'] = async () => { const { NIGHT } = H.moods;
  const p = await gu(7, NIGHT, H.B[7], ['sarbinaz', 'otbasqan'], 3, 6, 3, { ...ALL7, tod: 'night' }); G.mis.safe = { x: 0, z: 2 };
  chest(9.5, -48, 120); const AR = {};
  for (const [k, z, cz] of [['w1', -32, -43], ['w2', -64, -75], ['w3', -96, -107]]) { AR[k] = arenaOf(k, 0, z, { crowd: [['wolf', 5], ['askar', 3]] }); cageAt(0, cz); people([['asir', -.6, cz], ['mother', .6, cz + .5], ['child', 0, cz - .6]], { kind: 'cage', T: 75, near: 15, guards: [AR[k].foe], label: 'r_cage', exit: { x: 0, z: cz - 30 } }); }
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'v3d_73'], ['gu', 'v3d_73b']]);
  for (const [k, z, cz] of [['w1', -32, -43], ['w2', -64, -75], ['w3', -96, -107]]) {
    obj(t('v3o_7_3')); const mk = marker(0, z + 6); G.mis.aim = () => ({ x: 0, z: z + 6 }); await H.reach(0, z + 6, 4.5); mk.remove(); G.mis.aim = null;
    const r = await champ(k, 0, z, { arena: AR[k], after: k === 'w3' ? 'fight' : 'flee', intro: [['gu', 'v3d_' + k]] }); if (r.es && r.es.length) { setMusic('battle'); obj(t('v3o_7_3')); await dead(r.es); } p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .35); }
  setMusic('off'); await H.victory(); return win(); };
