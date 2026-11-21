// Level scenery for "Qirq qiz": terrain relief, animated sea + beach, rivers + bridge, Central-Asian flora (instanced),
// procedural wooden ships, Khorezm-style walled city, black-yurt horde camp. Everything outside the play lane |x| < G.W;
// the lane itself stays at height 0 (except the river channel under the bridge, which is walled off by colliders).
import { THREE, G, SET, world, scene, renderer, gradePass, woodMat, yurt, decor, banner, fire } from './engine.js?v=1795218616';
import { ENV, pbrMat, place, applyLight, redress, roadify, roadX } from './env.js?v=1795218616';
import * as FX from './fx.js?v=1795218616';

const Q = Math.max(0, Math.min(2, SET.q ?? 1));
let sd = 1; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const rr = (a, b) => a + R() * (b - a); const seed = s => { sd = Math.abs(Math.floor(s * 7919 + 13)) % 2147483646 + 1; for (let i = 0; i < 5; i++) R(); };
const pick = a => a[Math.floor(R() * a.length)];
const sst = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vn(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, o = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, z * f); f *= 2.03; a *= .5; } return s / (1 - Math.pow(.5, o)); }
const C = (h) => new THREE.Color(h);
export const WATER = -0.32, RIVER = -0.42;
const U = { uT: { value: 0 } };
let tickers = [], HF = null, LANE_END = -1e9;
export const heightAt = (x, z) => (HF ? HF(x, z) : 0);
const laneF = x => sst(G.W + 1.2, G.W + 6.5, Math.abs(x));
const SCN = { }; const DBG = new URLSearchParams(location.search).get('scdbg') || '';   // per-level info (for map/tests)

