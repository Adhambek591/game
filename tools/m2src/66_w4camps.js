// ======================================================================
// WAVE4 CAMPS: 2–4 enemy camps per chapter on the road to the chapter boss (yurt camp / watchtower / river ford), 60–150 soldiers each,
// shown on the world map in advance (js/wave4.js draws them). Clearing them unlocks the boss (missions unlock in list order).
// In the level: three posted groups and the captain stand in the camp from the start (fly-over shows them); the rest come out of the
// tents / tower gate in waves while fewer than 14 are up. One body stands for 3 soldiers; the engine's 40-active cap is never reached.
// ======================================================================
import { yurt as w4Yurt, wall as w4Wall, banner as w4Banner, water as w4Water, crate as w4Crate, house as w4House, ground as w4Ground, shoot as w4Shoot } from './engine.js?v=1795194545';
const W4CAMPS = { 1: [['yurt', 60], ['tower', 80]], 2: [['yurt', 80], ['tower', 90]], 3: [['ford', 90], ['yurt', 100]], 4: [['tower', 100], ['ford', 110], ['yurt', 110]], 5: [['yurt', 110], ['tower', 120], ['ford', 120]], 6: [['tower', 130], ['yurt', 130], ['ford', 140]], 7: [['yurt', 140], ['tower', 150], ['yurt', 150]] };
for (const c of Object.keys(W4CAMPS)) { const cc = +c, bi = MLIST.findIndex(m => m.c === cc && m.boss); if (bi < 0) continue;
  W4CAMPS[c].forEach(([k, n], i) => MLIST.splice(bi + i, 0, { id: cc + '-C' + (i + 1), c: cc, ty: 'camp', n: 'w4_n_' + k, o: 'w4o_camp', s: ['win', 'most', 'all'], camp: { k, n } })); }
