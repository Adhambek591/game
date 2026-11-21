// ======================================================================
// RESCUE kit (v3): people in danger — roped and dragged off, trapped in burning yurts/stables, caged, bound for sacrifice.
// Every group has its own visible countdown above it; when it runs out they burn / are carried away. Enemies go for them.
// Freed people run to safety. Stars: 1 = done, 2 = most people (≥60%) saved, 3 = all saved and no maiden lost.
// ======================================================================
// people(list, o): list = [[type, x, z], ...]; o = { kind: 'bound'|'drag'|'fire'|'cage'|'altar'|'wound', T: seconds, guards: post-group or [es],
//   door: breakable, handlers: [es] (drag), exit: {x,z}, safe: {x,z}, raid: n (guards that hunt the people), auto: start the clock at once, near: start radius, label }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const RES_ICON = { walk: '🧍', ride: '⛓', bound: '⛓', drag: '⛓', fire: '🔥', cage: '⛓', altar: '🩸', wound: '✚' };
let resEl = null;
function resHud() { if (!resEl) { resEl = document.createElement('div'); resEl.id = 'rescnt'; resEl.style.cssText = 'position:absolute;left:12px;top:116px;z-index:6;pointer-events:none;font:800 13px/1.2 system-ui,sans-serif;color:#ffe9a8;text-shadow:0 1px 3px #000;background:rgba(0,0,0,.35);padding:3px 8px;border-radius:8px;display:none'; ($('hud') || document.body).appendChild(resEl); }
  const S = resStats(); if (!S.total || !G.mis || G.mis.noResHud) { resEl.style.display = 'none'; return; } resEl.style.display = 'block'; resEl.textContent = '🧍 ' + S.saved + '/' + S.total + (S.lost ? '   ✖ ' + S.lost : ''); }
function resStats() { const L = (G.mis && G.mis.res) || []; let total = 0, saved = 0, lost = 0; for (const g of L) for (const c of g.ps) { total++; if (c.saved) saved++; else if (c.dead || c.lostP) lost++; } return { total, saved, lost }; }
function people(list, o = {}) {
  const g = { ps: [], o, kind: o.kind || 'bound', T: o.T ?? 40, on: false, freed: false, done: false, guards: o.guards ? (o.guards.es || o.guards) : [], hand: o.handlers || [], door: o.door || null, lt: -1, ropes: [] };
  for (const [ty, x, z] of list) { const c = spawn(ty || 'asir', x, z, 'ally', true); c.maxHp = c.hp = o.hp || 260; c.spawnT = 0; c.o.scale.setScalar(c.vs || c.d.scale || 1); c.d = { ...c.d, follow: false, name: '' }; c.vict = g; c.st = 'held'; c.rot = o.face ?? 0; c.seed = rnd(0, 9); c.custom = victimAI; c.r = .45; const d0 = c.damage.bind(c); c.damage = (a, s2, f) => d0((c.st === 'held' || c.st === 'safe') && !(s2 && s2.raider) ? a * .25 : a, s2, f); g.ps.push(c); }
  g.x = g.ps.reduce((s, c) => s + c.x, 0) / g.ps.length; g.z = g.ps.reduce((s, c) => s + c.z, 0) / g.ps.length;
  if (g.kind === 'drag') for (const c of g.ps) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1, 4), new THREE.MeshStandardMaterial({ color: 0x7a5a32, roughness: 1 })); world.add(m); g.ropes.push(m); }
  if (o.raid) { let k = 0; for (const e of g.guards) if (k < o.raid && !e.dead) { const r = raidAI(g.ps.filter(c => c.st === 'held')); if (e.grp) e.next = r; else e.custom = r; k++; } }
  const el = document.createElement('div'); el.style.cssText = 'position:absolute;z-index:5;pointer-events:none;transform:translate(-50%,-100%);font:800 13px/1 system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000,0 0 6px #000;background:rgba(120,20,10,.55);border:1px solid rgba(255,200,120,.6);padding:3px 7px;border-radius:9px;white-space:nowrap;display:none'; ($('hud') || document.body).appendChild(el); g.el = el;
  (G.mis.res = G.mis.res || []).push(g); (G.mis.groups = G.mis.groups || []).push({ es: g.ps, awake: true, o: {}, x: g.x, z: g.z, label: o.label || 'r_' + g.kind });
  return g; }