// ---------- geometry helpers ----------
function colorGeo(g, c) { if (g.index) g = g.toNonIndexed(); const p = g.attributes.position, n = p.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = typeof c === 'function' ? c(p.getX(i), p.getY(i), p.getZ(i), i) : c; a[i * 3] = v.r; a[i * 3 + 1] = v.g; a[i * 3 + 2] = v.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function merge(list) {
  let n = 0; const L2 = list.filter(Boolean).map(g => { if (g.index) g = g.toNonIndexed(); if (!g.attributes.normal) g.computeVertexNormals(); n += g.attributes.position.count; return g; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = new Float32Array(n * 3).fill(1), UV = new Float32Array(n * 2).fill(.012); let o = 0;
  for (const g of L2) { const c = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.color) Cc.set(g.attributes.color.array, o * 3); if (g.attributes.uv) UV.set(g.attributes.uv.array, o * 2); o += c; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); m.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); m.computeBoundingSphere(); return m;
}
const _up = new THREE.Vector3(0, 1, 0), V = (x, y, z) => new THREE.Vector3(x, y, z);
function limb(a, b, r0, r1, col, seg = 5) { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, true); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, d.normalize())); g.translate(a.x, a.y, a.z); return colorGeo(g, (x, y) => col.clone().multiplyScalar(.82 + .3 * hash(x * 3.1, y * 2.7 + z0(x)))); }
const z0 = x => x * .37;
// foliage blob: displaced icosphere with soft outward normals and AO-ish vertical gradient
function blob(cx, cy, cz, r, sx, sy, sz, col, det = 1, rough = .45, col2) {
  const g = new THREE.IcosahedronGeometry(r, Q ? det : 0); const p = g.attributes.position, n = new Float32Array(p.count * 3), cl = new Float32Array(p.count * 3);
  const kx = R() * 9, kz = R() * 9;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const l = Math.hypot(x, y, z) || 1; const k = 1 + rough * (hash(Math.round(x * 40) + kx, Math.round(y * 40) * 1.3 + Math.round(z * 40) * .7 + kz) - .5);
    const nx = x / l, ny = y / l, nz = z / l; x *= k * sx; y *= k * sy; z *= k * sz; p.setXYZ(i, x + cx, y + cy, z + cz); n[i * 3] = nx; n[i * 3 + 1] = ny * .8 + .2; n[i * 3 + 2] = nz;
    const t = (ny + 1) / 2, j = .85 + .3 * hash(Math.round(x * 30) + kz, Math.round(z * 30) + kx); const c = (col2 && hash(Math.round(x * 9) + kx, Math.round(y * 9 + z * 7)) > .55 ? col2 : col).clone().multiplyScalar((.55 + .6 * t) * j); cl[i * 3] = c.r; cl[i * 3 + 1] = c.g; cl[i * 3 + 2] = c.b; }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); return g;
}
// soft materials
const mcache = {};
function windMat(key, wk = .07, o = {}) { if (mcache[key]) return mcache[key]; const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0, ...o });
  m.onBeforeCompile = sh => { sh.uniforms.uT = U.uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    #ifdef USE_INSTANCING
      vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
    #else
      vec2 ip = (modelMatrix * vec4(0., 0., 0., 1.)).xz;
    #endif
    float wk = pow(max(position.y, 0.) * ${wk.toFixed(3)}, 2.);
    transformed.x += sin(uT * 1.6 + ip.x * .31 + ip.y * .17 + position.y * .45) * wk;
    transformed.z += sin(uT * 1.23 + ip.y * .29 + position.x * .8) * wk * .6;`); };
  m.customProgramCacheKey = () => 'wind' + wk; return mcache[key] = m; }
function vcMat(key, o = {}) { return mcache[key] || (mcache[key] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0, ...o })); }
function canvasTex(w, h, fn, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
const tcache = {}; const tex = (k, mk) => tcache[k] || (tcache[k] = mk());

// instanced scatter: list of [x, z, scale, rotY, tint]
function inst(geo, mat, list, { shadow = true, sink = .08, yFn } = {}) {
  if (!list.length) return null; const m = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((it, i) => { const [x, z, s, ry, tn] = it; o.position.set(x, (yFn ? yFn(x, z) : heightAt(x, z)) - sink * s, z); o.rotation.set(it[5] || 0, ry, it[6] || 0); o.scale.setScalar(s); if (it[7]) o.scale.y *= it[7]; o.updateMatrix(); m.setMatrixAt(i, o.matrix); c.setScalar(1); if (tn) c.copy(tn); m.setColorAt(i, c); });
  m.castShadow = shadow && Q > 0; m.receiveShadow = Q > 0; m.computeBoundingSphere(); m.userData.scn = 1; world.add(m); return m;
}
// instanced copies of a scanned PBR model from env.js (ENV.mod[name] parts): list of [x, z, scale, rotY]
function instModel(name, list, { sink = .1 } = {}) { const parts = ENV.mod[name]; if (!parts || !list.length) return; const o = new THREE.Object3D(), M = new THREE.Matrix4();
  parts.forEach((pt, pi) => { const its = list.filter((_, i) => i % parts.length === pi); if (!its.length) return; const mk = 'im' + name + pi; const mat = mcache[mk] || (mcache[mk] = (() => { const c = pt.material.clone(); c.color = c.color.clone().multiply(C(0xb8a490)); return c; })()); const m = new THREE.InstancedMesh(pt.geometry, mat, its.length);
    its.forEach((it, i) => { o.position.set(it[0], heightAt(it[0], it[1]) - sink * it[2], it[1]); o.rotation.set(0, it[3], 0); o.scale.setScalar(it[2]); o.updateMatrix(); M.multiplyMatrices(o.matrix, pt.mw); m.setMatrixAt(i, M); });
    m.castShadow = Q > 0; m.receiveShadow = true; m.computeBoundingSphere(); m.userData.scn = 1; world.add(m); }); }
function addMesh(geo, mat, { shadow = true, recv = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow && Q > 0; m.receiveShadow = recv && Q > 0; m.userData.scn = 1; world.add(m); return m; }

// ---------- flora (procedural, built once, instanced) ----------
const BARK = C(0x6b5a48), BARK_G = C(0x8a8174), BARK_D = C(0x4a3a2c);
function branchy(base, dir, len, r, depth, col, out, ends, twist = .5, spread = .7, kids = 3) {
  const segs = depth > 0 ? 3 : 2; let a = base.clone(), d = dir.clone().normalize(), rr0 = r;
  for (let s = 0; s < segs; s++) { d.add(V(rr(-twist, twist), rr(-twist * .4, twist * .5), rr(-twist, twist))).normalize(); const b = a.clone().addScaledVector(d, len / segs); const r1 = rr0 * .8; out.push(limb(a, b, rr0, r1, col, depth > 1 ? 5 : depth ? 4 : 3)); a = b; rr0 = r1; }
  if (depth <= 0) { ends.push({ p: a, d }); return; }
  const n = kids + (R() < .5 ? 1 : 0); for (let k = 0; k < n; k++) { const nd = d.clone().add(V(rr(-spread, spread), rr(-.1, .5), rr(-spread, spread))).normalize(); branchy(a, nd, len * rr(.55, .75), rr0 * .75, depth - 1, col, out, ends, twist, spread, Math.max(2, kids - 1)); }
  if (depth === 1) ends.push({ p: a, d });
}
// foliage atlas (grayscale, tinted by vertex colour): q0 broadleaf, q1 juniper scales, q2 saxaul twigs, q3 tamarisk plumes; opaque white corner for trunks
function foliageAtlas() { return tex('atlas', () => { const t = canvasTex(512, 512, (g) => { g.clearRect(0, 0, 512, 512); g.fillStyle = '#fff'; g.fillRect(0, 496, 16, 16);
  const qd = (q, fn) => { g.save(); g.translate((q % 2) * 256, Math.floor(q / 2) * 256); g.beginPath(); g.rect(2, 2, 252, 252); g.clip(); fn(); g.restore(); };
  const gr = (a, b) => { const v = a + Math.random() * (b - a) | 0; return `rgb(${v},${v},${v})`; };
  qd(0, () => { for (let i = 0; i < 260; i++) { const a = Math.random() * 6.28, d = Math.pow(Math.random(), .6) * 112, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d * .9; g.save(); g.translate(x, y); g.rotate(Math.random() * 6.28); g.fillStyle = gr(110 + (128 - d) * .5, 210 + (128 - d) * .3); g.beginPath(); g.ellipse(0, 0, 9, 4.5, 0, 0, 6.28); g.fill(); g.strokeStyle = 'rgba(60,60,60,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); g.restore(); } });
  qd(1, () => { for (let i = 0; i < 90; i++) { const a = Math.random() * 6.28, d = Math.pow(Math.random(), .7) * 105, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d; for (let k = 0; k < 9; k++) { const b = Math.random() * 6.28, L = 6 + Math.random() * 12; g.strokeStyle = gr(100, 220); g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(b) * L, y + Math.sin(b) * L); g.stroke(); } } });
  qd(2, () => { for (let i = 0; i < 70; i++) { let x = 128 + (Math.random() - .5) * 200, y = 40 + Math.random() * 60, a = Math.PI / 2 + (Math.random() - .5) * 1.4; g.strokeStyle = gr(130, 230); g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 9; k++) { a += (Math.random() - .5) * .5; x += Math.cos(a) * 11; y += Math.sin(a) * 11; g.lineTo(x, y); } g.stroke(); } });
  qd(3, () => { for (let i = 0; i < 46; i++) { let x = 128 + (Math.random() - .5) * 190, y = 230, a = -Math.PI / 2 + (Math.random() - .5) * 1.1; g.strokeStyle = gr(120, 170); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); const pts = []; for (let k = 0; k < 12; k++) { a += (Math.random() - .5) * .25; x += Math.cos(a) * 15; y += Math.sin(a) * 15; g.lineTo(x, y); pts.push([x, y]); } g.stroke(); for (const [px, py] of pts.slice(3)) for (let k = 0; k < 7; k++) { g.fillStyle = gr(170, 255); g.beginPath(); g.arc(px + (Math.random() - .5) * 12, py + (Math.random() - .5) * 12, 1.8 + Math.random() * 1.8, 0, 6.28); g.fill(); } } });
}); t.colorSpace = THREE.SRGBColorSpace; return t; }); }
// crossed alpha cards for a foliage clump; normals point away from the crown centre (soft, volumetric shading)
function cards(cx, cy, cz, r, sx, sy, sz, col, col2, q, n, ctr) {
  const P = [], N = [], UVs = [], CL = [], u0 = (q % 2) * .5, v0 = 1 - Math.floor(q / 2) * .5 - .5;
  for (let k = 0; k < n; k++) { const ry = rr(0, 3.14), rx = rr(-.5, .5) + (k % 3 === 2 ? 1.2 : 0); const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rr(-.3, .3)));
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(a * r * sx, b * r * sy, 0).applyMatrix4(m).add(V(cx, cy, cz)));
    const c = (R() < .4 && col2 ? col2 : col).clone().multiplyScalar(rr(.85, 1.1));
    for (const i of [0, 1, 2, 0, 2, 3]) { const p = corners[i]; P.push(p.x, p.y, p.z); const nn = p.clone().sub(ctr).normalize(); nn.y = nn.y * .7 + .35; nn.normalize(); N.push(nn.x, nn.y, nn.z);
      UVs.push(u0 + ([0, 1, 1, 0][i]) * .5, v0 + ([0, 0, 1, 1][i]) * .5); const ao = .55 + .5 * Math.min(1, Math.max(0, (p.y - ctr.y) / (r * 2) + .5)); CL.push(c.r * ao, c.g * ao, c.b * ao); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); g.userData.card = 1; return g;
}
const FLORA = {
  saxaul() { const parts = [], ends = [], h = rr(2.2, 3.2); const nT = 2 + (R() < .6 ? 1 : 0) + (R() < .3 ? 1 : 0);
    for (let i = 0; i < nT; i++) { const a = i / nT * 6.28 + rr(-.4, .4); branchy(V(rr(-.15, .15), 0, rr(-.15, .15)), V(Math.cos(a) * .5, 1, Math.sin(a) * .5), h * .55, .11, 2, BARK_G, parts, ends, .55, .8, 2); }
    const ctr = V(0, h * .75, 0); for (const e of ends) { if (R() < .2) continue; parts.push(cards(e.p.x, e.p.y - .1, e.p.z, rr(.45, .7), 1.2, .9, 1, C(0xa8b882), C(0xc0c090), 2, 2, ctr)); } return parts; },
  deadSaxaul() { const parts = [], ends = []; for (let i = 0; i < 3; i++) { const a = i * 2.1 + rr(-.4, .4); branchy(V(0, 0, 0), V(Math.cos(a) * .7, 1, Math.sin(a) * .7), rr(1.2, 1.8), .09, 2, C(0x9a8f80), parts, ends, .6, .9, 2); } return parts; },
  tamarisk() { const parts = [], ends = [], n = 6 + Math.floor(R() * 4), h = rr(2.4, 3.6);
    for (let i = 0; i < n; i++) { const a = rr(0, 6.28), lean = rr(.15, .6); branchy(V(0, 0, 0), V(Math.cos(a) * lean, 1, Math.sin(a) * lean), h * rr(.45, .65), .05, 1, C(0x6e4b3c), parts, ends, .25, .5, 2); }
    const pink = R() < .75, ctr = V(0, h * .6, 0); for (const e of ends) parts.push(cards(e.p.x, e.p.y, e.p.z, rr(.55, .8), .8, 1.25, 1, pink ? C(0xf0a8d0) : C(0xb8c898), pink ? C(0xc8b0d8) : C(0xd0c8a0), 3, 2, ctr)); return parts; },
  turanga() { const parts = [], ends = [], h = rr(6, 8.5); const lean = V(rr(-.25, .25), 1, rr(-.25, .25)); branchy(V(0, 0, 0), lean, h * .5, .3, 2, BARK_D, parts, ends, .3, .75, 3);
    const ctr = V(0, h * .8, 0); for (const e of ends) parts.push(cards(e.p.x, e.p.y + .3, e.p.z, rr(1.1, 1.6), 1.2, .85, 1, C(0xa8c060), C(0xc8d070), 0, 3, ctr)); return parts; },
  poplar() { const parts = [], h = rr(11, 15); parts.push(limb(V(0, 0, 0), V(0, h * .9, 0), .28, .08, BARK_G, 6)); const ctr = V(0, h * .55, 0);
    for (let k = 0; k < 7; k++) { const y = h * (.2 + k * .115), r = (1.25 - k * .12) * rr(.9, 1.1); parts.push(cards(rr(-.2, .2), y, rr(-.2, .2), r * 1.1, .8, 1.5, 1, C(0x88b850), C(0xa0c860), 0, 3, ctr)); } return parts; },
  elm() { const parts = [], ends = [], h = rr(5.5, 7); parts.push(limb(V(0, 0, 0), V(rr(-.2, .2), h * .45, rr(-.2, .2)), .38, .28, BARK_D, 7)); branchy(V(0, h * .42, 0), V(0, 1, 0), h * .35, .26, 1, BARK_D, parts, ends, .25, .9, 4);
    const ctr = V(0, h * .75, 0); for (const e of ends) parts.push(cards(e.p.x, e.p.y + .4, e.p.z, rr(1.5, 2), 1.1, .85, 1, C(0x78a848), C(0x98b858), 0, 3, ctr)); parts.push(cards(0, h * .82, 0, 2.3, 1.2, .8, 1, C(0x709a40), null, 0, 3, ctr)); return parts; },
  juniper() { const parts = [], ends = [], h = rr(3, 5.5); branchy(V(0, 0, 0), V(rr(-.3, .3), 1, rr(-.3, .3)), h * .45, .2, 1, C(0x5a4636), parts, ends, .45, .6, 3); const ctr = V(0, h * .5, 0);
    for (let k = 0; k < 4; k++) { const y = h * (.28 + k * .18); parts.push(cards(rr(-.3, .3), y, rr(-.3, .3), (1.35 - k * .25) * rr(.85, 1.1), 1, 1.1, 1, C(0x6a8a60), C(0x80985c), 1, 3, ctr)); } for (const e of ends) parts.push(cards(e.p.x, e.p.y, e.p.z, rr(.6, .9), 1, 1, 1, C(0x6a8a5e), null, 1, 2, ctr)); return parts; },
  bush() { const parts = [], ctr = V(0, .3, 0); const col = R() < .5 ? C(0xb8b078) : C(0xa0b070); for (let k = 0; k < 3; k++) parts.push(cards(rr(-.35, .35), rr(.3, .45), rr(-.35, .35), rr(.45, .6), 1.2, .75, 1, col, C(0xc8b880), 2, 2, ctr)); return parts; },
  reeds() { const parts = [], n = 9 + Math.floor(R() * 5);
    for (let i = 0; i < n; i++) { const a = rr(0, 6.28), d = rr(0, .45), x = Math.cos(a) * d, z = Math.sin(a) * d, h = rr(1.8, 3), lx = rr(-.35, .35), lz = rr(-.35, .35), w = .045;
      const g = new THREE.BufferGeometry(); const pos = [x - w, 0, z, x + w, 0, z, x + lx * .5, h * .6, z + lz * .5, x + lx, h, z + lz]; g.setAttribute('position', new THREE.Float32BufferAttribute([...pos.slice(0, 3), ...pos.slice(3, 6), ...pos.slice(6, 9), ...pos.slice(3, 6), ...pos.slice(9, 12), ...pos.slice(6, 9)], 3)); g.computeVertexNormals();
      const nm = g.attributes.normal; for (let k = 0; k < nm.count; k++) nm.setXYZ(k, nm.getX(k) * .4, .9, nm.getZ(k) * .4);
      parts.push(colorGeo(g, (X, Y) => C(0x6f8a3c).lerp(C(0xc8b77a), Math.min(1, Y / h * 1.1)).multiplyScalar(.7 + .5 * Y / h)));
      if (R() < .45) parts.push(blob(x + lx, h + .08, z + lz, .07, .8, 2.6, .8, C(0x7a5a40), 0, .3)); }
    return parts; },
  grass() { const parts = []; for (let i = 0; i < 7; i++) { const a = rr(0, 6.28), x = Math.cos(a) * rr(0, .3), z = Math.sin(a) * rr(0, .3), h = rr(.4, .8), lx = rr(-.3, .3), lz = rr(-.3, .3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([x - .05, 0, z, x + .05, 0, z, x + lx, h, z + lz], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3)); parts.push(colorGeo(g, (X, Y) => C(0x5d7a32).lerp(C(0xa8a85a), Y / h))); } return parts; },
  rock() { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position; const k1 = R() * 9; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = .75 + .5 * hash(Math.round(x * 20) + k1, Math.round(y * 20) * 1.7 + Math.round(z * 20)); p.setXYZ(i, x * k * 1.2, Math.max(-.3, y * k * .7), z * k); } g.computeVertexNormals(); return [colorGeo(g, (x, y, z) => C(0x8a7a66).multiplyScalar(.7 + .35 * hash(Math.round(x * 6), Math.round(z * 6 + y * 4)) + y * .15))]; },
};
const FCACHE = {};
function floraGeo(type, v) { const k = type + v; if (FCACHE[k]) return FCACHE[k]; const s0 = sd; seed(v * 101 + type.length * 17); const g = merge(FLORA[type]().map(p => { if (!p.userData.card && p.attributes.uv) p.deleteAttribute('uv'); return p; })); sd = s0; return FCACHE[k] = g; }
const WK = { saxaul: .08, deadSaxaul: .02, tamarisk: .12, turanga: .045, poplar: .03, elm: .04, juniper: .03, bush: .1, reeds: .22, grass: .35, rock: 0 };
// plant a list of [x, z, s, ...] for a flora type split over its variants
function floraMat(type) { const k = 'f' + type; if (mcache[k]) return mcache[k]; return windMat(k, WK[type] || .05, { map: foliageAtlas(), alphaTest: .42, side: THREE.DoubleSide }); }
let fDepth = null; const floraDepth = () => fDepth || (fDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: foliageAtlas(), alphaTest: .42 }));
function plant(type, list, opt = {}) { if (DBG.includes('noflora')) return; const nv = opt.nv || 3; const bins = Array.from({ length: nv }, () => []); list.forEach((it, i) => bins[i % nv].push(it));
  bins.forEach((b, v) => { const m = inst(floraGeo(type, v), type === 'rock' ? vcMat('rock') : floraMat(type), b, { shadow: opt.shadow ?? (type !== 'grass'), sink: opt.sink ?? .06 }); if (m && type !== 'rock') m.customDepthMaterial = floraDepth(); }); }
// scatter helper: generate n samples over [x0,x1]x[z0,z1] (both sides mirrored if side=0) accepted by fn -> scale (0 = reject)
function scatter(n, x0, x1, z0, z1, fn, both = true) { const out = []; for (let i = 0; i < n; i++) { const s = both ? (R() < .5 ? -1 : 1) : 1; const x = s * (x0 + (x1 - x0) * Math.pow(R(), 2.1)), z = rr(z1, z0); const k = fn(x, z); if (k) out.push([x, z, k, rr(0, 6.28), C(0xffffff).multiplyScalar(rr(.82, 1.12)).lerp(C(0xffe0b0), rr(0, .25))]); } return out; }
const dens = n => Math.round(n * [.45, .75, 1][Q]);

// ---------- terrain relief (rebuilds the flat ground planes made by engine.ground) ----------
function groundMeshes() { return world.children.filter(o => o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.width === 80 && Math.abs(o.position.y) < .01 && Math.abs(o.rotation.x + Math.PI / 2) < .01); }
function terrain(prof) { if (DBG.includes('noterr')) { HF = prof.h; return; }
  for (const g of groundMeshes()) {
    const L = g.geometry.parameters.height, zc = g.position.z, zN = zc + L / 2, zF = zc - L / 2;
    const fade = z => (prof.noFade ? 1 : sst(zN - 1, zN - 11, z) * sst(zF + 1, zF + 9, z));
    const hf = (x, z) => { let h = prof.h(x, z); h = h > 0 ? h * fade(z) : h; if (Math.abs(x) < G.W + .25 && h < -.04 && !(prof.laneDip && prof.laneDip(x, z))) h = -.04; return h; };
    const prev = HF; HF = (x, z) => (z <= zN && z >= zF ? hf(x, z) : prev ? prev(x, z) : 0);
    const xs = [], X = prof.xMax || 70, st = x => { const a = Math.abs(x); return a < G.W - 2 ? 2.5 : a < 36 ? [1.6, 1.05, .9][Q] : 3.5; };
    for (let x = -X; x < X - .3; x += st(x)) xs.push(x); xs.push(X);
    const dz = [2, 1.4, 1.15][Q], nz = Math.ceil(L / dz) + 1, nx = xs.length;
    const P = new Float32Array(nx * nz * 3), UV = new Float32Array(nx * nz * 2), CL = new Float32Array(nx * nz * 3), TN = new Float32Array(nx * nz * 4);
    for (let j = 0; j < nz; j++) { const z = Math.max(zF, zN - j * dz); for (let i = 0; i < nx; i++) { const x = xs[i], h = hf(x, z), k = j * nx + i;
      P[k * 3] = x; P[k * 3 + 1] = h; P[k * 3 + 2] = z; UV[k * 2] = (x + Math.sign(x) * Math.abs(h) * .85 + 40) / 80; UV[k * 2 + 1] = (z - zF) / L;
      const c = prof.col ? prof.col(x, z, h) : [1, 1, 1]; CL[k * 3] = c[0]; CL[k * 3 + 1] = c[1]; CL[k * 3 + 2] = c[2]; if (prof.tint) { const t = prof.tint(x, z, h); TN.set(t, k * 4); } } }
    const idx = []; for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, b, c, b, d, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); geo.setAttribute('color', new THREE.BufferAttribute(CL, 3)); geo.setAttribute('tint', new THREE.BufferAttribute(TN, 4)); geo.setIndex(idx); geo.computeVertexNormals();
    g.geometry.dispose(); g.geometry = geo; g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.updateMatrix();
    const m = g.material.clone(); m.vertexColors = true; if (prof.matTint) m.color.multiply(C(prof.matTint)); if (prof.mat) Object.assign(m, prof.mat);
    m.onBeforeCompile = sh => { sh.vertexShader = 'attribute vec4 tint; varying vec4 vTint;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vTint = tint;');
      sh.fragmentShader = 'varying vec4 vTint;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n { float lum = dot(diffuseColor.rgb, vec3(.299, .587, .114)); diffuseColor.rgb = mix(diffuseColor.rgb, vTint.rgb * (lum * 1.5 + .2), vTint.a); }'); };
    m.customProgramCacheKey = () => 'terrTint'; if (ROAD) roadify(m, ROAD); g.material = m; g.userData.terr = 1; g.castShadow = !!prof.shadow && Q > 0; g.receiveShadow = true;
  }
}
// drop / lift the level's existing props onto the relief; remove the ones that would stand in water
function settle(wet = WATER) {
  const rm = [];
  for (const o of world.children) { if (o.userData.scn || o.userData.terr || o.userData.dress) continue;
    if (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && Math.abs(o.position.y + .25) < 1e-4) { rm.push(o); continue; } // old flat water() planes
    if (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && o.material && o.material.alphaMap && o.material.polygonOffset) { const h = heightAt(o.position.x, o.position.z); if (h < -.03 || h > .25 || (SCN.noDecal && SCN.noDecal(o.position.x, o.position.z))) rm.push(o); continue; } // burned-ground decals
    const x = o.position.x, z = o.position.z; if (Math.abs(x) < G.W + .6 || Math.abs(o.position.y) > .06) continue; const h = heightAt(x, z);
    if (h < wet - .08) { rm.push(o); continue; } if (h < 5) o.position.y = h - .06; }
  rm.forEach(o => world.remove(o)); redress(world, heightAt, wet);
}
// colour helpers for terrain vertex tints (multiplied with the PBR ground texture)
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const SAND = [1.13, 1.04, .86], WETS = [.62, .55, .46], SALT = [1.25, 1.24, 1.2], GRASS = [.6, .82, .36], ROCK = [.86, .8, .76], RED = [1.05, .78, .62];

// ---------- water shaders ----------
const GLSL = `
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vno(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(hh(i), hh(i + vec2(1., 0.)), u.x), mix(hh(i + vec2(0., 1.)), hh(i + vec2(1., 1.)), u.x), u.y); }
float WV(vec2 p, float t){ return sin(p.x * .21 + t * 1.1 + p.y * .04) * .22 + sin(p.y * .17 - t * .9 + p.x * .07) * .17 + sin(p.x * .6 + p.y * .5 + t * 2.1) * .06 + sin((-p.x * .4 + p.y * .9) * 1.3 + t * 2.7) * .035; }
`;
const WV = (x, z, t) => Math.sin(x * .21 + t * 1.1 + z * .04) * .22 + Math.sin(z * .17 - t * .9 + x * .07) * .17 + Math.sin(x * .6 + z * .5 + t * 2.1) * .06 + Math.sin((-x * .4 + z * .9) * 1.3 + t * 2.7) * .035;
function seaMat(sdGLSL) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .24, metalness: 0, transparent: true, envMapIntensity: .18 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = U.uT; const head = 'uniform float uT; varying vec3 vWp; varying float vSd; varying float vH;\n' + GLSL;
    sh.vertexShader = head + `float SD(vec2 p){ ${sdGLSL} }\n` + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3(0., 1., 0.);
        { vec4 w0 = modelMatrix * vec4(position, 1.); float am = smoothstep(-1., 8., SD(w0.xz)); float e = .6;
          float dx = (WV(w0.xz + vec2(e, 0.), uT) - WV(w0.xz - vec2(e, 0.), uT)) / (2. * e) * am, dz = (WV(w0.xz + vec2(0., e), uT) - WV(w0.xz - vec2(0., e), uT)) / (2. * e) * am;
          objectNormal = normalize(vec3(-dx, 1., -dz)); }`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
        { vec4 w0 = modelMatrix * vec4(position, 1.); float s0 = SD(w0.xz); float am = smoothstep(-1., 8., s0);
          float h = WV(w0.xz, uT) * am + .08 * sin(s0 * 1.4 - uT * 1.6) * smoothstep(-.6, 1.4, s0) * (1. - smoothstep(3., 9., s0));
          transformed.y += h; vSd = s0; vH = h; vWp = w0.xyz + vec3(0., h, 0.); }`);
    sh.fragmentShader = head + `float SD(vec2 p){ ${sdGLSL} }\n` + sh.fragmentShader
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float sdF = SD(vWp.xz); float dep = smoothstep(1., 16., sdF);
        vec3 wc = mix(vec3(.24, .7, .7), vec3(.05, .27, .45), dep);
        wc = mix(wc, vec3(.5, .62, .52), (1. - smoothstep(-.8, 1.4, sdF)) * .4);
        float fn = vno(vWp.xz * 1.1 + vec2(uT * .25, uT * .1)) * .6 + vno(vWp.xz * 3.3 - vec2(uT * .35, 0.)) * .4;
        float band = sin(sdF * 1.4 - uT * 1.6) * .5 + .5;
        float sf = (1. - smoothstep(0., 3.8, sdF)) * smoothstep(.4, .72, fn * .75 + band * .5) * .95;
        float edge = (1. - smoothstep(-.5, .5, sdF)) * (.7 + .3 * band);
        float cap = smoothstep(.26, .42, vH) * smoothstep(.55, .8, fn) * smoothstep(6., 16., sdF);
        float foam = clamp(max(max(sf, edge * .9), cap * .8), 0., 1.);
        vec4 diffuseColor = vec4(mix(wc, vec3(.94, .96, .93), foam), clamp(mix(.8, .97, smoothstep(-.8, 3., sdF)) + foam * .4, 0., 1.));`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(roughness, .8, foam);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 q = vWp.xz; float a1 = q.x * 1.7 + uT * 1.9 + sin(q.y * .9), a2 = q.y * 2.1 - uT * 1.5 + sin(q.x * 1.1), a3 = q.x * 3.3 - q.y * 2.7 + uT * 3.1;
          vec3 rn = vec3(cos(a1) * .08 + cos(a3) * .045, 0., cos(a2) * .08 - cos(a3) * .04) * (1. - foam);
          normal = normalize(normal + (viewMatrix * vec4(rn, 0.)).xyz); }`); };
  m.customProgramCacheKey = () => 'sea3' + sdGLSL; return m;
}
function riverMat() { if (mcache.river) return mcache.river;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .44, metalness: 0, transparent: true, envMapIntensity: .15 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = U.uT; const head = 'uniform float uT; varying vec2 vR; varying vec3 vWp;\n' + GLSL;
    sh.vertexShader = head + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vR = uv; vec4 w0 = modelMatrix * vec4(position, 1.); transformed.y += sin(w0.x * .9 + uT * 2.) * .025 + sin(w0.z * .7 - uT * 1.6) * .02; vWp = w0.xyz;`);
    sh.fragmentShader = head + sh.fragmentShader
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        vec2 f = vec2(vR.x * 2.5, vR.y - uT * .45);
        float n = vno(f * vec2(2.2, 1.3)) * .6 + vno(f * vec2(5., 3.) + 7.) * .4;
        float mid = smoothstep(0., .3, vR.x) * smoothstep(1., .7, vR.x);
        vec3 wc = mix(vec3(.3, .35, .29), vec3(.05, .19, .3), mid) + (n - .5) * .06;
        float foam = (1. - smoothstep(.1, .24, min(vR.x, 1. - vR.x))) * smoothstep(.45, .75, n) + smoothstep(.8, .95, n) * .35 * mid;
        foam = clamp(foam, 0., 1.);
        vec4 diffuseColor = vec4(mix(wc, vec3(.85, .86, .8), foam * .8), mix(.8, .95, mid));`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(roughness, .7, foam);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float a = f.y * 9. + n * 5., b = f.x * 7. + n * 4. + uT; vec3 rn = vec3(sin(b) * .06, 0., cos(a) * .09);
          normal = normalize(normal + (viewMatrix * vec4(rn, 0.)).xyz); }`); };
  m.customProgramCacheKey = () => 'river2'; return mcache.river = m; }
