// =====================================================================================================================
// Qırq qız — ARCHERY "SNIPER" MODE (js/archery.js — owned by the archery agent, log: /home/user/agents/archery_log.md)
// From a hidden position (ridge / cliff ledge / rooftop) the heroine shoots sentries on a distant Kalmyk camp or fortress
// 60–150 m away. Touch: drag = look; hold 🏹 = draw the bow (zoomed bow-sight with range pins 50–150 m, sway that steadies
// with 🫁 "hold breath"), release = loose. Arrows drop (gravity) and drift (wind) — lead walkers, aim above for range.
// Guards patrol / stand / talk in pairs; a body in sight or an arrow landing close by raises suspicion → alarm (horn) → rush.
// Good shots (headshot / last target / rope) get the slow-motion ARROW CAM (tap to skip; toggle in ⚙ settings or the HUD).
// Units are real engine models (spawn(...,'npc',raw)) driven here; the engine is frozen (G.freeze) while this mode runs,
// so nothing of the melee game (AI, collisions, player) touches them. Missions: LEVELS at the bottom; started from
// missions.js (m2/src/75_archery.js) through runArchery(id, H) → resolves { ok, noAlarm, all, why }.
// =====================================================================================================================
import { G, $, THREE, scene, camera, world, wall, yurt, fire, decor, burst, sparks, addGold, SET, saveSet, spawn } from './engine.js?v=1795179205';
import { torch, banner } from './fx.js?v=1795179205';
import { heightAt } from './scenery.js?v=1795179205';
import { t } from './i18n.js?v=1795179205';
import { Sfx, setMusic } from './audio.js?v=1795179205';

const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v, hyp = Math.hypot, lerp = (a, b, k) => a + (b - a) * k;
const GRAV = 6.2, V0 = 80, KW = .45, ZFOV = 10, WFOV = 52, SIM = 120, WATER = -.32;
const tt = (k, o) => { const s = t(k, o); return s === k ? (EN[k] || k) : s; };
const EN = { ar_wind: 'Wind', ar_alarm: 'ALARM!', ar_head: 'Headshot!', ar_kill: 'Down!', ar_skip: 'Tap to skip', ar_cam: 'Arrow cam', ar_go: 'Forward!' };
const PIN = [[50, '#7dff6a'], [75, '#ffe14a'], [100, '#ff5a3c'], [125, '#5ad8ff'], [150, '#ffffff']];
const pinAng = d => GRAV * d / (2 * V0 * V0);   // radians below the launch line where an arrow at full draw lands at distance d
const arcamOn = () => SET.arcam !== 0;

let S = null, UI = null;
export const ARCH = { get S() { return S; } };
window.__QQBOW = window.__ARCH = ARCH;   // public handle (tutorial's ARCH() probe checks window.__ARCH; it prefers LEVELS['TU-S'] when present)

// ---------------------------------------------------------------- geometry helpers
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _t = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), ZAX = new THREE.Vector3(0, 0, 1);
function segPt(ax, ay, az, bx, by, bz, cx, cy, cz) { const dx = bx - ax, dy = by - ay, dz = bz - az, L = dx * dx + dy * dy + dz * dz || 1e-9; const k = clamp(((cx - ax) * dx + (cy - ay) * dy + (cz - az) * dz) / L, 0, 1); return hyp(ax + dx * k - cx, ay + dy * k - cy, az + dz * k - cz); }
function segSeg(p1x, p1y, p1z, q1x, q1y, q1z, p2x, p2y, p2z, q2x, q2y, q2z) {
  const d1x = q1x - p1x, d1y = q1y - p1y, d1z = q1z - p1z, d2x = q2x - p2x, d2y = q2y - p2y, d2z = q2z - p2z, rx = p1x - p2x, ry = p1y - p2y, rz = p1z - p2z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z, f = d2x * rx + d2y * ry + d2z * rz; let s, u;
  if (a < 1e-9 && e < 1e-9) return hyp(rx, ry, rz);
  if (a < 1e-9) { s = 0; u = clamp(f / e, 0, 1); } else { const c = d1x * rx + d1y * ry + d1z * rz; if (e < 1e-9) { u = 0; s = clamp(-c / a, 0, 1); } else { const b = d1x * d2x + d1y * d2y + d1z * d2z, den = a * e - b * b; s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0; u = (b * s + f) / e; if (u < 0) { u = 0; s = clamp(-c / a, 0, 1); } else if (u > 1) { u = 1; s = clamp((b - c) / a, 0, 1); } } }
  return hyp(p1x + d1x * s - p2x - d2x * u, p1y + d1y * s - p2y - d2y * u, p1z + d1z * s - p2z - d2z * u); }
function segBox(ax, ay, az, bx, by, bz, B) { let t0 = 0, t1 = 1; const d = [bx - ax, by - ay, bz - az], o = [ax, ay, az];
  for (let i = 0; i < 3; i++) { if (Math.abs(d[i]) < 1e-9) { if (o[i] < B.min[i] || o[i] > B.max[i]) return false; continue; } let u0 = (B.min[i] - o[i]) / d[i], u1 = (B.max[i] - o[i]) / d[i]; if (u0 > u1) [u0, u1] = [u1, u0]; t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t0 > t1) return false; } return true; }
const RC = new THREE.Raycaster();
const groundY = (x, z) => { const h = heightAt(x, z); return h < WATER ? WATER : h; };

// ---------------------------------------------------------------- shared meshes / materials
const MAT = {};
const mat = (k, mk) => MAT[k] || (MAT[k] = mk());
function arrowMesh() { const g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .78, 5).rotateX(Math.PI / 2), mat('sh', () => new THREE.MeshStandardMaterial({ color: 0x8a6438, roughness: .7 }))); g.add(sh);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.024, .09, 5).rotateX(Math.PI / 2), mat('tip', () => new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: .8, roughness: .35 }))); tip.position.z = .43; g.add(tip);
  const fm = mat('fl', () => new THREE.MeshStandardMaterial({ color: 0xc8281e, roughness: .8, side: THREE.DoubleSide })), fm2 = mat('fl2', () => new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: .8, side: THREE.DoubleSide }));
  const fg = new THREE.PlaneGeometry(.16, .045).rotateY(Math.PI / 2); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(fg, i ? fm2 : fm); f.position.set(0, 0, -.32); const w = new THREE.Group(); w.rotation.z = i * 2.094; f.position.y = .026; w.add(f); g.add(w); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } }); return g; }
function grassTex() { return mat('grassT', () => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 46; i++) { const x = 8 + Math.random() * 112, h = 50 + Math.random() * 74, b = (Math.random() - .5) * 34; g.strokeStyle = `hsl(${42 + Math.random() * 30},${30 + Math.random() * 25}%,${22 + Math.random() * 28}%)`; g.lineWidth = 1.5 + Math.random() * 2.5; g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + b * .3, 128 - h * .6, x + b, 128 - h); g.stroke(); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; }); }
function tuft(x, y, z, s = 1) { const m = mat('grass', () => new THREE.MeshStandardMaterial({ map: grassTex(), alphaTest: .4, side: THREE.DoubleSide, roughness: 1, color: 0xb8a070 })); const g = new THREE.Group(); const pg = new THREE.PlaneGeometry(1.3, 1.1).translate(0, .5, 0);
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(pg, m); p.rotation.y = i * 1.05 + rnd(0, .5); g.add(p); } g.position.set(x, y - .05, z); g.scale.setScalar(s); world.add(g); return g; }
function rock(x, y, z, s = 1, col = 0x8a7a68) { const geo = new THREE.IcosahedronGeometry(1, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(p.getX(i) * 4.1 + p.getZ(i) * 3.3) * .5 + Math.sin(p.getY(i) * 5.7) * .5) * .22; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .72, p.getZ(i) * k); } geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat('rock' + col, () => new THREE.MeshStandardMaterial({ color: col, roughness: .95, flatShading: true }))); m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.y = rnd(0, 6); m.castShadow = m.receiveShadow = true; world.add(m); return m; }
const woodM = () => mat('wood', () => new THREE.MeshStandardMaterial({ color: 0x6e5034, roughness: .9 }));

