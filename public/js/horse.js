// Skinned horse: the R_horse mesh is auto-rigged at load (real skeleton: spine, neck, head, tail, 4-bone legs)
// and animated procedurally with speed-driven gaits (walk / trot / canter / gallop), idle life, rearing, hit and death.
import * as THREE from 'three';
const PI = Math.PI, TAU = PI * 2, sm = t => t * t * (3 - 2 * t), cl = (v, a, b) => Math.max(a, Math.min(b, v));
let BASE = null; const BASES = new Map();
// ---- coats: [hide colour, strength]  (0 = keep the texture's dark coat)
export const COATS = { black: [0x15110f, 0], bay: [0x6a3a1c, 1], chestnut: [0x4a2a16, 1], grey: [0x8c8a86, 1], white: [0xd8d2c8, 1], dun: [0xa88658, 1] };
const COATK = Object.keys(COATS);
const coatMat = {};
function getMat(coat, B = BASE) { const ck = B.key + coat; if (coatMat[ck]) return coatMat[ck]; const m = B.mat.clone(); const [c, k] = COATS[coat] || COATS.bay; const U = { uCoat: { value: new THREE.Color(c) }, uK: { value: k } };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U); sh.fragmentShader = 'uniform vec3 uCoat; uniform float uK;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
    { vec3 c = diffuseColor.rgb; float l = dot(c, vec3(.299, .587, .114)); float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); float sat = (mx - mn) / max(mx, .001);
      float red = smoothstep(.45, .7, sat) * step(c.g * 1.5, c.r) * smoothstep(.12, .25, c.r); float silver = (1. - smoothstep(.1, .22, sat)) * smoothstep(.3, .45, l);
      float hide = (1. - red) * (1. - silver); vec3 nc = uCoat * clamp(.45 + l * 4.2, .3, 1.6); diffuseColor.rgb = mix(c, nc, hide * uK); }`); };
  m.customProgramCacheKey = () => 'horsecoat' + coat + (m.vertexColors ? 'v' : ''); return coatMat[ck] = m; }
// ---- Karakalpak saddle cloth texture (red felt, gold border, ram's-horn "qoshqar muyiz" motifs)
function clothTex() { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#8a1018'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#d8a83a'; g.fillRect(0, 0, 512, 22); g.fillRect(0, 234, 512, 22); g.fillRect(0, 0, 18, 256); g.fillRect(494, 0, 18, 256);
  g.fillStyle = '#1a2a5a'; for (let x = 0; x < 512; x += 28) { g.beginPath(); g.moveTo(x, 11); g.lineTo(x + 14, 3); g.lineTo(x + 28, 11); g.lineTo(x + 14, 19); g.fill(); g.beginPath(); g.moveTo(x, 245); g.lineTo(x + 14, 237); g.lineTo(x + 28, 245); g.lineTo(x + 14, 253); g.fill(); }
  g.strokeStyle = '#e8c050'; g.lineWidth = 7; g.lineCap = 'round'; const ram = (cx, cy, s) => { g.beginPath(); g.moveTo(cx, cy + 24 * s); g.lineTo(cx, cy - 6 * s); g.bezierCurveTo(cx, cy - 40 * s, cx - 44 * s, cy - 40 * s, cx - 40 * s, cy - 8 * s); g.bezierCurveTo(cx - 38 * s, cy + 8 * s, cx - 20 * s, cy + 6 * s, cx - 22 * s, cy - 8 * s); g.moveTo(cx, cy - 6 * s); g.bezierCurveTo(cx, cy - 40 * s, cx + 44 * s, cy - 40 * s, cx + 40 * s, cy - 8 * s); g.bezierCurveTo(cx + 38 * s, cy + 8 * s, cx + 20 * s, cy + 6 * s, cx + 22 * s, cy - 8 * s); g.stroke(); };
  for (let i = 0; i < 4; i++) ram(80 + i * 118, 140, 1.15); g.fillStyle = '#e8c050'; for (let i = 0; i < 5; i++) { const x = 22 + i * 118; g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 10, 140); g.lineTo(x, 152); g.lineTo(x - 10, 140); g.fill(); }
  g.fillStyle = '#d8a83a'; for (let x = 24; x < 500; x += 18) { g.beginPath(); g.arc(x, 236, 4, 0, PI); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
// ---- build the shared rigged base from the static horse prop (once)
// average normals of vertices sharing a position (GLB lo mesh had split/flat normals -> faceted look); uv seams are kept
function smoothN(g) { const p = g.attributes.position, n = g.attributes.normal; if (!n) return; const M = new Map(), k = i => Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4); for (let i = 0; i < p.count; i++) { const key = k(i); let a = M.get(key); if (!a) M.set(key, a = [0, 0, 0]); a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); } for (let i = 0; i < p.count; i++) { const a = M.get(k(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); } n.needsUpdate = true; }
export function horseBase(src, ref) { if (!src) return BASE; if (BASES.has(src)) return BASES.get(src); src.updateMatrixWorld(true); let mesh = null; src.traverse(m => { if (m.isMesh && !mesh) mesh = m; }); if (!mesh) return null;
  const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld); if (!geo.attributes.normal) geo.computeVertexNormals(); smoothN(geo); geo.computeBoundingBox(); let bb = geo.boundingBox; geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  const P = geo.attributes.position, n = P.count, v = new THREE.Vector3(); geo.computeBoundingBox(); bb = geo.boundingBox; const H = bb.max.y; let hz = 0, hn = 0; for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); if (v.y > H * .8) { hz += v.z; hn++; } } if (hz / Math.max(1, hn) < 0) { geo.rotateY(PI); geo.computeBoundingBox(); bb = geo.boundingBox; }
  const L = bb.max.z - bb.min.z, Z0 = bb.min.z, Z1 = bb.max.z;
  // legs: low vertices clustered by side and front/back
  const lg = { FL: [0, 0, 0], FR: [0, 0, 0], HL: [0, 0, 0], HR: [0, 0, 0] }; let zs = []; for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); if (v.y < H * .12) zs.push(v.z); } zs.sort((a, b) => a - b); const zMid = zs.length ? (zs[0] + zs[zs.length - 1]) / 2 : 0;
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); if (v.y > H * .22 || v.y < H * .02) continue; const k = (v.z > zMid ? 'F' : 'H') + (v.x > 0 ? 'L' : 'R'); lg[k][0] += v.x; lg[k][1] += v.z; lg[k][2]++; }
  for (const k in lg) { const c = lg[k]; c[0] /= Math.max(1, c[2]); c[1] /= Math.max(1, c[2]); }
  const zF = (lg.FL[1] + lg.FR[1]) / 2, zH = (lg.HL[1] + lg.HR[1]) / 2; const yo = f => f * H;
  // saddle top
  let sy = 0, szs = (zF + zH) / 2 - .05 * L; for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); if (Math.abs(v.z - szs) < L * .1 && Math.abs(v.x) < .1 * L && v.y > sy) sy = v.y; }
  // skeleton definition: name, parent, head position (a LOD mesh reuses the reference skeleton)
  const D = []; const add = (nm, par, x, y, z) => { D.push({ nm, par, p: new THREE.Vector3(x, y, z) }); return D.length - 1; };
  const root = add('root', -1, 0, 0, 0), pel = add('pelvis', root, 0, yo(.68), zH + .04 * L), sp1 = add('spine1', pel, 0, yo(.70), zH + .22 * L), sp2 = add('spine2', sp1, 0, yo(.72), szs), ch = add('chest', sp2, 0, yo(.70), zF - .02 * L);
  const nk1 = add('neck1', ch, 0, yo(.74), zF + .08 * L), nk2 = add('neck2', nk1, 0, yo(.84), zF + .2 * L), hd = add('head', nk2, 0, yo(.92), Z1 - .17 * L), hde = add('headEnd', hd, 0, yo(.8), Z1);
  const t1 = add('tail1', pel, 0, yo(.72), Z0 + .1 * L), t2 = add('tail2', t1, 0, yo(.6), Z0 + .05 * L), t3 = add('tail3', t2, 0, yo(.42), Z0 + .03 * L), te = add('tailEnd', t3, 0, yo(.2), Z0 + .02 * L);
  if (ref) { D.length = 0; for (const d of ref.D) D.push({ nm: d.nm, par: d.par, p: d.p.clone() }); }
  const legs = {}; if (!ref) for (const k of ['FL', 'FR', 'HL', 'HR']) { const [x, z] = lg[k], f = k[0] === 'F', par = f ? ch : pel; const a = add(k + '1', par, x * 1.05, yo(f ? .6 : .64), z + (f ? .02 : .05) * L), b = add(k + '2', a, x, yo(f ? .45 : .46), z + (f ? -.01 : .07) * L), c = add(k + '3', b, x, yo(.27), z + (f ? 0 : -.03) * L), d = add(k + '4', c, x, yo(.08), z), e = add(k + '5', d, x, yo(0), z + .01 * L); legs[k] = [a, b, c, d, e]; }
  // segments for weighting (bone i: from its head to the head of its main child)
  const Ix = Object.fromEntries(D.map((d, i) => [d.nm, i])); const pel2 = Ix.pelvis, ch2 = Ix.chest; const zF2 = ref ? ref.zF : zF, zH2 = ref ? ref.zH : zH;
  const child = {}; for (let i = 0; i < D.length; i++) { const pr = D[i].par; if (pr >= 0 && child[pr] === undefined && !/^(tail1|FL1|FR1|HL1|HR1)$/.test(D[i].nm)) child[pr] = i; }
  child[pel2] = Ix.spine1; child[ch2] = Ix.neck1;
  const isLeg = i => /^[FH][LR][1-4]$/.test(D[i].nm), legOf = i => D[i].nm.slice(0, 2), skinB = D.map((d, i) => i).filter(i => !/End$|5$/.test(D[i].nm) && i !== root);
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), seg = skinB.map(i => [i, D[i].p, child[i] !== undefined ? D[child[i]].p : D[i].p]); const tmp = new THREE.Vector3(), ab = new THREE.Vector3();
  const dseg = (p, a, b) => { ab.subVectors(b, a); const l2 = ab.lengthSq(); let t = l2 > 0 ? tmp.subVectors(p, a).dot(ab) / l2 : 0; t = cl(t, 0, 1); return tmp.copy(a).addScaledVector(ab, t).distanceTo(p); };
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); const side = v.x > 0 ? 'L' : 'R', fr = v.z > zMid ? 'F' : 'H', myLeg = fr + side; const cand = [];
    for (const [b, a, e] of seg) { const nm = D[b].nm; if (isLeg(b)) { if (legOf(b) !== myLeg || v.y > H * .66) continue; } else { if (/^tail/.test(nm) && v.z > zH2 - .02 * L) continue; if (/^(neck|head)/.test(nm) && v.z < zF2 - .06 * L) continue; if (v.y < H * .36 && !/^tail/.test(nm)) continue; }
      let d = dseg(v, a, e); if (isLeg(b) && v.y < H * .42) d *= .6; cand.push([b, 1 / (Math.pow(d + .004 * L, 4))]); }
    if (!cand.length) cand.push([pel2, 1]); cand.sort((a, b) => b[1] - a[1]); let s = 0; for (let k = 0; k < 4 && k < cand.length; k++) s += cand[k][1]; for (let k = 0; k < 4; k++) { const c = cand[k]; si[i * 4 + k] = c ? c[0] : 0; sw[i * 4 + k] = c ? c[1] / s : 0; } }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const mat = mesh.material.clone(); if (mat.emissiveMap) { mat.emissiveMap = null; mat.emissive = new THREE.Color(0); } if (geo.attributes.color) mat.vertexColors = true;
  // barrel at saddle for cloth sizing
  let rx = 0, yT = 0, yB = 1e9; for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); if (Math.abs(v.z - szs) > L * .05) continue; if (v.y > H * .4) { rx = Math.max(rx, Math.abs(v.x)); yT = Math.max(yT, v.y); yB = Math.min(yB, v.y); } }
  const BB = { key: 'b' + BASES.size, geo, mat, D, H, L, zF, zH, Z0, Z1, sy: ref ? ref.sy : sy, szs: ref ? ref.szs : szs, legs, idx: Object.fromEntries(D.map((d, i) => [d.nm, i])), rx, yT: Math.min(yT, sy), yB, cloth: BASE ? BASE.cloth : clothTex(), tris: (geo.index ? geo.index.count : P.count) / 3 }; BASES.set(src, BB); if (!BASE) BASE = BB; return BB; }
// ---- one horse instance
export function makeHorse(src, o = {}) { const B = horseBase(src); if (!B) return null; const BF = o.far ? horseBase(o.far, B) : null; const coat = o.coat || COATK[Math.floor(Math.random() * COATK.length)];
  const bones = B.D.map(d => { const b = new THREE.Bone(); b.name = d.nm; return b; }); B.D.forEach((d, i) => { const b = bones[i]; if (d.par >= 0) { bones[d.par].add(b); b.position.copy(d.p).sub(B.D[d.par].p); } else b.position.copy(d.p); });
  const skel = new THREE.Skeleton(bones), mesh = new THREE.SkinnedMesh(B.geo, o.mat || getMat(coat, B)); mesh.add(bones[0]); mesh.bind(skel); mesh.castShadow = !o.noShadow; mesh.frustumCulled = false;
  let farM = null; if (BF) { farM = new THREE.SkinnedMesh(BF.geo, o.mat || getMat(coat, BF)); farM.bind(skel, mesh.bindMatrix); farM.castShadow = false; farM.frustumCulled = false; farM.visible = false; }
  const g = new THREE.Group(); g.add(mesh); if (farM) g.add(farM); const I = B.idx, bn = k => bones[I[k]];
  // Karakalpak saddle cloth + saddle on the back (rigid on spine2)
  if (!o.bare) { const sp2 = bn('spine2'), base = B.D[I.spine2].p; const r = B.rx * 1.06, ry = (B.yT - B.yB) / 2 * 1.04, yc = (B.yT + B.yB) / 2;
    const cg = new THREE.CylinderGeometry(r, r, B.L * .3, 24, 1, true, PI - 1.45, 2.9); cg.rotateX(PI / 2); cg.scale(1, ry / r, 1); const cloth = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: B.cloth, roughness: .9, side: THREE.DoubleSide })); cloth.position.set(0, yc - base.y, B.szs - base.z); cloth.castShadow = true; sp2.add(cloth);
    const lg = new THREE.CylinderGeometry(r * 1.03, r * 1.03, B.L * .15, 16, 1, true, PI - .55, 1.1); lg.rotateX(PI / 2); lg.scale(1, ry / r, 1); const leather = new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: .6, side: THREE.DoubleSide }); const sad = new THREE.Mesh(lg, leather); sad.position.copy(cloth.position); sp2.add(sad);
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(B.L * .012, B.L * .02, B.H * .07, 8), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: .8, roughness: .35 })); pm.position.set(0, B.yT - base.y + B.H * .03, B.szs - base.z + B.L * .07); sp2.add(pm);
    const ct = new THREE.Mesh(new THREE.BoxGeometry(r * .9, B.H * .05, B.L * .02), leather); ct.position.set(0, B.yT - base.y + B.H * .02, B.szs - base.z - B.L * .07); sp2.add(ct);
    const st = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: .9, roughness: .3 }); for (const sd of [-1, 1]) { const s = new THREE.Mesh(new THREE.TorusGeometry(B.L * .025, B.L * .006, 5, 10), st); s.position.set(sd * r * 1.05, yc - base.y - ry * .95, B.szs - base.z); s.rotation.y = PI / 2; sp2.add(s); } }
  const anchor = new THREE.Object3D(); anchor.position.set(0, B.sy - B.D[I.spine2].p.y, B.szs - B.D[I.spine2].p.z); bn('spine2').add(anchor);
  // animation state (random tempo / phase so horses never move in sync)
  const S = { ph: Math.random(), tempo: .92 + Math.random() * .16, t: Math.random() * 9, v: 0, gait: 0, idleT: 0, toss: 0, tossT: 3 + Math.random() * 6, shift: Math.random() * 9, rear: 0, rearDur: 1, hitT: 0, dead: 0, side: Math.random() < .5 ? -1 : 1, stepAcc: 0, pitch: 0, roll: 0 };
  const cur = {}; const R = (k, ax, val, dt, rate = 14) => { const key = k + ax; const c = cur[key] ?? 0; const nv = dt > 0 ? c + (val - c) * Math.min(1, dt * rate) : val; cur[key] = nv; bn(k).rotation[ax] = nv; return nv; };
  const H = B.H, zH = B.D[I.HL4].p.z;
  const api = { group: g, mesh, farM, coat, S, anchor, tris: B.tris, lod: 0,
    setLod(f) { if (!farM || f === api.lod) return; api.lod = f; mesh.visible = !f; farM.visible = !!f; },
    // sp = ground speed in world m/s, k = world scale of the horse group
    update(dt, sp, k = 1) { S.t += dt; const v = sp / Math.max(.3, k); S.v += (v - S.v) * Math.min(1, dt * 4);
      if (S.dead) return api.deathTick(dt); const V = S.v; S.idleT = V < .4 ? S.idleT + dt : 0;
      // gait selection with hysteresis (units: horse-heights per second)
      const gs = [.25, 1.3, 3.0, 5.2]; let G0 = S.gait; while (G0 < 4 && V > gs[G0] * (G0 > S.gait ? 1 : 1.12)) G0++; while (G0 > 0 && V < gs[G0 - 1] * .85) G0--; 
      const RA = globalThis.__G && globalThis.__G.rearAlways; if (v > 3 && S.lastIdle > 1.2 && S.rear <= 0) { S.lastIdle = 0; if (RA || Math.random() < .6) S.rear = S.rearDur = .9; }
      if (S.gait >= 3 && v < .4 && !S.stopChk && S.rear <= 0) { S.stopChk = 1; if (Math.random() < .5) S.rear = S.rearDur = .7; } if (v > 1) S.stopChk = 0;
      if (V < .4) S.lastIdle = (S.lastIdle || 0) + dt; else if (v > 3) S.lastIdle = 0; S.gait = G0;
      const f = [0, .85 + V * .25, 1.25 + V * .07, 1.5 + V * .05, 1.8 + V * .035][G0] * S.tempo; S.ph = (S.ph + dt * f) % 1;
      // leg phase offsets and stance fraction per gait: walk 4-beat, trot diagonal 2-beat, canter 3-beat, gallop 4-beat (transverse)
      const OFF = [null, { HL: 0, FL: .25, HR: .5, FR: .75 }, { FL: 0, HR: 0, FR: .5, HL: .5 }, { HR: 0, HL: .33, FR: .33, FL: .62 }, { HL: 0, HR: .1, FL: .48, FR: .58 }][G0];
      const ST = [0, .62, .46, .4, .34][G0], AMP = [0, .32, .42, .55, .72][G0], FLX = [0, .9, 1.15, 1.25, 1.4][G0]; const ph = S.ph, w = TAU * ph;
      let bob = 0, pitch = 0, nod = 0, sflex = 0;
      if (G0 === 1) { bob = -Math.abs(Math.sin(w * 2)) * .012 * H; nod = Math.sin(w * 2) * .07; }
      else if (G0 === 2) { bob = Math.cos(w * 2) * .022 * H; nod = Math.sin(w * 2) * .05; }
      else if (G0 >= 3) { const a = G0 === 3 ? 1 : 1.25; bob = Math.sin(w) * .04 * H * a; pitch = Math.cos(w) * .06 * a; nod = Math.sin(w + 1.2) * .16 * a; sflex = Math.sin(w + .4) * .07 * a; }
      for (const lk of ['FL', 'FR', 'HL', 'HR']) { const fr = lk[0] === 'F'; let a1 = 0, a2 = 0, a3 = 0, a4 = 0;
        if (G0 > 0) { const u = (ph + OFF[lk]) % 1; let sw, fl; if (u < ST) { sw = 1 - 2 * (u / ST); fl = 0; } else { const q = (u - ST) / (1 - ST); sw = -1 + 2 * sm(q); fl = Math.sin(PI * q); } const A = AMP * -sw;
          if (fr) { a1 = A * .75 - fl * .25 * FLX; a2 = -fl * .2 * FLX; a3 = fl * 1.25 * FLX; a4 = fl * .7 * FLX; } else { a1 = A * .8 + fl * .1; a2 = fl * .55 * FLX; a3 = -fl * 1.0 * FLX; a4 = fl * .75 * FLX; } }
        else { if (!fr && lk === (Math.sin(S.shift * .23) > 0 ? 'HL' : 'HR')) { a2 = .12; a3 = -.25; a4 = .45; } }
        R(lk + '1', 'x', a1, dt); R(lk + '2', 'x', a2, dt); R(lk + '3', 'x', a3, dt); R(lk + '4', 'x', a4, dt); }
      // idle life: breathing, head/tail motion, weight shift, occasional head toss
      const br = Math.sin(S.t * 1.7) * .012; let neck = nod, headR = 0, headY = 0, tailY = Math.sin(S.t * 1.3 + S.side) * .25, tailX = .25 + (G0 >= 3 ? -.55 : G0 * -.1);
      if (G0 === 0) { headY = Math.sin(S.t * .37 + S.side) * .25; headR = Math.sin(S.t * .51) * .08; neck += Math.sin(S.t * .29) * .08 + .05; S.tossT -= dt; if (S.tossT <= 0) { S.toss = .6; S.tossT = 4 + Math.random() * 7; tailY += .4; } }
      if (S.toss > 0) { S.toss -= dt; const q = S.toss / .6; neck += -Math.sin(PI * q) * .45; headR += Math.sin(PI * q * 2) * .2; }
      if (S.hitT > 0) { S.hitT -= dt; const q = S.hitT / .35; neck -= .4 * q; pitch -= .08 * q; S.roll = Math.sin(S.t * 40) * .05 * q; } else S.roll *= .8;
      // rear (on starting / stopping a big move)
      let rr = 0; if (S.rear > 0) { S.rear -= dt; const q = 1 - S.rear / S.rearDur; rr = Math.sin(PI * cl(q, 0, 1)) * .62; for (const lk of ['FL', 'FR']) { R(lk + '1', 'x', -.9 * rr / .62, dt, 20); R(lk + '3', 'x', 1.6 * rr / .62, dt, 20); R(lk + '4', 'x', .6 * rr / .62, dt, 20); } for (const lk of ['HL', 'HR']) R(lk + '1', 'x', rr, dt, 20); neck -= rr * .5; bob = 0; pitch = 0; }
      R('pelvis', 'x', -sflex + br * .5, dt); R('spine1', 'x', sflex * .5 - br, dt); R('spine2', 'x', sflex * .4 + br, dt); R('chest', 'x', -sflex * .6, dt);
      R('neck1', 'x', neck * .5 + (G0 >= 3 ? .12 : 0), dt); R('neck2', 'x', neck * .5, dt); R('head', 'x', -neck * .3 + headR, dt); R('neck1', 'y', headY * .5, dt, 4); R('head', 'y', headY * .5, dt, 4);
      R('tail1', 'x', tailX, dt, 6); R('tail1', 'y', tailY, dt, 5); R('tail2', 'y', tailY * .6, dt, 4); R('tail3', 'y', tailY * .4, dt, 3); R('tail2', 'x', -tailX * .3 + Math.sin(S.t * 3.1) * .05, dt, 6);
      const rt = bones[0]; const P0 = -rr - pitch; rt.rotation.x = P0; rt.rotation.z = S.roll; const pz = rr > 0 ? zH : 0; rt.position.set(0, bob + pz * Math.sin(P0), pz - pz * Math.cos(P0));
      S.pitch = P0 + (cur.pelvisx || 0) + (cur.spine1x || 0) + (cur.spine2x || 0); S.stepAcc += dt * f * (G0 >= 3 ? 1 : 2); return G0; },
    hit() { if (!S.dead) S.hitT = .35; },
    die(side) { S.dead = .001; S.fall = side || S.side; },
    deathTick(dt) { S.dead += dt; const q = sm(cl(S.dead / .7, 0, 1)), rt = bones[0]; rt.rotation.set(0, 0, q * 1.45 * S.fall); rt.position.set(-S.fall * q * B.rx * .9, q * B.rx * .5, 0); for (const lk of ['FL', 'FR', 'HL', 'HR']) { const k = S.dead < .7 ? Math.sin(S.dead * 25) * .3 * (1 - q) : 0; R(lk + '1', 'x', (lk[0] === 'F' ? -.5 : .4) * q + k, dt, 10); R(lk + '3', 'x', (lk[0] === 'F' ? .6 : -.4) * q, dt, 10); } R('neck1', 'x', .3 * q, dt, 6); R('tail1', 'x', .6, dt, 3); return -1; }
  };
  return api; }
