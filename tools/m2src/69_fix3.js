// ======================================================================
// FIX3 (author's 2nd phone play-test, Nov 20): ride sections without any combat, the 2-3 caravan reworked (FX.convoyCart, 4 announced ambushes),
// boss fights strictly one-on-one, 3-3 bridge reworked (freed captives run across the bridge, the objective is done when they are freed),
// enemy budget per mission (sp()/rein() stop at F3_CAP).
// ======================================================================
import * as F3X from './fx.js?v=1795179205';
import { ground as f3Ground, wall as f3Wall } from './engine.js?v=1795179205';
import * as f3SC from './scenery.js?v=1795179205';
const f3cl = (v, a, b) => Math.max(a, Math.min(b, v));
// ---------- big side alert: where the attack comes from ----------
let f3SideEl = null, f3SideT = 0;
function sideAlert(side, txt, dur = 4.5) {
  if (!f3SideEl) { const s = document.createElement('style'); s.textContent = '@keyframes f3p{0%{opacity:.75;scale:1}100%{opacity:1;scale:1.08}}#f3side{position:absolute;z-index:7;pointer-events:none;display:none;font:900 19px/1.1 system-ui,sans-serif;color:#fff;text-shadow:0 2px 4px #000;padding:9px 16px;border-radius:14px;background:rgba(170,30,15,.8);border:2px solid #ffd27a;white-space:nowrap;animation:f3p .5s ease-in-out infinite alternate}#f3side b{font-size:30px;vertical-align:middle;margin:0 6px}';
    document.head.appendChild(s); f3SideEl = document.createElement('div'); f3SideEl.id = 'f3side'; ($('hud') || document.body).appendChild(f3SideEl); }
  const el = f3SideEl, P0 = { left: ['10px', '', '42%', '', ''], right: ['', '10px', '42%', '', ''], back: ['50%', '', '', '96px', 'translateX(-50%)'], front: ['50%', '', '96px', '', 'translateX(-50%)'] }[side] || ['50%', '', '96px', '', 'translateX(-50%)'];
  el.style.left = P0[0]; el.style.right = P0[1]; el.style.top = P0[2]; el.style.bottom = P0[3]; el.style.transform = P0[4];
  const ar = { left: '◀', right: '▶', back: '▼', front: '▲' }[side] || '!';
  el.innerHTML = side === 'right' ? txt + '<b>' + ar + '</b>' : '<b>' + ar + '</b>' + txt; el.style.display = 'block'; clearTimeout(f3SideT); f3SideT = setTimeout(() => { el.style.display = 'none'; }, dur * 1000); }
function sideOff() { if (f3SideEl) f3SideEl.style.display = 'none'; clearTimeout(f3SideT); }

// ---------- boss fights: one-on-one. Anyone else on the enemy side leaves the field, summoned adds never arrive ----------
function leaveAI(e, dt) { const P = G.player; e.farT = -1e9; e.lt = (e.lt || 0) + dt; const sx = Math.sign(e.x || 1) || 1; e.x += sx * 4.5 * dt; e.z += (P && e.z > P.z ? 2.5 : -2.5) * dt; e.face(sx, 0, dt * 6); e.play('Running_A');
  if (e.lt > 2.6 || Math.abs(e.x) > G.W - .6) { burst(e.x, .6, e.z, 0xc8a070, 1.6, true); e.dead = true; e.gone = true; try { e.remove(); } catch (er) { e.o.visible = false; } } return true; }
let f3L = 0;
function soloTick() { const now = performance.now() / 1000, dt = Math.min(.1, now - f3L); f3L = now; if (!G.paused && !G.flying) for (const e of G.ents) if (e.f3left && !e.dead) leaveAI(e, dt * (G.ts || 1));   // npc units get no AI call from the engine: drive them here
  const M = G.mis, b = G.boss; if (M && M.soloB && (!b || b.dead || b !== M.soloB) && !M.soloOff) { M.soloOff = true; try { $('obj').textContent = '✓ ' + t(M.m.n); } catch (e) { } }   /* QA: "Duel: …" no longer stays after the boss falls */
  if (!M || !M.m || !M.m.boss || !b || b.dead || G.paused || G.flying || !M.started) return;
  if (M.soloB !== b) { M.soloB = b; M.soloOff = false; try { $('obj').textContent = '⚔ ' + t('duelO', { n: t(b.d.name) }); } catch (e) { } }
  /* soldiers: the engine's boss-duel watcher ring (combat agent) makes everyone else stand back and watch — nothing to do here */ }