// ribbon along a path of {x,z}; uv.x across (0..1), uv.y = distance / 5
function ribbon(pts, hw, y) {
  const P = [], UVa = [], idx = []; let dist = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; if (i) dist += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    const w = typeof hw === 'function' ? hw(i) : hw; P.push(pts[i].x - tz * w, y, pts[i].z + tx * w, pts[i].x + tz * w, y, pts[i].z - tx * w); UVa.push(0, dist / 5, 1, dist / 5);
    if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UVa, 2)); g.setIndex(idx); g.computeVertexNormals();
  const nm = g.attributes.normal; for (let i = 0; i < nm.count; i++) nm.setXYZ(i, 0, 1, 0); return g;
}

// ---------- wooden ships (procedural lofted hull with curved strakes) ----------
function plankTex() { return tex('plank', () => canvasTex(512, 512, (g, w, h) => {
  const rows = 8, rh = h / rows; for (let r = 0; r < rows; r++) { const base = [[122, 84, 52], [109, 74, 45], [132, 92, 58], [100, 68, 42]][r % 4]; let x = -((r * 137) % 200);
    while (x < w) { const L = 140 + ((r * 31 + x) % 7) * 30; const v = ((r * 13 + x * 7) % 21) - 10; g.fillStyle = `rgb(${base[0] + v},${base[1] + v * .8},${base[2] + v * .6})`; g.fillRect(x, r * rh, L, rh);
      for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(50,30,15,${.08 + (k % 3) * .04})`; g.lineWidth = 1; g.beginPath(); const yy = r * rh + 4 + k * (rh - 8) / 9; g.moveTo(x, yy); for (let t = 0; t <= L; t += 20) g.lineTo(x + t, yy + Math.sin((t + k * 40 + r * 9) * .05) * 1.5); g.stroke(); }
      g.fillStyle = 'rgba(20,12,6,.75)'; g.fillRect(x, r * rh, 2, rh); g.fillStyle = 'rgba(30,20,10,.9)'; for (const yy of [.3, .7]) { g.beginPath(); g.arc(x + 7, r * rh + rh * yy, 1.6, 0, 6.3); g.fill(); } x += L; }
    g.fillStyle = 'rgba(15,9,4,.85)'; g.fillRect(0, r * rh, w, 3); g.fillStyle = 'rgba(255,230,190,.12)'; g.fillRect(0, r * rh + 3, w, 2); }
})); }
function sailTex(kind) { return tex('sail' + kind, () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = kind ? '#2b2422' : '#e6d6b4'; g.fillRect(0, 0, w, h); const st = kind ? '#7a1712' : '#a8261a';
  for (let i = 0; i < 4; i++) { g.fillStyle = st; g.fillRect(18 + i * 64, 0, 22, h); }
  g.fillStyle = kind ? '#c8a050' : '#d7a640'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 16, 24); g.lineTo(x + 32, 40); g.lineTo(x + 16, 56); g.fill(); }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,240,210'},${Math.random() * .06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2 + Math.random() * 6); }
  for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(60,40,20,.25)'; g.fillRect(0, y, w, 1.5); }
})); }
let SHIP = null;
function shipParts() { if (SHIP) return SHIP; const s0 = sd; seed(77);
  const Ls = 13, B = 3.5, D = 1.35, NU = 30, NV = 10;
  const w = s => B / 2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), 2.3)), .6), keel = s => -D * (1 - .32 * s * s), sheer = s => .8 + 1.05 * Math.pow(Math.abs(s), 3) + (s > 0 ? .3 * Math.pow(s, 6) : 0);
  const sec = (s, t) => { const a = t * Math.PI / 2; return [w(s) * Math.pow(Math.sin(a), .55), keel(s) + (sheer(s) - keel(s)) * (1 - Math.cos(a))]; };
  // hull shell (both sides)
  const P = [], UVs = [], CL = [], idx = [];
  for (const side of [-1, 1]) { const o = P.length / 3; for (let i = 0; i <= NU; i++) { const s = -1 + 2 * i / NU; for (let j = 0; j <= NV; j++) { const t = j / NV, [x, y] = sec(s, t); P.push(side * x, y, s * Ls / 2); UVs.push(s * Ls / 2 / 3.2, t * 3); const tar = y < -.15 ? .38 : y < .05 ? .6 : 1; const top = j === NV ? .7 : 1; CL.push(tar * top, tar * top, tar * top); } }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = o + i * (NV + 1) + j, b = a + 1, c = a + NV + 1, d = c + 1; if (side > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); } }
  const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); hull.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2)); hull.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); hull.setIndex(idx); hull.computeVertexNormals();
  // deck strip at deck height
  const yd = .42, DP = [], DU = [], DI = []; const half = s => { let lo = 0, hi = 1; for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (sec(s, m)[1] < yd) lo = m; else hi = m; } return sec(s, lo)[0] * .97; };
  for (let i = 0; i <= 24; i++) { const s = -.86 + 1.72 * i / 24, hw = half(s), z = s * Ls / 2; DP.push(-hw, yd, z, hw, yd, z); DU.push(-hw / 1.2, z / 3.2, hw / 1.2, z / 3.2); if (i) { const k = (i - 1) * 2; DI.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
  const deck = new THREE.BufferGeometry(); deck.setAttribute('position', new THREE.Float32BufferAttribute(DP, 3)); deck.setAttribute('uv', new THREE.Float32BufferAttribute(DU, 2)); deck.setIndex(DI); deck.computeVertexNormals();
  const hullG = merge([colorGeo(hull.toNonIndexed(), (x, y) => C(0xffffff).multiplyScalar(y < -.15 ? .4 : y < .05 ? .62 : 1)), colorGeo(deck, C(0xd8c4a8))]);
  // timber: rails, stem/stern posts, mast, yard, thwarts, oars, cargo
  const wood = [], col = C(0x8a6a48), dark = C(0x4a3424);
  const tube = (pts, r, c, seg = 40) => colorGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 6), c);
  for (const side of [-1, 1]) { const pts = []; for (let i = 0; i <= 20; i++) { const s = -.97 + 1.94 * i / 20, [x, y] = sec(s, 1); pts.push(V(side * x, y + .04, s * Ls / 2)); } wood.push(tube(pts, .09, dark));
    const p2 = []; for (let i = 0; i <= 16; i++) { const s = -.9 + 1.8 * i / 16, [x, y] = sec(s, .78); p2.push(V(side * (x + .03), y, s * Ls / 2)); } wood.push(tube(p2, .06, dark, 30)); }
  wood.push(tube([V(0, keel(1) + .1, Ls / 2), V(0, sheer(1) - .2, Ls / 2 + .25), V(0, sheer(1) + .9, Ls / 2 + .7), V(0, sheer(1) + 1.6, Ls / 2 + .45), V(0, sheer(1) + 1.55, Ls / 2 + .05)], .14, dark, 24));
  wood.push(colorGeo(new THREE.ConeGeometry(.22, .6, 6).rotateX(-Math.PI / 2.4).translate(0, sheer(1) + 1.5, Ls / 2 - .1), C(0xb08a40)));
  wood.push(tube([V(0, keel(-1) + .1, -Ls / 2), V(0, sheer(-1) - .1, -Ls / 2 - .2), V(0, sheer(-1) + .7, -Ls / 2 - .45), V(0, sheer(-1) + 1.1, -Ls / 2 - .2)], .13, dark, 20));
  wood.push(limb(V(0, yd - .1, 0.5), V(0, 9, .5), .17, .1, col, 7));
  wood.push(limb(V(-3.3, 8.1, .78), V(3.3, 8.1, .78), .09, .09, col, 6)); // yard
  wood.push(limb(V(-.9, sheer(-.85) + .2, -Ls / 2 * .85), V(-1.9, -1, -Ls / 2 - .3), .08, .08, dark, 5)); // steering oar
  wood.push(colorGeo(new THREE.BoxGeometry(.1, 1.2, .5).translate(-1.85, -.7, -Ls / 2 - .3), dark));
  for (let k = -4; k <= 4; k++) { if (k === 0) continue; const s = k / 5.2, hw = half(s); wood.push(colorGeo(new THREE.BoxGeometry(hw * 2, .1, .32).translate(0, yd + .38, s * Ls / 2), col)); }
  const oars = []; for (const side of [-1, 1]) for (let k = -3; k <= 3; k++) { if (!k) continue; const s = k / 5.2, [x, y] = sec(s, 1), z = s * Ls / 2; const a = V(side * x * .6, y + .45, z), b = V(side * (x + 3.4), -.75, z - .5); oars.push(limb(a, b, .05, .04, col, 5)); const bl = new THREE.BoxGeometry(.05, .26, 1).translate(0, 0, 0); bl.lookAt(V(side, -.3, 0)); bl.translate(b.x, b.y, b.z); oars.push(colorGeo(bl, col)); }
  for (let k = 0; k < 5; k++) { const z = rr(-4, 3.5), x = rr(-.8, .8); if (R() < .5) wood.push(colorGeo(new THREE.CylinderGeometry(.32, .32, .8, 9).translate(x, yd + .4, z), C(0x6a4a30))); else wood.push(colorGeo(new THREE.BoxGeometry(.8, .6, .8).rotateY(rr(0, 1)).translate(x, yd + .3, z), C(0x9a7a50))); }
  // shields hung along the rails (warship)
  const paint = []; const pc = [C(0x9a1e14), C(0xc8902c), C(0x1e2a44), C(0xe8dcc0)];
  for (const side of [-1, 1]) for (let k = -5; k <= 5; k++) { const s = k / 6.5, [x, y] = sec(s, 1); const g = new THREE.CylinderGeometry(.36, .36, .06, 12).rotateZ(Math.PI / 2).translate(side * (x + .06), y - .22, s * Ls / 2); paint.push(colorGeo(g, (X, Y, Z) => (Math.hypot(Y - (y - .22), Z - s * Ls / 2) < .12 ? C(0x8a7a5a) : pc[(k + 6 + (side > 0 ? 1 : 0)) % 4]))); }
  // sail: billowed cloth hanging from the yard, and a furled variant
  const sg = new THREE.PlaneGeometry(6.2, 5.2, 10, 8); const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i), u = x / 6.2 + .5, v = y / 5.2 + .5; sp.setZ(i, Math.sin(u * Math.PI) * (.35 + .9 * (1 - v)) * Math.sin(Math.PI * (.15 + .85 * v)) + .15); sp.setX(i, x * (1 - .06 * (1 - v))); } sg.translate(0, 5.45, .95); sg.computeVertexNormals();
  const furl = colorGeo(new THREE.CylinderGeometry(.28, .28, 6.2, 8).rotateZ(Math.PI / 2).translate(0, 7.75, .95), C(0xd8c8a6));
  // rigging lines
  const top = V(0, 9, .5), rope = []; const L2 = (a, b) => rope.push(a.x, a.y, a.z, b.x, b.y, b.z);
  L2(top, V(0, sheer(1) + 1.3, Ls / 2 + .4)); L2(top, V(0, sheer(-1) + .9, -Ls / 2 - .35));
  for (const side of [-1, 1]) { for (const s of [-.12, .05, .22]) { const [x, y] = sec(s, 1); L2(V(0, 8.6, .5), V(side * x, y, s * Ls / 2)); } L2(V(side * 3.3, 8.1, .78), V(side * w(-.7), sheer(-.7), -Ls / 2 * .7)); L2(V(side * 3.1, 2.85, 1.1), V(side * w(.55), sheer(.55), Ls / 2 * .55)); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rope, 3));
  SHIP = { hull: hullG, wood: merge(wood), oars: merge(oars), paint: merge(paint), sail: sg, furl, rope: rg, Ls }; sd = s0; return SHIP;
}
const ships = [];
function ship(x, z, ry, o = {}) {
  const S = shipParts(), g = new THREE.Group(); const hm = mcache.hull || (mcache.hull = new THREE.MeshStandardMaterial({ map: plankTex(), vertexColors: true, roughness: .85, side: THREE.DoubleSide }));
  const add = (geo, m, sh = true) => { const k = new THREE.Mesh(geo, m); k.castShadow = sh && Q > 0; k.receiveShadow = Q > 0; g.add(k); return k; };
  add(S.hull, hm); add(S.wood, vcMat('shipwood', { map: plankTex() })); add(S.paint, vcMat('paint', { roughness: .6 })); if (o.oars !== false) add(S.oars, vcMat('shipwood', { map: plankTex() }));
  if (o.sail === false) add(S.furl, vcMat('furl')); else add(S.sail, mcache['sm' + (o.dark ? 1 : 0)] || (mcache['sm' + (o.dark ? 1 : 0)] = new THREE.MeshStandardMaterial({ map: sailTex(o.dark ? 1 : 0), side: THREE.DoubleSide, roughness: 1 })), Q > 1);
  if (Q > 0) g.add(new THREE.LineSegments(S.rope, mcache.rope || (mcache.rope = new THREE.LineBasicMaterial({ color: 0x2a2018 }))));
  g.scale.setScalar(o.s || 1); g.position.set(x, WATER, z); g.rotation.y = ry; g.userData = { scn: 1, x, z, ry, ph: rr(0, 6), drift: o.drift || 0, s: o.s || 1 }; world.add(g); ships.push(g); return g;
}
function tickShips(t) { for (const g of ships) { const u = g.userData; if (u.drift) { u.z -= u.drift * .016; if (u.z < -420) u.z = 40; } const x = u.x, z = u.z, s = u.s * 5;
  const h0 = WV(x, z, t), hf = WV(x + Math.sin(u.ry) * s, z + Math.cos(u.ry) * s, t), hb = WV(x - Math.sin(u.ry) * s, z - Math.cos(u.ry) * s, t), hl = WV(x + Math.cos(u.ry) * 1.6, z - Math.sin(u.ry) * 1.6, t), hr = WV(x - Math.cos(u.ry) * 1.6, z + Math.sin(u.ry) * 1.6, t);
  g.position.set(x, WATER + h0 * .85 - .12, z); g.rotation.set((hb - hf) / (2 * s) * 1.2, u.ry, (hl - hr) / 3.2 * .8 + Math.sin(t * .7 + u.ph) * .02, 'YXZ'); } }

// ---------- timber structures ----------
const timber = () => (ENV.ok && pbrMat('brown_planks_09', 1, 1, { color: 0x8a6c50 })) || woodMat();
const box = (w, h, d, x, y, z, c, ry = 0, rx = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); return c ? colorGeo(g, c) : g; };
const cyl = (r0, r1, h, x, y, z, c, seg = 7) => colorGeo(new THREE.CylinderGeometry(r1, r0, h, seg).translate(x, y + h / 2, z), c);
const WC = () => C(0xffffff).multiplyScalar(rr(.72, 1.05));
// ---------- fix3: post-build relief edits (used by fx.js scanShapes and by missions through G.scn) ----------
// G.scn.reshape(fn, box)  fn(x, z, h) -> new height; box {x1,x2,z1,z2}. Edits the level's terrain meshes in place (or relief-ifies the
//                         engine's flat ground planes on levels without scenery) and wraps heightAt / G.groundH.
// G.scn.bridgeGap(o)      cuts a river (o.water !== false) or dry ravine across the play field under a bridge deck that spans
//                         z o.z1..o.z2 (deck stays where it is); adds flowing water, wet banks and support piles under the deck.
// G.scn.deckAt(x, z)      deck top y if (x, z) is on a registered bridge deck, else null (for the combat agent: units on a deck
//                         walk at this height; the lane elsewhere is y 0).
const DECKS = [];
const deckAt = (x, z) => { for (const d of DECKS) if (x >= d.x1 && x <= d.x2 && z >= d.z1 && z <= d.z2) return d.y; return null; };
function reshape(fn, B) {
  const terr = []; world.traverse(o => { if (o.isMesh && o.userData.terr) terr.push(o); });
  if (!terr.length) { const flat = groundMeshes(); if (!flat.length) return false; HF = null; const r0 = ROAD; ROAD = null; try { terrain({ h: (x, z) => fn(x, z, 0), laneDip: () => true, noFade: true }); } finally { ROAD = r0; } G.groundH = (x, z) => (HF ? HF(x, z) : 0); return true; }
  const prev = HF || (() => 0); HF = (x, z) => (x >= B.x1 && x <= B.x2 && z >= B.z1 && z <= B.z2 ? fn(x, z, prev(x, z)) : prev(x, z));
  for (const g of terr) { const P = g.geometry.attributes.position; let ch = 0;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); if (x < B.x1 || x > B.x2 || z < B.z1 || z > B.z2) continue; const h0 = P.getY(i), h1 = fn(x, z, h0); if (h1 !== h0) { P.setY(i, h1); ch++; } }
    if (ch) { P.needsUpdate = true; g.geometry.computeVertexNormals(); g.geometry.computeBoundingSphere(); g.geometry.computeBoundingBox(); } }
  // paved lanes (ch6) are one flat quad on top of the terrain: re-mesh them subdivided and follow the new relief
  world.traverse(k => { const pv = k.isMesh && k.userData.pave; if (!pv || pv.z1 > B.z2 || pv.z0 < B.z1) return; const L = pv.z0 - pv.z1, g = new THREE.PlaneGeometry(pv.hw * 2, L, Math.ceil(pv.hw * 2), Math.ceil(L)); g.rotateX(-Math.PI / 2); g.translate(0, 0, (pv.z0 + pv.z1) / 2);
    const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setY(i, (HF ? HF(P.getX(i), P.getZ(i)) : 0) + .012); g.computeVertexNormals(); k.geometry.dispose(); k.geometry = g; });
  G.groundHT = performance.now(); return true; }
function bridgeGap(o) { const z0 = (o.z1 + o.z2) / 2, half = Math.abs(o.z1 - o.z2) / 2, hw = o.hw ?? Math.max(2, half - 5.5), bw = o.bank ?? Math.min(5, half - hw - .3), wy = o.wy ?? -1.15, wet = o.water !== false;
  const wob = x => (o.straight || Math.abs(x) < 9 ? 0 : Math.sin(x * .07 + 1.3) * 1.6 + Math.sin(x * .17) * .5) * Math.min(1, (Math.abs(x) - 9) / 10);
  const prof = (x, z) => { const d = Math.abs(z - z0 - wob(x)); if (d < hw) return (wet ? wy - .1 : wy) - (wet ? 1.2 : .6) * Math.sqrt(Math.min(1, (hw - d) / 2.5)); if (d < hw + bw) return (wet ? wy - .1 : wy) * Math.pow(1 - (d - hw) / bw, 1.35); return 0; };
  const ok = reshape((x, z, h) => Math.min(h, prof(x, z)), { x1: -80, x2: 80, z1: z0 - hw - bw - 4, z2: z0 + hw + bw + 4 }); if (!ok) return null;
  if (wet) { const pts = []; for (let x = -72; x <= 72; x += 1.5) pts.push({ x, z: z0 + wob(x) }); const w = addMesh(ribbon(pts, hw + .9, wy), riverMat(), { shadow: false }); w.userData.fxS = 1; }
  if (o.piles !== false) { const P = [], dw = o.deckW ?? 6.4, yb = o.deckY ?? 0; for (let z = z0 - hw - bw * .5; z <= z0 + hw + bw * .5 + .01; z += 3.4) { const gb = prof(0, z); if (gb > -.35) continue; const hgt = yb - gb + .4;
      for (const sx of [-1, 1]) P.push(cyl(.17, .2, hgt, sx * (dw / 2 + .12), gb - .4, z, C(0x4a3a2a), 7)); P.push(box(dw + .5, .22, .26, 0, yb - .12, z, C(0x3e2e20))); P.push(box(Math.hypot(dw - 1, hgt * .7), .14, .14, 0, gb + hgt * .45, z, C(0x3e2e20), 0, 0, Math.atan2(hgt * .7, dw - 1))); }
    if (P.length) { const m = addMesh(merge(P), timber()); m.userData.fxS = 1; } }
  if (o.deck) { const dw = o.deckW ?? 6.4, top = o.deckTop ?? .06, z1 = Math.min(o.z1, o.z2), z2 = Math.max(o.z1, o.z2), P = [];   // plank deck over the mission's flat box
    for (let z = z2 - .28; z > z1; z -= .56) P.push(box(dw + rr(-.12, .12), .12, .5, rr(-.06, .06), top - .06, z, WC(), rr(-.015, .015)));
    for (const x of [-dw / 2 + .3, 0, dw / 2 - .3]) P.push(box(.3, .3, z2 - z1, x, top - .27, (z1 + z2) / 2, C(0x5a4636)));
    const m = addMesh(merge(P), timber()); m.userData.fxS = 1; o.deck.visible = false; }
  // props the mission left on the now-carved ground: drop them onto the banks, hide the ones that would stand in the water
  { const dwh = (o.deckW ?? 6.4) / 2 + .7, ents = new Set((G.ents || []).map(e => e.o)); for (const k of world.children) { if (k.userData.scn || k.userData.terr || k.userData.fxS === 2 || ents.has(k) || k === o.deck) continue; const x = k.position.x, z = k.position.z; if (Math.abs(x) < dwh && Math.abs(z - z0) < half + .5) continue; const d = prof(x, z); if (d > -.05) continue; if (wet && d < wy + .15) k.visible = false; else k.position.y += d; } }
  DECKS.push({ x1: -(o.deckW ?? 6.4) / 2, x2: (o.deckW ?? 6.4) / 2, z1: Math.min(o.z1, o.z2), z2: Math.max(o.z1, o.z2), y: (o.deckTop ?? o.deckY ?? 0) });
  if (wet) G.waterY = wy; return { z0, hw, bw, wy }; }
G.scn = { reshape, bridgeGap, deckAt, decks: DECKS };
// walkable plank bridge across a river that crosses the lane at z0 (deck top at y≈0.06)
function bridge(z0, hw, len) {
  const P = []; const zN = z0 + len / 2, zF = z0 - len / 2;
  for (let z = zN - .26; z > zF; z -= .56) P.push(box(2 * hw + .5 + rr(-.15, .15), .12, .5, rr(-.08, .08), 0, z, WC(), rr(-.02, .02)));
  for (let x = -hw; x <= hw + .01; x += hw / 2) P.push(box(.32, .34, len + .4, x, -.24, z0, C(0x5a4636)));
  for (const zz of [z0 + len / 2 - 1.2, z0 + 2.2, z0 - 2.2, z0 - len / 2 + 1.2]) { P.push(box(2 * hw + .9, .28, .34, 0, -.5, zz, C(0x4a3828))); for (let x = -hw; x <= hw + .01; x += hw / 2) P.push(cyl(.22, .2, 3.4, x + rr(-.05, .05), -3.6, zz, C(0x4a3a2a), 8)); }
  for (const s of [-1, 1]) { const x = s * (hw + .12); for (let z = zN - .3; z >= zF + .2; z -= 1.6) { P.push(box(.2, 1.25, .2, x, .62, z, C(0x6a5038))); if (z - 1.6 >= zF + .2) P.push(box(.1, .1, 1.75, x, .62, z - .8, C(0x6a5038), 0, (s > 0 ? 1 : -1) * .55)); }
    P.push(box(.2, .14, len - .2, x, 1.25, z0, C(0x7a5c40))); P.push(box(.14, .1, len - .2, x, .7, z0, C(0x6a5038))); }
  for (const zz of [zN + .4, zF - .4]) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) P.push(box(rr(.8, 1.3), rr(.5, .8), rr(.8, 1.2), s * (hw + rr(-.3, .9)), .05, zz + rr(-.6, .6), C(0x8a7d6c), rr(0, 3)));
  return addMesh(merge(P), timber());
}
function pier(x0, x1, z, hw = 1.3) { const P = [], y = .32;
  for (let x = x0; x < x1; x += .5) P.push(box(.46, .1, 2 * hw + rr(-.1, .1), x, y, z + rr(-.05, .05), WC()));
  for (const s of [-1, 1]) P.push(box(x1 - x0, .22, .22, (x0 + x1) / 2, y - .17, z + s * (hw - .2), C(0x4a3828)));
  for (let x = x0 + 1; x < x1; x += 2.6) for (const s of [-1, 1]) P.push(cyl(.17, .14, 3.6 + (s > 0 ? .5 : 0), x, -3, z + s * hw, C(0x4a3a2a)));
  for (let k = 0; k < 3; k++) P.push(cyl(.33, .33, .8, rr(x0 + 2, x1 - 1), y + .05, z + rr(-.6, .6), C(0x6a4a30), 9));
  return addMesh(merge(P), timber());
}

// ---------- Khorezm mud-brick town ----------
function boxUV(g, sc = 3) { const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (ay > ax && ay > az) uv.setXY(i, x / sc, z / sc); else if (ax > az) uv.setXY(i, z / sc, y / sc); else uv.setXY(i, x / sc, y / sc); } return g; }
const pick3 = v => C([0xb0402c, 0x2e5c9c, 0xd0a040, 0x4a8a5c, 0xd8cfb8, 0x8a3a5a][Math.floor(v * 6) % 6]);
function town(list) { // list of {x,z,w,d,h,face,dome}
  const wall = [], dark = [], wood = [], tile = [];
  for (const b of list) { const { w, d, h } = b, x = 0, z = 0, f = b.face, n0 = [wall.length, dark.length, wood.length, tile.length], tint = C(0xffffff).multiplyScalar(rr(.82, 1.08)).lerp(C(0xffd8b0), rr(0, .3));
    wall.push(box(w, h, d, x, h / 2, z, tint)); wall.push(box(w + .3, .25, d + .3, x, h + .02, z, tint.clone().multiplyScalar(.8)));
    for (const s of [-1, 1]) { wall.push(box(w + .3, .5, .25, x, h + .38, z + s * (d / 2), tint)); wall.push(box(.25, .5, d + .3, x + s * (w / 2), h + .38, z, tint)); }
    const fx = x + f * (w / 2 + .02); dark.push(box(.08, 2.1, 1.1, fx, 1.05, z + rr(-d / 4, d / 4), C(0x3a2416)));
    for (let k = -1; k <= 1; k += 2) if (d > 4.5) dark.push(box(.08, .7, .55, fx, h * .62, z + k * d / 3.2, C(0x1a120c)));
    for (let k = -d / 2 + .5; k < d / 2; k += 1.1) wood.push(cyl(.09, .09, .5, 0, 0, 0, C(0x6a4a30), 6).rotateZ(Math.PI / 2).translate(fx + f * .2, h - .3, z + k));
    if (b.iwan) { wall.push(box(.6, h + 2.4, d * .7, fx + f * .3, (h + 2.4) / 2, z, tint)); dark.push(box(.08, h * .9, d * .32, fx + f * .62, h * .45, z, C(0x2a1c12))); tile.push(box(.06, .45, d * .7, fx + f * .62, h + 1.7, z, C(0x2e8aa0))); }
    if (b.dome) { const r = Math.min(w, d) * .36; tile.push(colorGeo(new THREE.SphereGeometry(r, 16, 8, 0, 6.29, 0, Math.PI / 2).translate(x, h + .55, z), (X, Y) => (Y > h + .55 + r * .25 ? C(0x2f8fa8) : C(0x3a6fa0)).multiplyScalar(.85 + .3 * hash(Math.round(X * 4), Math.round(Y * 4))))); tile.push(cyl(r + .05, r + .05, .55, x, h, z, C(0xd8c098), 14)); }
    // gfx2: less boxy silhouettes - battered (inward-leaning) walls, a wooden porch (ayvan) on some, corner turrets (guldasta) on the tall ones
    { const p = wall[n0[0]].attributes.position, tp = .88 + hash(b.x + 1, b.z) * .08; for (let i = 0; i < p.count; i++) if (p.getY(i) > h * .5) { p.setX(i, p.getX(i) * tp); p.setZ(i, p.getZ(i) * tp); }
      const hv = hash(b.z + 2, b.x); if (hv > .45 && !b.iwan && d > 5) { const px = f * (w / 2 + 1.15), pd = d * (.45 + hv * .3); wood.push(box(2.3, .14, pd, px, 2.62, 0, C(0x7a5a3a))); wall.push(box(2.1, .1, pd - .3, px, 2.74, 0, tint.clone().multiplyScalar(.9))); for (const k of [-1, 0, 1]) wood.push(cyl(.09, .08, 2.6, f * (w / 2 + 2.15), 0, k * (pd / 2 - .15), C(0x6a4a30), 6)); }
      const h2 = hash(b.x * 1.7 + 4, b.z * .9); if (h2 > .62 && !b.dome && w > 6.5) { const uw = w * (.42 + h2 * .2), ud = d * .6, ux = -f * (w - uw) * .3, uh = 2 + h2 * 1.4; wall.push(box(uw, uh, ud, ux, h + uh / 2, 0, tint.clone().multiplyScalar(1.04))); wall.push(box(uw + .3, .22, ud + .3, ux, h + uh + .1, 0, tint.clone().multiplyScalar(.82))); dark.push(box(.08, .7, .5, ux + f * (uw / 2 + .02), h + uh * .55, 0, C(0x1a120c))); for (let k = -ud / 2 + .4; k < ud / 2; k += 1.2) wood.push(cyl(.08, .08, .45, 0, 0, 0, C(0x6a4a30), 6).rotateZ(Math.PI / 2).translate(ux + f * (uw / 2 + .2), h + uh - .28, k)); }
      if (hv <= .45 && hv > .15 && !b.iwan) { const ac = pick3(hash(b.x, b.z * 3)), aw = 2.2 + hv * 3; wood.push(box(1.7, .07, aw, f * (w / 2 + .8), 2.55, (hv - .3) * d * .5, ac, 0, 0, -f * .32)); for (const k of [-1, 1]) wood.push(cyl(.05, .05, 2.2, f * (w / 2 + 1.55), 0, (hv - .3) * d * .5 + k * (aw / 2 - .1), C(0x5a4030), 5)); }
      if (h > 6 && !b.dome) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const tx = sx * w / 2 * tp, tz = sz * d / 2 * tp; wall.push(cyl(.52, .4, h + 1.2, tx, 0, tz, tint, 8)); tile.push(colorGeo(new THREE.SphereGeometry(.44, 8, 4, 0, 6.29, 0, Math.PI / 2).translate(tx, h + 1.2, tz), C(0x2f8fa8))); } }
    // gfx2: every house is built at the origin, then turned by its own angle and moved into place (no more axis-aligned rows)
    const ry = b.ry ?? (hash(b.x, b.z) - .5) * .3; [wall, dark, wood, tile].forEach((A, k) => { for (let i = n0[k]; i < A.length; i++) A[i].rotateY(ry).translate(b.x, 0, b.z); }); }
  const cm = (ENV.ok && pbrMat('clay_block_wall', 1, 1, { color: 0xe0c49c, vertexColors: true })) || vcMat('clay');
  const g = merge(wall); boxUV(g); addMesh(g, cm); addMesh(merge(dark), vcMat('dark', { roughness: 1 })); addMesh(merge(wood), vcMat('wood2')); if (tile.length) addMesh(merge(tile), vcMat('tile', { roughness: .35, metalness: .1 }));
}
function minaret(x, z, h = 26) { const t = tex('brick', () => canvasTex(128, 512, (g, w, H) => { g.fillStyle = '#c89a64'; g.fillRect(0, 0, w, H); for (let y = 0; y < H; y += 8) for (let xx = (y / 8) % 2 * 8; xx < w; xx += 16) { g.fillStyle = `rgb(${190 + Math.random() * 30},${140 + Math.random() * 25},${90 + Math.random() * 20})`; g.fillRect(xx, y, 15, 7); }
    for (const yb of [60, 150, 250, 350, 440]) { g.fillStyle = '#2d8ca0'; g.fillRect(0, yb, w, 18); g.fillStyle = '#e8d090'; for (let xx = 0; xx < w; xx += 16) { g.beginPath(); g.moveTo(xx, yb + 9); g.lineTo(xx + 8, yb + 2); g.lineTo(xx + 16, yb + 9); g.lineTo(xx + 8, yb + 16); g.fill(); } } }));
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 2.3, h, 18, 1), new THREE.MeshStandardMaterial({ map: t, roughness: .9 })); m.position.set(x, h / 2, z); m.castShadow = Q > 0; m.userData.scn = 1; world.add(m);
  const P = [cyl(1.9, 1.9, .6, x, h, z, C(0xc8a070), 16), cyl(1.6, 1.6, 2.2, x, h + .6, z, C(0x2a6a80), 16), cyl(1.9, 1.9, .3, x, h + 2.8, z, C(0xc8a070), 16), colorGeo(new THREE.SphereGeometry(1.4, 14, 8, 0, 6.29, 0, Math.PI / 2).translate(x, h + 3.1, z), C(0x2f8fa8)), cyl(.08, .05, 1.2, x, h + 4.4, z, C(0xd8b040), 5)];
  addMesh(merge(P), vcMat('tile', { roughness: .35, metalness: .1 }));
}
function stripeTex() { return tex('stripe', () => canvasTex(256, 128, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = '#f2e6cc'; g.fillRect(x, 0, 16, h); g.fillStyle = '#ffffff'; g.fillRect(x + 16, 0, 16, h); } g.fillStyle = 'rgba(120,20,10,.9)'; g.fillRect(0, h - 22, w, 10); for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .07})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } })); }
let STALL = null;
function stallParts() { if (STALL) return STALL; const s0 = sd; seed(5); const cloth = new THREE.PlaneGeometry(3.4, 2.6, 6, 4); const cp = cloth.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin((cp.getX(i) / 3.4 + .5) * Math.PI * 3) * .06 - Math.sin((cp.getY(i) / 2.6 + .5) * Math.PI) * .15); cloth.rotateX(-Math.PI / 2 + .38); cloth.translate(0, 2.55, 0); cloth.computeVertexNormals();
  const wd = [], gd = []; for (const [x, z, h] of [[-1.6, -1.15, 2.9], [1.6, -1.15, 2.9], [-1.6, 1.15, 2.1], [1.6, 1.15, 2.1]]) wd.push(cyl(.06, .05, h, x, 0, z, C(0x6a4a30), 5)); wd.push(box(3, .7, 1, 0, .35, .4, C(0x8a6a48)));
  for (let k = 0; k < 7; k++) gd.push(colorGeo(new THREE.SphereGeometry(rr(.17, .24), 8, 6).scale(1.3, 1, 1).translate(rr(-1.2, 1.2), .82, rr(.1, .7)), pick([C(0xd8b840), C(0x6a9a3a), C(0xe0c060)])));
  for (let k = 0; k < 3; k++) gd.push(colorGeo(new THREE.LatheGeometry([[0, 0], [.2, .02], [.28, .25], [.2, .45], [.12, .5]].map(p => new THREE.Vector2(p[0], p[1])), 9).translate(rr(-1.5, 1.5), 0, rr(1.1, 1.6)), C(0xa85a34)));
  for (let k = 0; k < 2; k++) gd.push(box(.5, 1.6, .06, -1 + k * 1.6, 1.1, -1.1, pick([C(0x9a1e1e), C(0x1e3a6a), C(0x7a2a5a)])));
  STALL = { cloth, wood: merge(wd), goods: merge(gd) }; sd = s0; return STALL; }
function stalls(list) { const S = stallParts(); const T = list.map(([x, z, ry]) => [x + rr(-.35, .35), z + rr(-.6, .6), rr(.84, 1.22), ry + rr(-.24, .24), pick([C(0xc83a2a), C(0x2a5aa8), C(0xd8a030), C(0x3a8a5a), C(0xffffff)])]);
  inst(S.cloth, mcache.cloth || (mcache.cloth = new THREE.MeshStandardMaterial({ map: stripeTex(), side: THREE.DoubleSide, roughness: 1 })), T, { sink: 0 }); inst(S.wood, vcMat('wood2'), T.map(t => [...t.slice(0, 4)]), { sink: 0 }); inst(S.goods, vcMat('goods', { roughness: .6 }), T.map(t => [...t.slice(0, 4)]), { sink: 0 }); }
function paving(z0, z1, hw) { const t = tex('pave2', () => canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#a08c70'; g.fillRect(0, 0, w, h);
    const R2 = Math.random, blot = (n, cols, r0, r1, a) => { for (let i = 0; i < n; i++) { const x = R2() * w, y = R2() * h, r = r0 + R2() * (r1 - r0); for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r), c = cols[i % cols.length]; gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r); } } };
    blot(40, ['178,160,130', '120,102,80', '150,132,104', '96,84,68'], 30, 110, .3);
    // worn flagstones in loose patches (about 40 % of the surface), each an irregular polygon with a dark joint and a light worn top
    for (let i = 0; i < 150; i++) { const cx = R2() * w, cy = R2() * h; if (Math.sin(cx * .021 + 1) * Math.cos(cy * .017) + R2() * .5 < .12) continue; const r = 9 + R2() * 17, n = 5 + (R2() * 3 | 0), a0 = R2() * 6.28, v = R2() * 34 - 17, warm = R2() < .5;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.beginPath(); for (let k = 0; k < n; k++) { const a = a0 + k / n * 6.283, rr2 = r * (.72 + ((k * 7919 + i * 131) % 17) / 17 * .4); g[k ? 'lineTo' : 'moveTo'](cx + ox + Math.cos(a) * rr2 * 1.25, cy + oy + Math.sin(a) * rr2 * .85); } g.closePath();
        g.fillStyle = warm ? `rgb(${168 + v},${150 + v},${124 + v})` : `rgb(${150 + v},${146 + v},${138 + v})`; g.fill(); g.lineWidth = 2.6; g.strokeStyle = 'rgba(48,38,28,.7)'; g.stroke(); } }
    blot(26, ['70,56,42', '190,172,140'], 14, 50, .22); for (let i = 0; i < 900; i++) { g.fillStyle = R2() < .5 ? 'rgba(60,48,36,.35)' : 'rgba(210,196,168,.3)'; g.fillRect(R2() * w, R2() * h, 1 + R2() * 2, 1 + R2() * 2); } }));
  t.repeat.set(hw * 2 / 9, (z0 - z1) / 9); const m = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.1, roughness: .97, color: 0xc6b8a2, polygonOffset: true, polygonOffsetFactor: -2 });
  const g = new THREE.PlaneGeometry(hw * 2, z0 - z1); g.rotateX(-Math.PI / 2); g.translate(0, .012, (z0 + z1) / 2); const k = addMesh(g, m, { shadow: false }); k.userData.pave = { hw, z0, z1 }; return k; }

// ---------- horde camp ----------
const blackCache = new Map();
function blackYurt(x, z, s = 1) { const g = yurt(x, z, false, false); if (!g) return null; g.scale.multiplyScalar(s); g.traverse(m => { if (m.isMesh) { let d = blackCache.get(m.material); if (!d) { d = m.material.clone(); d.color = new THREE.Color(0x2e2622); d.roughness = 1; blackCache.set(m.material, d); } m.material = d; } }); g.position.y = heightAt(x, z) - .05; return g; }
let TOTEM = null;
function totemParts() { if (TOTEM) return TOTEM; const s0 = sd; seed(9); const P = [], hair = [];
  P.push(cyl(.12, .09, 4.6, 0, 0, 0, C(0x3a2a1e), 6)); P.push(colorGeo(new THREE.SphereGeometry(.3, 8, 6).scale(1, .9, 1.3).translate(0, 4.75, .05), C(0xd8ccb0)));
  for (const s of [-1, 1]) P.push(colorGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(s * .2, 4.85, 0), V(s * .6, 5.05, -.1), V(s * .75, 5.5, .05), V(s * .6, 5.8, .2)]), 8, .06, 5), C(0xe0d4b8)));
  P.push(box(.9, .08, .08, 0, 3.9, 0, C(0x3a2a1e)));
  for (let k = 0; k < 6; k++) hair.push(colorGeo(new THREE.ConeGeometry(.12, 1.4, 5).rotateX(Math.PI).translate(rr(-.4, .4), 3.2, rr(-.05, .05)), pick([C(0x1a1410), C(0x6a1a12), C(0x2a2018)])));
  TOTEM = merge([...P, ...hair]); sd = s0; return TOTEM; }
function fence(cx, cz, w, d) { const P = []; const post = (x, z) => P.push(cyl(.08, .07, 1.3, x, 0, z, C(0x5a4232), 5));
  for (let x = -w / 2; x <= w / 2; x += 2) { post(cx + x, cz - d / 2); post(cx + x, cz + d / 2); } for (let z = -d / 2 + 2; z < d / 2; z += 2) { post(cx - w / 2, cz + z); post(cx + w / 2, cz + z); }
  for (const y of [.55, 1.05]) { P.push(box(w, .07, .07, cx, y, cz - d / 2, C(0x6a5038))); P.push(box(w, .07, .07, cx, y, cz + d / 2, C(0x6a5038))); P.push(box(.07, .07, d, cx - w / 2, y, cz, C(0x6a5038))); P.push(box(.07, .07, d, cx + w / 2, y, cz, C(0x6a5038))); }
  const g = merge(P); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + heightAt(p.getX(i), p.getZ(i))); addMesh(g, vcMat('wood2')); }

// ---------- sky dome, dust, per-frame ticker ----------
function cloudTex(storm) { return tex('cloud' + storm, () => canvasTex(1024, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h); const N = storm ? 260 : 120;
  for (let i = 0; i < N; i++) { const cx = Math.random() * w, cy = h * (storm ? rr(.25, 1) : rr(.55, .95)), n = 5 + Math.floor(Math.random() * 9), sc = rr(.6, 1.6) * (storm ? 1.3 : 1);
    for (let k = 0; k < n; k++) { const x = cx + rr(-60, 60) * sc, y = cy + rr(-14, 10) * sc, r = rr(12, 34) * sc;
      for (const dx of [-w, 0, w]) { const gr = g.createRadialGradient(x + dx, y - r * .25, r * .1, x + dx, y, r); const lit = storm ? rr(.35, .6) : rr(.75, 1), sh = storm ? .18 : .5;
        gr.addColorStop(0, `rgba(${255 * lit | 0},${255 * lit | 0},${255 * lit | 0},.85)`); gr.addColorStop(.6, `rgba(${255 * (lit + sh) / 2 | 0},${255 * (lit + sh) / 2 | 0},${255 * (lit + sh) / 2 | 0},.5)`); gr.addColorStop(1, `rgba(${255 * sh | 0},${255 * sh | 0},${255 * sh | 0},0)`); g.fillStyle = gr; g.fillRect(x + dx - r, y - r, r * 2, r * 2); } } }
}, false)); }
function skyDome(S, dir) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: C(S.top) }, hor: { value: C(S.hor) }, cl: { value: C(S.cloud) }, sunc: { value: C(S.sun) }, sd: { value: new THREE.Vector3(...dir).normalize() }, tx: { value: cloudTex(S.storm ? 1 : 0) }, uT: U.uT },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 top, hor, cl, sunc, sd; uniform sampler2D tx; uniform float uT; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float y = d.y; vec3 c = mix(hor, top, pow(clamp(y, 0., 1.), .55)); if (y < 0.) c = hor * (1. + y * .4);
        float s = max(dot(d, sd), 0.); c += sunc * (pow(s, 6.) * .35 + pow(s, 60.) * .6);
        vec4 k = texture2D(tx, vec2(atan(d.z, d.x) / 6.2832 + .5 + uT * .0015, clamp(y * 2.4, 0., 1.)));
        vec3 kc = cl * k.r + sunc * pow(s, 4.) * k.r * .7; c = mix(c, kc, k.a * smoothstep(-.02, .05, y));
        vec2 q = d.xz - sd.xz; float ray = pow(s, 3.) * (.55 + .45 * sin(atan(q.y, q.x) * 23. + uT * .05)); c += sunc * ray * .12 * (1. - k.a);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const sk = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), m); sk.frustumCulled = false; sk.renderOrder = -5; sk.userData.scn = 1; sk.onBeforeRender = (r, s, cam) => { sk.position.copy(cam.position); sk.updateMatrixWorld(); }; world.add(sk);
  // sun glow sprite + distant haze ring
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('glow', () => canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 2, 64, 64, 64); r.addColorStop(0, 'rgba(255,250,230,1)'); r.addColorStop(.2, 'rgba(255,220,160,.6)'); r.addColorStop(1, 'rgba(255,180,100,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); })), color: C(S.sun), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  glow.scale.setScalar(S.storm ? 30 : 60); glow.userData.scn = 1; glow.renderOrder = -4; const dv = new THREE.Vector3(...dir).normalize(); glow.onBeforeRender = (r, s, cam) => { glow.position.copy(cam.position).addScaledVector(dv, 190); glow.updateMatrixWorld(); }; glow.frustumCulled = false; world.add(glow);
}
function dust(col, n) { if (!Q) return; const P = new Float32Array(n * 3); for (let i = 0; i < n; i++) { P[i * 3] = rr(-20, 20); P[i * 3 + 1] = rr(0, 7); P[i * 3 + 2] = rr(-24, 10); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const m = new THREE.PointsMaterial({ color: col, size: .09, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, map: tex('dot', () => canvasTex(32, 32, (c, w) => { const r = c.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = r; c.fillRect(0, 0, w, w); })) });
  m.onBeforeCompile = sh => { sh.uniforms.uT = U.uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    transformed.y = mod(position.y + uT * .18 + sin(position.x) * 2., 7.); transformed.x += sin(uT * .35 + position.z * .7) * 1.2; transformed.z += cos(uT * .27 + position.x * .5) * .9;`); };
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.scn = 1; tickers.push(() => p.position.set(G.cam.x, 0, G.cam.z)); world.add(p); }
function startTicker() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, -99, 0, .01, -99, 0, 0, -99, .01], 3)); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  m.frustumCulled = false; m.userData.scn = 1; let last = -1; m.onBeforeRender = () => { const t = performance.now() / 1000; if (t - last < .004) return; last = t; U.uT.value = t; for (const f of tickers) f(t); }; world.add(m); }
// lane readability + caravan trail per chapter (see env.js roadify); rides (ch*10) get a wider track
const ROADS = { 2: { rip: 1, gt: [1.02, 1.07, .86], amp: 1.8, hw: 2.6, dark: 0.82, desat: 0.82, tint: [.52, .42, .3] }, 3: { amp: .9, hw: 2.4, dark: 0.85, desat: 0.85, tint: [.4, .34, .25] }, 4: { rip: .6, amp: 1.4, hw: 2.3, dark: 0.86, desat: 0.88, tint: [.5, .43, .32] }, 5: { amp: 1.1, hw: 2.3, dark: 0.90, desat: 0.90, tint: [.46, .38, .32] }, 6: { k: 0, dark: 0.90, desat: 0.90 }, 7: { amp: 1.5, hw: 2.5, dark: .8, desat: .75, tint: [.3, .28, .26] },
  20: { amp: 2.2, hw: 3, dark: .52, desat: .42, tint: [.52, .42, .3] }, 40: { amp: 2, hw: 2.8, dark: .56, desat: .48, tint: [.5, .43, .32] }, 70: { amp: 2.2, hw: 3, dark: .78, desat: .7, tint: [.3, .28, .26] } };