// ---------------------------------------------------------------- level kit (used by LEVELS[].build)
const K = {
  // the hidden position: a crest of earth/rock under the camera with grass and stones in front (the near foreground of the view)
  hide(o = {}) { const c = S.cam, gy = c.y - 1.6, col = o.col || 0x8c7458;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('crest' + col, () => new THREE.MeshStandardMaterial({ color: col, roughness: 1 })));
    m.scale.set(o.w || 9, Math.max(1, gy - groundY(c.x, c.z - 3) + .3), o.d || 7); m.position.set(c.x, groundY(c.x, c.z - 3) - .3, c.z + 1.5); m.receiveShadow = true; world.add(m);
    for (let i = 0; i < (o.n || 16); i++) { const a = rnd(-.95, .95), d = rnd(2.2, 4.6); const x = c.x - Math.sin(a + S.yaw) * d, z = c.z - Math.cos(a + S.yaw) * d; tuft(x, gy - .45 - d * .08, z, rnd(.5, .85)); }
    for (const [a, d, s] of o.rocks || [[-.75, 3.2, .55], [.62, 3.6, .7], [.95, 2.6, .45]]) rock(c.x - Math.sin(a + S.yaw) * d, gy - .35, c.z - Math.cos(a + S.yaw) * d, s); },
  // engine wall (real B_wall / B_tower props) — registered as arrow colliders, its tops can be sampled with K.top
  wall(x1, x2, z, h, th) { const n0 = world.children.length; wall(x1, x2, z, h, th, false); const add = world.children.slice(n0); K.solid(add); return add; },
  solid(list) { for (const o of list) { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); if (!isFinite(b.min.x)) continue; S.cols.push({ min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z], o }); S.colObjs.push(o); } },
  top(x, z, dflt = 0) { const rc = new THREE.Raycaster(new THREE.Vector3(x, 80, z), new THREE.Vector3(0, -1, 0), 0, 120); const h = rc.intersectObjects(S.colObjs, true)[0]; return h ? h.point.y : dflt; },
  // wooden palisade of sharpened logs (gap = [x0, x1] left open for the gate)
  palisade(x1, x2, z, h = 3.2, gap) { const geos = [], cg = new THREE.CylinderGeometry(.17, .2, 1, 6), tg = new THREE.ConeGeometry(.2, .45, 6);
    for (let x = x1; x <= x2; x += .38) { if (gap && x > gap[0] && x < gap[1]) continue; const hh = h * rnd(.9, 1.06); geos.push(cg.clone().scale(1, hh, 1).translate(x, groundY(x, z) + hh / 2 - .2, z + rnd(-.06, .06))); geos.push(tg.clone().translate(x, groundY(x, z) + hh - .2 + .22, z)); }
    const g = mergeGeo(geos); const m = new THREE.Mesh(g, woodM()); m.castShadow = m.receiveShadow = true; world.add(m);
    const segs = gap ? [[x1, gap[0]], [gap[1], x2]] : [[x1, x2]]; for (const [a, b] of segs) S.cols.push({ min: [a - .2, -2, z - .25], max: [b + .2, groundY(a, z) + h, z + .25] }); return m; },
  // wooden watchtower: 4 posts, platform with a rail and a little roof; returns the platform height (feet of a guard on it)
  wtower(x, z, h = 5.5, o = {}) { const gy = groundY(x, z), W = 1.6, geos = [], post = new THREE.CylinderGeometry(.13, .15, 1, 6);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) geos.push(post.clone().scale(1, h + 2.4, 1).translate(x + sx * W, gy + (h + 2.4) / 2, z + sz * W));
    geos.push(new THREE.BoxGeometry(W * 2 + .6, .22, W * 2 + .6).translate(x, gy + h, z));
    for (const s of [-1, 1]) { geos.push(new THREE.BoxGeometry(W * 2 + .5, .1, .08).translate(x, gy + h + .95, z + s * (W + .25))); geos.push(new THREE.BoxGeometry(.08, .1, W * 2 + .5).translate(x + s * (W + .25), gy + h + .95, z)); geos.push(new THREE.BoxGeometry(W * 2 + .5, .55, .05).translate(x, gy + h + .38, z + s * (W + .25))); }
    for (let i = 0; i < 6; i++) { const yy = gy + .8 + i * (h - 1) / 5; geos.push(new THREE.BoxGeometry(W * 2, .08, .08).rotateX(i % 2 ? .5 : -.5).translate(x, yy, z + W)); }
    const m = new THREE.Mesh(mergeGeo(geos), woodM()); m.castShadow = m.receiveShadow = true; world.add(m);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(W * 1.75, 1.3, 4).rotateY(Math.PI / 4).translate(x, gy + h + 2.95, z), mat('roof', () => new THREE.MeshStandardMaterial({ color: 0x8a6a40, roughness: 1 }))); roof.castShadow = true; world.add(roof);
    S.cols.push({ min: [x - W - .3, gy + h - .15, z - W - .3], max: [x + W + .3, gy + h + .62, z + W + .3] }, { min: [x - W - .3, gy + h + 2.25, z - W - .3], max: [x + W + .3, gy + h + 3.6, z + W + .3] });
    if (o.flag) banner(x + W, z + W, o.flag, { y: gy + h - 3.6, scale: .75, ry: 0 }); if (o.torch) torch(x - W, z + W, 1.6, gy + h); return gy + h + .11; },
  yurt(x, z) { const n0 = world.children.length; yurt(x, z, false, false); K.solid(world.children.slice(n0)); },
  fire: (x, z, s = 1.1, y = 0) => fire(x, z, s, y / 1.45),
  banner: (x, z, c = 0x1a1a1a, o) => banner(x, z, c, o),
  horse: (x, z, ry) => { try { decor('R_horse', x, z, ry); } catch (e) { } },
  // ---- people
  guard(type, o = {}) { const P = (o.path || [[o.x, o.z]]).map(p => { const y = p[2] ?? (o.y === 'top' ? K.top(p[0], p[1], 0) : o.y ?? groundY(p[0], p[1])); return { x: p[0], z: p[1], y, w: p[3] ?? (o.path ? o.wait ?? 2.4 : 0) }; });
    const e = spawn(type, P[0].x, P[0].z, 'npc', true); e.inLoco = false; e.o.scale.setScalar(e.vs || 1); e.rot = o.face ?? 0;
    const g = { e, type, path: P.length > 1 ? P : null, i: P.length > 1 ? 1 : 0, pi: 0, loop: !!o.loop, dirn: 1, mode: o.mode || (P.length > 1 ? 'patrol' : 'still'), speed: o.speed || 1.05, y: P[0].y, vx: 0, vz: 0, wait: rnd(0, 1.5), seed: rnd(0, 9), rot0: o.face ?? 0, sweep: o.sweep ?? .6,
      sus: 0, spot: 0, st: 'calm', target: o.target !== false, bonus: !!o.bonus, key: o.key || null, on: o.on !== false, name: o.name || null, H: o.H || 0, cone: o.cone ?? .5, range: o.range ?? 30 };
    e.y = g.y; g.H = g.H || measure(e); if (!g.on) e.o.visible = false; S.guards.push(g); anim(g, 'Idle'); return g; },
  pair(a, b) { a.mode = b.mode = 'talk'; a.mate = b; b.mate = a; a.gT = rnd(1, 4); b.gT = rnd(3, 7); },
  rope(a, b, o = {}) { const r = { a, b, cut: false, o }; const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const rm = mat('rope', () => new THREE.MeshStandardMaterial({ color: 0xd8b878, roughness: .9 })); const m = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, L, 6).rotateX(Math.PI / 2), rm); m.position.copy(A).add(B).multiplyScalar(.5); m.lookAt(B); world.add(m); r.m = m;
    const rib = new THREE.Mesh(new THREE.PlaneGeometry(.5, .32), mat('rib', () => new THREE.MeshBasicMaterial({ color: 0xff2a1a, side: THREE.DoubleSide }))); rib.position.copy(A).lerp(B, .5); rib.position.y -= .2; world.add(rib); r.rib = rib;
    S.ropes.push(r); return r; },
  // straw archery target: bale on an easel with a painted face (rings), facing +z; o.cart = moving on a little cart along x (half-range, speed)
  target(x, z, o = {}) { const gy = groundY(x, z), g = new THREE.Group(), R = o.R || .75; g.position.set(x, gy, z); world.add(g);
    const face = mat('tface', () => { const c = document.createElement('canvas'); c.width = c.height = 256; const q = c.getContext('2d'); q.fillStyle = '#d8b860'; q.fillRect(0, 0, 256, 256); [['#f4efe0', 1], ['#1c1c1c', .8], ['#2a6ad8', .6], ['#d8281e', .4], ['#ffd23a', .2]].forEach(([col, k]) => { q.fillStyle = col; q.beginPath(); q.arc(128, 128, 124 * k, 0, 7); q.fill(); }); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: tx, roughness: .9 }); });
    const straw = mat('straw', () => new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 1 })), y0 = o.cart ? 1.25 : .9;
    const bale = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.08, R * 1.08, .42, 20).rotateX(Math.PI / 2), straw); bale.position.y = y0 + R; bale.castShadow = true; g.add(bale);
    const fm = new THREE.Mesh(new THREE.CircleGeometry(R, 32), face); fm.position.set(0, y0 + R, .215); g.add(fm);
    for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, y0 + R * 1.6, 5), woodM()); leg.position.set(sx * R * .7, (y0 + R * 1.6) / 2, -.3); leg.rotation.x = .18; g.add(leg); }
    if (o.cart) { const cb = new THREE.Mesh(new THREE.BoxGeometry(2, .25, 1.2), woodM()); cb.position.y = .55; g.add(cb); for (const sx of [-.75, .75]) for (const sz of [-.5, .5]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .1, 12).rotateZ(Math.PI / 2), woodM()); w.position.set(sx, .3, sz); g.add(w); }
      for (const sz of [-.5, .5]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(o.cart[0] * 2 + 3, .06, .08), woodM()); rail.position.set(x, gy + .03, z + sz); world.add(rail); } }
    const T = { g, x, z: z + .215, y: gy + y0 + R, R, vx: 0, hits: 0 };
    if (o.cart) { const [half, sp] = o.cart; T.vx = sp; T.move = (T, dt, frozen) => { if (!frozen && Math.abs(T.x + T.vx * dt - x) > half) T.vx *= -1; T.x += T.vx * dt; g.position.x = T.x; }; }
    S.tgts.push(T); return T; },
  maiden(x, z) { const e = spawn('qiz', x, z, 'npc', true); e.inLoco = false; e.o.scale.setScalar(e.vs || 1); e.rot = Math.PI; const m = { e, st: 'cover', i: 0, y: groundY(x, z), H: measure(e) }; e.y = m.y; S.maids.push(m); anim(m, 'Idle'); return m; },
  // rush after the alarm: n soldiers run from `from` toward to(g) (default: the hidden position)
  rush(n, from, to) { const out = []; for (let i = 0; i < n; i++) { const g = K.guard('askar', { x: from[0] + rnd(-2, 2), z: from[1] + rnd(-1, 1), mode: 'rush', speed: rnd(4, 4.6) }); g.to = to || (() => ({ x: S.cam.x, z: S.cam.z })); g.delay = i * .55; g.e.o.visible = false; g.on = false; out.push(g); S.rushers.push(g); } return out; },
};
function mergeGeo(list) { // minimal BufferGeometry merge (position + normal), all inputs non-indexed or indexed
  const L = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0; for (const g of L) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0;
  for (const g of L) { if (!g.attributes.normal) g.computeVertexNormals(); P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.BufferAttribute(P, 3)); r.setAttribute('normal', new THREE.BufferAttribute(N, 3)); return r; }
const HC = {};
function measure(e) { if (HC[e.type]) return HC[e.type]; let h = 0; try { e.o.position.set(e.x, 0, e.z); e.o.updateMatrixWorld(true); const b = new THREE.Box3(); e.o.traverse(o => { if (o.isSkinnedMesh) { o.computeBoundingBox && o.computeBoundingBox(); const bb = o.boundingBox && o.boundingBox.clone().applyMatrix4(o.matrixWorld); if (bb) b.union(bb); } }); h = b.max.y - Math.max(0, b.min.y); } catch (er) { }
  return (HC[e.type] = h > 1.2 && h < 3.2 ? h : 2.05 * (e.vs || 1) / 1.18); }
function anim(g, name, op = {}) { if (g.an === name && !op.force) { if (op.ts) g.e.rig.play(name, { ts: op.ts }); return; } g.an = name; g.e.rig.play(name, op); }