(function f3loop() { requestAnimationFrame(f3loop); try { soloTick(); } catch (e) { } })();

// ---------- RIDE sections: pure riding — catch up with riders (no fighting: ride up beside one and he drops his captive), golden rings, rocks to steer round ----------
function f3Ring(x, z) { const g = new THREE.Group(); const tor = new THREE.Mesh(new THREE.TorusGeometry(2.1, .14, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: .9 })); tor.position.y = 2.7; g.add(tor);
  const glow = new THREE.Mesh(new THREE.TorusGeometry(2.1, .36, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.y = 2.7; g.add(glow);
  const wm = new THREE.MeshStandardMaterial({ color: 0x6b4524, roughness: .9 }); for (const s of [-1, 1]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 4.8, 6), wm); po.position.set(s * 2.25, 2.4, 0); po.castShadow = true; g.add(po); }
  g.position.set(x, 0, z); world.add(g); return { g, tor, glow, x, z, done: false }; }
function fleeTick(e, dt, g) { const P = G.player; e.farT = -1e9; e.state = 'chase';
  if (e.caught) { e.lt = (e.lt || 0) + dt; const sx = e.sx; e.x += sx * 6 * dt; e.z -= 2.5 * dt; e.rot = Math.atan2(sx, -.5); e.spd = 6.5; e.play('Idle_Combat');
    if (e.lt > 1.6 || Math.abs(e.x) > G.W - .4) { burst(e.x, .8, e.z, 0xc8a070, 2, true); e.dead = true; e.gone = true; try { e.remove(); } catch (er) { e.o.visible = false; } } return true; }
  if (G.freeze || !G.mis.started || !e.go) { e.spd = 0; e.play('Idle'); return true; }
  const ahead = P ? P.z - e.z : 10; const v = e.v0 * (ahead > 22 ? .7 : ahead < 7 ? 1.08 : 1) * FAST();
  e.z -= v * dt; e.x = f3cl(e.x + Math.sin(G.time * .75 + e.seed) * dt * 2.4, -G.W + 1.6, G.W - 1.6); e.rot = Math.PI; e.spd = v; e.play('Idle_Combat');
  if (Math.random() < .25) burst(e.x + rnd(-.4, .4), .2, e.z + .9, 0xc8a070, 1, true);
  if (P && !P.dead && hyp(P.x - e.x, P.z - e.z) < 4.3) { e.ct = (e.ct || 0) + dt; if (e.ct > .2) { e.caught = true; e.sx = e.x > P.x ? 1 : -1; Sfx.pick(); burst(e.x, 1.6, e.z, 0xffe0a0, 2.2); ringFx(e.x, e.z, 2.6, 0xffd060); hintRaw(t('f3_caught'));
      g.freed = true; g.el.style.display = 'none'; for (const c of g.ps) if (!c.dead) { c.saved = true; c.st = 'safe'; c.y = 0; c.x = f3cl(e.x - e.sx * 1.6, -G.W + 1, G.W - 1); c.z = e.z + 1; c.rot = 0; c.play('Cheer', { force: true }); } addGold(20, e.x, e.z); } } else e.ct = 0;
  if (e.z < -199 - f3D) { e.escaped = true; e.dead = true; e.gone = true; try { e.remove(); } catch (er) { e.o.visible = false; } hintRaw(t('f3_esc')); } return true; }
