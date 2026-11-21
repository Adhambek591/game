// Realistic skinned character (Meshy rig) driven by mocap clips retargeted from a shared library
import * as THREE from 'three';
import { clone as skClone } from '../assets/vendor/jsm/utils/SkeletonUtils.js?v=1795249975';
import { PROPS } from './glbrig.js?v=1795249975';
export const ANIM = { data: null };
const PI = Math.PI;
// game action name -> [clip, loop, default duration (s) or null = natural]
const MAP = {
  Idle: ['idle', 1], Idle_Combat: ['combat', 1], '2H_Melee_Idle': ['combat', 1], Running_A: ['run', 1], Running_C: ['run', 1], Walking_A: ['walk', 1], Walking_Backwards: ['walk', 1], Sit_Floor_Idle: ['idle', 1],
  '1H_Melee_Attack_Slice_Diagonal': ['slash', 0, .5], '1H_Melee_Attack_Slice_Horizontal': ['attack', 0, .5], '1H_Melee_Attack_Chop': ['judg', 0, .65],
  E_Attack: ['attack', 0, 1.1], E_Slam: ['slam', 0, 1.5], '2H_Melee_Attack_Spin': ['spin', 0, .75], Dodge_Forward: ['roll', 0, .55], '1H_Melee_Attack_Stab': ['slash', 0, .32],
  '1H_Ranged_Shoot': ['cast', 0, .5], Spellcast_Shoot: ['cast', 0], '2H_Ranged_Shoot': ['cast', 0], Jump_Full_Long: ['judg', 0, .7], Hit_A: ['hit', 0, .4], Death_A: ['dead', 0, 1.4],
  Cheer: ['taunt', 0, 1.6], '2H_Melee_Attack_Slice': ['heavy', 0], '2H_Melee_Attack_Chop': ['heavy', 0]
};
// ---- ANIM LAYER (anim agent): one-shot actions use a WINDOW of the mocap clip and a time-warp (anticipation -> strike -> recovery),
// instead of the whole 2-5 s clip squeezed into half a second.  [clip, a (start), p (anticipation peak), h (contact), b (end), recovery s, hit fraction of the
// game duration when the caller passes no dur, hit fraction when it passes dur, default game duration]
const SEG = {
  '1H_Melee_Attack_Slice_Diagonal': ['slash', .42, .6, .78, 1.08, .32, .28, .42, .5],
  '1H_Melee_Attack_Slice_Horizontal': ['slash', 1.08, 1.22, 1.38, 1.62, .3, .28, .42, .5],
  '1H_Melee_Attack_Chop': ['attack', .3, .5, 1.15, 1.5, .4, .29, .52, .65],
  '1H_Melee_Attack_Stab': ['slash', .42, .6, .78, 1.08, .3, .3, .42, .32],
  E_Attack: ['attack', .2, .47, 1.15, 2.5, .8, .42, .42, 1.1],
  E_Slam: ['slam', .25, .5, 1.8, 3.03, .9, .55, .55, 1.5],
  '2H_Melee_Attack_Spin': ['spin', .75, 1.33, 1.67, 1.9, .25, .56, .5, .75],
  '2H_Melee_Attack_Slice': ['heavy', .75, 1.4, 1.6, 1.87, .3, .52, .52, 1.0],
  '2H_Melee_Attack_Chop': ['heavy', .75, 1.4, 1.6, 1.87, .3, .52, .52, 1.0],
  Dodge_Forward: ['roll', .6, .95, 1.3, 1.85, .25, .55, .55, .55],
  _Step: ['roll', .2, .5, .72, .25, .2, .55, .55, .34], Dodge_Side: ['roll', .2, .5, .72, .25, .2, .55, .55, .35],
  Hit_Front: ['hit', 0, .1, .22, .55, .22, .25, .25, .3], Hit_Back: ['hit', .8, .9, 1.0, 1.3, .22, .25, .25, .3], Block_Impact: ['combat', 0, .1, .2, .5, .17, .3, .3, .25],
  Jump_Full_Long: ['judg', .5, .9, 1.07, 1.35, .3, .8, .8, .7],
  '1H_Ranged_Shoot': ['cast', .25, .5, .75, 1.3, .5, .5, .5, .5], Spellcast_Shoot: ['cast', .25, .5, .75, 1.3, .5, .5, .5, 1.4], '2H_Ranged_Shoot': ['cast', .25, .5, .75, 1.3, .5, .5, .5, 1.3],
  Hit_A: ['hit', 0, .12, .25, .6, .3, .3, .3, .4],
  Cheer: ['taunt', 1.9, 2.2, 2.6, 3.5, .8, .3, .3, 1.6],
  _Bow: ['cast', .2, .38, .5, .25, .35, .5, .5, .5],
  _Death: ['dead', 1.3, 1.5, 2.15, 2.9, .5, .62, .62, 1.0], _Down: ['dead', 1.85, 1.95, 2.2, 2.3, .2, .8, .8, .34], _GetUp: ['dead', 2.2, 2.0, 1.5, 1.32, .12, .8, .8, .5]
};
const LOCOQ = /^(Running_A|Running_C|Walking_A|Walking_Backwards)$/, RNG = /Ranged_Shoot/;
const V_RUN = 3.6, V_WALK = .86, WALK_CYC = 1.39;  // ground speed of the clips at timeScale 1 for a 1.75 m body (measured from the foot tracks)
const ADDB = ['Hips', 'Spine', 'Spine01', 'Spine02', 'neck', 'Head', 'LeftUpLeg', 'RightUpLeg', 'RightArm', 'RightForeArm', 'LeftArm', 'LeftForeArm'];
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _d = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _a1 = new THREE.Vector3(), _a2 = new THREE.Vector3(), _a3 = new THREE.Vector3();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
export const RIBROOT = new THREE.Group();
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
export class Ribbon {
  constructor(bone, o, S) { this.bone = bone; this.o = o; this.S = S; const n = this.n = o.n || 7; this.seg = (o.len || .6) * S / (n - 1); this.w0 = (o.w || .12) * S; this.w1 = (o.w1 ?? o.w ?? .12) * S; this.off = new THREE.Vector3(...(o.off || [0, 0, -.1])).multiplyScalar(S);
    this.P = []; this.Q = []; for (let i = 0; i < n; i++) { this.P.push(new THREE.Vector3()); this.Q.push(new THREE.Vector3()); } this.init = false;
    const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 4), idx = []; for (let i = 0; i < n; i++) { uv[i * 4] = 0; uv[i * 4 + 1] = i / (n - 1); uv[i * 4 + 2] = 1; uv[i * 4 + 3] = i / (n - 1); if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: o.color || 0x7a1016, roughness: .85, side: THREE.DoubleSide })); this.mesh.frustumCulled = false; this.mesh.castShadow = true; RIBROOT.add(this.mesh); this.t = Math.random() * 9; }
  update(dt, root) { const P = this.P, Q = this.Q, n = this.n, b = this.bone; b.updateWorldMatrix(true, false); root.getWorldQuaternion(_q); const k0 = root.getWorldScale(_v).x || 1; if (this.k0 !== k0) { this.k0 = k0; const r = k0 / (this.kb || k0); this.kb = this.kb || k0; this.sc = k0 / this.kb; }
    const a = b.getWorldPosition(new THREE.Vector3()).add(this.off.clone().multiplyScalar(k0).applyQuaternion(_q)); const back = new THREE.Vector3(0, 0, -1).applyQuaternion(_q); back.y = 0; back.normalize(); const side = new THREE.Vector3(back.z, 0, -back.x); const seg = this.seg * k0;
    if (!this.init || P[0].distanceTo(a) > 3) { for (let i = 0; i < n; i++) { P[i].copy(a).addScaledVector(back, i * seg * .3); P[i].y -= i * seg * .9; Q[i].copy(P[i]); } this.init = true; }
    this.t += dt; const h = Math.min(dt, .033); P[0].copy(a); Q[0].copy(a);
    for (let i = 1; i < n; i++) { const p = P[i], q = Q[i]; _v.copy(p).sub(q).multiplyScalar(.9); if (_v.length() > seg * 1.5) _v.setLength(seg * 1.5); q.copy(p); p.add(_v); p.y -= 9 * h * h * (this.o.grav ?? 1); const k = i / n; p.addScaledVector(side, Math.sin(this.t * 4.5 + i * .9) * .002 * k * this.S); p.addScaledVector(back, (.004 + Math.sin(this.t * 2.7 + i) * .002) * k * this.S); }
    for (let it = 0; it < 3; it++) for (let i = 1; i < n; i++) { const p0 = P[i - 1], p = P[i]; _v.copy(p).sub(p0); const l = _v.length() || 1e-4; p.addScaledVector(_v, (seg - l) / l); if (p.y < .04) p.y = .04; }
    const pos = this.mesh.geometry.attributes.position; for (let i = 0; i < n; i++) { const w = (this.w0 + (this.w1 - this.w0) * i / (n - 1)) * .5 * k0; pos.setXYZ(i * 2, P[i].x - side.x * w, P[i].y, P[i].z - side.z * w); pos.setXYZ(i * 2 + 1, P[i].x + side.x * w, P[i].y, P[i].z + side.z * w); } pos.needsUpdate = true; this.mesh.geometry.computeVertexNormals(); }
  dispose() { RIBROOT.remove(this.mesh); this.mesh.geometry.dispose(); }
}
// Guloyim (the only rig created with o.amulet) wears a deep-blue / gold outfit so she stands out from the red-clad maidens:
// her baked atlas is swapped for a recoloured copy (assets/env/tex/gulayim_blue.jpg — crimson cloth -> royal blue, skin/armour kept).
let BLUE = null;
function blueOutfit(m) { const src = m.map; if (!BLUE) BLUE = new THREE.TextureLoader().loadAsync('./assets/env/tex/gulayim_blue.jpg').catch(() => null);
  BLUE.then(t => { if (!t) return; t.flipY = src.flipY; t.colorSpace = src.colorSpace; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.channel = src.channel; t.anisotropy = src.anisotropy; m.map = t; m.needsUpdate = true; }); }