// ---------------------------------------------------------------- UI (own DOM + CSS)
function css() { if ($('archCss')) return; const s = document.createElement('style'); s.id = 'archCss'; s.textContent = `
#arch{position:fixed;inset:0;z-index:45;display:none;pointer-events:none;color:#f8eed8;font:600 13px/1.2 var(--fu,system-ui,sans-serif);user-select:none;-webkit-user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent}
#arch.on{display:block}
#arch .look{position:absolute;inset:0;pointer-events:auto;touch-action:none}
#arch .scope{position:absolute;inset:0;opacity:0;pointer-events:none}
#arch .vig{position:absolute;inset:-2px;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 0,rgba(0,0,0,0) var(--r,170px),rgba(10,7,4,.55) calc(var(--r,170px) + 2px),rgba(6,4,2,.94) calc(var(--r,170px) + 34px))}
#arch svg.ret{position:absolute;left:50%;top:50%;overflow:visible;pointer-events:none}
#arch .rng{position:absolute;left:calc(50% - var(--r,170px) * .5);top:calc(50% + var(--r,170px) * .62);transform:translateX(-50%);font:700 15px/1 var(--fu,sans-serif);color:#ffe9ad;text-shadow:0 1px 3px #000,0 0 6px #000;white-space:nowrap}
#arch .bow{position:absolute;left:3%;top:-8%;height:116%;pointer-events:none;transform-origin:50% 60%;will-change:transform}
#arch .cine{position:absolute;inset:0;display:none;pointer-events:none}
#arch .cine.on{display:block}
#arch .lines{position:absolute;inset:-30%;background:repeating-conic-gradient(from 0deg,rgba(255,250,235,.16) 0deg .6deg,rgba(255,255,255,0) .6deg 5deg);-webkit-mask-image:radial-gradient(circle,transparent 26%,#000 62%);mask-image:radial-gradient(circle,transparent 26%,#000 62%);animation:arsp .25s steps(3) infinite}
@keyframes arsp{0%{transform:rotate(0)}100%{transform:rotate(3deg)}}
#arch .cine .bar{position:absolute;left:0;right:0;height:9%;background:#000}
#arch .skip{position:absolute;right:max(14px,var(--sr,0px));bottom:12%;font:600 12px/1 var(--fu,sans-serif);color:rgba(255,240,210,.75);text-shadow:0 1px 2px #000}
#arch .top{position:absolute;left:calc(10px + var(--sl,0px));right:calc(10px + var(--sr,0px));top:calc(6px + var(--st,0px));display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
#arch .pill{background:linear-gradient(180deg,rgba(33,42,96,.82),rgba(14,17,42,.86));border:1px solid rgba(232,189,98,.55);border-radius:10px;padding:5px 9px;text-shadow:0 1px 2px #000;color:#f8eed8;font:600 13px/1.2 var(--fu,sans-serif)}
#arch .obj{max-width:38vw}
#arch .obj b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-weight:600;font-size:12px;color:#f1dfb6}
#arch .obj span{display:block;margin-top:2px;font-weight:700;color:#ffe9ad}
#arch .alert{display:flex;align-items:center;gap:6px;margin-top:2px}
#arch .alert i{display:block;width:min(150px,20vw);height:9px;border-radius:5px;background:rgba(0,0,0,.6);box-shadow:0 0 0 1px rgba(232,189,98,.5);overflow:hidden}
#arch .alert i b{display:block;height:100%;width:0;background:linear-gradient(90deg,#f2b93a,#e0523a)}
#arch .alert.hot i b{background:#ff2a1a}
#arch .alert span{font-size:16px;filter:drop-shadow(0 1px 2px #000)}
#arch .rt{display:flex;gap:6px;align-items:flex-start}
#arch .rt button{pointer-events:auto;cursor:pointer;min-width:38px;min-height:34px}
#arch .wind{display:flex;align-items:center;gap:5px}
#arch .wind .wa{display:inline-block;color:#9fe0ff;font-size:15px;transition:transform .3s}
#arch .cam.off{opacity:.45;text-decoration:line-through}
#arch .msg{position:absolute;left:50%;top:24%;transform:translate(-50%,-50%) scale(.9);font:400 clamp(22px,4.4vw,36px)/1.05 var(--fd,serif);letter-spacing:.05em;color:#ffe9ad;text-shadow:0 2px 6px #000,0 0 14px rgba(0,0,0,.8);opacity:0;transition:opacity .25s,transform .25s;white-space:nowrap;pointer-events:none}
#arch .msg.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
#arch .msg.r{color:#ff6a4a}
#arch .tip{position:absolute;left:50%;bottom:calc(14px + var(--sb,0px));transform:translateX(-50%);max-width:min(560px,62vw);text-align:center;background:rgba(10,8,20,.72);border:1px solid rgba(232,189,98,.45);border-radius:10px;padding:7px 12px;font:600 13px/1.25 var(--fu,sans-serif);opacity:0;transition:opacity .3s;pointer-events:none}
#arch .tip.on{opacity:1}
#arch.cine-on .tip,#arch.cine-on .msg{opacity:0!important}
#arch .shoot,#arch .breath,#arch .go{position:absolute;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer}
#arch .shoot{right:calc(18px + var(--sr,0px));bottom:calc(16px + var(--sb,0px));width:96px;height:96px;background:radial-gradient(circle at 40% 32%,#c9372a,#6a1410 70%);box-shadow:0 0 0 3px #e8bd62,0 0 0 6px rgba(0,0,0,.45),0 6px 14px rgba(0,0,0,.6);font-size:42px}
#arch .shoot.wait{filter:grayscale(.8) brightness(.7)}
#arch .shoot svg,#arch .breath svg{position:absolute;inset:-7px;width:calc(100% + 14px);height:calc(100% + 14px);transform:rotate(-90deg)}
#arch .shoot circle,#arch .breath circle{fill:none;stroke-width:6}
#arch .shoot .fg{stroke:#ffe9ad;stroke-dasharray:289;stroke-dashoffset:289;stroke-linecap:round}
#arch .breath{right:calc(132px + var(--sr,0px));bottom:calc(22px + var(--sb,0px));width:66px;height:66px;background:radial-gradient(circle at 40% 32%,#3a5aa8,#141c48 70%);box-shadow:0 0 0 2px #e8bd62,0 4px 10px rgba(0,0,0,.6);font-size:28px;opacity:0;transform:scale(.7);transition:opacity .2s,transform .2s;pointer-events:none}
#arch .breath.on{opacity:1;transform:scale(1);pointer-events:auto}
#arch .breath .bg{stroke:rgba(0,0,0,.5)} #arch .breath .fg{stroke:#9fe0ff;stroke-dasharray:195;stroke-dashoffset:0}
#arch .breath.hold{box-shadow:0 0 0 3px #9fe0ff,0 0 16px #9fe0ff}
#arch .go{left:calc(18px + var(--sl,0px));bottom:calc(18px + var(--sb,0px));min-width:120px;height:52px;border-radius:26px;padding:0 18px;background:linear-gradient(180deg,#f8dc92,#c8922f);color:#2a1503;font:700 17px/1 var(--fu,sans-serif);box-shadow:0 0 0 2px #fff2b6,0 4px 12px rgba(0,0,0,.6);display:none;animation:argo 1s ease-in-out infinite}
@keyframes argo{50%{transform:scale(1.06)}}
#arch .mk{position:absolute;inset:0;pointer-events:none}
#arch .mk div{position:absolute;transform:translate(-50%,-100%);font:800 22px/1 var(--fu,sans-serif);text-shadow:0 2px 3px #000,0 0 6px #000;color:#ffd24a;display:none;text-align:center}
#arch .mk div.r{color:#ff4a2a}
#arch .mk div.m{color:#86e07c;font-size:14px}
#arch .mk div.d{color:#ffe9ad;font-size:13px;font-weight:700;background:rgba(0,0,0,.45);padding:1px 5px;border-radius:6px}
#arch .mk div svg{display:block;margin:0 auto}
#set .aseg{display:flex;padding:2px;border-radius:22px;background:rgba(5,6,16,.7);box-shadow:0 0 0 1px rgba(232,189,98,.45)}
#set .aseg button{min-width:58px;height:40px;padding:0 12px;border:0;border-radius:20px;background:none;color:var(--mute);font:700 13px/1 var(--fu);cursor:pointer}
#set .aseg button.on{background:linear-gradient(180deg,#f8dc92,#c8922f);color:#2a1503;box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 1px 3px rgba(0,0,0,.6)}
@media (max-height:420px){#arch .shoot{width:84px;height:84px;font-size:36px}#arch .breath{right:calc(118px + var(--sr,0px));width:58px;height:58px;font-size:24px}}
`; document.head.appendChild(s); }
const BOW_SVG = `<svg class="bow" viewBox="0 0 220 640" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="arbw" x1="0" x2="1"><stop offset="0" stop-color="#3a2210"/><stop offset=".5" stop-color="#8a5a2c"/><stop offset="1" stop-color="#4a2a12"/></linearGradient></defs>
<path class="str" d="M150 40 L120 320 L150 600" stroke="#efe6cc" stroke-width="2.4" fill="none"/>
<path d="M150 40 C 40 60, 205 250, 92 320 C 205 390, 40 580, 150 600" stroke="url(#arbw)" stroke-width="15" fill="none" stroke-linecap="round"/>
<path d="M150 40 C 40 60, 205 250, 92 320 C 205 390, 40 580, 150 600" stroke="#c8922f" stroke-width="2" fill="none" stroke-dasharray="3 22" opacity=".8"/>
<rect x="80" y="290" width="24" height="62" rx="8" fill="#2a160a" stroke="#c8922f" stroke-width="2"/><g class="arw"><line x1="120" y1="320" x2="-30" y2="320" stroke="#8a6438" stroke-width="5"/><path d="M-30 320 l14 -7 v14z" fill="#3a3a40"/><path d="M112 320 l18 -9 h10 l-14 9 l14 9 h-10z" fill="#c8281e"/></g></svg>`;
function buildUI() { css(); if (UI) return UI; const r = document.createElement('div'); r.id = 'arch';
  r.innerHTML = `<div class="look"></div>${BOW_SVG}<div class="scope"><div class="vig"></div><svg class="ret"></svg><div class="rng"></div></div><div class="mk"></div>
  <div class="cine"><div class="lines"></div><div class="bar" style="top:0"></div><div class="bar" style="bottom:0"></div><div class="skip"></div></div>
  <div class="top"><div class="pill obj"><b></b><span></span></div><div class="alert"><span>👁</span><i><b></b></i></div>
  <div class="rt"><div class="pill wind"><span class="wa">➤</span><b></b></div><div class="pill arr"></div><button class="pill cam">🎥</button><button class="pill set">⚙</button></div></div>
  <div class="msg"></div><div class="tip"></div><button class="go"></button>
  <div class="breath"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="31" class="bg"/><circle cx="40" cy="40" r="31" class="fg"/></svg><span>🫁</span></div>
  <div class="shoot"><svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="46" class="fg"/></svg><span>🏹</span></div>`;
  document.body.appendChild(r); const q = s => r.querySelector(s);
  UI = { r, look: q('.look'), bow: q('.bow'), str: q('.bow .str'), arw: q('.bow .arw'), scope: q('.scope'), ret: q('.ret'), rng: q('.rng'), mk: q('.mk'), cine: q('.cine'), skip: q('.skip'), ot: q('.obj b'), oc: q('.obj span'), alert: q('.alert'), alb: q('.alert i b'), wa: q('.wind .wa'), wv: q('.wind b'), arr: q('.arr'), cam: q('.cam'), set: q('.set'), msg: q('.msg'), tip: q('.tip'), go: q('.go'), breath: q('.breath'), brf: q('.breath .fg'), shoot: q('.shoot'), shf: q('.shoot .fg'), marks: new Map() };
  // input: look layer (drag / tap-to-skip), shoot (hold to draw), breath (hold), forward (maidens)
  const ptr = new Map();
  UI.look.addEventListener('pointerdown', e => { if (!S) return; if (S.cine) { endCine(); return; } ptr.set(e.pointerId, [e.clientX, e.clientY]); try { UI.look.setPointerCapture(e.pointerId); } catch (er) { } });
  UI.look.addEventListener('pointermove', e => { const p = ptr.get(e.pointerId); if (!p || !S || G.paused) return; const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY; look(dx, dy); });
  const up = e => ptr.delete(e.pointerId); UI.look.addEventListener('pointerup', up); UI.look.addEventListener('pointercancel', up);
  const sh = UI.shoot; sh.addEventListener('pointerdown', e => { e.preventDefault(); try { sh.setPointerCapture(e.pointerId); } catch (er) { } drawStart(); });
  sh.addEventListener('pointermove', e => { if (!S || !S.drawing) return; if (S.dp) { look(e.clientX - S.dp[0], e.clientY - S.dp[1]); } S.dp = [e.clientX, e.clientY]; });   // sliding the thumb on the button also aims
  const rel = e => { if (S) { S.dp = null; drawEnd(e.type === 'pointercancel'); } }; sh.addEventListener('pointerup', rel); sh.addEventListener('pointercancel', rel);
  const br = UI.breath; br.addEventListener('pointerdown', e => { e.preventDefault(); try { br.setPointerCapture(e.pointerId); } catch (er) { } if (S) S.holdBr = true; });
  const bu = () => { if (S) S.holdBr = false; }; br.addEventListener('pointerup', bu); br.addEventListener('pointercancel', bu);
  UI.go.addEventListener('pointerdown', e => { e.preventDefault(); if (S && S.L.go) S.L.go(); });
  UI.cam.addEventListener('click', () => { SET.arcam = arcamOn() ? 0 : 1; saveSet(); camBtn(); Sfx.ui && Sfx.ui(); });
  UI.set.addEventListener('click', () => { const b = $('bset'); if (b) b.click(); });
  addEventListener('keydown', e => { if (!S || G.paused) return; if (e.code === 'Space' && !e.repeat) { drawStart(); e.preventDefault(); } if (e.key === 'Shift' || e.code === 'KeyB') S.holdBr = true; if (S.cine && (e.code === 'Escape' || e.code === 'Enter')) endCine();
    const k = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.code]; if (k) look(k[0], k[1]); });
  addEventListener('keyup', e => { if (!S) return; if (e.code === 'Space') drawEnd(); if (e.key === 'Shift' || e.code === 'KeyB') S.holdBr = false; });
  addEventListener('resize', () => { if (S) drawReticle(); });
  return UI; }
function camBtn() { if (!UI) return; UI.cam.classList.toggle('off', !arcamOn()); UI.cam.title = tt('ar_cam'); const row = $('archSetRow'); if (row) row.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === (arcamOn() ? 1 : 0))); }
// "Arrow cam" row in the game's ⚙ settings panel (own class: story.js setTexts only walks .seg rows)
function injectSet() { const box = document.querySelector('#set > div'), acts = box && box.querySelector('.acts'); if (!box || !acts) return; let row = $('archSetRow');
  if (!row) { row = document.createElement('div'); row.className = 'row'; row.id = 'archSetRow'; row.innerHTML = '<span></span><div class="aseg"><button data-v="0"></button><button data-v="1"></button></div>'; box.insertBefore(row, acts);
    row.querySelectorAll('button').forEach(b => b.onclick = () => { SET.arcam = +b.dataset.v; saveSet(); camBtn(); Sfx.ui && Sfx.ui(); });
    const sb = $('bset'); if (sb) sb.addEventListener('click', () => setTimeout(setRowTexts, 0)); }
  setRowTexts(); }
function setRowTexts() { const row = $('archSetRow'); if (!row) return; row.querySelector('span').textContent = '🏹 ' + tt('ar_cam'); const bs = row.querySelectorAll('button'); bs[0].textContent = t('off'); bs[1].textContent = t('on'); camBtn(); }
let msgT = 0; function msg(s, cls = '', dur = 1.6) { if (!UI) return; UI.msg.textContent = s; UI.msg.className = 'msg on ' + cls; clearTimeout(msgT); msgT = setTimeout(() => UI.msg.classList.remove('on'), dur * 1000); }
let tipT = 0; function tip(s, dur = 5) { if (!UI || !s) return; UI.tip.textContent = s; UI.tip.classList.add('on'); clearTimeout(tipT); tipT = setTimeout(() => UI.tip.classList.remove('on'), dur * 1000); }
function drawReticle() { if (!UI || !S) return; const H = innerHeight, W = innerWidth, R = Math.round(Math.min(W, H) * .45), vf = ZFOV * Math.PI / 180, px = a => a / vf * H;
  UI.scope.style.setProperty('--r', R + 'px'); UI.rng.style.setProperty('--r', R + 'px'); S.pxPerRad = H / vf;
  let s = `<circle r="${R - 5}" fill="none" stroke="#120c06" stroke-width="10"/><circle r="${R - 10}" fill="none" stroke="#c8922f" stroke-width="1.6" opacity=".9"/><circle r="${R - 1}" fill="none" stroke="#5a3a18" stroke-width="2"/>`;
  s += `<line x1="${-R + 14}" y1="0" x2="-16" y2="0" stroke="#e8d8b0" stroke-width="1" opacity=".55"/><line x1="16" y1="0" x2="${R - 14}" y2="0" stroke="#e8d8b0" stroke-width="1" opacity=".55"/><line x1="0" y1="-10" x2="0" y2="10" stroke="#e8d8b0" stroke-width="1" opacity=".7"/>`;
  const wy = px(pinAng(100)); for (let i = -6; i <= 6; i++) { if (!i) continue; const x = px(i * .005); s += `<line x1="${x}" y1="${wy - (i % 2 ? 4 : 7)}" x2="${x}" y2="${wy + (i % 2 ? 4 : 7)}" stroke="#9fe0ff" stroke-width="1.4" opacity=".75"/>`; }
  for (const [d, c] of PIN) { const y = px(pinAng(d)); if (y > R - 12) continue; s += `<line x1="${R - 9}" y1="${y}" x2="5" y2="${y}" stroke="#20160c" stroke-width="3.2"/><line x1="${R - 9}" y1="${y}" x2="5" y2="${y}" stroke="${c}" stroke-width="1.1" opacity=".55"/><circle cx="0" cy="${y}" r="3.6" fill="${c}" style="filter:drop-shadow(0 0 3px ${c})"/><text x="${R - 26}" y="${y - 4}" fill="${c}" font-size="11" font-weight="700" text-anchor="middle" style="paint-order:stroke;stroke:#000;stroke-width:3px">${d}</text>`; }
  s += `<rect x="${-R * .72}" y="${-R * .8}" width="${R * .3}" height="9" rx="4.5" fill="#1a2a1a" stroke="#c8922f" stroke-width="1"/><circle class="bub" cx="${-R * .57}" cy="${-R * .8 + 4.5}" r="3.2" fill="#a8ff60"/>`;
  UI.ret.innerHTML = s; UI.ret.setAttribute('width', 2); UI.ret.setAttribute('height', 2); UI.ret.style.transform = 'translate(-1px,-1px)'; }