// o = { riders: [[x, z, v]], rings: [[x, z]], rocks: [[x, z, s]], T: seconds (timer star), hint }
let f3D = 0;   // wave4: extra ride length (the 200 m level gave 15-25 s rides; the author wants 60-90 s)
async function rideRun(o) { const R = { rings: [], riders: [] }; f3D = Math.max(0, (o.len || 200) - 200);
  await H.fadeTo(true);
  await H.chapterStart(o.mood, () => { f3Ground(14, -215 - f3D, 'ground1'); f3Wall(-30, 30, 13, 2.2, 1.2, false); f3Wall(-30, 30, -210 - f3D, 4, 1.6); fire(-10.4, -60, 1); fire(10.4, -140, 1); f3SC.ride(G.curCh);
    for (let z = -206; z > -206 - f3D; z -= 13) for (const sd of [-1, 1]) { if (o.shore && sd > 0) continue; try { place(world, 'boulder_01', sd * (G.W + 2.5 + rnd(0, 5)), z + rnd(-4, 4), rnd(1.1, 2.4)); } catch (e) { } }
    if (o.build) o.build(); }, ['gulayim']);
  const p = H.heroSetup('gulayim', 0, 3, G.curCh || 1); for (let i = 0; i < 4; i++) spawn('qiz', (i % 2 ? 1 : -1) * (2.2 + (i >> 1) * 1.8), 7 + (i >> 1) * 2.2);
  H.setHero('gu'); toggleMount(p, true); for (const m of G.ents) if (m.type === 'qiz') toggleMount(m, true);
  p.horseHp = p.horseMax = 1e9; const sp0 = p.speed; p.speed = sp0 * .62; G.mis.safe = { x: 0, z: 5 }; G.mis.noResHud = false;
  R.rings = (o.rings || []).map(([x, z]) => f3Ring(x, z));
  for (const [x, z, s] of o.rocks || []) { try { place(world, 'boulder_01', x, z, s); } catch (e) { } G.colC.push({ x, z, r: s * .8 }); }
  R.riders = (o.riders || []).map(([x, z, v, wt]) => { const f = spawn('askar', x, z, 'npc', true); f.spawnT = 0; f.o.scale.setScalar(f.vs || f.d.scale || 1); toggleMount(f, true); f.rot = Math.PI; f.d = { ...f.d, name: '' }; f.seed = rnd(0, 9); f.v0 = v; f.wait = !!wt; f.farT = -1e9;
    const g = people([['asir', x, z + .8]], { kind: 'ride', guards: [f], auto: true, T: 999, label: 'r_drag' }); f.g3 = g; return f; });   // team npc: driven from G.tick below
  const mk = marker(0, -193 - f3D, 0x66ff88, 2.2); live(); setMusic('calm'); await ban(3); mstart(); for (const f of R.riders) if (!f.wait) f.go = true;
  setMusic('battle'); H.hint('', 7, t(o.hint || 'f3_h_ride'));
  const tm = $('timer'); let T0 = o.T || 0, late = false; if (T0) tm.style.display = 'block';
  const ringNext = () => R.rings.find(r => !r.done && r.z < G.player.z + 1.5);
  G.mis.aim = () => { const P = G.player; const f = R.riders.filter(f => !f.caught && !f.dead).sort((a, b) => hyp(a.x - P.x, a.z - P.z) - hyp(b.x - P.x, b.z - P.z))[0]; if (f) return f; const r = ringNext(); if (r) return { x: r.x, z: r.z }; return { x: 0, z: -193 - f3D }; };
  let lp = ''; const prog = () => { const n = R.riders.length, k = R.riders.filter(f => f.caught).length, rn = R.rings.filter(r => r.done).length; const s = '🐎 ' + t(o.obj) + (n ? '   ⛓ ' + k + '/' + n : '') + (R.rings.length ? '   ◯ ' + rn + '/' + R.rings.length : ''); if (s !== lp) { lp = s; $('obj').textContent = s; } };
  G.tick = dt => { const P = G.player; if (!P) return; prog(); if (!R.cpd && (R.riders.filter(f => f.caught).length >= 2 || (R.rings.length && R.rings.filter(r => r.done).length >= Math.ceil(R.rings.length / 2)))) { R.cpd = 1; cp(); }   /* bench #14: mid-ride checkpoint after the 2nd objective */ for (const f of R.riders) if (!f.dead) { if (!f.go && f.wait && P.z - f.z < 30) f.go = true; fleeTick(f, dt, f.g3); if (o.xMax !== undefined && !f.caught && f.x > o.xMax) f.x = o.xMax; }
    for (const r of R.rings) { if (r.done) continue; const on = r === ringNext(); r.tor.material.opacity = on ? .95 : .5; r.glow.material.opacity = on ? .3 + Math.sin(G.time * 6) * .15 : .06;
      if (hyp(P.x - r.x, P.z - r.z) < 2.3) { r.done = true; Sfx.pick(); burst(r.x, 2.6, r.z, 0xffd060, 2.2); ringFx(r.x, r.z, 2.4, 0xffd060); r.tor.material.color.set(0x7fe08a); r.glow.material.opacity = 0; addGold(5, r.x, r.z); } }
    if (T0 > 0) { T0 -= dt * FAST(); tm.textContent = '⏳ ' + Math.max(0, Math.ceil(T0)); if (T0 <= 0) { late = true; hintRaw(t('f3_late')); tm.style.display = 'none'; } } };
  await until(() => (G.player.z < -189 - f3D && R.riders.every(f => f.caught || f.escaped)) || G.mis.force); mk.remove();
  G.tick = null; G.mis.aim = null; tm.style.display = 'none'; G.mis.flag = !!(o.T ? !late : R.riders.every(f => f.caught)); G.mis.flag2 = R.rings.every(r => r.done);
  setMusic('off'); await wait(.6); for (const m of G.ents) if (m.mounted) toggleMount(m, false); p.speed = sp0;
  const ok = R.riders.every(f => f.caught); await H.bannerShow('', R.riders.length ? t(ok ? 'rideWin' : 'rideMiss') : t('f3_ride_end'), '', 2.2); if (ok || !R.riders.length) addGold(80, p.x, p.z); return ok; }