TYICON.camp = '⛺';
// camp balance 2c: camp soldiers' [HP x, damage x] per chapter on top of the chapter curve (QA sim bot: ~150–240 game-s at the cap, she ends at 30–70 % HP)
const W4CAMPK = { 1: [1.1, 2.4], 2: [1.2, 3.4], 3: [1.1, 2.4], 4: [1.1, 2.4], 5: [1.1, 2.4], 6: [1.1, 2.4], 7: [1.5, 4.2] };   // only measured values (wave4_log "Camp balance 2c"); ch3 still easy (82 % HP), ch4/ch6 not measured
const W4MOOD = { 1: 'DAY', 2: 'HOT', 3: 'DAY', 4: 'DAY', 5: 'DUSK', 6: 'DAY', 7: 'DUSK' };
// models agent's camp / ford sets (js/models_ext.js, window.__MXB.put); every call is optional — without the module the old props stay
const w4mx = (name, x, z, ry = 0, ...a) => { try { const B = window.__MXB; if (!B) return null; return B.put(world, name, x, z, ry, ...a) || true; } catch (e) { return null; } };
function w4Scene(k, c, CZ) {
  const W = G.W;
  if (k === 'yurt') { for (const [x, z] of [[-12.6, CZ + 3], [12.8, CZ - 1], [-8.6, CZ - 12],   /* QA: the two front yurts stand outside the lane now — a roof next to the camera covered the lower-right play area */ [8.8, CZ - 14], [-8.8, CZ - 25], [9, CZ - 26]]) w4Yurt(x, z, false, true);
    for (const s of [-1, 1]) { if (!w4mx('tug', s * 4.6, CZ + 7)) { try { w4Banner(s * 4.6, CZ + 7, 0x1a1a1a); } catch (e) { } } w4mx('mantlet', s * 2.6, CZ + 8.2, 0); } decor('R_arava', -9.4, CZ - 5, .6); w4Crate(5.5, CZ + 5); w4Crate(-5, CZ - 15);
    if (w4mx('tent', -6.4, CZ - 19, .3)) G.colC.push({ x: -6.4, z: CZ - 19, r: 1.6 }); if (w4mx('tent', 6.6, CZ - 20, -.3)) G.colC.push({ x: 6.6, z: CZ - 20, r: 1.6 }); w4mx('weaponRack', 6.2, CZ - 7, -1.2); w4mx('weaponRack', -6.4, CZ + 1, 1.2); w4mx('arrowBasket', 5.2, CZ - 9.5, 0); w4mx('campfire', 0, CZ - 4, 0); }
  else if (k === 'tower') { w4Wall(-W - 3, -3.4, CZ + 6, 2.4, .8); w4Wall(3.4, W + 3, CZ + 6, 2.4, .8); for (const s of [-1, 1]) { try { w4Banner(s * 3.9, CZ + 6.4, 0x1a1a1a); } catch (e) { } }
    for (const [x, z, r] of [[-6.5, CZ - 8, .3], [6.5, CZ - 9, -.3]]) { if (w4mx('watchtower', x, z, r)) G.colC.push({ x, z, r: 1.8 }); else { try { decor('B_tower', x, z, r); } catch (e) { } } } w4mx('tug', 0, CZ - 16, 0); w4mx('weaponRack', -5, CZ - 14, 1.2); w4mx('mantlet', -2.4, CZ + 3.4, 0); w4mx('mantlet', 2.4, CZ + 3.4, 0); w4mx('arrowBasket', 4, CZ - 11, 0); w4Yurt(-8.8, CZ - 19, false, true); w4Yurt(8.8, CZ - 20, false, true); w4Crate(4.5, CZ + 2); }
  else { try { w4Water(0, CZ + 9, 2 * W + 18, 7.5); } catch (e) { } for (const [x, z, s] of [[-8.5, CZ + 5, 1.4], [8, CZ + 4.6, 1.2], [-5, CZ + 13.4, 1], [6.5, CZ + 13.2, 1.3]]) { try { place(world, 'boulder_01', x, z, s); } catch (e) { } }
    w4Yurt(-8.6, CZ - 8, false, true); w4Yurt(8.8, CZ - 13, false, true); w4Yurt(-8.8, CZ - 22, false, true); decor('R_arava', 9.4, CZ - 2, 2.4);
    w4mx('fordStones', 0, CZ + 9, 0, 9); w4mx('fordStakes', -3.6, CZ + 9, Math.PI / 2, 8); w4mx('reeds', -9.5, CZ + 11.5, 0, 7); w4mx('reeds', 9.8, CZ + 6.6, 0, 6); w4mx('boat', 9.2, CZ + 10.5, .5); w4mx('tug', -4.5, CZ - 3, 0); w4mx('weaponRack', 5, CZ - 9, -1.2); w4mx('campfire', 0, CZ - 12, 0); }
}
async function campRun(m) { const c = m.c, k = m.camp.k, N = m.camp.n, CZ = -62, REP = 2, B = Math.ceil(N / REP);   // QA pass 2: one body = 2 soldiers (60 soldiers were gone in a minute), three real waves with a pause
  const mood = H.moods[W4MOOD[c]] || H.moods.DAY, build = c === 1 ? H.buildMission : H.B[c];
  const p = await gu(c, mood, () => { build(); w4Scene(k, c, CZ); }, [], 3, c - 1, 5); G.curCh = c - 1; if (m.keep) { try { window.__W4.RUN.m = null; } catch (e) { } }   /* 7-1: our host joins now, on foot (it was skipped while she was mounted) */
  const pool = w4Pool(c), pick = i => { const q = pool[i % pool.length]; return q === 'manj' ? 'askar' : q; };
  const L1 = [], L2 = [], L3 = [];
  for (let i = 0; i < 6; i++) L1.push([pick(i), (i % 3 - 1) * 2.6 + (i > 2 ? 1.3 : 0), CZ + 3.5 - (i > 2 ? 2 : 0), i % 2 ? 'p' : 'g', 1.6]);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; L2.push([pick(i + 1), Math.cos(a) * 2.3, CZ - 4 + Math.sin(a) * 2.3, 's']); }
  for (let i = 0; i < 4; i++) L3.push([pick(i + 2), (i - 1.5) * 2.2, CZ - 13.5]);
  const gA = post(L1, { label: 'e_horde', wake: 12, noExtra: true }), gB = post(L2, { fire: [0, CZ - 4], wake: 12, noExtra: true }), gC = post(L3, { wake: 11, noExtra: true });   // the camp is sized by its own soldier count: no balance extras (they were never counted and put catapults into the fire circle)
  const capt = leader(gC, 0, CZ - 11, 'mb_cap'); capt.maxHp = capt.hp = Math.round(capt.maxHp * (1.2 + .1 * c));
  if (c >= 4) for (const e of gA.es.slice(0, 2)) if (window.__W4) window.__W4.cavalry(e);
  if (c >= 5 && window.__W4) for (const x of [-5.5, 5.5].slice(0, c >= 6 ? 2 : 1)) { const cat = window.__W4.catapult(x, CZ - 17); cat.grp = gC; cat.next = cat.custom; cat.custom = sleepAI; cat.pose = 'g'; cat.hx = cat.x; cat.hz0 = cat.z; cat.seed = 1; cat.rot = cat.rot0 = 0; cat.farT = -1e9; gC.es.push(cat); }
  const CK = W4CAMPK[c] || W4CAMPK[7], cbuff = e => { if (e.w4cat || e === capt) return; e.maxHp = Math.round(e.maxHp * CK[0]); e.hp = e.maxHp; e.dmgMul = (e.dmgMul || 1) * CK[1]; };   /* camp balance 2c (wave4_log): per-chapter soldier [HP x, damage x] */
  const all = [...gA.es, ...gB.es, ...gC.es]; all.forEach(cbuff); let reserve = Math.max(0, B - all.length), waveT = 0, told = false, wave = 1, pause = 0; const R0 = reserve, R3 = Math.floor(R0 / 2), wv = () => Math.min(3, Math.ceil(wave)); let wLast = 1;
  const full = ['askar', 'qalqan', 'archer', 'qilich', 'nayza'], wpool = w => { const q = pool.filter(x => x !== 'manj' && x !== 'cav'); for (const x of full.slice(0, Math.min(full.length, c + w))) if (!q.includes(x)) q.push(x); return q; }, upN = () => all.filter(e => !e.dead && e !== capt && !e.w4cat).length;
  const exits = k === 'tower' ? [[-2, CZ - 23], [2, CZ - 23], [0, CZ - 25]] : k === 'ford' ? [[-3.5, CZ - 24], [3.5, CZ - 24], [0, CZ - 26]] : [[-3, CZ - 26], [3, CZ - 27], [0, CZ - 28]];
  live(); setMusic('calm'); if (!m.keep) await ban(3); mstart(); H.objective('w4o_camp'); G.mis.camp = { N, B };
  const left = () => Math.round((all.filter(e => !e.dead).length + reserve) * N / B);
  G.mis.aim = () => { const a = aimOf(all)(); return a; }; G.mis.need = all;
  let lp = ''; G.tick = dt => { const awake = [gA, gB, gC].some(g => g.awake);
    // wave 1 = the posted camp; when it is nearly beaten: 5 s pause, horn, wave 2 (first half of the reserve, in batches of <= 5 while fewer than 12 are up); the same again for wave 3 with the next unit types
    if (awake && reserve > 0) { const up = upN(), left = wave === 2 ? reserve - R3 : wave === 3 ? reserve : 0;
      if (wave === 1 && up <= 3) { wave = 1.5; pause = 5; hintRaw('⛺ ' + t('w4_camp_out')); }
      else if (wave === 2 && left <= 0 && up <= 3) { wave = 2.5; pause = 5; }
      else if (wave === 1.5 || wave === 2.5) { pause -= dt; if (pause <= 0) { wave += .5; waveT = 0; } }
      else if (left > 0) { waveT -= dt; if (up < 12 && waveT <= 0) { waveT = 5; const n = Math.min(5, left), wp = wpool(wave); reserve -= n;
          for (let i = 0; i < n; i++) { const [x, z] = exits[i % exits.length]; const e = sp(TY(wp[(i + reserve) % wp.length]), x + rnd(-1, 1), z + rnd(-1, 1)); e.state = 'chase'; e.farT = 0; e.rot = 0; cbuff(e); all.push(e); } try { Sfx.horn(); } catch (er) { } } } }
    const wn = wv(); if (wn !== wLast) { wLast = wn; hintRaw('⛺ ' + t('w4_wave', { n: wn, m: 3 })); try { Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } } const s = '⛺ ' + t('w4_wave', { n: wn, m: 3 }) + ' · ' + t('w4_hud_camp', { n: left(), m: N }) + (capt.dead ? '' : '   🎯 ' + t('mb_cap')); if (s !== lp) { lp = s; $('obj').textContent = s; } };
  await until(() => (reserve <= 0 && all.every(e => e.dead)) || G.mis.force); if (G.mis.force) for (const e of all) if (!e.dead) e.die();
  G.tick = null; G.mis.aim = null; G.mis.need = null; setMusic('off'); addGold(60 + 30 * c, G.player.x, G.player.z); if (m.keep) m.keep(); await H.bannerShow('', '⛺ ' + t('w4_camp_win'), '', 1.8); await H.victory(); return win(); }