// ---------------------------------------------------------------- input → state
function look(dx, dy) { if (!S || S.cine || S.over) return; const k = .0046 * (S.fov / WFOV) * (S.drawing ? .8 : 1); S.yaw = clamp(S.yaw - dx * k, S.L.yawLim[0], S.L.yawLim[1]); S.pitch = clamp(S.pitch - dy * k, -.5, .3); S.looked = (S.looked || 0) + Math.abs(dx) + Math.abs(dy); }
function drawStart() { if (S && S.cine) { endCine(); return; } if (!S || S.over || G.paused) return; if (S.reload > 0 || S.arrows <= 0) { if (S.arrows <= 0) msg(tt('ar_noarrow'), 'r'); return; } if (S.drawing) return; S.drawing = true; S.drawT = 0; S.zoomT = 0; }
function drawEnd(cancel) { if (!S || !S.drawing) return; S.drawing = false; if (cancel || S.drawT < .3 || S.over) { S.drawT = 0; return; } loose(); }

// ---------------------------------------------------------------- the shot
function aimDir(out) { const cp = Math.cos(S.cp), sp = Math.sin(S.cp); return out.set(-Math.sin(S.cy) * cp, sp, -Math.cos(S.cy) * cp); }
function loose() { const pw = clamp(S.drawT / .75, .35, 1), V = V0 * (.55 + .45 * pw); S.arrows--; S.shots++; S.reload = .85; S.drawT = 0; Sfx.arrow && Sfx.arrow(); S.kick = 1;
  const d = aimDir(new THREE.Vector3()), o = new THREE.Vector3(S.cam.x, S.cam.y - .06, S.cam.z).addScaledVector(d, .5); const h = simulate(o, d.multiplyScalar(V));
  const a = { h, t: 0, m: arrowMesh(), spin: rnd(0, 6), trail: trailMesh(), done: false }; world.add(a.m); world.add(a.trail.m); S.flying.push(a); arrowTick(a, 0, 0);
  S.commit = Math.max(S.commit, S.t + h.T + .06); if (h.kind === 'guard') h.obj.pend = true;
  const g = h.kind === 'guard' ? h.obj : null, lastT = g && g.target && remainingTargets() <= 1;
  if (arcamOn() && !S.cine && h.T > .32 && (g && (h.head || lastT || g.key) || h.kind === 'rope' || h.kind === 'tgt' && (h.head || h.obj.final))) startCine(a);
  if (!S.tut.shot) { S.tut.shot = 1; setTimeout(() => S && tip(tt('ar_t4'), 6), 2200); } return h; }
function remainingTargets() { return S.guards.filter(g => g.target && !g.bonus && !g.dead && g.on).length; }
// deterministic flight: the guards keep their current velocity during any flight (S.commit), so the path is pre-computed exactly
function simulate(o, v) { const pts = [o.x, o.y, o.z]; let x = o.x, y = o.y, z = o.z, vx = v.x, vy = v.y, vz = v.z; const dt = 1 / SIM, wx = S.wind.x * KW, wz = S.wind.z * KW;
  const live = S.guards.filter(g => !g.dead && !g.pend && g.on && g.e.o.visible), near = new Set();
  const fin = (kind, obj, head) => ({ kind, obj, head: !!head, pts: new Float32Array(pts), n: pts.length / 3, T: (pts.length / 3 - 1) / SIM, near: [...near].filter(g => g !== obj) });
  for (let i = 1; i <= SIM * 4.5; i++) { const tm = i * dt, px = x, py = y, pz = z; vx += wx * dt; vz += wz * dt; vy -= GRAV * dt; x += vx * dt; y += vy * dt; z += vz * dt; pts.push(x, y, z);
    for (const g of live) { const gx = g.e.x + g.vx * tm, gz = g.e.z + g.vz * tm, gy = g.y; if (Math.abs(gx - x) > 4 || Math.abs(gz - z) > 4) continue; const H = g.H;
      const dh = segPt(px, py, pz, x, y, z, gx, gy + H * .9, gz); if (dh < .25) return fin('guard', g, true);
      if (segSeg(px, py, pz, x, y, z, gx, gy + H * .12, gz, gx, gy + H * .78, gz) < .33) return fin('guard', g, false); if (dh < 1.7) near.add(g); }
    for (const T of S.tgts) { const tz = T.z, cx = T.x + (T.vx || 0) * tm; if ((pz - tz) * (z - tz) > 0) continue; const k = (tz - pz) / ((z - pz) || 1e-9), ix = px + (x - px) * k, iy = py + (y - py) * k, rr = hyp(ix - cx, iy - T.y); if (rr < T.R) { pts.length -= 3; pts.push(ix, iy, tz + .02); const f = fin('tgt', T); f.r = rr / T.R; f.head = f.r < .2; return f; } }
    for (const r of S.ropes) if (!r.cut && segSeg(px, py, pz, x, y, z, ...r.a, ...r.b) < .3) return fin('rope', r);
    for (const c of S.cols) if (segBox(px, py, pz, x, y, z, c)) { if (!c.o) return fin('solid', c); const L = hyp(x - px, y - py, z - pz); RC.set(_t.set(px, py, pz), _s.set(x - px, y - py, z - pz).normalize()); RC.far = L; const hit = RC.intersectObject(c.o, true)[0]; if (hit) { pts.length -= 3; pts.push(hit.point.x, hit.point.y, hit.point.z); return fin('solid', c); } }   // AABB first, then the real mesh
    const gh = heightAt(x, z); if (gh < WATER && y < WATER) return fin('water'); if (y < gh) return fin('ground');
    if (hyp(x - o.x, z - o.z) > 300 || y < -20) break; }
  return fin('none'); }
function trailMesh() { const N = 28, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
  const idx = []; for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
  const m = new THREE.Mesh(g, mat('trail', () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))); m.frustumCulled = false; return { m, N }; }
function pathAt(h, tm, out) { const f = clamp(tm, 0, h.T) * SIM, i = Math.min(h.n - 2, Math.floor(f)), k = f - i, P = h.pts; return out.set(lerp(P[i * 3], P[i * 3 + 3], k), lerp(P[i * 3 + 1], P[i * 3 + 4], k), lerp(P[i * 3 + 2], P[i * 3 + 5], k)); }
function arrowTick(a, dt, rdt) { if (a.done) { if (a.fade !== undefined) { a.fade -= rdt; trailUpd(a, a.h.T, Math.max(0, a.fade / .4)); if (a.fade <= 0) { world.remove(a.trail.m); a.fade = undefined; } } return; }
  a.t += dt; const p = pathAt(a.h, a.t, _v), q = pathAt(a.h, a.t + 1 / SIM, _w).sub(p); if (q.lengthSq() < 1e-8) q.copy(a.dir || ZAX); a.dir = q.clone().normalize();
  a.m.position.copy(p); a.m.quaternion.setFromUnitVectors(ZAX, a.dir); a.spin += rdt * (S.cine && S.cine.a === a ? 9 : 30); a.m.quaternion.multiply(_q.setFromAxisAngle(ZAX, a.spin)); trailUpd(a, a.t, 1);
  if (a.t >= a.h.T) { a.done = true; a.fade = .4; resolve(a); } }
function trailUpd(a, tm, k) { const { m, N } = a.trail, P = m.geometry.attributes.position.array, C = m.geometry.attributes.color.array, cp = camera.position, big = S.cine && S.cine.a === a, span = big ? .16 : .28;
  for (let i = 0; i < N; i++) { const u = i / (N - 1), tt0 = Math.max(0, tm - span * (1 - u)); pathAt(a.h, tt0, _v); pathAt(a.h, tt0 + .01, _w).sub(_v).normalize(); const side = _s.copy(_w).cross(_t.subVectors(cp, _v)).normalize(); const wdt = .045 * u * (big ? .5 : 1);
    P.set([_v.x + side.x * wdt, _v.y + side.y * wdt, _v.z + side.z * wdt, _v.x - side.x * wdt, _v.y - side.y * wdt, _v.z - side.z * wdt], i * 6); const c = u * u * .55 * k * (big ? clamp((_v.distanceTo(cp) - .6) / 1.6, 0, 1) * .6 : 1); C.set([c, c * .96, c * .85, c, c * .96, c * .85], i * 6); }
  m.geometry.attributes.position.needsUpdate = true; m.geometry.attributes.color.needsUpdate = true; }
function resolve(a) { const h = a.h, P = pathAt(h, h.T, new THREE.Vector3()), D = a.dir || ZAX;
  for (const g of h.near) if (!g.dead) noise(g, P, .42);
  if (h.kind === 'guard') { const g = h.obj; g.pend = false; if (g.dead) { world.remove(a.m); return; } kill(g, h.head, D, P, a); return; }
  if (h.kind === 'rope') { cutRope(h.obj, P); world.remove(a.m); return; }
  if (h.kind === 'tgt') { const T = h.obj; a.m.position.copy(P).addScaledVector(D, .18); a.m.updateMatrixWorld(true); T.g.updateMatrixWorld(true); T.g.attach(a.m); burst(P.x, P.y, P.z, 0xe8d090, h.head ? 1.4 : .9, true); sparks(P.x, P.y, P.z, 0xf0d890, h.head ? 14 : 7, 4); Sfx.hit && Sfx.hit(); msg(tt(h.head ? 'ar_bull' : 'ar_hit'), '', 1.3); if (S.L.onTgt) S.L.onTgt(T, h); return; }
  if (h.kind === 'water') { burst(P.x, WATER + .2, P.z, 0xd8ecff, 1.2); sparks(P.x, WATER + .1, P.z, 0xe8f4ff, 8, 3); world.remove(a.m); noiseAt(P, 4); return; }
  if (h.kind === 'none') { world.remove(a.m); return; }
  stick(a, P, D); burst(P.x, P.y, P.z, 0xb8a080, .9, true); sparks(P.x, P.y, P.z, 0xd8c8a0, 6, 3); Sfx.hit && Sfx.hit(); noiseAt(P, 6); }
function stick(a, P, D) { a.m.position.copy(P).addScaledVector(D, .12); S.stuck.push(a.m); if (S.stuck.length > 26) world.remove(S.stuck.shift()); }
function noiseAt(P, R) { let heard = false; for (const g of S.guards) { if (g.dead || !g.on || g.mode === 'rush') continue; const d = hyp(g.e.x - P.x, g.y + 1.6 - P.y, g.e.z - P.z); if (d < R) { noise(g, P, .55 + .45 * (1 - d / R)); heard = true; } } if (heard && !S.alarm) msg(tt('ar_miss'), '', 1.4); }
function noise(g, P, amt) { if (S.alarm) return; g.sus += amt; g.susPt = { x: P.x, z: P.z }; if (g.sus >= 1) return alarm(g, 'noise'); g.st = 'sus'; g.susT = 4.5; }
function kill(g, head, D, P, a) { const e = g.e; g.dead = true; g.deadT = S.t; S.kills++; if (head) S.heads++;
  e.o.updateMatrixWorld(true); a.m.position.copy(P).addScaledVector(D, head ? .02 : .1); a.m.updateMatrixWorld(true); e.o.attach(a.m);
  anim(g, 'Hit_A', { force: true }); g.dieT = .14; g.vx = g.vz = 0;
  const gy = groundY(e.x, e.z); if (g.y - gy > .9) g.fall = { vx: D.x * 2.9 + rnd(-.3, .3), vz: D.z * 2.9 + rnd(-.3, .3), vy: 2.3, rx: 0 }; else g.slide = { vx: D.x * 1.5, vz: D.z * 1.5, t: .3 };
  sparks(P.x, P.y, P.z, 0xf0e0b0, head ? 14 : 9, 5); burst(P.x, P.y, P.z, 0xfff0c8, head ? 1.3 : .9); Sfx.hit && Sfx.hit(); setTimeout(() => Sfx.death && Sfx.death(), 90);
  try { addGold(head ? 12 : 6, e.x, e.z); } catch (er) { } msg(tt(head ? 'ar_head' : 'ar_kill'), '', 1.2); S.bodies.push(g);
  if (S.L.onKill) S.L.onKill(g, head); }