export class SkinRig {
  constructor(src, o = {}) {
    const scene = skClone(src); this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); this.body.add(scene); this.scene = scene;
    this.mats = []; this.B = {}; this.sp = 1; this.kind = ''; this.var = .9 + Math.random() * .22;
    scene.traverse(k => { if (k.isMesh) { k.castShadow = true; k.frustumCulled = false; k.material = k.material.clone(); k.material.userData.em0 = k.material.emissive ? k.material.emissive.clone() : null; if (k.material.emissive) this.mats.push(k.material); } if (k.isBone) this.B[k.name] = k; });
    if (o.amulet) scene.traverse(k => { if (k.isMesh && k.material.map) blueOutfit(k.material); });
    this.mixer = new THREE.AnimationMixer(scene); this.acts = {}; this.cur = null;
    // procedural creatures: their bones are not the humanoid set, so the mocap library must not bind to them
    // (models_ext.vary() swaps wolf atlases painted for the old wolf-man UVs: keep this model's own map)
    if (this.B.LeftFrontUpLeg) scene.traverse(k => { if (k.isMesh && k.material.map) { const mp = k.material.map; Object.defineProperty(k.material, 'map', { get: () => mp, set() { }, configurable: true }); } });
    this.proc = this.B.LeftFrontUpLeg ? 'wolf' : (this.B.Tail7 && this.B.Jaw && !this.B.Hips) ? 'dragon' : null; this.pt = 0; this.pop = {}; this.gp = Math.random();
    const D = this.proc ? null : ANIM.data; const hips = this.B.Hips; const tgtY = hips ? hips.position.y : 100;
    if (D) for (const cn in D.clips) {
      const tracks = [];
      for (const bn in D.clips[cn]) {
        const b = this.B[bn], rs = D.rest[bn]; if (!b || !rs) continue; const T = D.clips[cn][bn];
        if (T.rotation) { const [t, v] = T.rotation; const qS = new THREE.Quaternion(...rs.r).invert(), qT = b.quaternion.clone(), q = new THREE.Quaternion(), out = new Float32Array(v.length);
          for (let i = 0; i < t.length; i++) { q.set(v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]); q.premultiply(qS).premultiply(qT); out[i * 4] = q.x; out[i * 4 + 1] = q.y; out[i * 4 + 2] = q.z; out[i * 4 + 3] = q.w; }
          tracks.push(new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', t, out)); }
        if (T.translation && bn === 'Hips') { const [t, v] = T.translation, k = tgtY / (D.hipsY || 100), out = new Float32Array(v.length);
          for (let i = 0; i < t.length; i++) { out[i * 3] = b.position.x; out[i * 3 + 1] = v[i * 3 + 1] * k; out[i * 3 + 2] = b.position.z; }
          tracks.push(new THREE.VectorKeyframeTrack(b.name + '.position', t, out)); }
      }
      const clip = new THREE.AnimationClip(cn, -1, tracks); const a = this.mixer.clipAction(clip); this.acts[cn] = a;
    }
    // weapon in right hand: blade perpendicular to the forearm, pointing forward; grip at the palm
    scene.updateMatrixWorld(true); const H = this.hgt = (() => { const bb = new THREE.Box3().setFromObject(scene, true); return Math.max(.5, bb.max.y - bb.min.y); })(), S = H / 1.75;
    const wp = n => this.B[n] ? this.B[n].getWorldPosition(new THREE.Vector3()) : null;
    const mount = (bone, pos, X, Y, Z) => { const g = new THREE.Group(); const ws = bone.getWorldScale(new THREE.Vector3()); g.scale.set(S / ws.x, S / ws.y, S / ws.z); const qw = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); g.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(qw)); g.position.copy(bone.worldToLocal(pos.clone())); bone.add(g); return g; };
    const h = this.B.RightHand, fa = wp('RightForeArm'), PK = { saber: 'W_saber', axe: 'W_axe', spear: 'W_spear', bow: 'W_bow', staff: 'W_spear' }[o.wpn];
    if (h && fa && PK && PROPS[PK]) { const hp = wp('RightHand'), d = hp.clone().sub(fa).normalize(), F = new THREE.Vector3(0, 0, 1); const Y = F.clone().addScaledVector(d, -F.dot(d)).normalize(), Z = d.clone(), X = Y.clone().cross(Z).normalize();
      let gp = hp.clone().addScaledVector(d, .085 * S).addScaledVector(Y, .01 * S); const fc = this.fistC(h); if (fc && fc.distanceTo(hp) < .2 * S) { gp = fc; this.gripFix = 1; }
      const g = mount(h, gp, X, Y, Z); const m = PROPS[PK].clone(true); if (o.wpn === 'spear' || o.wpn === 'staff') m.position.y = -.55; if (o.wpn === 'axe') m.position.y = -.2; if (o.wpn === 'bow') { m.rotation.y = Math.PI / 2; } g.add(m); m.traverse(k => { if (k.isMesh) k.castShadow = true; }); this.wpn = g; this.wm = m; }
    const lf = this.B.LeftForeArm, lh = wp('LeftHand'); if (o.shield && lf && lh && PROPS.W_shield) { const p0 = wp('LeftForeArm'), d = lh.clone().sub(p0).normalize(); const Y = new THREE.Vector3(1, 0, .35).normalize(); Y.addScaledVector(d, -Y.dot(d)).normalize(); const Z = d.clone(), X = Y.clone().cross(Z).normalize();
      const g = mount(lf, p0.clone().lerp(lh, .6).addScaledVector(Y, .07 * S), X, Y, Z); g.add(PROPS.W_shield.clone(true)); }
    if (o.amulet) this.addAmulet(S);
    this.ribbons = []; const RB = o.ribbons || []; for (const r of RB) { const bn = this.B[r.bone]; if (bn) this.ribbons.push(new Ribbon(bn, r, S)); }
    scene.updateMatrixWorld(true); this.hipY0 = this.B.Hips ? this.B.Hips.getWorldPosition(new THREE.Vector3()).y : 1; this.mountY = 0; this.bob = 0;
    // ANIM LAYER state: additive bones (base pose restored before the mixer runs, so nothing accumulates), look-at, recoil spring, lean
    this.ab = {}; if (!this.proc) for (const n of ADDB) { const b = this.B[n]; if (!b) continue; const pw = b.parent.getWorldQuaternion(new THREE.Quaternion()); this.ab[n] = { b, q: b.quaternion.clone(), r: b.quaternion.clone(), pw, pi: pw.clone().invert() }; }
    this.abL = Object.values(this.ab); this.T = Math.random() * 9; this.ph = Math.random() * 6.28; this.lookY = 0; this.lookP = 0; this.ly = 0; this.lp = 0; this.rc = { x: 0, z: 0, vx: 0, vz: 0 }; this.tw = 0; this.mv = 0; this.lvx = 0; this.lvz = 0; this.yawV = 0; this.accF = 0; this.lnF = 0; this.lnS = 0; this.wsc = 1; this.acts2 = {}; this.os = null; this.lm = false; this.lrun = 0; this.ovw = 0;
    { const ra = this.B.RightArm, hd = this.B.Head; this.sideR = ra && hd ? (Math.sign(ra.getWorldPosition(new THREE.Vector3()).x - hd.getWorldPosition(new THREE.Vector3()).x) || 1) : 1; }
    this.hasBow = o.wpn === 'bow'; this.heroBow = !!o.amulet;
    this.play('Idle');
  }
  // centroid of the vertices skinned to a hand bone, in bind pose (= centre of the clenched fist)
  fistC(bone) { let sm = null; this.scene.traverse(k => { if (k.isSkinnedMesh && !sm && k.skeleton.bones.includes(bone)) sm = k; }); if (!sm) return null; const bi = sm.skeleton.bones.indexOf(bone), g = sm.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, pos = g.attributes.position; if (!si || !sw) return null; sm.updateMatrixWorld(true); sm.skeleton.update(); const bt = sm.applyBoneTransform ? 'applyBoneTransform' : 'boneTransform'; const v = new THREE.Vector3(), c = new THREE.Vector3(); let n = 0;
    for (let i = 0; i < pos.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi) w += sw.getComponent(i, k); if (w < .6) continue; v.fromBufferAttribute(pos, i); sm[bt](i, v); v.applyMatrix4(sm.matrixWorld); c.add(v); n++; } return n > 20 ? c.multiplyScalar(1 / n) : null; }
  // Gulayim's tumar: golden triangle, point down, with an engraved inner triangle
  addAmulet(S) { const sp = this.B.Spine02 || this.B.Spine01, nk = this.B.neck || this.B.Head; if (!sp || !nk) return; this.scene.updateMatrixWorld(true); const a = sp.getWorldPosition(new THREE.Vector3()), b = nk.getWorldPosition(new THREE.Vector3()); const y = a.y + (b.y - a.y) * .62; let zf = a.z + .1 * S, best = -1e9;
    this.scene.traverse(k => { if (!k.isSkinnedMesh) return; const pos = k.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pos.count; i += 2) { v.fromBufferAttribute(pos, i).applyMatrix4(k.matrixWorld); if (Math.abs(v.y - y) < .035 * S && Math.abs(v.x - b.x) < .05 * S && v.z > best) best = v.z; } }); if (best > -1e9) zf = best;
    const g = new THREE.Group(); const ws = sp.getWorldScale(new THREE.Vector3()); g.scale.set(S / ws.x, S / ws.y, S / ws.z); g.quaternion.copy(sp.getWorldQuaternion(new THREE.Quaternion()).invert()); g.position.copy(sp.worldToLocal(new THREE.Vector3(b.x, y, zf + .006 * S))); sp.add(g);
    const tri = (r, dep) => { const sh = new THREE.Shape(); sh.moveTo(-r * .866, r * .5); sh.lineTo(r * .866, r * .5); sh.lineTo(0, -r); sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: dep * .4, bevelSize: r * .08, bevelSegments: 1 }); };
    const gold = new THREE.MeshStandardMaterial({ color: 0xe0b040, metalness: 1, roughness: .28, emissive: 0x6a4000, emissiveIntensity: .9 }); const m = new THREE.Mesh(tri(.058, .009), gold); g.add(m);
    const ins = new THREE.Mesh(tri(.024, .004), new THREE.MeshStandardMaterial({ color: 0x7a4e10, metalness: .9, roughness: .45 })); ins.position.z = .011; g.add(ins);
    const cord = new THREE.Mesh(new THREE.TorusGeometry(.012, .003, 6, 12), gold); cord.position.y = .038; g.add(cord); this.amulet = g; this.amuletMat = gold; }
  _act(cn) { let a = this.acts[cn]; if (!a) return null; if (a === this.cur) { a = this.acts2[cn] || (this.acts2[cn] = this.mixer.clipAction(new THREE.AnimationClip(cn + '#2', -1, this.acts[cn].getClip().tracks))); if (a === this.cur) a = this.acts[cn]; } return a; }
  _fade(a, dur, loop) { const prev = this.cur; this.cur = a; a.reset(); a.enabled = true; a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop; a.play(); if (prev && prev !== a) a.crossFadeFrom(prev, dur, false); }
  _shot(key, op, fade) { const g = SEG[key], a = this._act(g[0]); if (!a) return false; const D = op.dur || g[8], hT = D * (op.dur ? g[7] : g[6]); this.os = { key, act: a, a: g[1], p: g[2], h: g[3], b: g[4], rec: g[5], hT, t: 0, sp: this.hero ? 1 : 1 + (this.var - 1) * .4, D: a.getClip().duration - .002 }; this.lm = false; this._fade(a, fade, false); a.timeScale = 0; a.time = g[1]; return true; }
  _warp(o, t) { if (t < o.hT) { const u = t / o.hT; if (o.hT >= .35) { if (u < .3) { const w = 1 - u / .3; return o.a + (o.p - o.a) * (1 - w * w); } const c = o.p + (o.h - o.p) * .14; if (u < .76) return o.p + (c - o.p) * ((u - .3) / .46); const w = (u - .76) / .24; return c + (o.h - c) * w * w; } if (u < .45) return o.a + (o.p - o.a) * (u / .45); const w = (u - .45) / .55; return o.p + (o.h - o.p) * w * (.4 + .6 * w); } const u = Math.min(1, (t - o.hT) / o.rec); return o.h + (o.b - o.h) * (1 - (1 - u) * (1 - u)); }
  play(name, op = {}) {
    if (this.proc) { if (this.kind === name && !op.force) return; this.kind = name; this.pt = 0; this.pop = op; return; }
    if (name === 'Walking_A' && op.force && op.ts >= 2.5) name = '_Step';  // engine sidestep = quick low dash, not a sped-up walk
    const m = MAP[name] || (SEG[name] ? [SEG[name][0], 0] : MAP.Idle);
    if (!this.ab) { const a = this.acts[m[0]] || this.acts.idle; if (a) { this.kind = name; this.cur = a; a.play(); } return; }
    const loop = !!m[1];
    if (this.kind === name && !op.force) { this.lts = op.ts || 1; return; }
    // knocked down (not dead): get up first, then go on with whatever was asked
    if (this.kd && !this.isDead && name !== 'Death_A') { if (loop) { this.next = [name, op]; if (!this.os || this.os.key !== '_GetUp') { this.kind = '_GetUp'; this._shot('_GetUp', {}, .1); } return; } this.kd = false; this.next = null; }
    if (name === 'Death_A') { const dead = this.isDead || !SkinRig.feel; const lying = this.kd; this.kind = name; this.kd = !dead; this.next = null; this._shot(dead ? '_Death' : '_Down', {}, dead ? .16 : .1); if (lying && dead && this.os) this.os.t = 9; this.setBow(false); return; }
    const prevShot = !!this.os; this.kind = name; this.lts = op.ts || 1;
    if (!loop && SEG[name]) { const bw = RNG.test(name) && (this.hasBow || this.heroBow); this.setBow(bw); this._shot(bw ? '_Bow' : name, bw && !op.dur ? { dur: 1.3 } : op, /^Hit_/.test(name) ? .02 : prevShot ? .09 : .07); if (name === 'Hit_Front') this.recoil(0, -1, .7); else if (name === 'Hit_Back') this.recoil(0, 1, .7); else if (name === 'Block_Impact') { this.blockT = .25; this.recoil(0, -1, .3); } return; }
    this.os = null; this.setBow(false);
    if (LOCOQ.test(name)) { this.lm = true; const run = /Running/.test(name) && this.mv / (this.hgt / 1.75 * this.wsc) > 1.6 ? 1 : 0; this.lrun = run; const a = this.acts[run ? 'run' : 'walk']; if (a && a !== this.cur) { this._fade(a, prevShot ? .16 : .2, true); a.time = Math.random() < .5 ? 0 : a.getClip().duration * .5 * (run ? 1 : WALK_CYC / a.getClip().duration); } return; }
    this.lm = false; const a = this.acts[m[0]] || this.acts.idle; if (!a) return;
    if (a === this.cur) { a.timeScale = this.var; return; }
    this._fade(a, prevShot ? .24 : .28, true); a.timeScale = (m[1] ? (op.ts || 1) : 1) * this.var; a.time = Math.random() * a.getClip().duration;
    if (!m[1]) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; const dur = op.dur || m[2]; a.time = 0; a.timeScale = dur ? a.getClip().duration / dur : 1; }
  }
  setBow(on) { if (!this.heroBow || !this.wpn || !this.wm) return; if (on && !this.bowM && PROPS.W_bow) { const m = this.bowM = PROPS.W_bow.clone(true); m.rotation.y = Math.PI / 2; m.visible = false; this.wpn.add(m); } if (!this.bowM) return; this.bowM.visible = on; this.wm.visible = !on; }
  // world velocity, yaw rate, facing, world scale (engine calls this every rendered frame)
  motion(vx, vz, yawV = 0, rot = 0, vs = 1) { this.wv = [vx, vz]; const c = Math.cos(rot), s = Math.sin(rot), lx = vx * c - vz * s, lz = vx * s + vz * c, sp = Math.hypot(vx, vz), k = .22; this.accF = this.accF * .85 + (lz - this.lvz) * .15 * 30; this.lvx += (lx - this.lvx) * k; this.lvz += (lz - this.lvz) * k; this.mv += (Math.min(sp, 16) - this.mv) * k; this.yawV = this.yawV * .8 + cl(yawV, -9, 9) * .2; this.wsc = vs || 1; }
  // hit reaction: torso whips away from the blow (lx, lz = push direction in the body's own frame)
  recoil(lx, lz, mag = .5) { const r = this.rc; r.vx += lx * mag * 9; r.vz += lz * mag * 9; }
  _add(n, yaw, pitch, roll) { const s = this.ab[n]; if (!s || (Math.abs(yaw) + Math.abs(pitch) + Math.abs(roll) < 1e-4)) return; _e.set(pitch, yaw, roll); _d.setFromEuler(_e); _q2.copy(s.pi).multiply(_d).multiply(s.pw); s.b.quaternion.premultiply(_q2); }
  _aim(bn, cn, dir, w) { const b = this.B[bn], c = this.B[cn]; if (!b || !c || w <= 0) return; _q2.copy(b.quaternion); this.aimBone(b, c, dir); if (w < 1) { const t = b.quaternion.clone(); b.quaternion.copy(_q2).slerp(t, w); b.updateMatrixWorld(true); } }
  _loco(dt) { const sc = this.hgt / 1.75 * this.wsc || 1, v = this.mv / sc, lx = this.lvx / sc, lz = this.lvz / sc; const back = this.kind === 'Walking_Backwards' ? lz < .2 : (lz < -.5 && -lz > Math.abs(lx) * 1.2 && v < 3.2);
    let run = this.lrun; if (v > 2.3) run = 1; else if (v < 1.9) run = 0; if (back) run = 0; this.lrun = run; const cn = run ? 'run' : 'walk', a = this.acts[cn]; if (!a) return;
    if (a !== this.cur) { const pv = this.cur, pd = pv ? pv.getClip().duration : 1, ph = pv ? (cn === 'run' ? (pv.time % WALK_CYC) / WALK_CYC : pv.time / pd) : 0; this._fade(a, .22, true); a.time = (ph % 1) * (cn === 'run' ? a.getClip().duration : WALK_CYC); }
    let g, ts; if (run) { g = cl(v / (V_RUN * 1.18), .8, 1.3); ts = cl(v / (V_RUN * g), .6, 1.5); } else { g = cl(v / (V_WALK * 1.25), .85, 1.3); ts = cl(v / (V_WALK * g), .45, 1.75); }
    this.sg = g; a.timeScale = back ? -ts : ts; const want = v > .5 ? cl(Math.atan2(back ? -lx : lx, back ? -lz : Math.max(lz, 0.001 + Math.abs(lx) * .25)), -1.1, 1.1) : 0; this.twT = want; }
  _layer(dt) { const B = this.B, o = this.os, dead = this.isDead || this.kind === 'Death_A' || this.kd, k7 = Math.min(1, dt * 7);
    // springs
    const r = this.rc, n = Math.max(1, Math.ceil(dt / .016)), h = Math.min(dt, .05) / n; for (let i = 0; i < n; i++) { r.vx += (-196 * r.x - 12.6 * r.vx) * h; r.vz += (-196 * r.z - 12.6 * r.vz) * h; r.x += r.vx * h; r.z += r.vz * h; } r.x = cl(r.x, -.6, .6); r.z = cl(r.z, -.6, .6);
    const lw = dead ? 0 : o ? (o.key === '_Bow' ? 1 : .35) : 1; this.ly += (cl(this.lookY, -1.25, 1.25) * lw - this.ly) * k7; this.lp += (cl(this.lookP, -.5, .5) * lw - this.lp) * k7;
    this.tw += ((this.lm && !this.mounted ? this.twT || 0 : 0) - this.tw) * Math.min(1, dt * 9);
    const br = dead ? 0 : Math.sin(this.T * 1.9 * this.var + this.ph) * .016, sway = dead || this.lm || o ? 0 : Math.sin(this.T * .55 * this.var + this.ph * 2) * .02;
    let bt = 0; const bowOn = !!o && o.key === '_Bow'; this.blockT = Math.max(0, (this.blockT || 0) - dt); const blk = this.blockT > 0 && !dead; this.ovw += ((bowOn || blk || (o && o.key === 'Cheer') ? 1 : 0) - this.ovw) * Math.min(1, dt * (blk ? 40 : 14)); if (bowOn) bt = -this.sideR * .75 * this.ovw;
    this.rw = (this.rw || 0) + ((this.lm && this.lrun && !this.mounted ? 1 : 0) - (this.rw || 0)) * Math.min(1, dt * 6); const up = -.6 * this.rw;  // the run mocap leans 55 deg: straighten the spine to a ~30 deg heroic run
    const tw = this.tw, ly = this.ly - bt, lp = this.lp;
    this._add('Hips', tw, up * .4, sway);
    this._add('Spine', -tw * .4 + bt * .34, r.z * .45 + up * .45, -r.x * .45 - sway * .6);
    this._add('Spine01', -tw * .3 + bt * .33, r.z * .3 + up * .33, -r.x * .3);
    this._add('Spine02', -tw * .3 + bt * .33 + ly * .2, br + lp * .2 + up * .22, 0);
    this._add('neck', ly * .3, lp * .3 - r.vz * .012 - up * .3, r.vx * .012);
    this._add('Head', ly * .5, lp * .5 - br * .5 - up * .3, 0);
    // longer stride instead of faster legs when the unit moves faster than the clip
    if (this.lm && this.sg && Math.abs(this.sg - 1) > .02) for (const nm of ['LeftUpLeg', 'RightUpLeg']) { const s = this.ab[nm]; if (!s) continue; _q2.copy(s.r).invert().multiply(s.b.quaternion); if (_q2.w < 0) { _q2.x = -_q2.x; _q2.y = -_q2.y; _q2.z = -_q2.z; _q2.w = -_q2.w; } const th = Math.acos(cl(_q2.w, -1, 1)), sn = Math.sin(th); if (sn > 1e-4) { const t2 = th * this.sg, f = Math.sin(t2) / sn; _q2.set(_q2.x * f, _q2.y * f, _q2.z * f, Math.cos(t2)); s.b.quaternion.copy(s.r).multiply(_q2); } }
    // arm overlays: bow draw / release, cheer with the weapon raised
    if (this.ovw > .02 && (o || blk) && !this.mounted) { this.root.updateMatrixWorld(true); const q = this.root.getWorldQuaternion(new THREE.Quaternion()), F = _a1.set(0, 0, 1).applyQuaternion(q), Sd = _a2.set(1, 0, 0).applyQuaternion(q).multiplyScalar(this.sideR), U = _a3.set(0, 1, 0), w = this.ovw, V = (f, s, u) => new THREE.Vector3().addScaledVector(F, f).addScaledVector(Sd, s).addScaledVector(U, u);
      if (blk) { const e = Math.min(1, this.blockT / .12) * w; this._aim('LeftArm', 'LeftForeArm', V(.7, -.3, .05), e); this._aim('LeftForeArm', 'LeftHand', V(.35, .55, .6), e); this._aim('RightArm', 'RightForeArm', V(.65, .35, -.05), e * .8); this._aim('RightForeArm', 'RightHand', V(.3, -.45, .75), e * .8); }
      else if (bowOn) { const u = cl(o.t / o.hT, 0, 1), rel = o.t - o.hT, dr = cl((u - .25) / .6, 0, 1), d = rel < 0 ? dr * dr * (3 - 2 * dr) : 0, fo = rel > o.rec * .5 ? cl(1 - (rel - o.rec * .5) / (o.rec * .5 + .01), 0, 1) : 1, ww = w * fo;
        this._aim('RightArm', 'RightForeArm', V(.95, .22, .06), ww); this._aim('RightForeArm', 'RightHand', V(1, .05, .04), ww);
        this._aim('LeftArm', 'LeftForeArm', V(.75 - 1.25 * d, -.35 - .45 * d, -.05 + .1 * d), ww); this._aim('LeftForeArm', 'LeftHand', V(1, .1 + .3 * d, .1 + (rel > 0 ? .25 : 0)), ww); }
      else if (o && o.key === 'Cheer') { const e = cl(o.t / .25, 0, 1) * cl((o.hT + o.rec - o.t) / .3, 0, 1), pm = Math.sin(o.t * 12.5) * .5 + .5; this._aim('RightArm', 'RightForeArm', V(.15, .3, 1), w * e); this._aim('RightForeArm', 'RightHand', V(.1 + pm * .35, .05, 1 - pm * .2), w * e); } }
    // body weight: lean into acceleration, bank into turns (visual only, the engine's movement is untouched)
    if (!this.mounted) { const sc = this.hgt / 1.75 * this.wsc || 1, v = this.mv / sc, tf = dead || !this.lm ? 0 : cl(this.accF / sc * .011, -.09, .11), ts = dead || !this.lm ? 0 : cl(-this.yawV * v * .011, -.2, .2); this.lnF += (tf - this.lnF) * Math.min(1, dt * 6); this.lnS += (ts - this.lnS) * Math.min(1, dt * 6); this.body.rotation.x = this.lnF; this.body.rotation.z = this.lnS; } }
  _pb(n, dt, x, y = 0, z = 0, r = 16) { const b = this.B[n]; if (!b) return; const q = Math.min(1, dt * r), e = b.rotation; e.x += (x - e.x) * q; e.y += (y - e.y) * q; e.z += (z - e.z) * q; }
  _spring(dt) { const r = this.rc, n = Math.max(1, Math.ceil(dt / .016)), h = Math.min(dt, .05) / n; for (let i = 0; i < n; i++) { r.vx += (-196 * r.x - 12.6 * r.vx) * h; r.vz += (-196 * r.z - 12.6 * r.vz) * h; r.x += r.vx * h; r.z += r.vz * h; } r.x = cl(r.x, -.6, .6); r.z = cl(r.z, -.6, .6); return r; }
  // ---- quadruped wolf (R_bori4): walk / trot / gallop chosen by ground speed, crouch-and-lunge bite, flinch, howl, falls on its side
  _wolf(dt) { const k = this.kind, T = this.T, t = this.pt, H = this.hgt, PI2 = Math.PI * 2, dead = this.isDead || k === 'Death_A', r = this._spring(dt); if (this.isDead && this.dz === undefined) this.dz = Math.random() < .5 ? -1 : 1;
    const v = this.mv / (this.wsc || 1) / (H / .95), atk = /Attack|Slam|Jump|Shoot|Stab/.test(k), moving = !dead && !atk && LOCOQ.test(k) && v > .25;
    let by = 0, bz = 0, bp = 0, br = 0, sx = 0, nx = 0, hx = 0, jaw = 0, tx = -.15, ty = Math.sin(T * 2.1 + this.ph) * .25, rate = 16; const L = { LeftFront: [0, 0, 0], RightFront: [0, 0, 0], LeftBack: [0, 0, 0], RightBack: [0, 0, 0] };
    if (moving) { const g = v < 1.7 ? 0 : v < 4.4 ? 1 : 2; this.gg = g; const f = v / ([.8, 1.25, 2.3][g] * (.8 + v * .04)); this.gp = (this.gp + dt * f) % 1; const off = [[.25, .75, 0, .5], [0, .5, .5, 0], [.5, .62, 0, .12]][g], A = [.36, .48, .84][g], st = [.62, .5, .4][g]; let i = 0;
      for (const n in L) { const p = (this.gp + off[i]) % 1, fr = i < 2; i++; let a, lift = 0; if (p < st) a = A * (1 - 2 * p / st); else { const u = (p - st) / (1 - st); a = A * (-1 + 2 * u); lift = Math.sin(u * Math.PI); } L[n] = fr ? [a + lift * .2, lift * (.5 + g * .15), -lift * (.8 + g * .2)] : [a, -lift * (.5 + g * .15), lift * (.7 + g * .2)]; }
      if (g === 2) { const w = Math.sin(PI2 * this.gp); sx = w * .26; bp = Math.sin(PI2 * this.gp + 1.2) * .11; by = (Math.abs(Math.sin(Math.PI * this.gp)) - .4) * .14 * H; nx = -w * .12; tx = -.35; ty *= .3; } else { by = Math.sin(PI2 * 2 * this.gp) * (g ? .022 : .01) * H; nx = g ? .05 : .12; tx = g ? -.3 : -.1; }
      br = cl(-this.yawV * .035, -.25, .25); rate = 22; }
    else if (/Jump/.test(k)) { const w = Math.min(1, t / .5); bp = -.28 + w * .5; nx = -.15; hx = -.1; jaw = w < .6 ? .6 : 0; tx = -.5; for (const n in L) L[n] = /Front/.test(n) ? [.95 - w * .6, .2, -.3] : [-.85 + w * .8, -.1, .3]; rate = 28; }  // pounce: the engine carries the body, the rig only stretches out
    else if (atk) { const hT = this.pop.dur ? this.pop.dur * .42 : .34, w = (t - hT) / .24;
      if (t < hT) { const u = t / hT; by = -.13 * H * u; bp = -.16 * u; nx = .25 * u; hx = -.2 * u; jaw = .18 * u; tx = .1; for (const n in L) L[n] = /Front/.test(n) ? [.25 * u, -.2 * u, 0] : [.35 * u, -.5 * u, .4 * u]; }
      else if (w < 1) { const s = Math.sin(Math.PI * w); bz = .5 * H * s; by = .22 * H * s; bp = -.3 + w * .5; nx = -.2; hx = -.1; jaw = w < .55 ? .6 : 0; tx = -.5; for (const n in L) L[n] = /Front/.test(n) ? [.95 - w * .7, .2, -.3] : [-.8 + w * .7, -.1, .3]; rate = 30; }
      else { nx = .15; jaw = .1; } }
    else if (dead) { const u = Math.min(1, t / .42), e = u * u * (3 - 2 * u); br = (this.dz || 1) * 1.5 * e; by = .17 * H * e; nx = .25 * e; hx = .2 * e; jaw = .22 * e; tx = .3 * e; ty = 0; for (const n in L) L[n] = [/Front/.test(n) ? .35 * e : -.3 * e, -.25 * e, .3 * e]; rate = 12; }
    else if (/^Hit/.test(k) && t < .3) { jaw = .35; nx = .2; hx = -.25; by = -.05 * H; tx = .4; }
    else if (k === 'Cheer') { const u = Math.min(1, t / .35) * cl((1.5 - t) / .3, 0, 1); nx = -.75 * u; hx = -.35 * u; jaw = .4 * u; bp = -.12 * u; tx = -.5; }
    else if (k === 'Idle_Combat') { by = -.1 * H; bp = -.06; nx = .25; hx = -.15; jaw = .14 + Math.sin(T * 9) * .02; tx = .05; ty *= .4; for (const n in L) L[n] = /Front/.test(n) ? [.18, -.12, 0] : [.3, -.42, .35]; }
    else { nx = Math.sin(T * .7 + this.ph) * .05; sx = Math.sin(T * 1.9 * this.var + this.ph) * .012; }
    const ly = dead ? 0 : cl(this.lookY, -1.1, 1.1), lp = dead ? 0 : cl(this.lookP, -.4, .4); this.ly += (ly - this.ly) * Math.min(1, dt * 7); this.lp += (lp - this.lp) * Math.min(1, dt * 7);
    this._pb('Spine', dt, sx, r.x * .5 + cl(this.yawV * .03, -.2, .2), 0, rate); this._pb('Chest', dt, -sx * .6, r.x * .3, 0, rate); this._pb('Neck', dt, nx + this.lp * .5 + r.z * .3, this.ly * .45, 0, rate); this._pb('Head', dt, hx + this.lp * .5, this.ly * .55, r.x * .4, rate); this._pb('Jaw', dt, jaw, 0, 0, 30);
    this._pb('Tail1', dt, tx, ty, 0, 10); this._pb('Tail2', dt, tx * .5, ty * 1.3, 0, 8);
    for (const n in L) { const a = L[n]; this._pb(n + 'UpLeg', dt, a[0], 0, 0, rate); this._pb(n + 'Leg', dt, a[1], 0, 0, rate); this._pb(n + 'Foot', dt, a[2], 0, 0, rate); }
    const b = this.body, q = Math.min(1, dt * (dead ? 9 : rate)); b.position.y += (by - b.position.y) * q; b.position.z += (bz - b.position.z) * q; b.rotation.x += (bp - r.z * .25 - b.rotation.x) * q; b.rotation.z += (br - b.rotation.z) * q; }
  // ---- Aydarha (R_aydarho, 16 bones): breathing and slow sway, neck follows the hero, bite / tail whip / water jet / dive / emerge roar / death, driven by the action names the boss kit already plays
  _dragon(dt) { const k = this.kind, T = this.T, t = this.pt, dead = this.isDead || k === 'Death_A', r = this._spring(dt), y = this.root.position.y; const vy = dt > 0 ? (y - (this.py ?? y)) / dt : 0; this.py = y; this.em = Math.max((this.em || 0) - dt * 1.1, vy > 2.5 && !dead ? 1 : 0);
    let nx = [0, 0, 0], hx = 0, jaw = .05 + Math.sin(T * 1.6) * .03, tw = 0, tamp = .11, spy = 0, rate = 8, nyk = 1;
    if (dead) { const e = Math.min(1, t / .9); nx = [.3 * e, .45 * e, .4 * e]; hx = .2 * e; jaw = .3 * e; tamp = .02; nyk = 0; }
    else if (k === 'E_Attack') { const hT = this.pop.dur ? Math.max(.3, this.pop.dur - .4) : .9, w = (t - hT) / .3;  // bite: coil back and up, mouth opens, strike down and forward, snap
      if (t < hT) { const u = Math.min(1, t / (hT * .55)); nx = [-.7 * u, -.45 * u, .1 * u]; hx = .4 * u; jaw = .15 + .6 * Math.min(1, t / hT); }
      else if (w < 1) { nx = [.8, .45, .1]; hx = -.3; jaw = w < .45 ? .75 : 0; rate = 26; } else { nx = [.2, .1, 0]; jaw = .05; rate = 5; } }
    else if (k === '2H_Melee_Attack_Spin') { const hT = this.pop.dur ? Math.max(.3, this.pop.dur - .5) : 1.0, w = (t - hT) / .35;  // tail: curl to one side, whip across
      if (t < hT) { const u = Math.min(1, t / (hT * .7)); tw = .3 * u; spy = .22 * u; tamp = .03; } else if (w < 1) { tw = -.42; spy = -.3; tamp = .03; rate = 24; } else { tw = -.1 * Math.max(0, 2 - w); tamp = .2; rate = 6; } }
    else if (/Shoot|Spellcast/.test(k)) { const hT = 1.1;  // jet: rear up, open wide, level the neck and hold while the beam runs
      if (t < hT) { const u = Math.min(1, t / (hT * .6)); nx = [-.45 * u, -.3 * u, -.1 * u]; hx = .25 * u; jaw = .7 * Math.min(1, t / hT); } else if (t < hT + 1.5) { const s = Math.sin(T * 38) * .015; nx = [.12 + s, .1, .05]; hx = -.1; jaw = .8 + s * 2; rate = 20; } }
    else if (/^Hit/.test(k) && this.pop.ts && this.pop.ts < 1) { const u = Math.min(1, t / .5); nx = [.8 * u, .7 * u, .5 * u]; hx = .4 * u; jaw = 0; tw = 0; tamp = .2; }  // dive
    else if (/^Hit/.test(k) && t < .35) { nx = [-.2, -.1, 0]; jaw = .5; rate = 20; }
    else if (k === 'Cheer' || this.em > 0) { const u = k === 'Cheer' ? Math.min(1, t / .4) * cl((1.6 - t) / .3, 0, 1) : this.em; nx = [-.5 * u, -.3 * u, -.15 * u]; hx = -.2 * u; jaw = Math.max(jaw, .7 * u); }
    const ly = dead ? 0 : cl(this.lookY, -1.2, 1.2) * nyk, lp = dead ? 0 : cl(this.lookP, -.4, .4); this.ly += (ly - this.ly) * Math.min(1, dt * 4); this.lp += (lp - this.lp) * Math.min(1, dt * 4);
    const br = Math.sin(T * 1.3) * .02; this._pb('Spine1', dt, br + r.z * .15, this.ly * .1 + r.x * .2, 0, rate); this._pb('Spine3', dt, -br, spy, 0, rate); this._pb('Spine4', dt, 0, spy * .7, 0, rate);
    for (let i = 0; i < 3; i++) this._pb('Neck' + (i + 1), dt, nx[i] + this.lp * .25 + r.z * .2, this.ly * .25 + Math.sin(T * .8 + i * .7) * .07 * nyk + r.x * .25, 0, rate);
    this._pb('Head', dt, hx + this.lp * .25, this.ly * .15, Math.sin(T * .6) * .04, rate); this._pb('Jaw', dt, jaw, 0, 0, 26);
    for (let i = 1; i <= 7; i++) this._pb('Tail' + i, dt, dead ? .05 : Math.sin(T * 1.1 - i * .6) * .03, tw * (.6 + i * .12) + Math.sin(T * 1.3 - i * .75) * tamp * (.5 + i * .12), 0, rate); }
  setMount(on, y) { this.mounted = on; this.mountY = on ? y : 0; this.body.position.set(0, this.mountY, 0); this.body.rotation.x = 0; if (!on) this.sad = null; }
  // seat on a moving saddle (y, z in root space; pitch of the horse's back)
  setSaddle(y, z, pitch) { this.sad = { y, z, pitch }; }
  aimBone(b, c, d) { if (!b || !c) return; b.updateMatrixWorld(true); const p0 = b.getWorldPosition(new THREE.Vector3()), p1 = c.getWorldPosition(new THREE.Vector3()); const cur = p1.sub(p0).normalize(); const qd = new THREE.Quaternion().setFromUnitVectors(cur, d.clone().normalize()); const nw = qd.multiply(b.getWorldQuaternion(new THREE.Quaternion())); const pw = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); b.quaternion.copy(pw.multiply(nw)); b.updateMatrixWorld(true); }
  legPose() { const R = this.root, B = this.B; R.updateMatrixWorld(true); const q = R.getWorldQuaternion(new THREE.Quaternion()); const F = new THREE.Vector3(0, 0, 1).applyQuaternion(q), U = new THREE.Vector3(0, 1, 0), Sd = new THREE.Vector3(1, 0, 0).applyQuaternion(q); const hp = B.Hips ? B.Hips.getWorldPosition(new THREE.Vector3()) : null;
    for (const s of ['Left', 'Right']) { const th = B[s + 'UpLeg']; if (!th || !hp) continue; const sg = Math.sign(th.getWorldPosition(new THREE.Vector3()).sub(hp).dot(Sd)) || 1; const side = Sd.clone().multiplyScalar(sg);
      this.aimBone(th, B[s + 'Leg'], F.clone().multiplyScalar(.7).addScaledVector(side, .55).addScaledVector(U, -.45)); this.aimBone(B[s + 'Leg'], B[s + 'Foot'], F.clone().multiplyScalar(-.25).addScaledVector(side, .18).addScaledVector(U, -1)); this.aimBone(B[s + 'Foot'], B[s + 'ToeBase'], F.clone().addScaledVector(U, -.2)); } }
  update(dt) { const G = globalThis.__G; if (G && G.hitStop > 0 && !G.paused) dt *= .05;  // hit-stop freezes the bodies too
    this.T += dt; if (this.proc) { this.pt += dt; if (this.proc === 'wolf') this._wolf(dt); else this._dragon(dt); for (const r of this.ribbons) r.update(dt, this.root); return; }
    for (const s of this.abL) s.b.quaternion.copy(s.q);
    const o = this.os; if (o) { o.t += dt * o.sp; o.act.time = cl(this._warp(o, o.t), 0, o.D); if (o.key === '_GetUp' && o.t >= o.hT + o.rec) { this.kd = false; this.os = null; const nx = this.next || ['Idle_Combat', {}]; this.next = null; this.kind = ''; this.play(nx[0], nx[1]); } } else if (this.lm) this._loco(dt);
    this.mixer.update(dt); if (this.post) this.post(this); for (const s of this.abL) s.q.copy(s.b.quaternion); this._layer(dt); if (this.mounted) { if (this.sad) { const h = this.hipY0 * .93, c = Math.cos(this.sad.pitch), sn = Math.sin(this.sad.pitch); this.body.rotation.x = this.sad.pitch; this.body.position.set(0, this.sad.y - h * c, this.sad.z - h * sn); } else this.body.position.y = this.mountY + this.bob; this.legPose(); } for (const r of this.ribbons) r.update(dt, this.root); }
  dispose() { for (const r of this.ribbons) r.dispose(); }
}

// feel systems (hit-stop, recoil, look-at, blade trails, FOV punch) live in feel.js; loaded lazily so engine.js / index.html stay untouched
setTimeout(() => import('./feel.js?v=1795249975').catch(e => console.warn('feel', e)), 0);