const RL = [[-5, -34], [5, -58], [-4, -84], [4.5, -110], [-5, -136], [3, -162]];
const RK = [[2.5, -46, 1.6], [-6.5, -72, 1.8], [6.8, -96, 1.7], [-1.5, -122, 1.6], [7, -150, 1.8], [-6, -175, 1.6]];
const f3Zig = (z0, z1, step, xs) => { const L = []; let k = 0; for (let z = z0; z > z1; z -= step, k++) L.push([xs[k % xs.length], z]); return L; };
RUN['2-1'] = async () => { const { HOT } = H.moods; await H.chapterIntro(2, 'nar6', 'ruins'); G.curCh = 1;
  // 440 m steppe chase (~65 s): three riders at once, then two more who bolt when she comes near
  await rideRun({ mood: HOT, obj: 'f3o_2_1', len: 440, riders: [[-3, -22, 5.7], [4, -32, 5.6], [-1, -42, 5.5], [3.5, -170, 6.0, 1], [-4, -275, 6.1, 1]],
    rings: f3Zig(-34, -415, 32, [-5, 5, -4, 4.5, -5, 3]), rocks: f3Zig(-46, -420, 27, [2.5, -6.5, 6.8, -1.5, 7, -6]).map(([x, z], i) => [x, z, 1.6 + (i % 3) * .1]) }); return win(); };
RUN['4-1'] = async () => { const { DAY } = H.moods; await H.chapterIntro(4, 'nar8', 'ruins'); G.curCh = 3;
  // 460 m along the shore (~70 s): the sea closes the right side of the road, driftwood and crates instead of rocks, two pairs of riders driving captives to the boats at the far end
  const SX = 5.2; await rideRun({ mood: DAY, obj: 'f3o_4_1', len: 460, shore: true, xMax: SX,
    build: () => { try { w4Water((SX + 34) / 2 + 1.2, -225, 34 - SX, 480); } catch (e) { } G.colB.push({ x1: SX + 1.6, x2: 40, z1: -480, z2: 14 });
      for (let z = -30; z > -440; z -= 41) { try { w4Crate(SX - .4 + rnd(-.5, .3), z + rnd(-5, 5)); } catch (e) { } }
      for (const [x, z, r] of [[SX + 4.5, -438, .5], [SX + 5, -449, -.3]]) { try { decor('R_arava', x, z, r); } catch (e) { } } },
    riders: [[-6, -24, 5.8], [1, -30, 5.6], [-3, -205, 6.1, 1], [2.5, -212, 6.0, 1]],
    rings: f3Zig(-40, -430, 36, [-7, 1.5, -4, 3, -8, 0]), rocks: f3Zig(-52, -430, 31, [-2, -8.5, 2.5, -5.5, 0.5, -9]).map(([x, z], i) => [x, z, 1.3 + (i % 2) * .3]) }); return win(); };