let ROAD = null;
const trail = (o = {}) => { try { if (DBG.includes('notrail')) return; FX.trailDress({ z0: 4, z1: LANE_END > -1e8 ? LANE_END : -186, hf: heightAt, ...o }); } catch (e) { console.warn('trail', e); } };
function begin(ch, light) { G.waterY = undefined; DECKS.length = 0; G.groundH = (x, z) => (HF ? HF(x, z) : 0); G.groundHT = performance.now(); G.gdPaved = ch === 6; ROAD = ROADS[ch] || null; SCN.noDecal = null; tickers = []; ships.length = 0; HF = null; seed(ch * 31 + 7); startTicker(); tickers.push(tickShips);
  const L = DBG.includes('nolight') ? null : applyLight(light, { scene, renderer, grade: gradePass, G }); if (L && L.sky && !DBG.includes('nosky')) skyDome(L.sky, L.dir); if (L && L.dust) dust(L.dust, [0, 120, 220][Q]); }
const done = ch => { window.__SCN = ch; console.warn('[scenery] built', ch); window.__R = () => { let m = 0, i = 0, t = 0; world.traverse(o => { if ((o.isMesh || o.isLine || o.isPoints) && o.visible) { m++; if (o.isInstancedMesh) i += o.count; const g = o.geometry; t += ((g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0) / 3) * (o.isInstancedMesh ? o.count : 1); } }); return { meshes: m, instances: i, ktris: Math.round(t / 1000) }; }; };