function cutRope(r, P) { r.cut = true; world.remove(r.m); world.remove(r.rib); Sfx.hit && Sfx.hit(); sparks(P.x, P.y, P.z, 0xffe0a0, 12, 5); burst(P.x, P.y, P.z, 0xd8b878, 1);
  for (const A of [r.a, r.b]) { const top = new THREE.Vector3(...A), L = Math.min(2.6, top.distanceTo(P) * .5); const m = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, L, 6).translate(0, -L / 2, 0), r.m.material); m.position.copy(top); m.rotation.z = rnd(-.25, .25); world.add(m); }
  msg(tt('ar_rope'), '', 1.4); if (S.L.onRope) S.L.onRope(r); }

// ---------------------------------------------------------------- guards
function turn(e, want, k) { let d = want - e.rot; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; e.rot += d * clamp(k, 0, 1); }
function sees(g, x, y, z, R, cosA) { const e = g.e, dx = x - e.x, dz = z - e.z, d = hyp(dx, dz); if (d > R || d < .05) return 0; if ((dx * Math.sin(e.rot) + dz * Math.cos(e.rot)) / d < cosA) return 0;
  const wz = S.L.wallZ; if (wz !== undefined && g.y - groundY(e.x, e.z) < 2.4 && y - groundY(x, z) < 2.4 && Math.sign(e.z - wz) !== Math.sign(z - wz)) return 0; if (S.L.blocked && S.L.blocked(g, x, z)) return 0; return 1 - d / R; }
function gTick(g, dt) { const e = g.e;
  if (g.dead) { if (g.dieT > 0 && (g.dieT -= dt) <= 0) anim(g, 'Death_A', { force: true });
    if (g.fall) { const F = g.fall; F.vy -= 9.8 * dt; e.x += F.vx * dt; e.z += F.vz * dt; g.y += F.vy * dt; F.rx = Math.max(-1.1, F.rx - dt * 1.6); e.o.rotation.order = 'YXZ'; e.o.rotation.x = F.rx;
      const gy = groundY(e.x, e.z); if (g.y <= gy && F.vy < 0) { g.y = gy; g.fall = null; e.o.rotation.x = 0; burst(e.x, gy + .3, e.z, 0xa89070, 1.6, true); burst(e.x, gy + .2, e.z, 0xc8b090, 1.1, true); Sfx.hurt && Sfx.hurt(); g.landed = true; } }
    else if (g.slide && g.slide.t > 0) { g.slide.t -= dt; e.x += g.slide.vx * dt; e.z += g.slide.vz * dt; if (g.slide.t <= 0) g.landed = true; }
    e.y = g.y; return; }
  if (!g.on) { if (g.mode === 'rush' && S.alarm && (g.delay -= dt) <= 0) { g.on = true; e.o.visible = true; burst(e.x, 1, e.z, 0x8a7a60, 1.4, true); } else return; }
  if (S.t < S.commit) { e.x += g.vx * dt; e.z += g.vz * dt; e.y = g.y; return; }   // committed while an arrow is in the air
  let seen = false;
  if (g.mode === 'rush') { const T = g.to(g), dx = T.x - e.x, dz = T.z - e.z, d = hyp(dx, dz); const sp = g.speed * (heightAt(e.x, e.z) < WATER ? .5 : 1) * (1 + Math.sin(S.t * 2 + g.seed) * .08);
    if (d < 1.3) { g.vx = g.vz = 0; if (!g.reached) { g.reached = true; if (S.L.onReach) S.L.onReach(g); else over(false, 'ar_found'); } anim(g, 'Idle_Combat'); }
    else { const wob = Math.sin(S.t * 1.3 + g.seed) * .35; g.vx = (dx / d + -dz / d * wob) * sp; g.vz = (dz / d + dx / d * wob) * sp; e.x += g.vx * dt; e.z += g.vz * dt; g.y = groundY(e.x, e.z); turn(e, Math.atan2(g.vx, g.vz), dt * 8); anim(g, 'Running_A', { ts: sp / 4.4 }); }
    e.y = g.y; return; }
  if (g.st === 'sus' && !S.alarm) { g.vx = g.vz = 0; if (g.susPt) turn(e, Math.atan2(g.susPt.x - e.x, g.susPt.z - e.z), dt * 3); anim(g, 'Idle_Combat'); if ((g.susT -= dt) <= 0) g.st = 'calm'; }
  else if (g.mode === 'script' && g.script) g.script(g, dt);
  else if (g.mode === 'patrol' && g.path) { const P = g.path, T = P[g.i];
    if (g.wait > 0) { g.wait -= dt; g.vx = g.vz = 0; if (g.lookB === undefined) g.lookB = e.rot; turn(e, g.lookB + Math.sin((S.t + g.seed) * .7) * .9, dt * 2); anim(g, S.alarm ? 'Idle_Combat' : 'Idle'); }
    else { g.lookB = undefined; const dx = T.x - e.x, dz = T.z - e.z, d = hyp(dx, dz), sp = g.speed * (S.alarm ? 1.7 : 1);
      if (d <= sp * dt + .02) { e.x = T.x; e.z = T.z; g.y = T.y; g.vx = g.vz = 0; g.wait = T.w * rnd(.75, 1.3); g.pi = g.i; if (g.loop) g.i = (g.i + 1) % P.length; else { if (g.i + g.dirn >= P.length || g.i + g.dirn < 0) g.dirn *= -1; g.i += g.dirn; } }
      else { g.vx = dx / d * sp; g.vz = dz / d * sp; e.x += g.vx * dt; e.z += g.vz * dt; const pr = P[g.pi], L = hyp(T.x - pr.x, T.z - pr.z) || 1; g.y = lerp(pr.y, T.y, clamp(1 - d / L, 0, 1)); turn(e, Math.atan2(g.vx, g.vz), dt * 6); anim(g, sp > 1.7 ? 'Running_A' : 'Walking_A', { ts: sp > 1.7 ? .75 : sp / 1.15 }); } } }
  else if (g.mode === 'talk' && g.mate && !g.mate.dead) { g.vx = g.vz = 0; const m = g.mate.e; turn(e, Math.atan2(m.x - e.x, m.z - e.z) + Math.sin(S.t * .4 + g.seed) * .25, dt * 3);
    if ((g.gT -= dt) <= 0) { if (g.an === 'Cheer') { anim(g, 'Idle'); g.gT = rnd(3, 7); } else { anim(g, 'Cheer', { force: true }); g.gT = 1.6; } } else if (g.an !== 'Cheer') anim(g, 'Idle'); }
  else { g.vx = g.vz = 0; if (g.mode === 'talk') g.mode = 'still'; turn(e, g.rot0 + Math.sin((S.t + g.seed) * (S.alarm ? .9 : .32)) * g.sweep * (S.alarm ? 1.6 : 1), dt * 2.5); anim(g, S.alarm ? 'Idle_Combat' : g.sit ? 'Sit_Floor_Idle' : 'Idle'); }
  e.y = g.y;
  if (S.alarm) return;
  // suspicion: bodies in sight (including the one falling right now)
  for (const b of S.bodies) { if (b.hidden || b === g) continue; const s = sees(g, b.e.x, b.y, b.e.z, b.landed ? 18 : 22, .5); if (s > 0) { seen = true; g.sus += dt * (.38 + 1.1 * s) * (b === g.mate ? 1.6 : 1); g.susPt = { x: b.e.x, z: b.e.z }; if (g.st !== 'sus') { g.st = 'sus'; g.susT = 4; } } }
  if (S.L.watch) seen = S.L.watch(g, dt) || seen;
  if (!seen) g.sus = Math.max(0, g.sus - dt * .05); if (g.sus >= 1) alarm(g, 'body'); }
function alarm(g, why) { if (!S || S.alarm) return; S.alarm = true; S.noAlarm = false; S.alarmT = S.t; Sfx.horn && Sfx.horn(); setTimeout(() => Sfx.horn && Sfx.horn(), 900); setMusic('battle'); msg(tt('ar_alarm'), 'r', 2.4);
  if (g && !g.dead) { anim(g, 'Cheer', { force: true }); g.mark = '!'; }
  for (const o of S.guards) { if (!o.dead && o.mode !== 'rush') { o.st = 'alert'; o.sus = 1; } }
  if (S.L.onAlarm) S.L.onAlarm(g, why); if (S.rushers.length) setTimeout(() => S && !S.over && tip(tt('ar_rush'), 5), 1600); }

// ---------------------------------------------------------------- arrow cam
function startCine(a) { S.cine = { a, ph: 'fly', t0: performance.now() }; G.ts = .13; UI.cine.classList.add('on'); UI.r.classList.add('cine-on'); UI.cine.querySelector('.lines').style.opacity = ''; UI.skip.textContent = tt('ar_skip'); S.drawing = false; }
function endCine() { if (!S || !S.cine) return; S.cine = null; G.ts = 1; UI.cine.classList.remove('on'); UI.r.classList.remove('cine-on'); S.zoom = 0; }
function cineCam() { const C = S.cine, a = C.a, h = a.h, now = performance.now(), rdt = Math.min(.05, (now - (C.last || now)) / 1000); C.last = now;
  if (C.ph === 'fly') { const p = a.m.position, d = a.dir || ZAX, side = _w.set(-d.z, 0, d.x).normalize(); const rem = (h.T - a.t);
    camera.position.copy(p).addScaledVector(d, -1.05).addScaledVector(side, .16).add(_v.set(0, .1, 0)); camera.up.set(0, 1, 0); camera.lookAt(p.x + d.x * 6, p.y + d.y * 6, p.z + d.z * 6);
    const sh = .006; camera.position.x += rnd(-sh, sh); camera.position.y += rnd(-sh, sh); setFov(46);
    if (rem < .07 || a.done) { C.ph = 'imp'; C.ti = now; const P = pathAt(h, h.T, new THREE.Vector3()), s2 = _w.set(-d.z, 0, d.x).normalize();
      const gk = h.kind === 'guard' ? h.obj : null, high = gk && gk.y - groundY(gk.e.x, gk.e.z) > 2; C.pos = P.clone().addScaledVector(_t.set(d.x, 0, d.z).normalize(), high ? -4.4 : -2.7).addScaledVector(s2, 1.7 * (Math.random() < .5 ? 1 : -1)).add(new THREE.Vector3(0, gk ? -.35 : .4, 0)); if (gk) C.pos.y = Math.max(C.pos.y, groundY(C.pos.x, C.pos.z) + .4); C.look = P.clone(); camera.position.copy(C.pos); camera.lookAt(C.look); G.ts = .28; UI.cine.querySelector('.lines').style.opacity = 0; } }
  else { const el = (now - C.ti) / 1000; if (el > .55) G.ts = Math.min(1, G.ts + rdt * 1.2);
    const g = h.kind === 'guard' ? h.obj : null; if (g && g.fall) C.pos.y = Math.max(groundY(C.pos.x, C.pos.z) + .5, lerp(C.pos.y, g.y + .9, Math.min(1, rdt * 3))); if (g) C.look.lerp(_v.set(g.e.x, g.y + (g.fall ? 1 : .6), g.e.z), Math.min(1, rdt * 4)); C.cur = C.cur || C.pos.clone(); C.cur.lerp(C.pos, Math.min(1, rdt * 6)); camera.position.copy(C.cur); camera.lookAt(C.look); setFov(38);   // absolute every frame: the engine resets the camera before camFn
    const fin = g ? (!g.fall && el > 1.1) : el > 1.3; if ((fin || el > 2.6) && !C.hold) endCine(); } }
function setFov(f) { if (Math.abs(camera.fov - f) > .01) { camera.fov = f; camera.updateProjectionMatrix(); } }

// ---------------------------------------------------------------- per-frame
function camFn(cam) { if (!S) return; if (S.cine) return cineCam();
  const z = S.zoom, sw = S.sway, br = Math.sin(performance.now() / 1000 * 1.5) * .0012 * (1 - z);
  S.cy = S.yaw + sw[0] * z; S.cp = S.pitch + sw[1] * z + br + S.kick * .012;
  cam.position.set(S.cam.x, S.cam.y, S.cam.z); if (S.shake > 0) { cam.position.x += rnd(-1, 1) * S.shake * .05; cam.position.y += rnd(-1, 1) * S.shake * .05; }
  cam.rotation.set(S.cp, S.cy, 0, 'YXZ'); S.fov = lerp(WFOV, ZFOV, z * z * (3 - 2 * z)); setFov(S.fov); }