for (const m of MLIST) if (m.camp) RUN[m.id] = () => campRun(m);

// ======================================================================
// WAVE4 SHOWCASE SIEGE — "Qashal qamalı" (6-Q, after 6-1). Our two catapult carts bombard the city wall; three waves:
// 1) the sortie in front of the wall, 2) a flank attack from the steppe + the archers on the wall (shot down with ⚔ = bow volley),
// then the catapults breach the gate, 3) the garrison behind the gate and two points held by captains; the lord of the fortress fights alone at the end.
// ======================================================================
{ const i61 = MLIST.findIndex(m => m.id === '6-1'); if (i61 >= 0) MLIST.splice(i61 + 1, 0, { id: '6-Q', c: 6, ty: 'siege', n: 'w4_n_siege', o: 'w4o_siege', s: ['win', 'most', 'all'], siege: 1 }); }
TYICON.siege = '🏰';
T.w4wa = { ...T.archer, like: T.archer.like || 'archer', mdl: T.archer.mdl || 'archer' };   // archer on the wall: own type = no kit moves, never walks
const SGZ = -64;
function siegeBuild() { const WZ = SGZ; w4Ground(14, -170, 'ground1'); w4Wall(-30, 30, 13, 3, 1.6); w4Wall(-30, -3.5, WZ, 3.2, 1.6); w4Wall(3.5, 30, WZ, 3.2, 1.6);   /* 4.8 m: a taller wall hid the whole fight from the camera at its foot */
  for (const s of [-1, 1]) { try { w4Banner(s * 5, WZ + 1.6, 0x1a1a1a); } catch (e) { } w4House(s * 17, WZ - 22, 7, 8, 4); w4House(s * 17.5, WZ - 44, 7, 7, 4); w4House(s * 17, WZ - 62, 7, 8, 4); }
  w4Yurt(-15, -4, false, true); w4Yurt(15.5, -8, false, true); for (const s of [-1, 1]) { try { w4Banner(s * 9.6, -14, 0x2f6fd0); } catch (e) { } }
  w4Wall(-30, 30, -158, 6, 1.6); }