// =================== chapter builders (called at the end of story.js buildChN) ===================
const dunes = (x, z, k = 1) => { const a = Math.abs(x), u = x * .075 + z * .03 + fbm(x * .02 + 3, z * .02, 2) * 2.5; return (Math.pow(1 - Math.abs(Math.sin(u)), 1.8) * 3.6 + fbm(x * .06, z * .06, 3) * 1.6) * (.6 + a * .02) * k * sst(G.W + 1.5, G.W + 9, a); };
const steppeH = (x, z) => { const a = Math.abs(x); return fbm(x * .04, z * .04, 3) * 2.6 + sst(22, 45, a) * Math.max(0, fbm(x * .015 + 9, z * .015, 2) - .35) * 14; };
const tint = (x, z, h, base) => { const n = fbm(x * .09 + 11, z * .09, 2); return mixc(base, [base[0] * .82, base[1] * .8, base[2] * .78], n * .6).map(v => v * (.94 + Math.min(h, 6) * .02)); };
const outLane = (pad = 1.5) => x => Math.abs(x) > G.W + pad;

// ---- crack texture for the salt flats (tileable voronoi) ----
function saltTex() { return tex('salt', () => { const S = 256, n = 7, pts = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + Math.random()) / n * S, (j + Math.random()) / n * S]); if (Math.random() < .35) pts.push([Math.random() * S, Math.random() * S]);
  return canvasTex(S, S, (g) => { const im = g.createImageData(S, S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let d1 = 1e9, d2 = 1e9; for (const [px, py] of pts) for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { const d = (x - px - ox) ** 2 + (y - py - oy) ** 2; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      const e = Math.sqrt(d2) - Math.sqrt(d1) + Math.sin(x * .21 + y * .13) * .7 + Math.sin(y * .37 - x * .09) * .5; const crack = e < .9 ? .6 : e < 2.6 ? 1.03 : .96; const nz = .93 + Math.random() * .07, k = (i => i)(y * S + x) * 4; const v = crack * nz;
      im.data[k] = Math.min(255, 214 * v); im.data[k + 1] = Math.min(255, 208 * v); im.data[k + 2] = Math.min(255, 198 * v); im.data[k + 3] = 255; } g.putImageData(im, 0, 0); }); }); }