function tick(dt) { if (!S || S.over === 2) return; const now = performance.now(), rdt = Math.min(.05, (now - (S.lastNow || now)) / 1000); S.lastNow = now;
  if (G.mis && G.mis.run !== S.run) return cleanup();
  S.t += dt; if (G.mis && G.mis.force && !S.over) { for (const g of S.guards) if (!g.dead && g.target) { g.dead = true; } over(true); }
  // bow / zoom / sway
  if (S.reload > 0) S.reload -= rdt; if (S.drawing) S.drawT += rdt; const zt = S.drawing ? clamp(S.drawT / .32, 0, 1) : 0; S.zoom = S.cine ? 0 : lerp(S.zoom, zt, Math.min(1, rdt * (S.drawing ? 14 : 9)));
  S.kick = Math.max(0, S.kick - rdt * 4); S.shake = Math.max(0, (S.shake || 0) - rdt * 2);
  if (S.holdBr && S.zoom > .5 && S.br > 0 && !(S.exh > 0)) { S.br -= rdt / 4.2; S.brK = lerp(S.brK, .16, Math.min(1, rdt * 5)); if (S.br <= 0) { S.br = 0; S.exh = 2.2; } }
  else { S.br = Math.min(1, S.br + rdt / 3.2); S.brK = lerp(S.brK, S.exh > 0 ? 2.4 : 1, Math.min(1, rdt * 3)); } if (S.exh > 0) S.exh -= rdt;
  const fat = S.drawing ? 1 + Math.max(0, S.drawT - 5) * .5 + Math.max(0, .9 - S.drawT) * 1.2 : 1, A = .0032 * S.brK * fat, tm = now / 1000;
  S.sway[0] = A * (Math.sin(tm * .83 + .4) * .62 + Math.sin(tm * 1.91) * .38); S.sway[1] = A * (Math.sin(tm * 1.17 + 1.3) * .55 + Math.sin(tm * .61 + 2) * .45);
  // world
  S.wT -= dt; if (S.wT <= 0) { S.wT = rnd(14, 24); S.wTo = rnd(S.L.wind[0], S.L.wind[1]) * (Math.random() < .5 ? -1 : 1); } S.wS = lerp(S.wS, S.wTo, Math.min(1, dt * .25)); S.wind.set(Math.cos(S.wA) * S.wS, 0, Math.sin(S.wA) * S.wS);
  for (const g of S.guards) gTick(g, dt);
  for (const m of S.maids) mTick(m, dt);
  for (const T of S.tgts) if (T.move) T.move(T, dt, S.t < S.commit);
  for (const a of S.flying) arrowTick(a, dt, rdt); S.flying = S.flying.filter(a => !a.done || a.fade !== undefined);
  if (S.L.tick) S.L.tick(dt, rdt);
  if (!S.over && S.L.check) { const r = S.L.check(); if (r) over(r === 'win', r === 'win' ? '' : r); }
  if (!S.over && S.arrows <= 0 && !S.flying.some(a => !a.done) && !S.cine && S.reload <= 0) { S.noArrowT = (S.noArrowT || 0) + rdt; if (S.noArrowT > 1.2) over(false, 'ar_noarrow'); }
  hud(rdt); }
function mTick(m, dt) { const e = m.e; if (m.st === 'lost') { e.y = m.y; return; } if (m.st === 'safe') { e.o.visible = false; return; } if (S.t < S.commit && m.st === 'move') { e.x += m.vx * dt; e.z += m.vz * dt; e.y = m.y; return; }
  if (m.st === 'move') { if ((m.delay -= dt) > 0) { anim(m, 'Idle'); m.vx = m.vz = 0; return; } const T = m.to, dx = T[0] - e.x, dz = T[1] - e.z, d = hyp(dx, dz), sp = m.sp || 1.7;
    if (d < .15) { m.vx = m.vz = 0; m.st = T[2] ? 'safe' : 'cover'; if (m.st === 'safe') burst(e.x, 1, e.z, 0xfff0c0, .8); anim(m, 'Idle'); m.coverT = S.t; }
    else { m.vx = dx / d * sp; m.vz = dz / d * sp; e.x += m.vx * dt; e.z += m.vz * dt; m.y = groundY(e.x, e.z); turn(e, Math.atan2(dx, dz), dt * 6); anim(m, sp > 3 ? 'Running_A' : 'Walking_A', { ts: sp > 3 ? sp / 5 : sp / 1.6 }); } }
  else if (m.st === 'cover') { anim(m, 'Idle'); turn(e, m.face ?? Math.PI, dt * 2); }
  e.y = m.y; }
function project(x, y, z) { _v.set(x, y, z).project(camera); if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) return null; return [(_v.x * .5 + .5) * innerWidth, (-_v.y * .5 + .5) * innerHeight]; }
function hud(rdt) { const U = UI; S.hT = (S.hT || 0) - rdt; const slow = S.hT <= 0; if (slow) S.hT = .12;
  const z = S.zoom; U.scope.style.opacity = clamp((z - .35) / .45, 0, 1); U.bow.style.opacity = clamp(1 - z * 2.2, 0, 1) * (S.cine ? 0 : 1);
  const pull = S.drawing ? clamp(S.drawT / .75, 0, 1) : 0, nx = 120 + pull * 75; U.str.setAttribute('d', `M150 40 L${nx} 320 L150 600`); U.arw.setAttribute('transform', `translate(${pull * 75} 0)`); U.arw.style.opacity = S.reload > 0 || S.arrows <= 0 ? 0 : 1;
  const bt = `translate(${Math.round(z * 120)}px, ${Math.round(S.kick * 18 + Math.sin(performance.now() / 700) * 3)}px) rotate(${(8 - z * 8).toFixed(1)}deg) scaleX(-1)`; if (U.bow._t !== bt) { U.bow.style.transform = bt; U.bow._t = bt; }
  U.shf.style.strokeDashoffset = 289 * (1 - pull); U.shoot.classList.toggle('wait', S.reload > 0 || S.arrows <= 0);
  U.breath.classList.toggle('on', z > .5); U.breath.classList.toggle('hold', !!S.holdBr && S.br > 0 && !(S.exh > 0)); U.brf.style.strokeDashoffset = 195 * (1 - S.br); U.brf.style.stroke = S.exh > 0 ? '#ff6a4a' : '#9fe0ff';
  if (slow) { // texts
    const al = S.alarm ? 1 : Math.min(1, Math.max(0, ...S.guards.filter(g => !g.dead && g.on).map(g => Math.max(g.sus, g.spot || 0)))); U.alb.style.width = (al * 100) + '%'; U.alert.classList.toggle('hot', S.alarm);
    const rel = S.wind.x * Math.cos(S.yaw) - S.wind.z * Math.sin(S.yaw), ws = Math.abs(S.wS); U.wv.textContent = ws.toFixed(1) + ' m/s'; U.wa.style.transform = `rotate(${rel >= 0 ? 0 : 180}deg) scale(${.8 + Math.min(1, ws / 4) * .5})`;
    U.arr.textContent = '🏹 × ' + (S.arrows > 900 ? '∞' : S.arrows); U.ot.textContent = S.L.objKey ? tt(S.L.objKey()) : (G.mis ? t(G.mis.m.o) : ''); U.oc.textContent = S.L.count ? S.L.count() : '';
    if (z > .6) { let best = null, bd = 1e9; const o = camera.position, d = aimDir(_w), R = Math.min(innerWidth, innerHeight) * .45; S.rf = null; for (const g of S.guards) { if (g.dead || !g.on) continue; const q = project(g.e.x, g.y + g.H * .6, g.e.z); if (!q) continue; const off = hyp(q[0] - innerWidth / 2, (q[1] - innerHeight / 2) * .6); if (off < R * .95 && off < bd) { bd = off; best = [g, hyp(g.e.x - o.x, g.y + g.H * .6 - o.y, g.e.z - o.z)]; } } if (best) S.rf = best;
      if (!best) { for (let s = 4; s < 240; s += 2) { const x = o.x + d.x * s, y = o.y + d.y * s, zz = o.z + d.z * s; if (y < heightAt(x, zz) || S.cols.some(c => x > c.min[0] && x < c.max[0] && y > c.min[1] && y < c.max[1] && zz > c.min[2] && zz < c.max[2])) { best = [null, s]; break; } } }
      U.rng.textContent = best ? (best[0] ? '◎ ' : '') + Math.round(best[1]) + ' m' : '— m'; U.rng.style.color = best && best[0] ? '#ffb070' : ''; } }
  // markers over heads (suspicion / alarm / spotting / beacon / maidens)
  const seen = new Set(); const mk = (key, x, y, z, html, cls) => { let el = U.marks.get(key); if (!el) { el = document.createElement('div'); U.mk.appendChild(el); U.marks.set(key, el); } const p = S.cine ? null : project(x, y, z); seen.add(key); if (!p) { el.style.display = 'none'; return; } el.style.display = 'block'; el.style.left = p[0] + 'px'; el.style.top = p[1] + 'px'; if (el._h !== html) { el.innerHTML = html; el._h = html; } el.className = cls || ''; };
  for (const g of S.guards) { if (g.dead || !g.on) continue; const y = g.y + g.H + .35;
    if (S.alarm && g.mark === '!') mk(g, g.e.x, y, g.e.z, '!', 'r');
    else if (g.spot > .02) mk(g, g.e.x, y, g.e.z, ring(g.spot, '#ff4a2a'), 'r');
    else if (g.prog !== undefined) mk(g, g.e.x, y, g.e.z, ring(g.prog, '#ffb030'), 'r');
    else if (!S.alarm && g.sus > .08) mk(g, g.e.x, y, g.e.z, g.sus > .6 ? '?!' : '?', g.sus > .6 ? 'r' : '');
    else if (S.zoom > .6 && S.rf && S.rf[0] === g) mk(g, g.e.x, y, g.e.z, Math.round(S.rf[1]) + ' m', 'd'); }
  for (const m of S.maids) if (m.st !== 'safe' && m.st !== 'lost' && !S.chargers) mk(m, m.e.x, m.y + m.H + .3, m.e.z, '▼', 'm');
  for (const [k, el] of U.marks) if (!seen.has(k)) { el.remove(); U.marks.delete(k); } }
const ring = (v, c) => `<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="11" fill="rgba(0,0,0,.45)" stroke="rgba(255,255,255,.25)" stroke-width="3"/><circle cx="15" cy="15" r="11" fill="none" stroke="${c}" stroke-width="3.4" stroke-dasharray="${(69.1 * clamp(v, 0, 1)).toFixed(1)} 70" transform="rotate(-90 15 15)"/></svg>`;
function over(win, why) { if (!S || S.over) return; S.over = 1; S.drawing = false; const res = { ok: win, noAlarm: S.noAlarm, all: S.L.allStar ? S.L.allStar() : false, why, kills: S.kills, heads: S.heads, shots: S.shots };
  if (!win) msg(tt(why || 'ms_fail'), 'r', 2.4); const wait = win ? 1600 : 2400; setTimeout(() => { if (S && S.done) { const d = S.done; S.done = null; S.over = 2; d(res); } }, wait); }
function cleanup() { if (!S) return; S.over = 2; endCine(); G.ts = 1; if (G.camFn === camFn) G.camFn = null; camera.fov = 40; camera.far = 240; camera.updateProjectionMatrix(); camera.rotation.order = 'XYZ'; G.freeze = false; if (G.tick === tick) G.tick = null; if (UI) { UI.r.classList.remove('on'); for (const [, el] of UI.marks) el.remove(); UI.marks.clear(); UI.tip.classList.remove('on'); UI.msg.classList.remove('on'); UI.go.style.display = 'none'; } S = null; }

