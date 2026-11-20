// Realistic skinned character (Meshy rig) driven by mocap clips retargeted from a shared library
import * as THREE from 'three';
import { clone as skClone } from '../assets/vendor/jsm/utils/SkeletonUtils.js?v=1795179205';
import { PROPS } from './glbrig.js?v=1795179205';
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
    const D = ANIM.data; const hips = this.B.Hips; const tgtY = hips ? hips.position.y : 100;
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
  play(name, op = {}) {
    const m = MAP[name] || MAP.Idle; const a = this.acts[m[0]] || this.acts.idle; if (!a) return;
    if (this.kind === name && !op.force) { if (m[1]) a.timeScale = (op.ts || 1) * this.var; return; }
    this.kind = name; const prev = this.cur; this.cur = a; a.reset(); a.enabled = true;
    a.setLoop(m[1] ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !m[1];
    const dur = op.dur || m[2]; a.timeScale = (dur ? a.getClip().duration / dur : (m[1] ? (op.ts || 1) : 1)) * (m[1] ? this.var : 1); if (m[1]) a.time = Math.random() * a.getClip().duration;
    a.play(); if (prev && prev !== a) a.crossFadeFrom(prev, m[1] ? .2 : .08, false);
  }
  motion(vx, vz) { this.wv = [vx, vz]; }
  setMount(on, y) { this.mounted = on; this.mountY = on ? y : 0; this.body.position.set(0, this.mountY, 0); this.body.rotation.x = 0; if (!on) this.sad = null; }
  // seat on a moving saddle (y, z in root space; pitch of the horse's back)
  setSaddle(y, z, pitch) { this.sad = { y, z, pitch }; }
  aimBone(b, c, d) { if (!b || !c) return; b.updateMatrixWorld(true); const p0 = b.getWorldPosition(new THREE.Vector3()), p1 = c.getWorldPosition(new THREE.Vector3()); const cur = p1.sub(p0).normalize(); const qd = new THREE.Quaternion().setFromUnitVectors(cur, d.clone().normalize()); const nw = qd.multiply(b.getWorldQuaternion(new THREE.Quaternion())); const pw = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); b.quaternion.copy(pw.multiply(nw)); b.updateMatrixWorld(true); }
  legPose() { const R = this.root, B = this.B; R.updateMatrixWorld(true); const q = R.getWorldQuaternion(new THREE.Quaternion()); const F = new THREE.Vector3(0, 0, 1).applyQuaternion(q), U = new THREE.Vector3(0, 1, 0), Sd = new THREE.Vector3(1, 0, 0).applyQuaternion(q); const hp = B.Hips ? B.Hips.getWorldPosition(new THREE.Vector3()) : null;
    for (const s of ['Left', 'Right']) { const th = B[s + 'UpLeg']; if (!th || !hp) continue; const sg = Math.sign(th.getWorldPosition(new THREE.Vector3()).sub(hp).dot(Sd)) || 1; const side = Sd.clone().multiplyScalar(sg);
      this.aimBone(th, B[s + 'Leg'], F.clone().multiplyScalar(.7).addScaledVector(side, .55).addScaledVector(U, -.45)); this.aimBone(B[s + 'Leg'], B[s + 'Foot'], F.clone().multiplyScalar(-.25).addScaledVector(side, .18).addScaledVector(U, -1)); this.aimBone(B[s + 'Foot'], B[s + 'ToeBase'], F.clone().addScaledVector(U, -.2)); } }
  update(dt) { this.mixer.update(dt); if (this.post) this.post(this); if (this.mounted) { if (this.sad) { const h = this.hipY0 * .93, c = Math.cos(this.sad.pitch), sn = Math.sin(this.sad.pitch); this.body.rotation.x = this.sad.pitch; this.body.position.set(0, this.sad.y - h * c, this.sad.z - h * sn); } else this.body.position.y = this.mountY + this.bob; this.legPose(); } for (const r of this.ribbons) r.update(dt, this.root); }
  dispose() { for (const r of this.ribbons) r.dispose(); }
}