function wallArcher(x, z, y) { const e = sp('w4wa', x, z); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); e.y = y; e.px = x; e.pz = z; e.cdw = rnd(2.5, 5); e.farT = -1e9; e.speed = 0; e.rot = 0; e.w4wall = 1;
  e.custom = (e, dt) => { e.x = e.px; e.z = e.pz; e.y = y; e.kx = e.kz = 0; const P = G.player; if (!P || P.dead || G.flying || !G.mis.started) { e.play('Idle'); return true; }
    const d = hyp(P.x - e.x, P.z - e.z); if (d > 34 || P.z < e.z - 2) { e.play('Idle'); return true; } e.rot = Math.atan2(P.x - e.x, P.z - e.z); e.cdw -= dt;
    if (e.cdw <= 0) { e.cdw = rnd(3.4, 4.8); e.play('1H_Ranged_Shoot', { once: true, force: true }); w4Shoot(e, { x: P.x + rnd(-1.3, 1.3), z: P.z + rnd(-1.3, 1.3) }, rnd(e.d.dmg[0], e.d.dmg[1]) * (e.dmgMul || 1)); e.shT = .7; }
    else if ((e.shT = (e.shT || 0) - dt) <= 0) e.play('Idle_Combat'); return true; }; return e; }
async function siegeRun(m) { const c = 6, WZ = SGZ, W4 = window.__W4;
  const p = await gu(c, H.moods.DAY, siegeBuild, [], 3, c - 1, 5); G.curCh = c - 1;
  const gt = H.gateDoor(0, WZ); flyPt(0, WZ, 'e_gate');
  const cats = W4 && W4.catProp ? [W4.catProp(-7.6, -20), W4.catProp(7.6, -23)] : [];
  const wa = [-9.6, -6.3, 6.3, 9.6].map(x => wallArcher(x, WZ, 4.8));
  const pool = w4Pool(c).filter(q => q !== 'manj' && q !== 'cav'), pick = i => pool[i % pool.length];
  const L1 = []; for (let i = 0; i < 8; i++) L1.push([pick(i), (i % 4 - 1.5) * 2.5, WZ + 9 + (i > 3 ? 2.6 : 0), i % 2 ? 'p' : 'g', 1.4]);
  const g1 = post(L1, { label: 'e_horde', wake: 15, noExtra: true });
  const L3 = []; for (let i = 0; i < 6; i++) L3.push([pick(i + 1), (i % 3 - 1) * 2.4, WZ - 7 - (i > 2 ? 2.4 : 0)]);
  const g3 = post(L3, { wake: 0, noExtra: true, nofly: true, noPass: true });
  const pts = [[-5.5, WZ - 26], [5.5, WZ - 48]].map(([x, z], i) => { const L = []; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + .4; L.push([pick(k + i), x + Math.cos(a) * 2.8, z + Math.sin(a) * 2.8]); }
    const g = post(L, { label: 'mb_cap', wake: 11, noExtra: true }); const cap = leader(g, x, z, 'mb_cap'); const mk = marker(x, z, 0xff4030, 3.4); try { w4Banner(x + (i ? 2.6 : -2.6), z - 2.4, 0x1a1a1a); } catch (e) { } return { g, cap, mk, x, z, done: false }; });
  const BO = { x: 0, z: WZ - 74, R: 8, type: TY('heavy'), hp: 4200, dmg: 1.45, scale: 1.22, name: 'w4_qbek', title: 'w4_qbek_t', crowd: [['askar', 4], ['archer', 2]], after: 'flee' }; BO.arena = arena(BO);
  live(); setMusic('battle'); await ban(3); mstart(); H.objective('w4o_siege'); hintRaw('🏰 ' + t('w4_sg_cat'));
  let ph = 1, lobT = 1.5, side = 0, lp = '', w2 = [], ptsN = 0; const up = L => L.filter(e => !e.dead), hud = s => { if (s !== lp) { lp = s; $('obj').textContent = s; } };
  const lobAt = (x, z, o) => { const cg = cats[side++ % Math.max(1, cats.length)]; if (!cg || !W4) { if (o.cb) o.cb(); return; } cg.fire(); W4.lob(cg.x, cg.z, x, z, o); };
  G.mis.aim = () => ph === 1 ? near(up(g1.es)) : ph === 2 ? (near(up(w2)) || near(up(wa)) || { x: 0, z: WZ + 12 }) : ph === 3 ? { x: 0, z: WZ + 9 } : ph === 4 ? (near(up(g3.es)) || near(pts.filter(q => !q.done).map(q => q.cap)) || null) : null;
  G.tick = dt => { lobT -= dt;
    if (lobT <= 0 && ph <= 3) { if (ph === 3) { lobT = 2.4; lobAt(rnd(-1.2, 1.2), WZ + .9, { team: 'ally', R: 2.6, dmg: 60, cb: () => { if (!gt.dead) { gt.hit('slam'); gt.hit('slam'); G.shake = Math.max(G.shake || 0, .3); } } }); }
      else { lobT = rnd(3, 4.2); const x = rnd(-10.5, 10.5); lobAt(x, WZ + rnd(-.2, .4), { team: 'ally', R: 2.3, dmg: 40, tele: false, y1: 4.2, cb: () => { burst(x, 4.6, WZ + .6, 0x9a8a70, 2.2, true); } }); } }
    const w = '🏰 ' + t('w4_wave', { n: Math.min(3, ph === 4 ? 3 : ph === 3 ? 2 : ph), m: 3 }) + ' — ';
    hud(ph === 1 ? w + t('w4_sg_left', { n: up(g1.es).length * 3 }) : ph === 2 ? w + t('w4_sg_hud1', { n: up(wa).length }) + ' · ' + t('w4_sg_left', { n: up(w2).length * 3 }) : ph === 3 ? w + t('w4_sg_gate') : ph === 4 ? w + t('w4_sg_pts', { n: ptsN, m: pts.length }) : lp);
    if (ph === 4) for (const q of pts) if (!q.done && q.cap.dead) { q.done = true; ptsN++; try { q.mk.remove(); marker(q.x, q.z, 0x40c060, 3.4); } catch (e) { } hintRaw('🚩 ' + t('w4_sg_pt', { n: ptsN, m: pts.length })); H.setCP(q.x, q.z + 4); try { Sfx.pick(); } catch (e) { } } };
  const F = () => G.mis.force;
  // wave 1: the sortie in front of the wall
  await until(() => !up(g1.es).length || F()); if (F()) for (const e of g1.es) if (!e.dead) e.die(); cp();
  // wave 2: flank attack from the steppe behind us + the archers on the wall
  ph = 2; try { Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } await H.bannerShow('', '🏰 ' + t('w4_wave', { n: 2, m: 3 }), t('w4_sg_arch'), 2.2); hintRaw('🏹 ' + t('w4_sg_arch'));
  { const L = []; for (let i = 0; i < 8; i++) L.push([pick(i + 2), (i % 2 ? 1 : -1) * (5 + (i >> 1) * 1.5), Math.min(9, G.player.z + 20 + (i >> 1) * 1.6)]); w2 = rein(L, 'sa', null); for (const e of w2) { e.state = 'chase'; e.farT = 0; } }
  await until(() => (!up(w2).length && !up(wa).length) || F()); if (F()) for (const e of [...w2, ...wa]) if (!e.dead) e.die(); cp();
  // the catapults breach the gate
  ph = 3; lobT = .6; hintRaw('🏰 ' + t('w4_sg_gate')); await until(() => gt.dead || F()); if (!gt.dead) gt.shatter(); Sfx.big(); flash(.3);
  await H.bannerShow('', '🏰 ' + t('w4_sg_breach'), t('w4_wave', { n: 3, m: 3 }), 2); H.setCP(0, WZ + 6);
  // wave 3: the garrison behind the gate, then the two points
  ph = 4; try { Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } g3.wakeR = 16; wake(g3); for (const q of pts) q.g.wakeR = 12;
  await until(() => (pts.every(q => q.done) && !up(g3.es).length && pts.every(q => !up(q.g.es).length)) || F()); if (F()) for (const g of [g3, ...pts.map(q => q.g)]) for (const e of g.es) if (!e.dead) e.die();
  ph = 5; G.tick = null; G.mis.aim = null; cp();
  // the lord of the fortress, one on one
  await duel(BO);
  setMusic('off'); addGold(240, G.player.x, G.player.z); await H.bannerShow('', '🏰 ' + t('w4_sg_win'), '', 2); await H.victory(); return win(); }