// ---------------------------------------------------------------- entry point (missions.js)
export async function runArchery(id, H) { const L = LEVELS[id]; if (!L) return { ok: true, noAlarm: true, all: true };
  buildUI(); injectSet(); if (S) cleanup();
  await H.fadeTo(true); await H.chapterStart(H.moods[L.mood], H.B[L.ch], L.need || []);
  G.freeze = true; G.player = null; G.ts = 1;
  S = { L, run: G.mis && G.mis.run, t: 0, cam: { x: L.cam[0], y: 0, z: L.cam[1] }, yaw: L.yaw || 0, pitch: L.pitch || -.04, cy: 0, cp: 0, fov: WFOV, zoom: 0, sway: [0, 0], br: 1, brK: 1, exh: 0, kick: 0, reload: 0, drawT: 0,
    arrows: L.arrows, shots: 0, kills: 0, heads: 0, guards: [], rushers: [], maids: [], bodies: [], ropes: [], tgts: [], cols: [], colObjs: [], flying: [], stuck: [], commit: 0, alarm: false, noAlarm: true,
    wind: new THREE.Vector3(), wA: L.windA ?? rnd(-.45, .45), wS: rnd(L.wind[0], L.wind[1]) * (Math.random() < .5 ? -1 : 1), wT: rnd(14, 24), tut: {}, done: null };
  S.wTo = S.wS; S.cam.y = (L.camY ?? (groundY(S.cam.x, S.cam.z) + (L.camH || 7))); L.state = {};
  try { L.build(K, S); } catch (e) { console.error('[archery] build', e); cleanup(); return { ok: true, noAlarm: false, all: false, why: 'build' }; }   // never strand the player in a broken level
  if (scene.fog) { scene.fog.near = Math.max(scene.fog.near, 110); scene.fog.far = Math.max(scene.fog.far, 330); }
  camera.far = 212; camera.updateProjectionMatrix();   // the fortress is ≤ 140 m away: trim the far end of the level (sky dome r = 200 must stay inside)
  G.cam.x = L.focus[0]; G.cam.z = L.focus[1]; G.camYaw = 0; G.camFn = camFn; G.tick = tick; drawReticle(); camBtn();
  $('hud').classList.remove('on'); UI.r.classList.remove('on'); $('fade').classList.remove('in'); G.paused = false; setMusic('calm');
  if (!L.noBanner) await H.bannerShow(t('ch' + L.ch), t(G.mis.m.n), t(G.mis.m.o), 3.2); else await new Promise(r => setTimeout(r, 600));
  if (!S) return { ok: false };
  if (L.intro && !window.__ARCH_NOINTRO) { await H.dialog(L.intro); if (!S) return { ok: false }; }
  UI.r.classList.add('on'); S.lastNow = performance.now(); if (L.start) L.start(S);
  const first = !localStorage.getItem('qq_arch_tut'); try { localStorage.setItem('qq_arch_tut', '1'); } catch (e) { }
  const tips = L.tips ? [] : first ? ['ar_t1', 'ar_t2', 'ar_t3', 'ar_t5'] : ['ar_t2', 'ar_t3']; tips.forEach((k, i) => setTimeout(() => S && !S.over && !S.cine && tip(tt(k), 5.5), 400 + i * 6200));
  const res = await new Promise(r => { S.done = r; }); cleanup(); return res; }
// test hooks (headless screenshots): aim at a guard with lead/drop solved, then loose
ARCH.aimAt = (i, o = {}) => { const g = S.guards[i]; if (!g) return null; const tgtY = g.y + g.H * (o.head ? .9 : .55); let best = null;
  for (let it = 0; it < 6; it++) { const tx = g.e.x + g.vx * (best ? best.T : 1), tz = g.e.z + g.vz * (best ? best.T : 1), dx = tx - S.cam.x, dz = tz - S.cam.z, dist = hyp(dx, dz), T = dist / V0;
    const wl = .5 * KW * T * T; const ax = tx - S.wind.x * wl, az = tz - S.wind.z * wl, ay = tgtY + .5 * GRAV * T * T; S.yaw = Math.atan2(-(ax - S.cam.x), -(az - S.cam.z)); S.pitch = Math.atan2(ay - S.cam.y, hyp(ax - S.cam.x, az - S.cam.z)); best = { T }; }
  S.sway[0] = S.sway[1] = 0; S.cy = S.yaw; S.cp = S.pitch; return { yaw: S.yaw, pitch: S.pitch }; };
ARCH.aimAtPt = (x, y, z) => { for (let it = 0; it < 4; it++) { const dist = hyp(x - S.cam.x, z - S.cam.z), T = dist / V0, wl = .5 * KW * T * T, ax = x - S.wind.x * wl, az = z - S.wind.z * wl, ay = y + .5 * GRAV * T * T; S.yaw = Math.atan2(-(ax - S.cam.x), -(az - S.cam.z)); S.pitch = Math.atan2(ay - S.cam.y, hyp(ax - S.cam.x, az - S.cam.z)); } S.cy = S.yaw; S.cp = S.pitch; };
ARCH.shoot = () => { S.drawT = 1; S.drawing = false; S.cy = S.yaw; S.cp = S.pitch; return loose(); };
ARCH.step = (dt = 1 / 30, n = 1) => { for (let i = 0; i < n && S; i++) { G.time += dt; tick(dt); for (const g of [...S.guards, ...S.maids]) g.e.mixer.update(dt); } };   // headless tests: advance the sim without waiting for frames
ARCH.draw = (on) => { if (on) { S.drawing = true; S.drawT = 1; } else S.drawing = false; };