const V3 = new THREE.Vector3();
function resTick(g, dt) {
  if (g.done || !G.mis.started) return; const P = G.player, o = g.o, alive = g.ps.filter(c => !c.dead && !c.lostP && !c.saved);
  if (!g.on && (o.auto || (P && hyp(P.x - g.x, P.z - g.z) < (o.near || 30)))) { g.on = true; if (o.guardR) g.guards = enemies().filter(e => hyp(e.x - g.x, e.z - g.z) < o.guardR); if (o.onStart) o.onStart(g); }
  if (g.guards.some(e => e.escaped)) { for (const c of alive) { c.lostP = true; c.o.visible = false; c.gone = true; } g.done = true; g.el.style.display = 'none'; return; }
  // freed?
  if (g.kind === 'walk') { g.T = alive.length ? Math.max(...alive.map(c => hyp(c.x - o.safe.x, c.z - o.safe.z))) / (o.speed || 1) : 0; }
  if (g.on && !g.freed && g.kind !== 'walk' && g.guards.every(e => e.dead) && g.hand.every(e => e.dead) && (!g.door || g.door.dead) && (g.kind !== 'wound' || (P && alive.some(c => hyp(P.x - c.x, P.z - c.z) < 2.6)))) {
    g.freed = true; for (const c of alive) { c.st = g.kind === 'ride' ? 'safe' : 'run'; if (g.kind === 'ride') { c.saved = true; c.y = 0; } c.play('Cheer', { force: true }); burst(c.x, 1.4, c.z, 0xffe0a0, 1.2); } if (alive.length) { Sfx.pick(); hintRaw(t('r_freed', { n: alive.length })); addGold(12 * alive.length, g.x, g.z); } for (const r of g.ropes) r.visible = false; }
  // the clock
  if (g.on && !g.freed && g.T > 0 && g.kind !== 'drag') { g.T -= dt * FAST(); if (g.T <= 0) { g.T = 0;
    if (g.kind === 'fire' || g.kind === 'altar') { for (const c of alive) { burst(c.x, 1, c.z, g.kind === 'fire' ? 0xff6a20 : 0xaa1020, 2.5); c.hp = 0; c.die && c.die(); } Sfx.big(); hintRaw(t('r_lost_' + g.kind)); }
    else { for (const c of alive) c.st = 'taken'; hintRaw(t('r_taken')); } } }
  // drag: handlers walk the rope line to the exit
  if (g.kind === 'drag') { const h = g.hand.filter(e => !e.dead); if (h.length && g.on && !g.freed) { const lead = h[0], ex = o.exit; const d = hyp(ex.x - lead.x, ex.z - lead.z); g.T = d / (o.speed || 1.5); if (d < 1.5) { for (const c of alive) { c.lostP = true; c.o.visible = false; } for (const e of h) { e.o.visible = false; e.dead = e.gone = true; } for (const r of g.ropes) r.visible = false; hintRaw(t('r_taken')); } }
    g.ps.forEach((c, i) => { const r = g.ropes[i]; if (!r || !r.visible) return; const a = h[0]; if (!a || c.dead || c.st !== 'held') { r.visible = false; return; } const A0 = V3.set(a.x, 1.0, a.z), B = new THREE.Vector3(c.x, 1.0, c.z); r.position.copy(A0).add(B).multiplyScalar(.5); r.scale.y = Math.max(.1, A0.distanceTo(B)); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A0).normalize()); }); }
  if (!alive.length) { g.done = true; g.el.style.display = 'none'; return; }
  // label
  const show = g.on && !g.freed && alive.some(c => c.st === 'held' || c.st === 'taken');
  if (show) { let x = 0, z = 0; for (const c of alive) { x += c.x; z += c.z; } V3.set(x / alive.length, 2.6, z / alive.length).project(camera); if (V3.z > 1) { V3.x = -V3.x; V3.y = -1; }
    const off = Math.abs(V3.x) > .82 || V3.y > .68 || V3.y < -.8; V3.x = clamp(V3.x, -.82, .82); V3.y = clamp(V3.y, -.8, .68);
    g.el.style.display = 'block'; { const W = renderer.domElement.clientWidth, Hh = renderer.domElement.clientHeight; g.el.style.left = ((V3.x + 1) / 2 * W) + 'px'; g.el.style.top = ((1 - V3.y) / 2 * Hh + 14) + 'px'; } g.el.style.opacity = off ? .85 : 1;
    const s = Math.ceil(g.T); g.el.textContent = (RES_ICON[g.kind] || '⛓') + ' ' + alive.length + (g.kind === 'ride' ? '' : '  ⏳ ' + s); g.el.style.background = s <= 10 ? 'rgba(200,20,10,.75)' : 'rgba(120,20,10,.55)'; }
  else g.el.style.display = 'none'; }
