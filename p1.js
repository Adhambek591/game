// ==== W3 combat (Witcher-style moveset: stamina, dodge/roll, block/parry, jump, strong chain, hard lock, executions; enemy roles + boss kits) ====
Object.assign(TXT, {
  parry: { uz: 'Qaytarildi!', qq: 'Qaytarıldı!', ru: 'Парирование!', en: 'PARRY!' }, gbrk: { uz: 'Himoya yorildi!', qq: 'Qorǵanıw jarıldı!', ru: 'Блок пробит!', en: 'GUARD BROKEN!' },
  exec: { uz: 'Yakuniy zarba!', qq: 'Aqırǵı soqqı!', ru: 'Добивание!', en: 'EXECUTION!' }, back: { uz: 'Orqadan!', qq: 'Arqadan!', ru: 'Со спины!', en: 'BACKSTAB!' },
  free: { uz: 'Qutul!', qq: 'Qutıl!', ru: 'Вырвись!', en: 'BREAK FREE!' }, weakp: { uz: 'Zaif joy!', qq: 'Álsiz jer!', ru: 'Слабое место!', en: 'WEAK SPOT!' },
  qilich: { uz: 'Qilichboz', qq: 'Qılıshker', ru: 'Мечник', en: 'Swordsman' }, qalqan: { uz: 'Qalqondor', qq: 'Qalqanshı', ru: 'Щитоносец', en: 'Shield bearer' },
  h_qil: { uz: "Qilichboz yengil zarbalarni qaytaradi — kuchli zarba bilan himoyasini yoring!", qq: 'Qılıshker jeńil soqqılardı qaytaradı — kúshli soqqı menen qorǵanıwın jarıń!', ru: 'Мечник парирует быстрые удары — пробейте блок сильным ударом!', en: 'The swordsman parries fast attacks — break his guard with a strong attack!' },
  h_qal: { uz: "Qalqon oldidan himoya qiladi — orqasiga o'ting!", qq: 'Qalqan aldınnan qorǵaydı — artına ótiń!', ru: 'Щит закрывает спереди — зайдите со спины!', en: 'The shield blocks from the front — get behind him!' },
  h_red: { uz: "Qizil hujumni to'sib bo'lmaydi — chap bering!", qq: 'Qızıl hújimdi tosıp bolmaydı — qashıń!', ru: 'Красную атаку не заблокировать — уклоняйтесь!', en: 'Red attacks cannot be blocked — dodge!' },
  h_jump: { uz: "To'lqin ustidan sakrang yoki dumalang!", qq: 'Tolqınnan sekirip ótiń yamasa domalań!', ru: 'Перепрыгните волну или перекатитесь!', en: 'Jump over the shockwave or roll through it!' }
});
const W3T = [], W3C = { ub: 0xff1010, mel: 0xffa020 };
const hintOnce = k => { const S = G.hintSeen || (G.hintSeen = {}); if (S[k]) return; S[k] = 1; hintRaw(tx(k)); };
// ---- enemy roles (reuse the soldier model) ----
Object.assign(T, {
  qilich: { ...T.askar, like: 'askar', mdl: 'askar', vsK: 1.06, scale: T.askar.scale * 1.06, hp: 190, dmg: [11, 15], speed: 4.1, windup: .42, cd: 1.25, string: 3, block: .3, parry: .55, poise: 80, elite: true, noShield: true, name: 'qilich' },
  qalqan: { ...T.askar, like: 'askar', mdl: 'askar', vsK: 1.13, scale: T.askar.scale * 1.13, hp: 240, dmg: [14, 19], speed: 3.0, windup: .55, cd: 1.7, string: 1, block: 0, shieldF: true, turn: .32, poise: 120, elite: true, name: 'qalqan' }
});
// ---- small helpers ----
const v2 = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || .01; return { dx, dz, l, ux: dx / l, uz: dz / l }; };
const frontOf = (e, src) => { const s = v2(e, src); return (s.dx * Math.sin(e.rot) + s.dz * Math.cos(e.rot)) / s.l; };
const lineGeo = (() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0, .5); return g; })();
const bandGeo = new THREE.CylinderGeometry(1, 1, .7, 48, 1, true);
function lineTele(e, len, w, dur, col = W3C.ub, follow = true) {
  const g = new THREE.Group(), rim = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .22, depthWrite: false })), fill = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .55, depthWrite: false }));
  rim.scale.set(w, 1, len); fill.scale.set(w, 1, .01); fill.position.y = .01; g.add(rim, fill); g.position.set(e.x, .08, e.z); g.rotation.y = e.rot; fxg.add(g);
  const o = { kind: 'line', g, fill, len, w, t: 0, dur, dead: false, own: follow ? e : null }; W3T.push(o); return o; }