function saltFlat(z0, z1) { const W = 76, D = z0 - z1, g = new THREE.PlaneGeometry(W, D, 38, Math.ceil(D / 2)); g.rotateX(-Math.PI / 2); g.translate(0, 0, (z0 + z1) / 2);
  const p = g.attributes.position, cl = new Float32Array(p.count * 4); for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, heightAt(x, z) + .03); const a = sst(z0, z0 - 9, z) * sst(z1, z1 + 9, z) * sst(38, 30, Math.abs(x)) * (.75 + .25 * fbm(x * .1, z * .1, 2)); cl[i * 4] = cl[i * 4 + 1] = cl[i * 4 + 2] = 1; cl[i * 4 + 3] = Math.min(1, a * 1.3); }
  g.setAttribute('color', new THREE.BufferAttribute(cl, 4)); g.computeVertexNormals(); const t = saltTex(); t.repeat.set(W / 7, D / 7);
  const sm = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.1, roughness: .9, color: 0x8c9096, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); roadify(sm, { ...(ROAD || {}), dark: .7, desat: .75 });
  return addMesh(g, sm, { shadow: false }); }

function _ch2() { begin(2, 'ch2');
  const SZ = z => sst(-86, -98, z) * (1 - sst(-160, -172, z));
  terrain({ h: (x, z) => dunes(x, z, 1 - .92 * SZ(z)) + laneF(x) * fbm(x * .3, z * .3, 2) * .2,
    col: (x, z, h) => { const s = SZ(z); return mixc(tint(x, z, h, SAND).map((v, i) => v * (1 + h * .025)), SALT, s * .5); }, tint: (x, z, h) => [.95, .78, .52, Math.min(.85, laneF(x) * .5 + Math.min(h, 4) * .1 + .15 * fbm(x * .07, z * .07, 2))] });
  settle(); saltFlat(-84, -176);
  plant('saxaul', scatter(dens(110), G.W + 3, 40, 10, -190, (x, z) => (SZ(z) > .5 ? 0 : rr(.8, 1.35))));
  plant('deadSaxaul', scatter(dens(30), G.W + 2, 36, -88, -172, () => rr(.8, 1.3)), { nv: 2 });
  plant('bush', scatter(dens(160), G.W + 1.5, 40, 10, -190, (x, z) => (SZ(z) > .6 && R() < .8 ? 0 : rr(.6, 1.2))));
  instModel('boulder_01', scatter(dens(30), G.W + 2, 40, 10, -190, () => rr(.5, 1.5)));
  trail({ kinds: ['wreck', 'bones', 'cairn', 'cargo', 'bones', 'wreck', 'wheel', 'cairn'], step: 13 });
  done(2); }