RUN['7-1'] = async () => { const { DUSK } = H.moods; await H.chapterIntro(7, 'nar11', 'ruins'); G.curCh = 6;
  // 420 m gallop to the enemy camp (~60 s, no fighting on horseback), then everybody dismounts and the chapter's big battle is fought on foot: 150 soldiers in three waves and their captain
  await rideRun({ mood: DUSK, obj: 'f3o_7_1', hint: 'f3_h_ride7', T: 90, len: 420, rings: f3Zig(-28, -400, 27, [-4.5, 4.5, -5, 4, -4, 5, -3, 2]), rocks: f3Zig(-40, -400, 29, [2.5, -6.5, 6.8, -1.5, 7, -6]).map(([x, z]) => [x, z, 1.7]) });
  const fl = G.mis.flag, fl2 = G.mis.flag2; await H.bannerShow('', '⚔ ' + t('w4_dismount'), '', 1.8);
  G.mis.w4foot = true; const r = campRun({ id: '7-1', c: 7, n: 'mn_7_1', camp: { k: 'yurt', n: 150 }, keep: () => { G.mis.flag = fl; G.mis.flag2 = fl2; } }); return r; };

// ---------- 2-3 the caravan to the well: carts roll forward at walking pace, stop only while attackers are close; 4 announced ambushes, each finite ----------
RUN['2-3'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], [], -13, 1, 3); trailMesh(12, -184);
  const Z0 = -6, LEN = 164, at = s => { const z = Z0 - s; return { x: TR(z), z }; };
  const cv = { s: 0, v: 0, sp: 3.1, pool: 1000, max: 1000, everFailed: false, hitT: 0, x: TR(Z0), z: Z0, carts: [], mem: [], amb: null }; G.mis.cv = cv; G.mis.esc = null;
  for (const [coat, back] of [['bay', 0], ['dun', 8.5]]) { const c = F3X.convoyCart({ coat, scale: 2.1, driver: true, load: true, path: s => at(s - back), speed: 0 }); if (!c) continue; c.auto = false; c.back = back;   // driven from G.tick with game time (fx.js ticks on render only)
    c.cols = [{ x: 0, z: 0, r: 1.5 }, { x: 0, z: 0, r: 1.1 }]; for (const q of c.cols) G.colC.push(q); cv.carts.push(c); }
  const hurt = e => { e.damage = (amt) => { if (G.mis.force) return 0; amt = Math.max(1, Math.round(Math.min(amt, 28) * .4 * ([.6, 1, 1.3][SET.diff] ?? 1))); cv.pool = Math.max(1, cv.pool - amt); cv.hitT = .5; if (cv.pool < cv.max * .25) cv.everFailed = true; num(e, '-' + amt, 'p'); e.flash = .12; if (e.curName !== 'Hit_A') e.play('Hit_A', { once: true, force: true }); return amt; }; e.hp = e.maxHp = 1e9; };
  WALK.slice(0, 6).forEach(([ty, gait], i) => { const side = i % 2 ? 1 : -1, back = 3 + (i >> 1) * 3.2, lat = side * (2.4 + (i % 3) * .5); const q = at(-back); const e = spawn(ty, q.x + lat, q.z, 'ally'); e.d = { ...e.d, follow: false, name: '' }; hurt(e); e.gait = gait; e.back = back; e.lat = lat; e.seed = rnd(0, 9); e.rot = Math.PI;
    e.custom = (e, dt) => { const q = at(cv.s - e.back), tx = q.x + e.lat + Math.sin(G.time * .31 + e.seed) * .35, tz = q.z + Math.sin(G.time * .23 + e.seed * 2) * .4; const dx = tx - e.x, dz = tz - e.z, l = hyp(dx, dz); e.farT = -1e9;
      if (l > (e.mv ? .2 : .7)) { e.mv = 1; const v = Math.min(4.2 * e.gait, l * 2.2); e.x += dx / l * v * dt; e.z += dz / l * v * dt; e.face(dx, dz, dt * 7); e.play(v > 3 ? 'Running_A' : 'Walking_A', { ts: Math.max(.55, v / 1.7) }); }
      else { e.mv = 0; e.play(cv.amb ? (e.seed > 4.5 ? 'Sit_Floor_Idle' : 'Idle') : 'Idle'); if (cv.v > .3) e.face(0, -1, dt * 4); } return true; }; cv.mem.push(e); });
  p.x = cv.x + 4; p.z = Z0 - 4; H.setCP(p.x, p.z); for (const e of G.ents) if (e.type === 'qiz') { e.x = cv.x + (e.x > 0 ? 4.5 : -4); }
  // ambushes: [s on the route, side, wave (dx, dz relative to the lead cart), bark]
  const AMB = [
    { s: 20, side: 'left', key: 'f3_amb_l', w: [['askar', -11, -5], ['askar', -11, 0], ['askar', -11, 4], ['askar', -10.5, -9]] },
    { s: 56, side: 'right', key: 'f3_amb_r', w: [['archer', 10.8, -8], ['archer', 10.8, -2], ['askar', 11, -5], ['askar', 11, 2], ['archer', 10.8, 5]] },
    { s: 96, side: 'back', key: 'f3_amb_b', w: [['wolf', -4, 20], ['wolf', 4, 21], ['wolf', -1, 23], ['wolf', 2, 24]] },
    { s: 134, side: 'front', key: 'f3_amb_f', w: [['heavy', 0, -15], ['askar', -4, -14], ['askar', 4, -14], ['askar', -2, -18], ['askar', 2, -18]], cap: true } ];
  chest(-9.6, -96, 80);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'cv_d1'], ['gu', 'cv_d2']]); setMusic('calm'); H.hint('', 6, t('f3_cv_go'));
  let lp = ''; const prog = () => { const s = cv.well ? '🛡 ' + t('w4_well') + ' — ' + t('w4_wave', { n: cv.well, m: 2 }) : cv.amb ? '⚔ ' + t('f3_cv_stop') : '🛒 ' + t('f3o_2_3') + '  ·  ' + t('f3_cv_m', { n: Math.max(0, Math.round(LEN - cv.s)) }); if (s !== lp) { lp = s; H.objective(''); $('obj').textContent = s; } };
  G.mis.aim = () => { if (cv.amb) { const e = near(cv.amb.filter(e => !e.dead)); if (e) return e; } const P = G.player; return hyp(P.x - cv.x, P.z - cv.z) > 14 ? { x: cv.x + 3, z: cv.z } : null; };
  let ai = 0;
  G.tick = dt => { const P = G.player; if (!P) return;
    if (!cv.amb && ai < AMB.length && cv.s >= AMB[ai].s) { const A = AMB[ai++], z0 = cv.z, x0 = cv.x; const es = rein(A.w.map(([ty, dx, dz]) => [ty, f3cl(x0 + dx, -G.W - .5, G.W + .5), z0 + dz]), 'sa', null); cv.amb = es; cv.ambN = ai;
      for (const e of es) { e.f3amb = true; burst(e.x, .6, e.z, 0xd8b070, 2.4); }
      es.slice(0, 2).forEach(e => { if (e.type !== 'archer') e.custom = raidAI(cv.mem); });
      if (A.cap && es[0]) { const c = es[0]; c.maxHp = c.hp = Math.round(c.maxHp * 1.6); try { markHunt(c, 'mb_cap'); } catch (er) { } }
      sideAlert(A.side, t(A.key), 4.5); Sfx.horn(); setMusic('battle'); bark('sa', 'bk_amb'); }
    if (cv.amb && cv.amb.every(e => e.dead)) { cv.amb = null; sideOff(); setMusic('calm'); H.hint('', 4, t('f3_cv_on')); cp(); }
    const lead = at(cv.s), block = !!cv.amb || enemies().some(e => e.custom !== sleepAI && hyp(e.x - lead.x, e.z - lead.z) < 9);
    const want = block || cv.s >= LEN ? 0 : cv.sp * FAST(); cv.v += (want - cv.v) * Math.min(1, dt * 1.6); if (cv.v < .03 && !want) cv.v = 0;
    for (const c of cv.carts) { c.speed = cv.v; c.update(dt); const q = at(c.s - c.back), q2 = at(c.s - c.back + 1), fx = q2.x - q.x, fz = q2.z - q.z, l = hyp(fx, fz) || 1; c.cols[0].x = q.x; c.cols[0].z = q.z; c.cols[1].x = q.x + fx / l * 3; c.cols[1].z = q.z + fz / l * 3; }
    if (cv.carts[0]) cv.s = cv.carts[0].s; else cv.s += cv.v * dt; const q = at(cv.s); cv.x = q.x; cv.z = q.z;
    if ((cv.sndT = (cv.sndT || 0) - dt) <= 0) { cv.sndT = .5; try { Sfx.loop && Sfx.loop('cart', cv.v > .15, { x: cv.x, z: cv.z }); } catch (er) { } }   /* audio: cart loop while it rolls */
    if (cv.hitT > 0) cv.hitT -= dt; else if (!cv.amb && cv.pool < cv.max) cv.pool = Math.min(cv.max, cv.pool + cv.max * .004 * dt); hpBar(cv); prog(); };
  await until(() => (cv.s >= LEN && ai >= AMB.length && !cv.amb) || G.mis.force); if (G.mis.force) for (const e of enemies()) e.die();
  // wave4 / missions audit: the plan's "battle for the well" — once the caravan rests at the well, raiders storm it from both sides at once, twice
  if (!G.mis.force) { const x0 = cv.x, z0 = cv.z; await H.bannerShow('', '🛡 ' + t('w4_well'), t('w4_well2'), 2.2);
    for (let w = 0; w < 2 && !G.mis.force; w++) { const L = []; for (let i = 0; i < 3 + w; i++) { L.push([i % 3 === 2 ? 'archer' : 'askar', -11, z0 - 5 + i * 3]); L.push([i % 3 === 1 ? 'archer' : 'askar', 11, z0 - 4 + i * 3]); }
      const es = rein(L.map(([ty, dx, z]) => [ty, f3cl(x0 + dx, -G.W - .5, G.W + .5), z]), 'sa', w ? null : 'bk_amb'); for (const e of es) { e.f3amb = true; e.state = 'chase'; e.farT = 0; burst(e.x, .6, e.z, 0xd8b070, 2.4); } es.filter(e => e.type !== 'archer').slice(0, 3).forEach(e => { e.custom = raidAI(cv.mem); });
      cv.well = w + 1; sideAlert(w ? 'right' : 'left', t('w4_well_w', { n: w + 1, m: 2 }), 4.5); setMusic('battle'); try { Sfx.loop && Sfx.loop('cart', false); Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } G.mis.aim = aimOf(es);
      await until(() => es.every(e => e.dead) || G.mis.force); sideOff(); cp(); await wait(1.2); } if (G.mis.force) for (const e of enemies()) e.die(); }
  G.tick = null; G.mis.aim = null; sideOff(); try { Sfx.loop && Sfx.loop('cart', false); } catch (er) { } for (const c of cv.carts) c.speed = 0; for (const e of cv.mem) e.custom = e2 => { e2.play('Cheer'); return true; };
  G.mis.flag = !cv.everFailed; setMusic('off'); await wait(.8); await say([['gu', 'cv_d3']]); hpBar(null); await H.victory(); return win(); };