function shockwave(src, x, z, R, v, dmg, col = 0xffa040) {
  const g = new THREE.Group(), ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false })), band = new THREE.Mesh(bandGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  band.position.y = .35; g.add(ring, band); g.position.set(x, .1, z); g.scale.setScalar(.5); fxg.add(g); W3T.push({ kind: 'wave', g, ring, band, x, z, R, v, r: .5, dmg, src, hit: new Set(), t: 0, dur: R / v, dead: false }); hintOnce('h_jump'); }
const rockGeo = new THREE.DodecahedronGeometry(.6, 0);
function boulder(src, tx0, tz0, fl, dmg) { const m = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 })); m.castShadow = true; m.scale.setScalar(1.3); fxg.add(m); W3T.push({ kind: 'rock', m, x0: src.x, z0: src.z, y0: src.h * .9, x1: tx0, z1: tz0, t: 0, dur: fl, dmg, src, dead: false }); }
let bangTex = null;
function ubMark(e, dur) { e.ubT = dur; e.ubD = dur; if (!bangTex) bangTex = canvasTex(64, (g, s) => { g.font = '900 54px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#300'; g.strokeText('!', s / 2, s / 2 + 3); g.fillStyle = '#ff2a10'; g.fillText('!', s / 2, s / 2 + 3); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bangTex, depthTest: false, transparent: true })); s.renderOrder = 14; s.scale.setScalar(1.1); fxg.add(s); W3T.push({ kind: 'bang', s, own: e, t: 0, dur, dead: false }); burst(e.x, e.h * .9, e.z, 0xff0000, 1.6); if (e.tg === G.player || Math.hypot(G.player.x - e.x, G.player.z - e.z) < 14) hintOnce('h_red'); }
function segDist(px, pz, ax, az, rot, len) { const ux = Math.sin(rot), uz = Math.cos(rot), qx = px - ax, qz = pz - az, s = clamp(qx * ux + qz * uz, 0, len); return Math.hypot(qx - ux * s, qz - uz * s); }
function w3Phase(e) { if (e.type === 'surtaysha' && e.helm !== undefined) return clamp(4 - e.helm, 1, 3); if (e.d.heavy) { if (e.maxHp > 1e8) return 1; return e.phase || (e.hp < e.maxHp * .34 ? 3 : e.hp < e.maxHp * .67 ? 2 : 1); } return e.hp < e.maxHp * .5 ? 2 : 1; }
const bdmg = (e, k = 1) => (e.d.dmg[0] + e.d.dmg[1]) * .5 * e.dmgMul * k;
// ---- stamina ----
function w3P(p) { if (!p.stMax) { p.stMax = 100; p.st = 100; p.stAt = -9; } }
function w3Spend(p, c, need = c) { w3P(p); if (p.st < need) { G.stLow = performance.now() + 450; if (G.time > (G.stNumT || 0)) { G.stNumT = G.time + 1; num(p, '⚡', 'n'); } return false; } p.st = Math.max(0, p.st - c); p.stAt = G.time; return true; }
// ---- player moves ----
function stickDir() { const x = joy.x + ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0), z = joy.z + ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - ((keys.KeyW || keys.ArrowUp) ? 1 : 0), l = Math.hypot(x, z); return l > .3 ? { x: x / l, z: z / l } : null; }
const busy = () => G.paused || G.freeze || G.qte;
function w3Dodge(p, roll, dir) {
  if (!p || p.dead || busy()) return; initAudio(); const now = performance.now(); if (!roll && !dir && now - (G.dTap || 0) < 320) roll = true; G.dTap = now; const a = p.act;
  if (roll && a && a.kind === 'dodge' && !a.roll && a.t < .3) { if (!w3Spend(p, 14, 6)) return; a.roll = true; a.dur = .62; a.sp = 12; a.t = 0; p.rot = Math.atan2(a.dx, a.dz); p.iframe = Math.max(p.iframe, .48); if (!p.mounted) p.play('Dodge_Forward', { once: true, force: true, dur: .62 }); return; }
  if (!roll && p.dodgeCd > 0) return;
  if (a && !canCancel(a) && !(a.kind === 'jump' && (p.y || 0) < .25) && !(a.kind === 'dodge' && a.t > a.dur * .65) && !(a.kind === 'hvy' && a.t < a.hitAt * .6)) { if (dir || roll) G.wbuf = { k: roll ? 'R' : 'D', t: G.time, dir }; return; }
  if (!w3Spend(p, roll ? 28 : 15, roll ? 12 : 7)) return;
  if (p.guard) w3GuardEnd(p);
  let d = dir || stickDir(); const L = p.hl && !p.hl.dead ? p.hl : null;
  if (!d) { if (roll) d = { x: Math.sin(p.rot), z: Math.cos(p.rot) }; else { const f = L ? v2(p, L) : { ux: Math.sin(p.rot), uz: Math.cos(p.rot) }; d = { x: -f.ux, z: -f.uz }; } }
  p.act = { kind: 'dodge', t: 0, dur: roll ? .62 : .34, dx: d.x, dz: d.z, sp: roll ? 12 : 13.5, roll }; p.queued = false;
  if (roll || p.mounted) p.rot = Math.atan2(d.x, d.z); else if (L) p.rot = Math.atan2(L.x - p.x, L.z - p.z);
  p.iframe = roll ? .5 : .3; p.dodgeCd = roll ? .45 : .3;
  if (roll && !p.mounted) p.play('Dodge_Forward', { once: true, force: true, dur: .62 }); else if (!p.mounted) { p.curName = ''; p.inLoco = false; p._play('Walking_A', { ts: 2.6, force: true }); p.lnx = d.x; p.lnz = d.z; p.ln = .32; }
  Sfx.dodge(); burst(p.x, .25, p.z, 0xc8a070, roll ? 1.4 : 1, true); G.stats.dodge = (G.stats.dodge || 0) + 1;
}
function guardFace(p) { let t = p.hl && !p.hl.dead ? p.hl : null; if (!t) { let bd = 9; for (const e of G.ents) { if (e.dead || e.gone || !hostile('ally', e.team) || e.bg) continue; const d = Math.hypot(e.x - p.x, e.z - p.z) - e.r; if (d < bd) { bd = d; t = e; } } } return t; }
function w3Guard(p, on, resume) {
  if (!p) return; w3P(p);
  if (!on) { p.guardHeld = false; if (p.guard) w3GuardEnd(p); return; }
  if (p.dead || busy() || p.mounted) return; if (!resume) { p.guardHeld = true; initAudio(); }
  const a = p.act; if (a && a.kind === 'block') return;
  if (a && !canCancel(a) && !(a.kind === 'dodge' && a.t > a.dur * .5)) { if (!resume) G.wbuf = { k: 'B', t: G.time }; return; }
  if (!resume) p.guardAt = G.time; p.guard = true; p.queued = false; p.act = { kind: 'block', t: 0, dur: 1e9 };
  const t0 = guardFace(p); if (t0) p.rot = Math.atan2(t0.x - p.x, t0.z - p.z);
  p.curName = ''; p.inLoco = false; p._play('Idle_Combat', { force: true }); if (p.rig.aimBone) p.rig.post = guardPose;
  if (!resume) { Sfx.swing && Sfx.swing(); sparks(p.x + Math.sin(p.rot) * .6, 1.3, p.z + Math.cos(p.rot) * .6, 0xbfe0ff, 4, 2); }
}
function w3GuardEnd(p) { p.guard = false; if (p.act && p.act.kind === 'block') p.act = null; if (p.rig.post === guardPose) p.rig.post = null; }
const _gv = () => new THREE.Vector3();
function guardPose(rig) { const B = rig.B, P = G.player; if (!P || !P.guard || P.rig !== rig) { rig.post = null; return; } if (!B.RightArm || !B.RightForeArm || !B.Head) return;
  rig.root.updateMatrixWorld(true); const q = rig.root.getWorldQuaternion(new THREE.Quaternion()), F = _gv().set(0, 0, 1).applyQuaternion(q), U = _gv().set(0, 1, 0), Sd = _gv().set(1, 0, 0).applyQuaternion(q);
  const head = B.Head.getWorldPosition(_gv()), sh = B.RightArm.getWorldPosition(_gv()), side = Math.sign(sh.clone().sub(head).dot(Sd)) || 1;
  rig.aimBone(B.RightArm, B.RightForeArm, F.clone().multiplyScalar(.75).addScaledVector(U, -.15).addScaledVector(Sd, side * .45));
  rig.aimBone(B.RightForeArm, B.RightHand, F.clone().multiplyScalar(.35).addScaledVector(U, .75).addScaledVector(Sd, -side * .6));
  if (B.LeftArm && B.LeftForeArm && B.LeftHand) { rig.aimBone(B.LeftArm, B.LeftForeArm, F.clone().multiplyScalar(.7).addScaledVector(U, -.3).addScaledVector(Sd, -side * .5)); rig.aimBone(B.LeftForeArm, B.LeftHand, F.clone().multiplyScalar(.5).addScaledVector(U, .5).addScaledVector(Sd, side * .5)); } }