// ---- ch3: river camp: side river + crossing river with a bridge, tugai forest ----
const cxL = z => -20.3 + Math.sin(z * .035) * 1.2 + Math.sin(z * .09 + 1) * .3, ZC = -78, HWc = 3.4, HWs = 4;
const zcx = x => ZC + (x > 10 ? (x - 10) * .22 + Math.sin((x - 10) * .12) * 2.5 : x < -10 ? (x + 10) * -.18 : 0);
const RW3 = -1.05;   // fix3: ch3 river surface (was RIVER -0.42 -> read as a bridge lying on flat ground)
const bank = d => (d > 3.6 ? 99 : d >= 0 ? (RW3 - .08) * Math.pow(1 - d / 3.6, 1.35) : RW3 - .08 - 1.3 * Math.sqrt(Math.min(1, -d / 3)));
const rivD = (x, z) => Math.min(Math.abs(x - cxL(z)) - HWs, x > cxL(z) ? Math.abs(z - zcx(x)) * .97 - HWc : 99);
function _ch3() { begin(3, 'ch3'); G.waterY = RW3; SCN.noDecal = (x, z) => Math.abs(z - ZC) < 9;
  terrain({ laneDip: (x, z) => Math.abs(z - ZC) < 7.6, h: (x, z) => Math.min(laneF(x) * (fbm(x * .05, z * .05, 3) * 2 + Math.max(0, fbm(x * .02 + 5, z * .02, 2) - .5) * 6), bank(Math.abs(x - cxL(z)) - HWs), x > cxL(z) ? bank(Math.abs(z - zcx(x)) * .97 - HWc) : 99),
    col: (x, z, h) => { const d = rivD(x, z); let c = mixc(tint(x, z, h, [1.02, .98, .82]), GRASS, (1 - sst(1, 12, d)) * .75); if (d < 1.2) c = mixc(c, WETS, 1 - sst(-.5, 1.2, d)); return c; }, tint: (x, z, h) => { const d = rivD(x, z), g = (1 - sst(2, 14, d)) * sst(.35, .6, fbm(x * .09, z * .09, 3)) + (1 - sst(.5, 4, d)) * .5; return d < .6 ? [.32, .28, .22, .75 * (1 - sst(-.4, .6, d)) + .2] : [.42, .54, .2, Math.min(.8, g * .85)]; } });
  settle(RW3 + .1);
  const side = []; for (let z = 18; z > -186; z -= 2) side.push({ x: cxL(z), z }); addMesh(ribbon(side, HWs + 1.1, RW3 - .01), riverMat(), { shadow: false });
  const cr = []; for (let x = 72; x > cxL(ZC); x -= 1) cr.push({ x, z: zcx(x) }); addMesh(ribbon(cr, HWc + 1.1, RW3), riverMat(), { shadow: false });
  bridge(ZC, 6, 15.6); G.colB.push({ x1: -60, x2: -6.35, z1: ZC - 7.2, z2: ZC + 7.2 }, { x1: 6.35, x2: 60, z1: ZC - 7.2, z2: ZC + 7.2 }); DECKS.push({ x1: -6.2, x2: 6.2, z1: ZC - 7.8, z2: ZC + 7.8, y: .06 });
  // funnel walkers toward the bridge so the squad never gets stuck at the bank
  tickers.push(() => { if (G.paused) return; for (const e of G.ents) { if (e === G.player || e.dead) continue; if (Math.abs(e.z - ZC) < 8.5 && Math.abs(e.x) > 5.2) e.x += (e.x > 0 ? -1 : 1) * Math.min(Math.abs(e.x) - 5.2, .12); } });
  const nearRiv = (lo, hi) => (x, z) => { const d = rivD(x, z); return d > lo && d < hi; };
  plant('reeds', scatter(dens(2400), 0, 44, 14, -184, (x, z) => { if (Math.abs(x) < 7.2 && Math.abs(z - ZC) < 7.5) return 0; const d = rivD(x, z); if (d < -1.4 || d > 2.4) return 0; if (Math.abs(x) < G.W + .3 && !(Math.abs(z - ZC) < 6)) return 0; return rr(.75, 1.25); }), { nv: 3, shadow: Q > 1 });
  const land = (lo, hi, pad = 2.5) => (x, z) => outLane(pad)(x) && nearRiv(lo, hi)(x, z);
  plant('turanga', scatter(dens(90), G.W + 3, 44, 10, -180, (x, z) => (land(3, 18, 4)(x, z) ? rr(.85, 1.25) : 0)));
  plant('tamarisk', scatter(dens(120), G.W + 2, 44, 10, -180, (x, z) => (land(1.5, 14)(x, z) ? rr(.8, 1.2) : 0)));
  plant('elm', scatter(dens(26), G.W + 7, 44, 6, -175, (x, z) => (land(6, 30, 7)(x, z) ? rr(.85, 1.15) : 0)), { nv: 2 });
  plant('poplar', scatter(dens(40), 25, 34, 10, -175, (x, z) => (land(4, 99, 12)(x, z) && x > 0 ? rr(.85, 1.15) : 0), false), { nv: 2 });
  plant('grass', scatter(dens(900), G.W + .5, 40, 12, -182, (x, z) => (land(0, 9, .5)(x, z) ? rr(.8, 1.4) : 0)), { shadow: false });
  trail({ kinds: ['cart', 'cargo', 'cairn', 'wreck', 'cargo', 'torch'], step: 17, skip: (x, z) => Math.abs(z - ZC) < 14 });
  done(3); }

// ---- ch4: sea shore, beach, piers, ships ----
const shX = z => 14 + Math.sin(z * .045) * 1 + Math.sin(z * .13 + 2) * .4, shZ = x => -165 + Math.sin(x * .08) * .8;
const SD_GLSL = 'float a = p.x - (14. + sin(p.y * .045) * 1. + sin(p.y * .13 + 2.) * .4); float b = (-165. + sin(p.x * .08) * .8) - p.y; return max(a, b);';
const sdS = (x, z) => Math.max(x - shX(z), shZ(x) - z);
const beachH = s => (s < -2 ? 99 : s < 6 ? -(s + 2) * .16 : Math.max(-4.5, -1.28 - (s - 6) * .25));
function sea(sdGLSL) { const m = seaMat(sdGLSL); if (DBG.includes('nosea')) m.visible = false; const P = (x0, x1, z0, z1, res, y = WATER) => { const g = new THREE.PlaneGeometry(x1 - x0, z0 - z1, Math.ceil((x1 - x0) / res), Math.ceil((z0 - z1) / res)); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); const k = addMesh(g, m, { shadow: false }); k.renderOrder = 1; return k; };
  const r = [2.6, 1.8, 1.4][Q]; return { P, r, m }; }
function _ch4() { begin(4, 'ch4');
  terrain({ laneDip: (x, z) => z < -162.6, h: (x, z) => { const s = sdS(x, z); return Math.min(laneF(x) * dunes(x, z, .55) * sst(-2, -10, s), beachH(s)); },
    col: (x, z, h) => { const s = sdS(x, z); let c = mixc(tint(x, z, h, [1.04, .98, .84]), SAND, sst(-14, -5, s)); if (s > -2.6) c = mixc(c, WETS, sst(-2.6, -.6, s)); if (s > .3) c = mixc(WETS, [.5, .58, .54], sst(.3, 4, s)); return c; }, tint: (x, z, h) => { const s = sdS(x, z); if (s > -.8) return [.42, .36, .27, .85]; if (s > -2.4) return [.62, .52, .38, .8]; return [.96, .82, .58, .78 * sst(-11, -4, s) + .2 * sst(.4, .7, fbm(x * .06, z * .06, 2))]; } });
  settle();
  const S = sea(SD_GLSL); S.P(10, 92, 30, -262, S.r); S.P(-92, 10, -150, -262, S.r); S.P(90, 340, 30, -262, 12, WATER - .03); S.P(-340, 340, -260, -470, 14, WATER - .03); S.P(-340, -90, -150, -262, 12, WATER - .03);
  for (const pz of [-62, -128]) pier(Math.max(G.W + .4, shX(pz) - 3), shX(pz) + 12, pz);
  ship(shX(-62) + 8.5, -62 + 3.4, Math.PI / 2, { sail: false, oars: false }); ship(shX(-128) + 9, -128 - 3.4, -Math.PI / 2, { sail: false, oars: false, dark: true });
  ship(shX(-22) + 6.5, -22, .08, { dark: true }); ship(shX(-96) + 7, -96, -.06, { dark: true }); ship(29, -150, .05, { sail: false }); ship(34, -40, .1, { drift: .7 }); ship(62, -40, .3, { s: 1.1, drift: .8 }); ship(75, -140, -.2, { dark: true, s: 1.2, drift: .6 }); ship(-24, -192, 1.3, { dark: true }); ship(22, -205, -1.4, {}); ship(120, -80, .2, { s: 1.3, drift: 1 });
  { const b = ship(shX(-108) - 1.6, -108, .4, { sail: false, oars: false, s: .42 }); ships.pop(); b.position.y = heightAt(b.position.x, -108) + .45; b.rotation.set(.04, .4, .2); }
  instModel('boulder_01', scatter(dens(70), 12, 44, 10, -200, (x, z) => { const s = sdS(x, z); return s > -3 && s < 6 && Math.abs(x) > G.W + .4 ? rr(.5, 1.6) : 0; })); instModel('namaqualand_stones_01', scatter(dens(60), 12, 30, 10, -200, (x, z) => { const s = sdS(x, z); return s > -2.5 && s < 1.5 && Math.abs(x) > G.W + .4 ? rr(1.5, 3) : 0; }));
  for (let i = 0; i < 9; i++) { const z = rr(-10, -150), x = shX(z) - rr(.6, 1.6); const o = place(world, 'dead_tree_trunk', x, z, rr(.9, 1.4)); if (o) { o.position.y = heightAt(x, z) - .1; o.userData.scn = 1; } }
  plant('saxaul', scatter(dens(60), G.W + 3, 40, 10, -160, (x, z) => (x < 0 ? rr(.8, 1.3) : 0)));
  plant('tamarisk', scatter(dens(90), G.W + 2, 40, 10, -165, (x, z) => (sdS(x, z) < -4 ? rr(.75, 1.15) : 0)));
  plant('reeds', scatter(dens(500), G.W + 1, 40, 8, -165, (x, z) => { const s = sdS(x, z); return s > -2.2 && s < .4 && Math.abs(x) > G.W + .3 && vn(z * .08, 1) > .45 ? rr(.7, 1.1) : 0; }), { shadow: Q > 1 });
  plant('bush', scatter(dens(90), G.W + 1.5, 40, 10, -165, (x, z) => (sdS(x, z) < -5 ? rr(.6, 1.1) : 0)));
  trail({ kinds: ['cargo', 'wreck', 'cairn', 'bones', 'cargo', 'wheel'], step: 18, skip: (x, z) => x > G.W + 1.5 });
  done(4); }