RUN['6-Q'] = () => siegeRun(MLIST.find(m => m.id === '6-Q'));
// missions audit: the chapter-3 intro (lore3 + c3 + nar7) played in 3-2 — it belongs to the chapter's first mission 3-1
{ const r31 = RUN['3-1'], r32 = RUN['3-2'];
  RUN['3-1'] = async () => { await H.chapterIntro(3, 'nar7', 'ruins'); return r31(); };
  RUN['3-2'] = async () => { const ci = H.chapterIntro; H.chapterIntro = async () => { H.chapterIntro = ci; await H.fadeTo(true); }; try { return await r32(); } finally { H.chapterIntro = ci; } }; }

// 4-2 (missions audit): the plank square becomes a docked war boat — bulwarks with shields, pointed bow, mast and sail, gangplank, sea around it
function w4Boat(x, z) { const g = new THREE.Group(), wd = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: .9 }), dk2 = new THREE.MeshStandardMaterial({ color: 0x33200f, roughness: 1 });
  const box = (w, h, d, px, py, pz, ry = 0, m = wd) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  for (const s of [-1, 1]) { box(.35, 1.1, 16.4, s * 8.1, .6, 0); box(.5, .22, 16.6, s * 8.1, 1.2, 0, 0, dk2); box(.35, 1.3, 10.4, s * 4, .7, -11.3, s * .881); box(5.4, 1.1, .35, s * 5.4, .6, 8.1);
    for (let k = -3; k <= 3; k++) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .12, 12), new THREE.MeshStandardMaterial({ color: k % 2 ? 0x8a1c14 : 0xc8a040, roughness: .7 })); sh.rotation.z = Math.PI / 2; sh.position.set(s * 8.34, .75, k * 2.2); g.add(sh); } }
  box(2.6, .14, 4.6, 0, .14, 10.2, 0, new THREE.MeshStandardMaterial({ color: 0x6a4a28, roughness: .9 })); box(.4, 2.8, .4, 0, 1.6, -14.5);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, 10.5, 8), wd); mast.position.set(0, 5.25, -8.6); mast.castShadow = true; g.add(mast); box(7.6, .18, .18, 0, 9.2, -8.6);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(7, 5.2), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 1, side: THREE.DoubleSide })); sail.position.set(0, 6.5, -8.55); sail.castShadow = true; g.add(sail);
  g.position.set(x, 0, z); world.add(g); G.colC.push({ x, z: z - 8.6, r: .5 });
  { const M = G.mis, iv = setInterval(() => { try { if (G.mis !== M) { clearInterval(iv); Sfx.surface && Sfx.surface(null); return; } const P = G.player; Sfx.surface && Sfx.surface(P && Math.abs(P.x - x) < 8.2 && Math.abs(P.z - z) < 8.2 ? 'wood' : null); } catch (e) { } }, 400); }   /* audio: wooden steps on the deck */
  try { w4Water(x, z - 27, 90, 30); for (const s of [-1, 1]) w4Water(x + s * 25, z - 2, 30, 22); } catch (e) { } }
// STORY (author): "Endi Gúlayım bolıp oynaysız" belongs to the start of chapter 1 (after the messenger's tale), not to the end of the tutorial
{ const r11 = RUN['1-1']; RUN['1-1'] = async () => { const M = G.mis, iv = setInterval(() => { try { if (G.mis !== M) { clearInterval(iv); return; } if (M.started && !G.paused && !G.flying) { clearInterval(iv); setTimeout(() => { try { if (G.mis === M) hintRaw('⚔ ' + t('tu3_next')); } catch (e) { } }, 1500); } } catch (e) { clearInterval(iv); } }, 500); return r11(); }; }