function guardBreak(p) { w3GuardEnd(p); p.st = 0; p.stAt = G.time + .6; p.act = { kind: 'stun', t: 0, dur: .7 }; p.curName = ''; p.inLoco = false; p._play('Hit_A', { once: true, force: true, ts: .8 }); num(p, tx('gbrk'), 'p'); sparks(p.x, 1.3, p.z, 0xffffff, 14, 7); Sfx.big(); G.shake = Math.max(G.shake, .45); vib(60); }
// defence of the player against an enemy hit: returns the damage left (0 = negated)
function w3Def(p, amt, src, op) {
  if (p.act && p.act.kind === 'exec') return 0;
  if (op.low && (p.y || 0) > .4) return 0;
  if (!p.guard) return amt;
  const ub = op.ub || !(op.mel || op.proj), fr = frontOf(p, src) > .2;
  if (ub) { if (op.ub && fr) guardBreak(p); return amt; }
  if (!fr) return amt;
  if (!op.proj && G.time - (p.guardAt || -9) < .3) { w3Parry(p, src); return 0; }
  const hv = src.d.heavy, cost = op.proj ? 5 : Math.max(6, amt * (hv ? 1.25 : .75)), s = v2(src, p);
  sparks(p.x - s.ux * .6, 1.3, p.z - s.uz * .6, 0xe8f0ff, 9, 6); Sfx.hit(); G.hitStop = Math.max(G.hitStop || 0, .04);
  if (p.st >= cost) { p.st -= cost; p.stAt = G.time; p.kx = (p.kx || 0) + s.ux * (hv ? 7 : 2.5); p.kz = (p.kz || 0) + s.uz * (hv ? 7 : 2.5); if (!op.proj) num(p, tx('block'), 'n'); return op.proj ? 0 : Math.round(amt * (hv ? .3 : .08)); }
  guardBreak(p); return Math.round(amt * .6); }
function w3Parry(p, e) {
  G.stats.parry = (G.stats.parry || 0) + 1; num(p, tx('parry'), 'c'); Sfx.big(); Sfx.hit(); vib(35); G.slow = Math.max(G.slow || 0, .55); G.hitStop = .12; G.shake = Math.max(G.shake, .35); G.zk = Math.max(G.zk || 0, .13);