function victimAI(c, dt) { const g = c.vict; if (G.flying) { c.play(g.kind === 'fire' || g.kind === 'walk' ? 'Idle' : 'Sit_Floor_Idle'); return true; } if (g.lt !== G.time) { g.lt = G.time; resTick(g, dt); resHud(); } if (G.mis.hazard && G.mis.hzT !== G.time && !G.paused && !G.flying) { G.mis.hzT = G.time; G.mis.hazard(dt); } if (c.saved) { if ((c.ct = (c.ct ?? 0) - dt) <= 0) { c.ct = rnd(1.5, 3); c.play(Math.random() < .5 ? 'Cheer' : 'Idle', { force: true }); } return true; }
  const o = g.o, sp = (c.type === 'elder' ? 3.8 : 4.8) * FAST();   // freed people RUN (fix3)
  const go = (tx, tz, v, anim) => { const dx = tx - c.x, dz = tz - c.z, l = hyp(dx, dz); if (l < .3) return l; c.x += dx / l * Math.min(v * dt, l); c.z += dz / l * Math.min(v * dt, l); c.face(dx, dz, dt * 8); c.play(anim, { ts: v / 2.2 / FAST() }); return l; };
  if (c.st === 'run') { const s = o.safe || G.mis.safe || { x: c.x, z: c.z + 30 }, sd = Math.sign(s.x || c.x || Math.sin(c.seed)) || 1; const l = go(sd * (G.W - 1.3 - Math.abs(Math.sin(c.seed * 3.1)) * 1.6), s.z + Math.cos(c.seed) * 2.5, sp, 'Running_A'); if (l < 1.2) { c.saved = true; c.st = 'safe'; c.rot = Math.PI; } return true; }
  // QA (5-1 soft-lock): the exit is fixed once (it used to slide with c.z) and clamped into the lane (the engine keeps everyone inside ±G.W,
  // so an exit beyond the lane edge was never reached: taken people walked forever, the group never ended and resFinish waited forever)
  if (c.st === 'taken') { const ex = c.exT || (c.exT = o.exit || { x: c.x > 0 ? G.W + 4 : -G.W - 4, z: c.z - 8 }); const tx = clamp(ex.x + Math.sin(c.seed) * 1.2, -G.W + .2, G.W - .2); const l = go(tx, ex.z, 1.35 * FAST(), 'Walking_A'); c.tkT = (c.tkT || 0) + dt; if (l < 1 || c.tkT > 40) { c.lostP = true; c.o.visible = false; c.gone = true; } return true; }
  if (g.kind === 'drag') { const h = g.hand.find(e => !e.dead); if (h) { const i = g.ps.indexOf(c), bx = h.x - Math.sin(h.rot) * (1.6 + i * 1.1), bz = h.z - Math.cos(h.rot) * (1.6 + i * 1.1); if (go(bx, bz, 2.4 * FAST(), 'Walking_A') < .3) c.play('Idle'); return true; } }
  if (g.kind === 'walk') { const s = o.safe, i = g.ps.indexOf(c); if (go(s.x + ((i % 3) - 1) * 1.3, s.z + (i / 3 | 0) * 1.2, (g.halt ? 0 : (o.speed || 1)) * FAST() + 1e-4, 'Walking_A') < 1) { c.saved = true; c.st = 'safe'; } else if (g.halt) c.play('Idle'); return true; }
  if (g.kind === 'ride') { const f = g.guards[0]; if (f && !f.dead) { c.x = f.x - Math.sin(f.rot) * .75; c.z = f.z - Math.cos(f.rot) * .75; c.y = 1.15; c.rot = f.rot; } c.play('Sit_Floor_Idle'); return true; }
  if (g.kind === 'fire') { if ((c.ct = (c.ct ?? 0) - dt) <= 0) { c.ct = rnd(.8, 2); c.play(Math.random() < .5 ? 'Idle' : 'Cheer', { force: true }); } return true; }
  c.play('Sit_Floor_Idle'); return true; }