// ---------- 3-3 the bridge: cross, beat the guards — the freed captives RUN back over the bridge (saved at once); then boats land raiders on both banks ----------
function bridgeRun(c, sd) { const W = [{ x: sd * 2, z: -87 }, { x: sd * 1.6, z: -69 }, { x: sd * (G.W - 2 - Math.random() * 1.5), z: -30 + rnd(-2, 2) }]; let i = 0;
  return (e, dt) => { e.farT = -1e9; const w = W[i]; if (!w) { if ((e.ct = (e.ct ?? 0) - dt) <= 0) { e.ct = rnd(1.5, 3); e.play(Math.random() < .5 ? 'Cheer' : 'Idle', { force: true }); } return true; }
    const dx = w.x - e.x, dz = w.z - e.z, l = hyp(dx, dz); if (l < .6) { i++; if (!W[i]) { e.st = 'safe'; e.rot = Math.PI; } return true; }
    const v = (e.type === 'elder' ? 3.8 : 4.8) * FAST(); e.x += dx / l * Math.min(v * dt, l); e.z += dz / l * Math.min(v * dt, l); e.face(dx, dz, dt * 8); e.play('Running_A', { ts: v / 2.6 }); return true; }; }
RUN['3-3'] = async () => { const { DAY } = H.moods;
  const p = await gu(3, DAY, H.B[3], [], -30, 2); G.mis.safe = { x: 0, z: -28 };
  const gG = post([['askar', -2.6, -92, 's'], ['askar', 2.4, -92.6, 's'], ['askar', 5, -96, 'p', 2], ['archer', -5, -99]], { fire: [0, -94], label: 'mb_cap', wake: 12 });
  const cr = people([['asir', -1.4, -99], ['mother', 0, -99.6], ['child', 1.4, -99], ['elder', -.7, -101], ['asir', .9, -101.2]], { kind: 'bound', T: 120, guards: gG, near: 24, label: 'r_bound', face: 0 });
  const cm = post([['archer', 9.4, -55], ['archer', 9.6, -60.5], ['archer', 9.4, -66]], { y: 1.3, label: 'v3c_arch', wake: 0, face: -Math.PI / 2, noHunt: true });
  const boss = cm.es[1]; boss.maxHp = boss.hp = 600; boss.vs *= 1.3; boss.o.scale.setScalar(boss.vs); boss.d = { ...boss.d, name: 'v3c_arch' };
  chest(-9.5, -44, 90);
  setMusic('calm'); await ban(3); mstart(); await say([['gu', 'v3d_33']]); obj(t('f3o_3_3'));
  const mk = marker(0, -88, 0xffd060, 1.8); G.mis.aim = () => (p.z > -86 ? { x: 0, z: -88 } : near(gG.es)); await until(() => p.z < -84 || gG.awake || G.mis.force); mk.remove(); wake(gG); setMusic('battle');
  await clear(gG); await until(() => cr.freed || cr.done || G.mis.force);
  for (const c of cr.ps) if (!c.dead && !c.lostP) { c.saved = true; c.st = 'run'; c.custom = bridgeRun(c, c.x >= 0 ? 1 : -1); } resHud(); cp();
  await wait(1.2); obj('🛡 ' + t('f3_33b')); bark('gu', 'v3b_boat'); sideAlert('back', t('f3_33b'), 4);
  const A = rein([['askar', -9, -91], ['askar', 9, -92], ['wolf', -7, -96], ['askar', 7, -97]]); for (const e of A) burst(e.x, .5, e.z, 0x88aacc, 2.5);
  await until(() => A.filter(e => !e.dead).length <= 1 || G.mis.force);
  const B = rein([['askar', -9.5, -62], ['heavy', 9.5, -63], ['askar', 9.5, -66.5], ['askar', -9.5, -58]]); for (const e of B) burst(e.x, .5, e.z, 0x88aacc, 2.5); wake(cm); bark('gu', 'v3b_arch'); sideAlert('back', t('f3_amb_b'), 3.5);
  G.mis.aim = null; await until(() => enemies().filter(e => e.custom !== sleepAI).length === 0 || G.mis.force); if (G.mis.force) for (const e of enemies()) e.die();
  setMusic('off'); await wait(1); await H.victory(); return win(); };