// =====================================================================================================================
// LEVELS — three missions in the campaign (inserted into MLIST by m2/src/75_archery.js)
// =====================================================================================================================
export const LEVELS = {
  // ch3 — the Kalmyk camp across the river (palisade, 2 watchtowers, yurts, fires). 6 sentries + the camp's captain (bonus).
  '3-S': { id: '3-S', ch: 3, mood: 'DUSK', cam: [1, -10], camH: 8.4, yaw: 0, pitch: -.05, yawLim: [-.75, .75], focus: [0, -100], wind: [.8, 3.2], arrows: 12, wallZ: -100,
    intro: [['gu', 'ar_d3a'], ['sa', 'ar_d3b']],
    build(K, S) { K.hide({ col: 0x8c7a58 });
      K.palisade(-17, 17, -100, 3.3, [-2.6, 2.6]); const tl = K.wtower(-9, -98.5, 5.6, { flag: 0x1a1a1a, torch: 1 }), tr = K.wtower(9, -98.5, 5.6, { flag: 0x1a1a1a, torch: 1 });
      for (const [x, z] of [[-9, -112], [4, -116], [13, -109], [-15, -120], [-2, -127], [10, -124]]) K.yurt(x, z); K.fire(3.2, -91.2, 1.1); K.fire(-5, -108, 1); K.horse(-12, -90, 1.2); K.horse(-13.6, -91.5, .7);
      const L = this.state;
      L.t1 = K.guard('archer', { x: -9, z: -98.5, y: tl, face: .15, sweep: .75 }); L.t2 = K.guard('archer', { x: 9, z: -98.5, y: tr, face: -.15, sweep: .75 });
      L.p1 = K.guard('askar', { path: [[-13.5, -96.6], [-4.5, -96.6]], wait: 2.8 }); L.p2 = K.guard('askar', { path: [[15.5, -96.4], [5, -96.4]], wait: 3.2, speed: .95 });
      L.a = K.guard('askar', { x: 2.2, z: -92.2, face: 1 }); L.b = K.guard('askar', { x: 4.3, z: -92.6, face: -1 }); K.pair(L.a, L.b);
      L.cap = K.guard('nayza', { path: [[0, -112], [0, -101.5], [1.5, -95]], wait: 3, on: false, bonus: true, speed: .9, key: 'cap' });
      L.six = [L.t1, L.t2, L.p1, L.p2, L.a, L.b]; L.rush = K.rush(4, [0, -101], null); },
    onKill(g) { const L = this.state; if (!L.capOut && S.kills >= 3) { L.capOut = 1; setTimeout(() => { if (!S || S.over || L.cap.dead) return; L.cap.on = true; L.cap.e.o.visible = true; tip(tt('ar_capt'), 4.5); }, 2500); } },
    count() { const L = this.state, n = L.six.filter(g => g.dead).length; return '🎯 ' + n + '/6' + (L.cap.dead ? '  ★ ' + tt('ar_cap') : L.cap.on ? '  ☆ ' + tt('ar_cap') : '') + (S.alarm ? '  ⚔ ' + S.rushers.filter(g => !g.dead).length : ''); },
    check() { const L = this.state; if (!L.six.every(g => g.dead) || !S.rushers.every(g => g.dead || !S.alarm)) return null;
      if (L.cap.dead || !L.cap.on) return 'win'; if (!L.sixT) { L.sixT = S.t; tip(tt('ar_capt2'), 5); } return S.t - L.sixT > 14 ? 'win' : null; },
    allStar() { const L = this.state; return L.cap.dead; } },

  // ch5 — Darbent: a wall across the pass. 4 maidens slip along the cliff to the postern; shoot every guard who spots them.
  '5-S': { id: '5-S', ch: 5, mood: 'DUSK', cam: [-5.5, -12], camH: 8.5, yaw: -.08, pitch: -.08, yawLim: [-.6, .5], focus: [3, -95], wind: [.5, 2.6], arrows: 12, wallZ: -108,
    intro: [['sa', 'ar_d5a']],
    build(K, S) { K.hide({ col: 0x9a7a66, w: 7, d: 6 }); const L = this.state;
      K.wall(-12, 12, -108, 3.6, 1.6); const wt = K.top(-4, -108, 5.4), towL = K.top(-12, -108, 7), towR = K.top(12, -108, 7); L.tops = [wt, towL, towR, groundY(12, -108), groundY(-12, -108)];
      L.wt = wt; L.cover = [[8.6, -46], [9.4, -61], [6.4, -76], [9.6, -90], [7.2, -104.6, 1]];
      for (const [x, z, s] of [[9.6, -47.6, 1.5], [10.6, -62.6, 1.6], [7.6, -77.6, 1.5], [10.6, -91.6, 1.5], [6, -48, 1], [8.2, -78.6, 1.1], [11.4, -60.8, 1.2]]) { const r = rock(x, groundY(x, z) + .4, z, s, 0x8a6e5c); K.solid([r]); }
      K.banner(-6, -108.9, 0x1a1a1a, { y: wt - .2, scale: .7, ry: 0 }); K.banner(6, -108.9, 0x1a1a1a, { y: wt - .2, scale: .7, ry: 0 });
      L.w1 = K.guard('archer', { x: -5, z: -108.2, y: wt, face: .1, sweep: .55, range: 52, cone: .55 });
      L.w2 = K.guard('askar', { path: [[-10, -108.4, wt], [10.5, -108.4, wt]], wait: 2.6, range: 46, cone: .55 });
      L.t1 = K.guard('archer', { x: 12, z: -108, y: towR, face: -.2, sweep: .6, range: 56, cone: .55 }); L.t2 = K.guard('askar', { x: -12, z: -108, y: towL, face: .35, sweep: .45, range: 40 });
      L.g1 = K.guard('askar', { path: [[2, -101], [12, -101]], wait: 3, range: 30, cone: .5 });
      L.pa = K.guard('askar', { x: -5.6, z: -69, face: .8, range: 26 }); L.pb = K.guard('askar', { x: -3.8, z: -70.6, face: -2.2, range: 26 }); K.pair(L.pa, L.pb);
      L.ms = [[8, -44], [9.2, -45], [8.6, -43.2], [9.8, -44.2]].map(([x, z]) => K.maiden(x, z)); L.stage = 0;
      L.rush = K.rush(3, [8, -106], g => { const m = S.maids.filter(m => m.st !== 'lost' && m.st !== 'safe').sort((a, b) => hyp(a.e.x - g.e.x, a.e.z - g.e.z) - hyp(b.e.x - g.e.x, b.e.z - g.e.z))[0]; return m ? { x: m.e.x, z: m.e.z } : { x: g.e.x, z: g.e.z }; }); },
    start() { setTimeout(() => S && this.showGo(), 2500); },
    showGo() { if (!S || S.over) return; const L = this.state; if (L.stage >= L.cover.length - 1) return; UI.go.textContent = tt('ar_go'); UI.go.style.display = 'flex'; if (!L.goTip) { L.goTip = 1; tip(tt('ar_mgo'), 6); } },
    go() { const L = this.state; if (S.maids.some(m => m.st === 'move')) return; UI.go.style.display = 'none'; L.stage++; const c = L.cover[L.stage]; let i = 0;
      for (const m of S.maids) { if (m.st === 'lost' || m.st === 'safe') continue; m.st = 'move'; m.delay = i * .55; m.to = [c[0] + (i % 2 ? .8 : -.6) * (i > 1 ? 1 : .4), c[1] + (i >> 1) * .9 - .3, c[2]]; m.sp = 1.75; i++; } Sfx.ui && Sfx.ui(); },
    watch(g, dt) { let any = false; for (const m of S.maids) { if (m.st !== 'move' || m.delay > 0) continue; const s = sees(g, m.e.x, m.y, m.e.z, g.range, g.cone); if (s > 0) { any = true; g.spot = (g.spot || 0) + dt * (.32 + 1.1 * s); g.spotM = m; } }
      if (!any) g.spot = Math.max(0, (g.spot || 0) - dt * .3); else if (!this.state.spotTip) { this.state.spotTip = 1; msg(tt('ar_spot'), 'r', 2); }
      if (g.spot >= 1) { const m = g.spotM; if (m && m.st === 'move') this.lose(m); g.spot = 0; alarm(g, 'spot'); } return false; },
    lose(m) { m.st = 'lost'; anim(m, 'Death_A', { force: true }); msg(tt('ar_mlost'), 'r', 2); this.state.lost = (this.state.lost || 0) + 1; },
    onReach(g) { const m = S.maids.find(m => m.st !== 'lost' && m.st !== 'safe' && hyp(m.e.x - g.e.x, m.e.z - g.e.z) < 2); if (m) this.lose(m); g.reached = false; },
    tick() { const L = this.state; if (!S.over && UI.go.style.display === 'none' && S.maids.every(m => m.st !== 'move') && L.stage < L.cover.length - 1 && !L.goWait && L.stage > 0) { L.goWait = 1; setTimeout(() => { L.goWait = 0; this.showGo(); }, 900); } },
    count() { const al = S.maids.filter(m => m.st !== 'lost').length, sf = S.maids.filter(m => m.st === 'safe').length; return '🧕 ' + al + '/4' + (sf ? '  ✔ ' + sf : '') + (S.alarm ? '  ⚔ ' + S.rushers.filter(g => !g.dead).length : ''); },
    check() { const alive = S.maids.filter(m => m.st !== 'lost'); if (!alive.length) return 'ar_mallost'; if (alive.every(m => m.st === 'safe') && S.rushers.every(g => g.dead || !g.on)) return 'win'; return null; },
    allStar() { return !this.state.lost; } },

  // ch6 — before the Qashal gate: the eastern wall's sentries, the beacon keeper on the gate tower, then the two ropes of the gate bridge.
  '6-S': { id: '6-S', ch: 6, mood: 'DAY', cam: [-16, -26], camY: 9.6, yaw: -.2, pitch: -.06, yawLim: [-.8, .6], focus: [6, -116], wind: [.6, 3], arrows: 14, wallZ: -120,
    intro: [['gu', 'ar_d6a'], ['sa', 'ar_d6b']],
    build(K, S) { const L = this.state;
      // rooftop hide: flat roof + parapet under the camera
      const rx = S.cam.x, rz = S.cam.z + 1, ry = S.cam.y - 1.65; const roofM = mat('roofT', () => new THREE.MeshStandardMaterial({ color: 0xb89a74, roughness: 1 }));
      const roof = new THREE.Mesh(new THREE.BoxGeometry(7, ry, 6), roofM); roof.position.set(rx, ry / 2, rz); roof.castShadow = roof.receiveShadow = true; world.add(roof);
      for (let x = -3.2; x <= 3.2; x += 1.1) { const c = new THREE.Mesh(new THREE.BoxGeometry(.6, .55, .3), roofM); c.position.set(rx + x, ry + .27, rz - 2.85); c.castShadow = true; world.add(c); }
      tuft(rx - 2.5, ry, rz - 2.2, .6); tuft(rx + 2.2, ry, rz - 2.4, .55); rock(rx + 1.2, ry + .1, rz - 2.3, .3, 0x9a8a70);
      // the city wall (built by buildCh6: x −30…−3.5 and 3.5…30 at z −120, h 5) → colliders + walkway height
      const cand = world.children.filter(o => { if (!o.isObject3D || o.isLight) return false; const b = new THREE.Box3().setFromObject(o); return isFinite(b.min.x) && b.max.z > -122.5 && b.min.z < -117.5 && b.max.y > 4 && b.max.x - b.min.x < 40 && b.max.y < 30; }); K.solid(cand);
      const wt = K.top(14, -120, 7.2), tgR = K.top(3.6, -120, 9.5), tgL = K.top(-3.6, -120, 9.5), tE = K.top(30, -120, 9.5); L.wt = wt; L.tops = [wt, tgR, tgL, tE];
      // gate bridge: a raised plank drawbridge in the gate gap, hinged at the bottom, held by two ropes to the gate towers
      const piv = new THREE.Group(); piv.position.set(0, groundY(0, -116.2), -116.2); /* just in front of the gate towers (the B_tower props almost close the gap) */ const pm = mat('plank', () => new THREE.MeshStandardMaterial({ color: 0x5e4228, roughness: .85 })), im = mat('iron', () => new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: .7, roughness: .5 }));
      const bw = 4.6, bh = 6.2; const pl = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, .28), pm); pl.position.y = bh / 2; pl.castShadow = pl.receiveShadow = true; piv.add(pl);
      for (const y of [.8, bh / 2, bh - .8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(bw + .05, .16, .32), im); b.position.y = y; piv.add(b); } world.add(piv); L.bridge = { piv, ang: 0, v: 0, fall: false };
      S.cols.push({ min: [-bw / 2, piv.position.y, -116.5], max: [bw / 2, piv.position.y + bh, -115.9] }); L.bcol = S.cols[S.cols.length - 1];
      const by0 = piv.position.y + bh, beam = new THREE.Mesh(new THREE.BoxGeometry(8.6, .45, .5), pm); beam.position.set(0, by0 + 2.4, -116.5); beam.castShadow = true; world.add(beam); K.solid([beam]);   // timber lintel between the gate towers carrying the bridge ropes
      for (const sx of [-1, 1]) { const pul = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .2, 10).rotateZ(Math.PI / 2), im); pul.position.set(sx * (bw / 2 - .25), by0 + 2.12, -116.4); world.add(pul); }
      L.r1 = K.rope([-bw / 2 + .25, by0 - .12, -116.15], [-bw / 2 + .25, by0 + 2.0, -116.4]); L.r2 = K.rope([bw / 2 - .25, by0 - .12, -116.15], [bw / 2 - .25, by0 + 2.0, -116.4]);
      // beacon (brazier) on the west gate tower; keeper sits next to it
      const bx = -5.2, bz = -120.8, by = tgL; const bra = new THREE.Mesh(new THREE.CylinderGeometry(.55, .3, .6, 8), im); bra.position.set(bx, by + .3, bz); world.add(bra); for (let i = 0; i < 4; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .9, 5), woodM()); lg.position.set(bx, by + .65, bz); lg.rotation.set(Math.PI / 2, i * .8, 0); world.add(lg); } L.beacon = [bx, by, bz];
      // eastern wall sentries (6) + the keeper + 2 on the western wall (bonus)
      L.e1 = K.guard('askar', { path: [[7, -120.2, wt], [21, -120.2, wt]], wait: 2.8, range: 30 });
      L.e2 = K.guard('archer', { x: 17, z: -120.4, y: wt, face: 0, sweep: .7 });
      L.e3 = K.guard('archer', { x: 30, z: -120, y: tE, face: -.4, sweep: .6 });
      L.e4 = K.guard('askar', { x: 3.6, z: -120, y: tgR, face: -.2, sweep: .9, range: 32 });
      L.e5 = K.guard('askar', { x: 11, z: -120.3, y: wt, face: Math.PI / 2 }); L.e6 = K.guard('nayza', { x: 12.6, z: -120.3, y: wt, face: -Math.PI / 2 }); K.pair(L.e5, L.e6);
      L.kp = K.guard('askar', { x: -2.8, z: -120.6, y: tgL, face: -1.3, sweep: .25, key: 'keeper' }); L.kp.sit = true;
      L.w1 = K.guard('askar', { path: [[-8, -120.2, wt], [-22, -120.2, wt]], wait: 3, bonus: true }); L.w2 = K.guard('archer', { x: -16, z: -120.4, y: wt, face: .2, bonus: true });
      L.east = [L.e1, L.e2, L.e3, L.e4, L.e5, L.e6, L.kp];
      L.rush = K.rush(4, [-11, -116.5], null); L.phase = 1; },   // out of a side postern in front of the wall
    keeperGo() { const L = this.state, k = L.kp; if (L.kGo || k.dead || S.over) return; L.kGo = 1; k.sit = false; k.mode = 'script'; k.prog = 0; msg(tt('ar_beacon'), 'r', 2.4); tip(tt('ar_beacon'), 4);
      const [bx, by, bz] = L.beacon, sx = k.e.x, sz = k.e.z; k.script = (g, dt) => { g.prog = Math.min(1, g.prog + dt / (S.alarm ? 3.5 : 6.5)); const u = Math.min(1, g.prog / .8), dur = (S.alarm ? 3.5 : 6.5) * .8; g.e.x = lerp(sx, bx + .8, u); g.e.z = lerp(sz, bz + .5, u); g.vx = u < 1 ? (bx + .8 - sx) / dur : 0; g.vz = u < 1 ? (bz + .5 - sz) / dur : 0;
        turn(g.e, u < 1 ? Math.atan2(bx - sx, bz - sz) : Math.atan2(bx - g.e.x, bz - g.e.z), dt * 6); anim(g, u < 1 ? 'Running_A' : 'Cheer', { ts: .7 }); if (g.prog >= 1 && !L.lit) { L.lit = 1; g.prog = undefined; K.fire(bx, bz, 1.5, by + .55); burst(bx, by + 1, bz, 0xffa040, 3); msg(tt('ar_lit'), 'r', 2.6); S.noAlarm = false; alarm(g, 'beacon'); g.mode = 'still'; } }; },
    onKill(g) { const L = this.state; if (g === L.kp) L.kp.prog = undefined; const n = L.east.filter(o => o.dead).length; if (n >= 2 && !L.kp.dead) this.keeperGo(); if (L.phase === 1 && L.east.every(o => o.dead)) { L.phase = 2; setTimeout(() => { if (S && !S.over) { msg(tt('ar_ropes'), '', 2.6); tip(tt('ar_ropes'), 6); } }, 900); } },
    onAlarm() { this.keeperGo(); },
    watch(g) { if (g.sus > .45 && g !== this.state.kp) this.keeperGo(); return false; },
    onRope() { const L = this.state; if (L.r1.cut && L.r2.cut && !L.bridge.fall) { L.bridge.fall = true; } },
    tick(dt) { const L = this.state, B = L.bridge; if (B.fall && B.ang < Math.PI / 2) { B.v += dt * 3.2; B.ang = Math.min(Math.PI / 2, B.ang + B.v * dt); B.piv.rotation.x = B.ang; if (B.ang >= Math.PI / 2) { B.v = 0; L.bcol.min[1] = L.bcol.max[1] = -99; Sfx.big && Sfx.big(); S.shake = 1;
          for (let i = 0; i < 7; i++) burst(rnd(-2.6, 2.6), .6, -116.2 + rnd(1, 6), 0xa89070, 2.4, true); msg(tt('ar_gate'), '', 2.6); L.chargeT = S.t;
          for (let i = 0; i < 6; i++) { const m = K.maiden(-3 + i * 1.2, -44 - (i % 2) * 1.6); m.st = 'move'; m.delay = i * .25; m.to = [-1.5 + (i % 3) * 1.5, -112, 1]; m.sp = 4.6; } S.chargers = 1; } } },
    count() { const L = this.state; if (L.phase === 1) return '🎯 ' + L.east.filter(g => g.dead).length + '/7' + (L.lit ? '  🔥' : '') + (S.alarm ? '  ⚔ ' + S.rushers.filter(g => !g.dead).length : ''); return '🪢 ' + [L.r1, L.r2].filter(r => r.cut).length + '/2'; },
    check() { const L = this.state; if (L.chargeT && S.t - L.chargeT > 4.5 && S.rushers.every(g => g.dead || !g.on)) return 'win'; return null; },
    allStar() { const L = this.state; return L.w1.dead && L.w2.dead && !L.lit; } },
  // tutorial (mission 0-0, tutorial agent's step "sniper"): training range by the river — static ~50 m, moving cart ~75 m, far ~120 m with wind; no guards, no alarm, ∞ arrows.
  'TU-S': { id: 'TU-S', ch: 3, mood: 'DAY', cam: [0, 4], camH: 3.2, yaw: 0, pitch: -.02, yawLim: [-.6, .6], focus: [0, -70], wind: [0, 0], windA: 0, arrows: 999, noBanner: true, tips: true,
    build(K, S) { const L = this.state; K.hide({ col: 0x8c7a58, w: 6, d: 5, n: 8 });
      L.t = [K.target(-3, -46), K.target(0, -71, { cart: [6, 1.6] }), K.target(4, -116, { R: .9 })]; L.t[2].final = true; L.stage = 0;
      for (const [x, z] of [[-6, -48], [6.5, -73], [-2, -118]]) K.banner(x, z, 0x8a1c14, { scale: .6 }); K.horse(-9, -60, .6); },
    start() { this.stage(0); },
    stage(i) { const L = this.state; L.stage = i; L.miss = 0; S.wS = S.wTo = i === 2 ? 2.4 : 0; S.wT = 1e9;
      const tips = [['tu_t_bow1', 'ar_t2', 'ar_t3'], ['tu_t_bow2', 'ar_t4'], ['tu_t_bow3', 'ar_t5', 'ar_t3']][i]; tips.forEach((k, j) => setTimeout(() => S && !S.over && L.stage === i && !S.cine && tip(tt(k), 5.5), 300 + j * 6000)); },
    onTgt(T, h) { const L = this.state, i = L.t.indexOf(T); if (i !== L.stage) return; if (i === 2) L.bull = h.head; setTimeout(() => { if (!S || S.over) return; if (i < 2) this.stage(i + 1); else L.done = 1; }, 900); },
    tick() { const L = this.state; if (S.flying.length === 0 && S.shots > (L.shots0 || 0)) { } },
    count() { const L = this.state; return '🎯 ' + Math.min(3, L.stage + (L.done ? 1 : 0)) + '/3' + (S.wS ? '  🌬' : ''); },
    check() { return this.state.done && !S.cine ? 'win' : null; },
    allStar() { return !!this.state.bull; } },
};
for (const k in LEVELS) LEVELS[k].state = {};