// handler AI: walks the roped line to the exit; turns to fight when the hero is close or he is hit
function dragAI(g) { return (e, dt) => { const P = G.player; e.farT = -1e9; if (e.hp < e.maxHp || (P && !P.dead && hyp(P.x - e.x, P.z - e.z) < 6.5)) { e.custom = null; e.asleep = false; e.farT = 0; return false; } if (!g.on) { e.asleep = true; e.play('Idle'); return true; } e.asleep = false;
  const ex = g.o.exit, dx = ex.x - e.x, dz = ex.z - e.z, l = hyp(dx, dz) || 1, v = (g.o.speed || 1.5) * FAST();
  // QA blocker (1-1 / 1-3 / 3-2): a handler never walks through a closed gate or out of the lane — where he cannot go on he turns round and fights (awake, inside the arena, reachable)
  const lim = G.limitZ > -1e8 ? G.limitZ + 1.6 : -1e9, nx = Math.max(-G.W + 1, Math.min(G.W - 1, e.x + dx / l * v * dt)), nz = Math.max(lim, e.z + dz / l * v * dt), mv = Math.abs(nx - e.x) + Math.abs(nz - e.z); e.x = nx; e.z = nz;
  if (l < 1.2 || mv < v * dt * .35) { e.custom = null; e.asleep = false; e.farT = 0; e.state = 'chase'; return false; }
  e.face(dx, dz, dt * 5); e.play('Walking_A', { ts: .75 }); e.farT = -1e9; return true; }; }
function dragGroup(caps, hands, exit, o = {}) { const hs = hands.map(([ty, x, z]) => { const e = sp(TY(ty), x, z); e.spawnT = 0; e.o.scale.setScalar(e.vs || 1); e.farT = -1e9; return e; }); const g = people(caps, { ...o, kind: 'drag', handlers: hs, exit }); for (const e of hs) e.custom = dragAI(g); return g; }
// maidens at the start of the mission (losses count against the 3rd star)
function maidLost() { const L = (G.mis && G.mis.qz) || []; return L.filter(e => e.dead).length; }
function resCleanup() { for (const g of (G.mis && G.mis.res) || []) { if (g.el) g.el.remove(); for (const r of g.ropes) r.visible = false; } if (resEl) resEl.style.display = 'none'; }
// hazard: telegraphed strikes around the hero (rockfall / arrow rain / fire rain)
function rain(every, kind) { let t0 = 2; const col = kind === 'rock' ? 0xb08a60 : kind === 'fire' ? 0xff6a20 : 0xd8d0b0;
  return dt => { t0 -= dt * FAST(); if (t0 > 0) return; t0 = every; const P = G.player; if (!P || P.dead) return; const pts = []; for (let i = 0; i < 3; i++) { const x = clamp(P.x + rnd(-5, 5), -G.W, G.W), z = P.z + rnd(-6, 4); pts.push([x, z]); telegraph(x, z, 2.2, 1.2, kind === 'rock' ? 0xaa7744 : 0xff4422); }
    G.waits.push({ t: 1.2, r: () => { for (const [x, z] of pts) { burst(x, kind === 'rock' ? 2.5 : .6, z, col, 2.6, kind === 'rock'); ringFx(x, z, 2.2, col); for (const e of G.ents) if (!e.dead && e.team !== 'enemy' && e.team !== 'npc' && hyp(e.x - x, e.z - z) < 2.4) e.damage(kind === 'rock' ? 38 : 26, { x, z, y: 0, team: 'enemy', d: {}, type: 'rock', dead: false }, { kb: 4 }); } G.shake = .3; Sfx.big(); } }); }; }