// ---- ch5: Darbent mountain pass ----
const edge5 = (z, s) => G.W + .55 + fbm(z * .05 + (s > 0 ? 40 : 0), 3.3, 2) * 1.8;
const cliffH = (x, z) => { const a = Math.abs(x), s = Math.sign(x) || 1, t = a - edge5(z, s); if (t < 0) return 0; let h = (1 - Math.exp(-t * .5)) * (16 + fbm(z * .03 + (s > 0 ? 50 : 0), a * .05, 3) * 15); h += Math.sin(h * 1.15 + fbm(z * .1, a * .1, 2) * 3) * .55 + fbm(x * .25, z * .25, 2) * 1.3 * Math.min(1, t * .35); return h; };
function _ch5() { begin(5, 'ch5');
  terrain({ noFade: true, shadow: true, h: cliffH, col: (x, z, h) => { const b = (h * .55 + fbm(z * .04, x * .04, 2) * 2.2) % 3; const band = b < 1 ? [1.25, 1.05, .9] : b < 1.6 ? [.62, .46, .4] : b < 2.3 ? [1.05, .82, .66] : [.85, .78, .74]; const cr = .7 + .45 * fbm(x * .35 + z * .1, z * .35 + h * .3, 2); const c = band.map(v => v * cr * (.75 + .3 * Math.min(1, h / 16))); return h < .25 ? tint(x, z, 0, [.95, .86, .78]) : mixc(tint(x, z, 0, [.95, .86, .78]), c, Math.min(1, h / 1.5)); }, tint: (x, z, h) => { const b = (h * .55 + fbm(z * .04, x * .04, 2) * 2.2) % 3; return h < .4 ? [.62, .5, .42, .25] : b < 1 ? [.95, .8, .62, .6] : b < 1.6 ? [.45, .3, .26, .6] : b < 2.3 ? [.8, .55, .4, .55] : [.62, .58, .55, .55]; } });
  settle(99);
  plant('juniper', scatter(dens(170), G.W + 1.5, 40, 10, -190, (x, z) => { const h = heightAt(x, z), hx = heightAt(x + Math.sign(x) * .8, z); return Math.abs(hx - h) < 2.2 || Math.abs(x) < edge5(z, Math.sign(x)) + .6 ? rr(.7, 1.3) : 0; }));
  instModel('boulder_01', scatter(dens(110), G.W + .8, 30, 10, -190, (x, z) => { const t = Math.abs(x) - edge5(z, Math.sign(x)); return t > -1.5 && t < 4 ? rr(.8, 2.6) : 0; }), { sink: .25 }); instModel('namaqualand_stones_01', scatter(dens(90), G.W + .6, 22, 10, -190, () => rr(1.5, 3.5))); instModel('namaqualand_stones_01', scatter(dens(140), 8.5, G.W + 1, 10, -190, () => rr(1.2, 2.4)), { sink: .05 });
  plant('bush', scatter(dens(70), G.W + 1, 44, 10, -190, (x, z) => (heightAt(x, z) < 1 || R() < .2 ? rr(.5, 1) : 0)));
  // hanging rope bridge high across the pass (landmark)
  for (const bz of [-58, -150]) { const y0 = Math.min(heightAt(-18, bz), heightAt(18, bz)); if (y0 < 9) continue; const P = [], rope = [];
    for (let x = -19; x <= 19; x += .55) { const y = y0 - 1.8 * (1 - (x / 19) ** 2); P.push(box(.42, .08, 1.7, x, y, bz + rr(-.04, .04), WC(), 0, 0, rr(-.05, .05))); }
    for (const s of [-1, 1]) for (const dy of [0, 1]) for (let x = -19; x < 19; x += 1) { const ya = y0 - 1.8 * (1 - (x / 19) ** 2) + dy * .95, yb = y0 - 1.8 * (1 - ((x + 1) / 19) ** 2) + dy * .95; rope.push(x, ya, bz + s * .9, x + 1, yb, bz + s * .9); }
    for (const sx of [-19.5, 19.5]) for (const s of [-1, 1]) P.push(cyl(.14, .12, 1.8, sx, heightAt(sx, bz) - .3, bz + s * 1, C(0x5a4232)));
    addMesh(merge(P), timber()); const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rope, 3)); const l = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x3a2a1a })); l.userData.scn = 1; world.add(l); }
  trail({ kinds: ['cairn', 'bones', 'wreck', 'torch', 'bones', 'cargo'], step: 15, maxCarts: 2 });
  done(5); }

// ---- ch6: Qashal city ----
function _ch6() { begin(6, 'ch6');
  terrain({ h: (x, z) => laneF(x) * sst(32, 44, Math.abs(x)) * fbm(x * .05, z * .05, 3) * 4, col: (x, z, h) => tint(x, z, h, [1.02, .95, .84]) });
  settle(); paving(12, -185, G.W + 1.6);
  const L = []; for (const s of [-1, 1]) for (let z = 8; z > -182; z -= rr(8, 11)) { const w = rr(6, 9), d = rr(6, 8.5); L.push({ x: s * rr(26.5, 30) , z, w, d, h: rr(3.8, 6.2), face: -s, dome: R() < .25, iwan: R() < .18 }); if (R() < .6) L.push({ x: s * rr(36, 40), z: z + rr(-3, 3), w: rr(6, 9), d: rr(6, 9), h: rr(4, 7), face: -s, dome: R() < .4 }); }
  for (const s of [-1, 1]) for (let z = -128; z > -178; z -= rr(9, 12)) if (Math.abs(z + 140) > 6 && Math.abs(z + 158) > 6) L.push({ x: s * rr(19.5, 21), z, w: rr(5, 6.5), d: rr(6, 8), h: rr(4, 5.5), face: -s, dome: R() < .3 });
  L.push({ x: 31, z: -150, w: 12, d: 12, h: 7, face: -1, dome: true, iwan: true });
  // gfx2: two more tiers of bigger, freely turned houses behind the street rows so the city reads as a city (merged into the same 4 draws)
  for (const s of [-1, 1]) for (let z = 16; z > -196; z -= 7 + hash(z, s) * 5) { L.push({ x: s * (47 + hash(z, 3) * 6), z, w: 6 + hash(z, 5) * 5, d: 6 + hash(z, 7) * 4, h: 5 + hash(z, 9) * 4.5, face: -s, dome: hash(z, 11) < .2, ry: (hash(z, 13) - .5) * .9 }); L.push({ x: s * (59 + hash(z, 4) * 9), z: z + 3, w: 7 + hash(z, 6) * 6, d: 7 + hash(z, 8) * 5, h: 7 + hash(z, 10) * 6, face: -s, dome: hash(z, 12) < .3, ry: (hash(z, 14) - .5) * 1.2 }); }
  town(L); minaret(-24, -133, 28); minaret(27, -44, 22);
  const st = []; for (const s of [-1, 1]) for (let z = -6; z > -108; z -= rr(6.5, 9)) { const x = s * (G.W + 1.9); if (G.fires.some(f => Math.hypot(f.x - x, f.z - z) < 3.2)) continue; st.push([x, z, s < 0 ? Math.PI / 2 : -Math.PI / 2]); } stalls(st);
  plant('poplar', scatter(dens(34), 22.5, 25, 10, -180, () => rr(.8, 1.1)), { nv: 2 }); plant('elm', scatter(dens(16), 31, 40, 10, -180, () => rr(.8, 1.1)), { nv: 2 });
  done(6); }

// ---- ch7: Surtaysha's black-yurt horde under a storm sky ----
function _ch7() { begin(7, 'ch7');
  terrain({ h: (x, z) => laneF(x) * steppeH(x, z), col: (x, z, h) => tint(x, z, h, [.92, .9, .82]), tint: (x, z, h) => [.5, .5, .34, .55 * sst(.4, .65, fbm(x * .08, z * .08, 3)) + .2] });
  settle();
  const spots = []; for (const s of [-1, 1]) for (let z = -6; z > -182; z -= rr(9, 13)) { spots.push([s * rr(16, 19), z]); if (R() < .7) spots.push([s * rr(24, 29), z + rr(-4, 4)]); }
  for (const [x, z] of spots) { if (z < -115 && Math.abs(Math.abs(x) - (G.W + 5)) < 4) continue; blackYurt(x, z, rr(.9, 1.15)); }
  inst(totemParts(), vcMat('totem'), scatter(dens(40), G.W + 1.6, 36, 6, -182, (x, z) => (spots.some(([a, b]) => Math.hypot(a - x, b - z) < 5) ? 0 : rr(.85, 1.2))).map(t => [t[0], t[1], t[2], t[3]]), { sink: .1 });
  for (const [x, z] of spots.slice(0, 8)) banner(x + (x > 0 ? -4 : 4), z + 3, pick([0x3a0606, 0x14100e]));
  fence(-27, -64, 12, 9); for (let i = 0; i < 4; i++) { const o = decor('R_horse', -27 + rr(-4, 4), -64 + rr(-3, 3), rr(0, 6.28)); if (o) o.position.y = heightAt(o.position.x, o.position.z); }
  fire(-16, -30, 1.3, heightAt(-16, -30) / 1.45); fire(17, -86, 1.3, heightAt(17, -86) / 1.45);
  plant('saxaul', scatter(dens(50), G.W + 3, 40, 10, -185, () => rr(.7, 1.1))); plant('bush', scatter(dens(140), G.W + 1.5, 40, 10, -185, () => rr(.5, 1)));
  trail({ kinds: ['torch', 'bones', 'wreck', 'torch', 'bones', 'cargo'], step: 13, flag: 0x3a0606 });
  done(7); }

// ---- horseback ride levels (story.rideLevel): rolling steppe; ch4 ride runs along the coast ----
function _ride(ci) { const ch = (ci || 1) + 1; begin(ch * 10, 'ch' + ch);
  if (ch === 4) { const sd2 = (x, z) => x - (13 + Math.sin(z * .04) * 1.1 + Math.sin(z * .13) * .5); const SDg = 'return p.x - (13. + sin(p.y * .04) * 1.1 + sin(p.y * .13) * .5);'; // gfx2 r2: shoreline 1.5 m closer and less straight, so the sea is in the gameplay view
    terrain({ h: (x, z) => Math.min(laneF(x) * steppeH(x, z) * sst(-3, -14, sd2(x, z)), beachH(sd2(x, z))), col: (x, z, h) => { const s = sd2(x, z); let c = mixc(tint(x, z, h, [1, .96, .82]), SAND, sst(-12, -4, s)); if (s > -2.6) c = mixc(c, WETS, sst(-2.6, -.6, s)); return c; }, tint: (x, z, h) => { const s = sd2(x, z); return s > -.8 ? [.42, .36, .27, .85] : s > -2.4 ? [.62, .52, .38, .8] : [.96, .82, .58, .75 * sst(-10, -4, s) + .15]; } });
    settle(); const S = sea(SDg); S.P(10, 92, 30, -230, S.r); S.P(90, 340, 30, -230, 12, WATER - .03);
    ship(22, -60, .1, { dark: true, drift: 1.2 }); ship(24, -150, -.05, { dark: true, drift: 1 }); ship(70, -110, .2, { s: 1.2, drift: .8 });
    plant('reeds', scatter(dens(300), G.W + 1, 40, 8, -210, (x, z) => { const s = sd2(x, z); return s > -2.2 && s < .4 && Math.abs(x) > G.W + .3 ? rr(.7, 1.1) : 0; }), { shadow: Q > 1 });
  } else { terrain({ h: (x, z) => laneF(x) * (ch === 2 ? dunes(x, z, .8) : steppeH(x, z)), col: (x, z, h) => tint(x, z, h, ch === 2 ? SAND : [.95, .92, .82]), tint: (x, z, h) => (ch === 2 ? [.95, .78, .52, .45 + .3 * laneF(x)] : [.5, .5, .34, .55 * sst(.4, .65, fbm(x * .08, z * .08, 3)) + .2]) }); settle(); }
  plant('saxaul', scatter(dens(90), G.W + 3, 40, 10, -212, (x, z) => (heightAt(x, z) > WATER + .3 ? rr(.75, 1.25) : 0)));
  plant('tamarisk', scatter(dens(ch === 2 ? 20 : 60), G.W + 2.5, 40, 10, -212, (x, z) => (heightAt(x, z) > 0 ? rr(.75, 1.15) : 0)));
  plant('bush', scatter(dens(120), G.W + 1.5, 40, 10, -212, (x, z) => (heightAt(x, z) > -.1 ? rr(.6, 1.1) : 0)));
  if (ch === 7) inst(totemParts(), vcMat('totem'), scatter(dens(16), G.W + 2, 30, 0, -200, () => 1).map(t => t.slice(0, 4)), { sink: .1 });
  trail({ kinds: ch === 7 ? ['bones', 'cairn', 'wreck', 'bones'] : ['cairn', 'wreck', 'bones', 'cargo', 'cairn', 'wheel'], step: 20, z1: -208, flag: ch === 7 ? 0x3a0606 : undefined });
  done('r' + ch); }

// guarded entry points: scenery must never break a level build
const safe = (fn, n) => (...a) => { try { if (DBG.includes('off')) { done(n); return; } fn(...a); } catch (e) { console.error('scenery', n, e); window.__SCN = n; } };
export const ch2 = safe(_ch2, 2);
export const ch3 = safe(_ch3, 3);
export const ch4 = safe(_ch4, 4);
export const ch5 = safe(_ch5, 5);
export const ch6 = safe(_ch6, 6);
export const ch7 = safe(_ch7, 7);
export const ride = safe(_ride, 'ride');
