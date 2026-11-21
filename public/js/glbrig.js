// Skinned GLB character driven by the same procedural pose parameters as Rig
import * as THREE from 'three';
import { J, BASE, POSE, MAP } from './rig.js?v=1795218616';
import { clone as skClone } from '../assets/vendor/jsm/utils/SkeletonUtils.js?v=1795218616';
const PI = Math.PI, S = Math.sin, DOWN = new THREE.Vector3(0, -1, 0);
const ZETA = { by: .75, bRx: 1, bRy: 1, bRz: .55, hipY: .8, spRx: .55, spRy: .5, spRz: .5, hdRx: .42, hdRy: .4, aLx: .5, aLz: .5, eL: .38, aRx: .55, aRz: .55, eR: .4, lL: .9, kL: .9, lR: .9, kR: .9, wRx: .45 };
const WMUL = { lL: 1.9, kL: 1.9, lR: 1.9, kR: 1.9, by: 1.5, hdRx: .62, hdRy: .62, eL: .7, eR: .75, aLx: .8, aLz: .8, spRx: .85, spRy: .8, spRz: .8, wRx: .85, bRz: .7 };
const CLOTH = [[/dress|quilt|cloak/, 1, .5, .42, .014], [/scarf/, 1, .8, .45, .02], [/hair/, 1, .86, .55, .01], [/plume/, -1, .9, .12, .03]];
const E = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
export const PROPS = {};
export class GlbRig {
  constructor(src, wpn = 'saber', shield = 0) {
    const scene = skClone(src); this.root = new THREE.Group(); const body = this.body = new THREE.Group(); this.root.add(body); body.add(scene); this.scene = scene;
    this.mats = []; this.kind = 'idle'; this.t = Math.random() * 3; this.sp = 1; this.cur = { ...BASE }; this.snap = 18;
    const B = this.B = {};
    scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = o.material.clone(); if (o.material.emissive) { o.material.userData.em0 = o.material.emissive.clone(); this.mats.push(o.material); } } if (o.isBone) B[o.name] = o; });
    const bb = new THREE.Box3().setFromObject(scene); const hgt = Math.max(.5, bb.max.y - bb.min.y); this.hgt = hgt;
    scene.updateMatrixWorld(true);
    const R = this.rest = {};
    for (const n in B) R[n] = { l: B[n].quaternion.clone(), w: B[n].getWorldQuaternion(new THREE.Quaternion()), p: B[n].getWorldPosition(new THREE.Vector3()) };
    const al = (a, b, pre) => { const d = R[b].p.clone().sub(R[a].p).normalize(); if (pre) d.applyQuaternion(pre); return new THREE.Quaternion().setFromUnitVectors(d, DOWN); };
    this.A = {};
    for (const s of ['l', 'r']) { const a0 = al('upperarm_' + s, 'lowerarm_' + s), f0 = al('lowerarm_' + s, 'hand_' + s, a0), t0 = al('thigh_' + s, 'calf_' + s), c0 = al('calf_' + s, 'foot_' + s, t0); this.A[s] = { a0, f0, t0, c0, a0i: a0.clone().invert(), t0i: t0.clone().invert() }; }
    this.pelY = B.pelvis ? B.pelvis.position.y : 0;
    // saber in right hand
    const h = B.hand_r; if (h && wpn) {
      const A = this.A.r, hw0 = A.f0.clone().multiply(A.a0).multiply(R.hand_r.w); const base = this.wBase = hw0.clone().invert();
      const w = this.wpn = new THREE.Group(); const ws = h.getWorldScale(new THREE.Vector3()); w.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z); w.position.copy(new THREE.Vector3(.0, -.085, .02).applyQuaternion(base)).divide(ws); h.add(w);
      const steel = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: .95, roughness: .25 }), gold = new THREE.MeshStandardMaterial({ color: 0xc79a3a, metalness: 1, roughness: .3 }), grip = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: .7 });
      const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; w.add(o); return o; };
      const PK = { saber: 'W_saber', axe: 'W_axe', spear: 'W_spear', bow: 'W_bow' }[wpn];
      if (PK && PROPS[PK]) { const m = PROPS[PK].clone(true); m.rotation.x = PI / 2; if (wpn === 'spear') m.position.z = -.5; if (wpn === 'axe') m.position.z = -.25; m.traverse(o => { if (o.isMesh) o.castShadow = true; }); w.add(m); } else {
      if (wpn === 'saber') { const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.quadraticCurveTo(.5, .02, .92, .2); shp.quadraticCurveTo(.52, .09, 0, .065);
        const bl = add(new THREE.ExtrudeGeometry(shp, { depth: .012, bevelEnabled: false }), steel, .006, -.03, .07); bl.rotation.y = -PI / 2; add(new THREE.BoxGeometry(.03, .13, .03), gold, 0, 0, .06); add(new THREE.CylinderGeometry(.016, .016, .15, 8), grip, 0, 0, -.02).rotation.x = PI / 2; }
      else if (wpn === 'axe') { add(new THREE.CylinderGeometry(.022, .026, 1.25, 8), grip, 0, 0, .45).rotation.x = PI / 2; const hd = add(new THREE.CylinderGeometry(.26, .26, .035, 16, 1, false, 0, PI), steel, 0, .0, .98); hd.rotation.set(0, 0, PI / 2); add(new THREE.ConeGeometry(.04, .2, 8), steel, 0, 0, 1.15).rotation.x = PI / 2; }
      else if (wpn === 'spear') { add(new THREE.CylinderGeometry(.016, .016, 2.0, 8), grip, 0, 0, .5).rotation.x = PI / 2; add(new THREE.ConeGeometry(.04, .28, 8), steel, 0, 0, 1.62).rotation.x = PI / 2; }
      else if (wpn === 'staff') { add(new THREE.CylinderGeometry(.02, .024, 1.7, 8), grip, 0, 0, .45).rotation.x = PI / 2; add(new THREE.SphereGeometry(.09, 12, 10), new THREE.MeshStandardMaterial({ color: 0x400808, emissive: 0xff2a08, emissiveIntensity: 2 }), 0, 0, 1.36); }
      else if (wpn === 'bow') { const bw = add(new THREE.TorusGeometry(.42, .014, 6, 16, PI), grip, 0, 0, .05); bw.rotation.set(0, PI / 2, PI / 2); }
      }
    }
    const hl = B.hand_l; if (shield && hl && PROPS.W_shield) { const A = this.A.l, base = A.f0.clone().multiply(A.a0).multiply(R.hand_l.w).invert(); const ws = hl.getWorldScale(new THREE.Vector3()); const s = new THREE.Group(); s.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z); s.quaternion.copy(base); hl.add(s); const m = PROPS.W_shield.clone(true); m.rotation.z = -PI / 2; m.position.set(.07, -.06, .02); s.add(m); this.shield = s; }
    this.fing = {};
    for (const sd of ['l', 'r']) { if (!R['index_01_' + sd] || !R['pinky_01_' + sd]) continue; const ac = R['pinky_01_' + sd].p.clone().sub(R['index_01_' + sd].p).normalize(); const L = [];
      for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) for (let k = 1; k <= 3; k++) { const n = f + '_0' + k + '_' + sd; if (R[n]) L.push([n, f === 'thumb' ? .45 : (k === 1 ? 1.0 : 1.15)]); }
      this.fing[sd] = { ac: sd === 'r' ? ac : ac.clone().negate(), L }; }
    this.grip = { r: wpn ? 1 : .3, l: shield ? .9 : .35 };
    this._q = new THREE.Quaternion(); this._fq = new THREE.Quaternion(); this.fSign = window.__FS || 1;
    // cloth / hair secondary motion (vertex shader driven by a damped spring)
    this.vel = {}; this.cl = new THREE.Vector3(); this.clV = new THREE.Vector3(); this.clT = new THREE.Vector3(); this.yawV = 0; this.spd = 0; this.acc = 0; this.lspd = 0;
    const U = this.U = { cl: { value: this.cl }, t: { value: Math.random() * 10 } };
    let y0 = 1e9, y1 = -1e9; scene.traverse(o => { if (o.isSkinnedMesh) { o.geometry.computeBoundingBox(); y0 = Math.min(y0, o.geometry.boundingBox.min.y); y1 = Math.max(y1, o.geometry.boundingBox.max.y); } }); const H = y1 - y0;
    if (H > 0) scene.traverse(o => { if (!o.isSkinnedMesh) return; const m = o.material, nm = (m.name || '').toLowerCase(); const c = CLOTH.find(c => c[0].test(nm)); if (!c) return;
      const P = new THREE.Vector4(c[1], y0 + c[2] * H, c[3] * H, c[4] * H);
      m.onBeforeCompile = sh => { sh.uniforms.uCl = U.cl; sh.uniforms.uClT = U.t; sh.uniforms.uClP = { value: P };
        sh.vertexShader = 'uniform vec3 uCl; uniform float uClT; uniform vec4 uClP;\n' + sh.vertexShader.replace('#include <skinning_vertex>', `#include <skinning_vertex>
        { float w = clamp(uClP.x * (uClP.y - transformed.y) / uClP.z, 0., 1.); w *= w;
          vec2 f = vec2(sin(uClT * 5.3 + transformed.y * 11. + transformed.x * 6.), cos(uClT * 4.1 + transformed.y * 9. + transformed.z * 7.)) * uClP.w;
          vec2 d = (uCl.xz + f) * w; transformed.xz += d; transformed.y += length(d) * .35 * w; }`); };
      m.customProgramCacheKey = () => 'qqcloth'; m.needsUpdate = true; });
  }
  motion(vx, vz, yawV, rot, vs) { const c = Math.cos(rot), s = Math.sin(rot), k = 1 / (vs || 1); const lx = (vx * c - vz * s) * k, lz = (vx * s + vz * c) * k; this.clT.set(-lx * .035, 0, -lz * .035); if (this.clT.length() > .28) this.clT.setLength(.28); const sp = Math.hypot(vx, vz); this.acc = this.acc * .8 + (sp - this.spd) * 2; this.spd = sp; this.yawV = this.yawV * .7 + yawV * .3; }
  set(name, D) { const r = this.rest[name], b = this.B[name]; if (!b) return; this._q.copy(r.w).invert().multiply(D).multiply(r.w); b.quaternion.copy(r.l).multiply(this._q); }
  play(name, op = {}) { const k = MAP[name] || 'idle'; if (k === this.kind && !op.force) { this.sp = op.ts || 1; return; } this.kind = k; this.t = 0; this.sp = op.ts || 1; this.snap = (k === 'idle' || k === 'run') ? 12 : 26; }
  update(dt) {
    this.t += dt * this.sp; const tg = { ...POSE[this.kind](this.t, this) }, c = this.cur, V = this.vel;
    // secondary action: lean into turns, head leads, torso drags behind
    const yv = Math.max(-8, Math.min(8, this.yawV)), lean = Math.max(-.22, Math.min(.22, -yv * this.spd * .006));
    tg.bRz = (tg.bRz ?? BASE.bRz) + lean; tg.spRy = (tg.spRy ?? BASE.spRy) - yv * .035; tg.hdRy = (tg.hdRy ?? BASE.hdRy) + yv * .05; tg.spRx = (tg.spRx ?? BASE.spRx) + Math.max(-.12, Math.min(.12, this.acc * .012));
    const free = this.kind === 'spin' || this.kind === 'dodge'; const n = Math.max(1, Math.ceil(dt / .012)), h = dt / n;
    for (let i = 0; i < n; i++) for (const j of J) { const v = tg[j] !== undefined ? tg[j] : BASE[j]; if (free && (j === 'bRy' || j === 'bRx')) { c[j] = v; V[j] = 0; continue; } const w = this.snap * (WMUL[j] || 1), z = ZETA[j] || .7; const a = w * w * (v - c[j]) - 2 * z * w * (V[j] || 0); V[j] = (V[j] || 0) + a * h; c[j] += V[j] * h; }
    // cloth spring (follow-through / overlapping action)
    for (let i = 0; i < n; i++) { const a = this.clT.clone().sub(this.cl).multiplyScalar(70).addScaledVector(this.clV, -2 * .3 * 8.4); this.clV.addScaledVector(a, h); this.cl.addScaledVector(this.clV, h); }
    if (this.kind === 'spin') this.cl.set(Math.sin(this.t * 14) * .2, 0, Math.cos(this.t * 14) * .2);
    this.U.t.value += dt;
    if (this.kind !== 'spin' && Math.abs(c.bRy) > PI) c.bRy = 0; if (this.kind !== 'dodge' && this.kind !== 'death' && Math.abs(c.bRx) > PI) c.bRx = 0;
    const b = this.body, pv = this.kind === 'dodge' ? .42 * this.hgt / 1.75 : 0; this.pv = (this.pv || 0) + (pv - (this.pv || 0)) * Math.min(1, dt * 30); b.position.y = c.by + this.pv; this.scene.position.y = -this.pv; b.rotation.set(c.bRx, c.bRy, c.bRz);
    this.set('spine_01', E(c.spRx * .5, c.spRy * .5, c.spRz * .5)); this.set('spine_02', E(c.spRx * .5, c.spRy * .5, c.spRz * .5));
    this.set('neck_01', E(c.hdRx * .5, c.hdRy * .5, 0)); this.set('head', E(c.hdRx * .5, c.hdRy * .5, 0));
    const arm = (s, ax, az, e) => { const A = this.A[s]; this.set('upperarm_' + s, E(ax, 0, az).multiply(A.a0)); this.set('lowerarm_' + s, A.a0i.clone().multiply(E(e, 0, 0)).multiply(A.f0).multiply(A.a0)); };
    arm('l', c.aLx, c.aLz, c.eL); arm('r', c.aRx, c.aRz, c.eR);
    const leg = (s, l, kn) => { const A = this.A[s]; this.set('thigh_' + s, E(l, 0, 0).multiply(A.t0)); this.set('calf_' + s, A.t0i.clone().multiply(E(kn, 0, 0)).multiply(A.c0).multiply(A.t0)); };
    leg('l', c.lL, c.kL); leg('r', c.lR, c.kR);
    for (const sd in this.fing) { const F = this.fing[sd], a = this.grip[sd] * (this.fSign || 1); for (const [n, k] of F.L) this.set(n, this._fq.setFromAxisAngle(F.ac, a * k)); }
    if (this.wpn) this.wpn.quaternion.copy(this.wBase).multiply(E(c.wRx - .25, 0, 0));
  }
}
