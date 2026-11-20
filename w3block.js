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
  const mx = (p.x + e.x) / 2, mz = (p.z + e.z) / 2; sparks(mx, 1.4, mz, 0xffffff, 22, 9); sparks(mx, 1.4, mz, 0x9fd8ff, 12, 6); burst(mx, 1.4, mz, 0xbfe8ff, 2.4); ringFx(p.x, p.z, 2.4, 0xbfe8ff);
  e.clearTele(); w3KitCancel(e); const s = v2(p, e);
  if (e.d.heavy) { if (e.poiseMax && !(e.brokenT > 0)) { e.poise -= e.poiseMax * .4; e.poiseAt = G.time; if (e.poise <= 0) breakPoise(e); else { e.stagger = Math.max(e.stagger, .7); e.state = 'chase'; } } else e.stagger = Math.max(e.stagger, .6); }
  else { e.state = 'chase'; e.stagger = Math.max(e.stagger, 1.5); e.kx += s.ux * 5; e.kz += s.uz * 5; e.lnx = s.ux; e.lnz = s.uz; e.ln = .3; e.play('Hit_A', { once: true, force: true, ts: .55 }); if (e.poiseMax && !(e.brokenT > 0)) { e.poise -= e.poiseMax * .55; e.poiseAt = G.time; if (e.poise <= 0) breakPoise(e); } }
  tokFree(e); p.counterT = G.time + 1.7; p.counterTg = e; p.iframe = Math.max(p.iframe, .3); }
function w3Jump(p) {
  if (!p || p.dead || busy() || p.mounted) return; initAudio(); const a = p.act; if (a && a.kind === 'jump') return;
  if (a && !canCancel(a) && !(a.kind === 'dodge' && a.t > a.dur * .6)) { G.wbuf = { k: 'J', t: G.time }; return; }
  if (!w3Spend(p, 10, 5)) return; if (p.guard) w3GuardEnd(p);
  let d = stickDir(), sp = p.speed * .85; const L = p.hl && !p.hl.dead ? p.hl : null;
  if (!d && L) { const s = v2(p, L); if (s.l < 8) { d = { x: s.ux, z: s.uz }; sp = clamp((s.l - L.r - 1.2) / .62, 0, 11); } }
  if (d) p.rot = Math.atan2(d.x, d.z);
  p.act = { kind: 'jump', t: 0, dur: .62, vx: d ? d.x * sp : 0, vz: d ? d.z * sp : 0, h: 1.35 }; p.queued = false; p.play('Jump_Full_Long', { once: true, force: true, dur: .7 }); Sfx.dodge(); burst(p.x, .2, p.z, 0xc8a070, 1.1, true); }
function w3Plunge(p, a, k) { if (a.plunge) return; a.plunge = k; const e = aim(p, 7); if (e) { const s = v2(p, e), rem = Math.max(.12, a.dur - a.t), want = Math.max(0, s.l - e.r - .8); a.vx = s.ux * Math.min(14, want / rem); a.vz = s.uz * Math.min(14, want / rem); } p.play('1H_Melee_Attack_Chop', { once: true, force: true, dur: Math.max(.25, a.dur - a.t + .1) }); Sfx.swing(); }
function w3Strong(p) {
  if (!p || p.dead || busy()) return; initAudio(); const a = p.act;
  if (a && a.kind === 'jump') return w3Plunge(p, a, 2);
  if (a && a.kind === 'hvy') { if (a.hit && a.t > a.dur * .5) { p.hc = ((p.hc || 0) + 1) % 3; p.combo = [0, 2, 3][p.hc]; startHeavy(p); } else G.wbuf = { k: 'S', t: G.time }; return; }
  if (a && a.kind === 'block') w3GuardEnd(p); else if (a && !canCancel(a)) { G.wbuf = { k: 'S', t: G.time }; return; }
  if (!a || a.kind !== 'atk') { p.hc = 0; p.combo = 0; } else p.hc = 0; startHeavy(p); }
// A pressed while busy: plunge from a jump, attack out of the guard, mash out of a grab
function w3Busy(p, k) { const a = p.act; if (!a) return false;
  if (a.kind === 'jump') { w3Plunge(p, a, 1); return true; }
  if (a.kind === 'block') { w3GuardEnd(p); startAtk(p); return true; }
  if (a.kind === 'held') { a.dur -= .2; sparks(p.x, 1.4, p.z, 0xffe0a0, 4, 4); if (Math.random() < .5) num(p, tx('free'), 'n'); return true; }
  return false; }
function w3Lock(p, release) {
  if (!p || p.dead) return; if (release) { p.hl = null; return; }
  const L = G.ents.filter(e => !e.dead && !e.gone && !e.bg && hostile('ally', e.team) && Math.hypot(e.x - p.x, e.z - p.z) < 18).sort((a, b) => a.x - b.x);
  if (!L.length) { p.hl = null; return; }
  let n; if (!p.hl || p.hl.dead || !L.includes(p.hl)) { let bs = 1e9; for (const e of L) { const s = v2(p, e), sc = s.l - (s.ux * Math.sin(p.rot) + s.uz * Math.cos(p.rot)) * 4 - (e === G.boss ? 3 : 0); if (sc < bs) { bs = sc; n = e; } } } else n = L[(L.indexOf(p.hl) + 1) % L.length];
  p.hl = n; p.lock = n; p.lockAt = G.time; ringFx(n.x, n.z, n.r + 1, 0xffd050); Sfx.swing && Sfx.swing(); }
// executions: occasional finisher with a camera close-up on a low-HP ordinary enemy
function w3Exec(p) {
  if (p.mounted || G.time < (G.execCd || 0) || G.noExec) return false; let e = p.hl && !p.hl.dead ? p.hl : null; if (!e || Math.hypot(e.x - p.x, e.z - p.z) - e.r > 2.6) { e = null; let bd = 2.6; for (const o of G.ents) { if (o.dead || o.team !== 'enemy' || o.bg) continue; const d = Math.hypot(o.x - p.x, o.z - p.z) - o.r; if (d < bd) { bd = d; e = o; } } }
  if (!e || e.d.heavy || e.invuln || e.air || e.downT > 0 || e.mounted || e.maxHp > 2000 || e.custom) return false;
  const low = e.hp <= e.maxHp * (e.d.elite ? .25 : .32) || (e.brokenT > 0 && e.hp <= e.maxHp * .45); if (!low) return false;
  if (Math.random() > (e.brokenT > 0 ? .9 : e.d.elite ? .5 : .25)) return false;
  G.execCd = G.time + 7; G.stats.exec = (G.stats.exec || 0) + 1; const s = v2(e, p); p.x = e.x + s.ux * (e.r + 1.05); p.z = e.z + s.uz * (e.r + 1.05); p.rot = Math.atan2(e.x - p.x, e.z - p.z); e.rot = Math.atan2(p.x - e.x, p.z - e.z);
  p.act = { kind: 'exec', t: 0, dur: 1.05, tg: e }; p.iframe = 1.3; p.queued = false; p.combo = 0; p.lock = e; p.lockAt = G.time;
  e.stagger = 3; e.state = 'chase'; e.clearTele(); w3KitCancel(e); e.kx = e.kz = 0; G.slow = Math.max(G.slow || 0, .5); num(p, tx('exec'), 'c'); p.play('1H_Melee_Attack_Slice_Horizontal', { once: true, force: true, dur: .32 }); Sfx.swing(); return true; }
Object.assign(HACT, {
  block(p, a, dt, fx, fz, mx, mz) { if (!p.guardHeld) { w3GuardEnd(p); return; } const tg = guardFace(p); p.x += mx * p.speed * .36 * dt; p.z += mz * p.speed * .36 * dt; if (tg) p.face(tg.x - p.x, tg.z - p.z, dt * 12); else if (Math.hypot(mx, mz) > .2) p.face(mx, mz, dt * 8); p.play(Math.hypot(mx, mz) > .2 ? 'Walking_A' : 'Idle_Combat'); },
  jump(p, a, dt) { const u = clamp(a.t / a.dur, 0, 1); p.x += a.vx * dt; p.z += a.vz * dt; p.y = Math.sin(u * Math.PI) * a.h; if (a.t >= a.dur && !a.land) { a.land = 1; p.y = 0;
      if (a.plunge) { const k = a.plunge === 2 ? 2.3 : 1.7, R = a.plunge === 2 ? 3.2 : 2.7; const n = hitCircle(p.x + Math.sin(p.rot) * .6, p.z + Math.cos(p.rot) * .6, R, () => pd() * k, 'ally', p, { crit: true, kb: 9, kd: 1, gb: 1, pz: 2.2 }); ringFx(p.x, p.z, R, 0xffe0a0); burst(p.x, .4, p.z, 0xc8a070, 3, true); slashFx(p.x, .6, p.z, p.rot, 1.4, 0xffe0a0); Sfx.big(); G.shake = Math.max(G.shake, .45); if (n) { Sfx.hit(); G.ulti = Math.min(100, G.ulti + 5 * n); } hitBreak(p.x, p.z, R, 'atk'); G.buf = null; if (a.plunge === 2) w3Spend(p, 10, 0); }
      else burst(p.x, .2, p.z, 0xc8a070, 1.2, true); } },
  stun() { }, held(p, a, dt) { const e = a.by; if (!e || e.dead) { a.t = a.dur; return; } const f = Math.sin(e.rot), g = Math.cos(e.rot); p.x = e.x + f * (e.r + .7); p.z = e.z + g * (e.r + .7); p.y = .5 + Math.sin(a.t * 18) * .08; p.rot = e.rot + Math.PI; if (a.t > (a.n || 0) * .45 + .3) { a.n = (a.n || 0) + 1; p.iframe = 0; p.hp -= Math.round(bdmg(e, .35)); num(p, '-' + Math.round(bdmg(e, .35)), 'p'); Sfx.hurt(); G.shake = Math.max(G.shake, .25); if (p.hp < 1) p.hp = G.noDeath ? 1 : 0; if (p.hp <= 0) p.die(); }
    if (a.t >= a.dur - dt) { p.y = 0; p.kx = f * 11; p.kz = g * 11; p.iframe = .5; e.state = 'recover'; e.tm = 1.2; e.punT = G.time + 1.2; } },
  exec(p, a, dt) { const e = a.tg; if (!e) return; p.face(e.x - p.x, e.z - p.z, dt * 12);
    if (!a.h1 && a.t > .12) { a.h1 = 1; slashFx(p.x + Math.sin(p.rot) * .5, 1.2, p.z + Math.cos(p.rot) * .5, p.rot, 1.1); sparks(e.x, e.h * .6, e.z, 0xffe6a8, 10, 6); Sfx.hit(); e.flash = .12; e.play('Hit_A', { once: true, force: true, ts: .7 }); G.hitStop = .06; e.lnx = Math.sin(p.rot); e.lnz = Math.cos(p.rot); e.ln = .3; }
    if (!a.h2 && a.t > .34) { a.h2 = 1; p.play('1H_Melee_Attack_Chop', { once: true, force: true, dur: .5 }); Sfx.swing(); }
    if (!a.h3 && a.t > .6) { a.h3 = 1; if (!e.dead) { e.invuln = false; e.stagger = 0; e.damage(e.hp + 9999, p, { crit: true, kb: 7, gb: 1, exec: 1 }); } sparks(e.x, e.h * .6, e.z, 0xffd27a, 26, 9); burst(e.x, e.h * .55, e.z, 0x7a0a0a, 2.6, true); ringFx(e.x, e.z, 3, 0xffd27a); slashFx(e.x, e.h * .5, e.z, p.rot, 1.6, 0xffd890); Sfx.big(); G.shake = .6; G.hitStop = .17; vib(70); } }
});
// ---- enemy defence: swordsman parries fast hits (strong ones break him), shield bearer blocks the front ----
function w3EDef(e, amt, src, op) {
  if (e.stagger > 0 || e.downT > 0 || e.air || e.brokenT > 0) return amt; const fr = frontOf(e, src), P = G.player, s = v2(e, src);
  if (e.d.shieldF) {
    if (fr > .25) { if (op.gb || op.kd || op.launch) { e.stagger = .6; e.state = 'chase'; w3KitCancel(e); e.kx -= s.ux * 5; e.kz -= s.uz * 5; sparks(e.x + s.ux * .6, e.h * .55, e.z + s.uz * .6, 0xffe070, 12, 7); return amt * .4; }
      sparks(e.x + s.ux * .6, e.h * .55, e.z + s.uz * .6, 0xe8f0ff, 10, 6); num(e, tx('block'), 'n'); Sfx.hit(); G.hitStop = Math.max(G.hitStop || 0, .03); if (src === P) { P.kx = (P.kx || 0) + s.ux * 3.5; P.kz = (P.kz || 0) + s.uz * 3.5; hintOnce('h_qal'); } e.poise = Math.max(1, (e.poise || 0) - amt * .3); return 0; }
    if (fr < -.3) { if (!op.silent) num(e, tx('back'), 'c'); return amt * 1.5; } return amt; }
  if (e.d.parry && src === P) {
    if (fr < .3) return amt;
    if (op.gb || op.crit || op.kd || op.launch) { if (e.state === 'block' || e.state === 'side' || e.state === 'chase') { e.stagger = .9; e.state = 'chase'; e.clearTele(); num(e, tx('brk'), 'c'); e.play('Hit_A', { once: true, force: true, ts: .6 }); sparks(e.x, e.h * .7, e.z, 0xffe070, 14, 7); return amt * 1.3; } return amt; }
    const ch = (e.state === 'block' ? .92 : e.state === 'windup' || e.state === 'kit' ? 0 : e.state === 'recover' ? .15 : e.d.parry) * DK([.6, 1, 1.2]);
    if (Math.random() < ch) { sparks(e.x + s.ux * .6, e.h * .6, e.z + s.uz * .6, 0xffffff, 14, 7); num(e, tx('parry'), 'n'); Sfx.hit(); G.hitStop = .06; P.kx = (P.kx || 0) + s.ux * 6; P.kz = (P.kz || 0) + s.uz * 6; if (P.act && P.act.kind === 'atk') { P.queued = false; P.combo = 0; P.act = { kind: 'stun', t: 0, dur: .38 }; P.curName = ''; P.inLoco = false; P._play('Hit_A', { once: true, force: true, ts: 1.3 }); }
      e.face(src.x - e.x, src.z - e.z, 1); startWind(e, P, 1); e.tm = e.wd = .36; hintOnce('h_qil'); return 0; } }
  return amt; }
// ---- enemy kit: data-driven telegraphed moves (each with a readable pose, ground marker and a punish window) ----
const KM = {
  // spearman low sweep: jump or step back
  sweep: { wd: .7, rec: .7, ub: 1, start(e, tg, m) { e.play('2H_Melee_Attack_Spin', { once: true, force: true, dur: m.wd + .4 }); m.tl.push(arcTele(e, e.d.range + 1, 1.75, m.wd, W3C.ub)); }, hit(e) { Sfx.swing(); slashFx(e.x, .5, e.z, e.rot, 1.4, 0xff6644); slashFx(e.x, .5, e.z, e.rot + 2.4, 1.3, 0xff6644); hitArc(e, e.d.range + 1, -.18, () => bdmg(e, .8), { ub: 1, low: 1, kb: 8 }); } },
  // charge (potion brute, shield bearer): red lane, then a straight rush
  charge: { wd: .75, rec: 1.0, ub: 1, start(e, tg, m) { m.len = e.type === 'qalqan' ? 8 : 11; e.play('Idle_Combat', { force: true }); m.tl.push(lineTele(e, m.len, e.r * 2 + 1, m.wd)); burst(e.x, .4, e.z, 0xc8a070, 1.5, true); }, tick(e, tg, m, dt) { if (m.t < m.wd * .6) e.face(tg.x - e.x, tg.z - e.z, dt * 5); },
    hit(e, tg, m) { m.d = 0; m.hit = false; e.play('Running_A', { force: true, ts: 1.8 }); Sfx.dodge(); }, act(e, tg, m, dt) { const v = 17; e.x += Math.sin(e.rot) * v * dt; e.z += Math.cos(e.rot) * v * dt; m.d += v * dt; if (Math.random() < .5) burst(e.x, .3, e.z, 0xc8a070, 1, true);
      if (!m.hit) for (const o of G.ents) { if (o.dead || !hostile(e.team, o.team)) continue; if (Math.hypot(o.x - e.x, o.z - e.z) < e.r + o.r + .4) { m.hit = true; if (o.damage(bdmg(e, 1.3), e, { ub: 1, kb: 13 })) { Sfx.big(); G.shake = Math.max(G.shake, .4); } break; } }
      if (m.d >= m.len || e.bump) { if (e.bump) { e.stagger = .8; burst(e.x, 1, e.z, 0xbfa58a, 1.6, true); Sfx.hit(); } return false; } return true; } },
  // ground slam around itself
  slam: { wd: .8, rec: .9, ub: 1, start(e, tg, m) { m.R = e.d.heavy ? 4.2 : 3.3; e.play('E_Slam', { once: true, force: true, dur: m.wd + .5 }); m.tl.push(telegraph(e.x, e.z, m.R, m.wd, W3C.ub)); }, hit(e, tg, m) { hitCircle(e.x, e.z, m.R, () => bdmg(e, 1.2), e.team, e, { ub: 1, kb: 10, nf: 1 }); ringFx(e.x, e.z, m.R, 0xff5522); burst(e.x, .4, e.z, 0xc8a070, 3, true); Sfx.big(); G.shake = Math.max(G.shake, .4); } },
  // grab: short red arc; if it lands the hero is held and can mash attack to break free
  grab: { wd: .55, rec: 1.0, ub: 1, start(e, tg, m) { e.play('E_Attack', { once: true, force: true, dur: m.wd + .4 }); m.tl.push(arcTele(e, e.r + 2.2, .65, m.wd, W3C.ub)); },
    hit(e, tg, m) { e.kx += Math.sin(e.rot) * 6; e.kz += Math.cos(e.rot) * 6; const P = G.player; if (P.dead || P.iframe > 0 || P.mounted || P.act && P.act.kind === 'exec') { if (P.iframe > 0 && P.act && P.act.kind === 'dodge' && P.act.t < .3) perfectDodge(P, e); return; } const s = v2(e, P); if (s.l > e.r + 2.6 || frontOf(e, P) < .5) return;
      if (P.guard) w3GuardEnd(P); P.act = { kind: 'held', t: 0, dur: 1.7, by: e }; P.queued = false; P.curName = ''; P.inLoco = false; P._play('Hit_A', { once: true, force: true, ts: .5 }); num(P, tx('free'), 'c'); Sfx.hurt(); m.held = true; e.play('Idle_Combat', { force: true }); },
    act(e, tg, m) { const P = G.player; return !!(m.held && P.act && P.act.kind === 'held' && P.act.by === e); } },
  // fast 3-hit combo (chieftain frenzy, Surtaysha sword): each swing has its own orange (parryable) arc
  combo3: { wd: .55, rec: .9, start(e, tg, m) { m.n = 0; m.N = w3Phase(e) >= 2 && e.type === 'surtaysha' ? 4 : 3; e.play('E_Attack', { once: true, force: true, dur: m.wd + .3 }); m.tl.push(arcTele(e, e.d.range + 1, .9, m.wd, W3C.mel)); },
    hit(e, tg, m) { cSwing(e, m); }, act(e, tg, m, dt) { e.face(tg.x - e.x, tg.z - e.z, dt * 6); if (m.n >= m.N) return m.t < .25; if (m.t >= .42) { m.t = 0; cSwing(e, m); } else if (!m.tw) { m.tw = 1; m.tl.push(arcTele(e, e.d.range + 1, .9, .42, W3C.mel)); e.play(m.n % 2 ? '1H_Melee_Attack_Slice_Diagonal' : 'E_Attack', { once: true, force: true, dur: .55 }); } return true; } },
  // giant stomp: hit around the feet, then a shockwave to jump over or roll through (phase 2: a second wave)
  stomp: { wd: 1.0, rec: 1.5, ub: 1, weak: 1, start(e, tg, m) { e.play('E_Slam', { once: true, force: true, dur: m.wd + .5 }); m.tl.push(telegraph(e.x, e.z, 3.2, m.wd, W3C.ub)); m.tl.push(telegraph(e.x, e.z, 11, m.wd, 0xff7a20)); },
    hit(e, tg, m) { hitCircle(e.x, e.z, 3.2, () => bdmg(e, 1.1), e.team, e, { ub: 1, kb: 11, kd: 1, nf: 1 }); shockwave(e, e.x, e.z, 11, 8.5, bdmg(e, .55)); burst(e.x, .4, e.z, 0xc8a070, 4, true); Sfx.big(); G.shake = Math.max(G.shake, .55); m.w2 = w3Phase(e) >= 2 ? 1 : 0; },
    act(e, tg, m) { if (m.w2 && m.t > .55) { m.w2 = 0; shockwave(e, e.x, e.z, 11, 9.5, bdmg(e, .5)); G.shake = Math.max(G.shake, .4); Sfx.big(); } return m.w2 && m.t <= .55; } },
  // boulder throw: marker where it will land (phase 3: three)
  rock: { wd: .9, rec: .8, ub: 1, start(e, tg, m) { e.play('Cheer', { once: true, force: true, dur: m.wd + .3 }); const n = w3Phase(e) >= 3 ? 3 : 1, q = lead(tg, m.wd + .8, .8); m.pts = []; for (let i = 0; i < n; i++) { const x = clamp(q.x + (i ? rnd(-4, 4) : 0), -G.W + 1, G.W - 1), z = q.z + (i ? rnd(-3, 3) : 0); m.pts.push([x, z]); m.tl.push(telegraph(x, z, 2.5, m.wd + .8, W3C.ub)); } },
    hit(e, tg, m) { e.play('E_Attack', { once: true, force: true, dur: .7 }); for (const [x, z] of m.pts) boulder(e, x, z, .8, bdmg(e, .9)); Sfx.swing(); } },
  // club sweep: wide low arc in front — jump or roll back
  club: { wd: .85, rec: 1.1, ub: 1, weak: 1, start(e, tg, m) { m.R = e.d.range + 2.2; e.play('2H_Melee_Attack_Spin', { once: true, force: true, dur: m.wd + .5 }); m.tl.push(arcTele(e, m.R, 1.95, m.wd, W3C.ub)); },
    hit(e, tg, m) { Sfx.swing(); slashFx(e.x, .7, e.z, e.rot, (e.d.scale || 2) * 1.1, 0xff6644); hitArc(e, m.R, -.37, () => bdmg(e, 1.1), { ub: 1, low: 1, kb: 13 }); G.shake = Math.max(G.shake, .35); } },
  // dragon bite: long red lane in front, lunges out of the water
  bite: { wd: .9, rec: 1.0, ub: 1, start(e, tg, m) { e.play('E_Attack', { once: true, force: true, dur: m.wd + .4 }); m.tl.push(arcTele(e, e.r + 4.5, .55, m.wd, W3C.ub)); m.z0 = e.z; m.x0 = e.x; },
    hit(e, tg, m) { e.x += Math.sin(e.rot) * 2.5; e.z += Math.cos(e.rot) * 2.5; Sfx.big(); burst(e.x + Math.sin(e.rot) * e.r, 1.5, e.z + Math.cos(e.rot) * e.r, 0x88ccff, 3); hitArc(e, e.r + 4.5, .45, () => bdmg(e, 1.2), { ub: 1, kb: 12 }); G.shake = Math.max(G.shake, .4); }, act(e, tg, m, dt) { e.x += (m.x0 - e.x) * Math.min(1, dt * 3); e.z += (m.z0 - e.z) * Math.min(1, dt * 3); return m.t < .6; } },
  // dragon tail sweep: a water wave rolling out from the dragon — jump it or roll through
  tail: { wd: 1.0, rec: .9, ub: 1, start(e, tg, m) { e.play('2H_Melee_Attack_Spin', { once: true, force: true, dur: m.wd + .5 }); m.tl.push(telegraph(e.x, e.z, 16, m.wd, 0x3aa0ff)); }, hit(e) { shockwave(e, e.x, e.z, 18, 10, bdmg(e, .6), 0x66ccff); burst(e.x, 1, e.z, 0x88ccff, 5); Sfx.big(); G.shake = Math.max(G.shake, .4); } },
  // dragon water jet: lane that locks, then a sweeping beam (phase 2+ sweeps across)
  jet: { wd: 1.1, rec: .9, ub: 1, start(e, tg, m) { e.play('Spellcast_Shoot', { once: true, force: true }); m.tl.push(lineTele(e, 30, 2.4, m.wd, 0x3aa0ff)); }, tick(e, tg, m, dt) { if (m.t < m.wd * .7) e.face(tg.x - e.x, tg.z - e.z, dt * 2.5); },
    hit(e, tg, m) { m.beam = new THREE.Mesh(new THREE.CylinderGeometry(.7, .9, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe4ff, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false })); fxg.add(m.beam); m.sw = w3Phase(e) >= 2 ? (Math.random() < .5 ? -1 : 1) * .55 : 0; m.n = 0; Sfx.orb(); },
    act(e, tg, m, dt) { e.rot += m.sw * dt; const L = 30, b = m.beam, cx = e.x + Math.sin(e.rot) * L / 2, cz = e.z + Math.cos(e.rot) * L / 2; b.position.set(cx, 1.2, cz); b.scale.set(1, L, 1); b.rotation.set(Math.PI / 2, 0, 0); b.rotation.order = 'YXZ'; b.rotation.y = e.rot; b.material.opacity = .55 + Math.random() * .3;
      if (m.t > m.n * .18) { m.n++; const P = G.player; if (!P.dead && segDist(P.x, P.z, e.x, e.z, e.rot, L) < 1.5) P.damage(bdmg(e, .35), e, { ub: 1, kb: 5 }); for (let i = 0; i < 3; i++) { const k = rnd(4, L); sparks(e.x + Math.sin(e.rot) * k, 1, e.z + Math.cos(e.rot) * k, 0x9fe4ff, 1, 3); } }
      if (m.t > 1.0) { fxg.remove(b); return false; } return true; }, end(e, m) { if (m.beam) fxg.remove(m.beam); } },
  // dragon dives and bursts up under the hero (red circle under her feet)
  dive: { wd: .6, rec: 1.2, start(e, tg, m) { e.play('Hit_A', { once: true, force: true, ts: .5 }); burst(e.x, 1, e.z, 0x88ccff, 4); Sfx.big(); }, tick(e, tg, m, dt) { e.y += (-8 - e.y) * Math.min(1, dt * 4); e.invuln = true; },
    hit(e, tg, m) { const P = G.player; m.gx = P.x; m.gz = P.z; m.tl.push(telegraph(m.gx, m.gz, 3.3, 1.2, W3C.ub)); ubMark(P, 1.2); },
    act(e, tg, m, dt) { e.invuln = true; e.y = -8; if (m.t < .7) { const P = G.player; m.gx += (P.x - m.gx) * Math.min(1, dt * 1.5); m.gz += (P.z - m.gz) * Math.min(1, dt * 1.5); if (m.tl[0]) m.tl[0].g.position.set(m.gx, .06, m.gz); }
      if (m.t >= 1.2) { e.invuln = false; e.y = -1.3; e.x = clamp(m.gx, -G.W + 2, G.W - 2); hitCircle(m.gx, m.gz, 3.3, () => bdmg(e, 1.2), e.team, e, { ub: 1, launch: 1, kb: 6, nf: 1 }); for (let i = 0; i < 4; i++) burst(m.gx + rnd(-1.5, 1.5), rnd(.5, 3), m.gz + rnd(-1.5, 1.5), 0x88ccff, 3); ringFx(m.gx, m.gz, 3.6, 0x88ccff); Sfx.big(); G.shake = .6; return false; } return true; }, end(e) { e.invuln = false; } },
  // Jallod: chain lash along a lane; a caught hero is dragged in for a follow-up chop (parryable)
  chain: { wd: .8, rec: 1.1, ub: 1, start(e, tg, m) { e.play('1H_Ranged_Shoot', { once: true, force: true, dur: m.wd + .3 }); m.tl.push(lineTele(e, 13, 1.3, m.wd)); }, tick(e, tg, m, dt) { if (m.t < m.wd * .65) e.face(tg.x - e.x, tg.z - e.z, dt * 5); },
    hit(e, tg, m) { const P = G.player, tip = { x: e.x + Math.sin(e.rot) * 13, z: e.z + Math.cos(e.rot) * 13, h: 2 }; const L = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 1, 6), new THREE.MeshBasicMaterial({ color: 0xb8b0a0 })); fxg.add(L); fx.push({ m: L, t: 0, dur: .35, s0: 1, s1: 1, line: [e, tip] }); Sfx.swing();
      if (!P.dead && segDist(P.x, P.z, e.x, e.z, e.rot, 13) < 1.2 && P.damage(bdmg(e, .45), e, { ub: 1, kb: 0 })) { m.pull = true; fx.push({ m: L.clone(), t: 0, dur: .45, s0: 1, s1: 1, line: [e, P] }); } },
    act(e, tg, m, dt) { if (!m.pull) return false; const P = G.player, s = v2(P, e); if (s.l > e.r + 1.6 && m.t < .5) { P.x += s.ux * 22 * dt; P.z += s.uz * 22 * dt; P.iframe = 0; return true; } m.pull = false; e.state = 'chase'; e.km = null; startWind(e, P, 1); e.tm = e.wd = .5; return true; } },
  // Jallod: chain slammed into the ground — a line of eruptions toward the hero (phase 2: two lines, phase 3: three)
  cslam: { wd: 1.0, rec: 1.0, ub: 1, start(e, tg, m) { e.play('E_Slam', { once: true, force: true, dur: m.wd + .4 }); }, hit(e, tg, m) { const ph = w3Phase(e), s = v2(e, tg), A = Math.atan2(s.ux, s.uz), L = ph >= 3 ? [-.4, 0, .4] : ph === 2 ? [-.25, .25] : [0]; for (const da of L) for (let i = 1; i <= 6; i++) quake(e.x + Math.sin(A + da) * i * 2.4, e.z + Math.cos(A + da) * i * 2.4, 1.7, .35 + i * .18, bdmg(e, .6), e); Sfx.big(); G.shake = Math.max(G.shake, .4); } },
  // sand giant: sand bursts erupting around the hero one after another
  sand: { wd: .6, rec: .8, ub: 1, start(e) { e.play('Cheer', { once: true, force: true, dur: 1 }); burst(e.x, 2, e.z, 0xd8b070, 3, true); }, hit(e, tg) { const n = 3 + w3Phase(e); for (let i = 0; i < n; i++) { const q = lead(tg, .6 + i * .3, .6); quake(clamp(q.x + rnd(-2.5, 2.5), -G.W + 1, G.W - 1), q.z + rnd(-2.5, 2.5), 2.2, .8 + i * .32, bdmg(e, .55), e); } } },
  // sand giant burrows, travels under the sand and bursts up under the hero
  burrow: { wd: .7, rec: 1.6, weak: 1, start(e, tg, m) { e.play('E_Slam', { once: true, force: true, dur: 1 }); m.inv = e.invuln; }, tick(e, tg, m, dt) { e.y = -e.h * clamp(m.t / m.wd, 0, 1) * 1.1; if (Math.random() < .6) burst(e.x + rnd(-1, 1), .3, e.z + rnd(-1, 1), 0xb08a60, 1.6, true); },
    hit(e, tg, m) { e.invuln = true; m.gx = tg.x; m.gz = tg.z; }, act(e, tg, m, dt) { e.y = -e.h * 1.1; e.invuln = true; const P = G.player; if (m.t < 1.6) { const s = v2(e, P); if (s.l > .6) { e.x += s.ux * 7 * dt; e.z += s.uz * 7 * dt; } if (Math.random() < .7) burst(e.x + rnd(-1, 1), .25, e.z + rnd(-1, 1), 0xb08a60, 1.8, true); return true; }
      if (!m.tw) { m.tw = 1; m.gx = P.x; m.gz = P.z; m.tl.push(telegraph(m.gx, m.gz, 3.4, .9, W3C.ub)); ubMark(P, .9); }
      if (m.t >= 2.5) { e.x = m.gx; e.z = m.gz; e.y = 0; e.invuln = m.inv; hitCircle(m.gx, m.gz, 3.4, () => bdmg(e, 1.2), e.team, e, { ub: 1, launch: 1, kb: 9, nf: 1 }); burst(e.x, 1, e.z, 0xd8b070, 5, true); ringFx(e.x, e.z, 3.8, 0xffb060); Sfx.big(); G.shake = .6; return false; } return true; }, end(e, m) { e.y = 0; e.invuln = m.inv; } },
  // Surtaysha: dark aura that hurts anyone who stays near him
  aura: { wd: .8, rec: .5, ub: 1, start(e, tg, m) { e.play('Cheer', { once: true, force: true, dur: 1.1 }); m.tl.push(telegraph(e.x, e.z, 5, m.wd, 0x8a20e0)); }, hit(e) { const z = { x: e.x, z: e.z, r: 5, t: 0, life: 4.5, src: e, team: e.team, n: 0, dmg: bdmg(e, .22) }; (G.zones || (G.zones = [])).push(z); ringFx(e.x, e.z, 5, 0xb040ff); Sfx.power(); } },
  // summon two wolves (limited)
  wolves: { wd: .9, rec: .6, start(e) { e.play('Cheer', { once: true, force: true, dur: 1.2 }); burst(e.x, e.h, e.z, 0x7722cc, 3); ringFx(e.x, e.z, 2.4, 0x7722cc); }, hit(e) { e.sumW = (e.sumW || 0) + 1; Sfx.howl(); for (const s of [-1, 1]) { const w = spawn('wolf', clamp(e.x + s * 3, -G.W + 1, G.W - 1), e.z + 2, 'enemy', true); w.sum = true; } } },
  // shield bearer: shield bash (orange = parryable) that knocks the hero back
  bash: { wd: .45, rec: .7, start(e, tg, m) { e.play('E_Attack', { once: true, force: true, dur: .8 }); m.tl.push(arcTele(e, e.r + 1.8, .5, m.wd, W3C.mel)); }, hit(e) { e.kx += Math.sin(e.rot) * 7; e.kz += Math.cos(e.rot) * 7; Sfx.swing(); if (hitArc(e, e.r + 1.9, .45, () => bdmg(e, .8), { mel: 1, kb: 12 })) Sfx.hit(); } }
};
function cSwing(e, m) { m.n++; m.tw = 0; Sfx.swing(); slashFx(e.x, e.h * .5, e.z, e.rot, (e.d.scale || 1) * .9, 0xff8844); e.kx += Math.sin(e.rot) * 4; e.kz += Math.cos(e.rot) * 4; if (hitArc(e, e.d.range + 1, .2, () => bdmg(e, .7), { mel: 1, kb: 5 })) Sfx.hit(); }
const GIANT = { cd: [3.2, 5], first: [2, 3.5], moves: [{ k: 'stomp', w: 3, max: 9 }, { k: 'club', w: 3, max: 5 }, { k: 'rock', w: 2, min: 5 }, { k: 'rock', w: 2, min: 3, ph: 3 }] };
const W3K = {
  nayza: { cd: [3, 5], moves: [{ k: 'sweep', w: 1, max: 2.6 }] },
  qalqan: { cd: [2.6, 4.2], moves: [{ k: 'bash', w: 3, max: 1.8 }, { k: 'charge', w: 2, min: 3.5, max: 9 }] },
  brute: { cd: [2.6, 4.2], first: [1.2, 2.4], moves: [{ k: 'charge', w: 3, min: 3.5, max: 11 }, { k: 'slam', w: 2, max: 2.6 }, { k: 'grab', w: 2, max: 1.9 }] },
  boribasi: { cd: [2.6, 4], moves: [{ k: 'combo3', w: 1, max: 2.6, ph: 2 }] },
  qunqar: GIANT, qargashiq: GIANT, camel: { ...GIANT, moves: GIANT.moves.slice(0, 2) },
  qashqir: { cd: [3, 4.6], moves: [{ k: 'club', w: 2, max: 4.5 }, { k: 'combo3', w: 3, max: 3.2 }, { k: 'stomp', w: 1, max: 8, ph: 2 }] },
  aydarho: { cd: [2.4, 3.6], first: [2, 3], moves: [{ k: 'bite', w: 3, max: 6 }, { k: 'tail', w: 2, max: 13 }, { k: 'jet', w: 3, min: 4 }, { k: 'dive', w: 2, min: 3, ph: 2 }] },
  jallod: { cd: [2.8, 4.4], moves: [{ k: 'chain', w: 3, min: 3.5, max: 12 }, { k: 'cslam', w: 2, min: 2 }, { k: 'combo3', w: 2, max: 3, ph: 2 }] },
  qumdev: { cd: [3, 4.6], moves: [{ k: 'sand', w: 3, min: 2 }, { k: 'burrow', w: 2, min: 5 }, { k: 'stomp', w: 2, max: 6 }] },
  surtaysha: { cd: [2.6, 4], moves: [{ k: 'combo3', w: 4, max: 3.4 }, { k: 'aura', w: 2, max: 6 }, { k: 'wolves', w: 1, ok: e => (e.sumW || 0) < 3 && enemies().length < 7 }] }
};
function kitTick(e, dt) {
  const K = W3K[e.brute ? 'brute' : e.type]; if (!K || G.noKit || e.asleep || e.team !== 'enemy' || e.mounted || e.drink || e.duel) return false;
  if (e.km) { if (e.state !== 'kit') { w3KitCancel(e); return false; } return kmTick(e, dt); }
  if (e.busy > 0 || e.castT > 0 || e.sub || e.ashore > 0 || /windup|leapS|pounce|crouch|recover|flee/.test(e.state)) return false;
  const P = G.player, tg = e.tg && !e.tg.dead ? e.tg : P; if (!tg || tg.dead || tg.team === 'npc') return false;
  if (e.kcd === undefined) e.kcd = rnd(...(K.first || [1.5, 3.5])); e.kcd -= dt; if (e.kcd > 0) return false;
  if (tg === P && !e.d.heavy && !tokOK(e)) { e.kcd = rnd(.4, .9); return false; }
  const ph = w3Phase(e), dist = Math.hypot(tg.x - e.x, tg.z - e.z) - tg.r - (e.d.heavy ? e.r * .6 : 0);
  const opts = K.moves.filter(m => (m.ph || 1) <= ph && dist >= (m.min ?? 0) && dist <= (m.max ?? 99) && (!m.ok || m.ok(e, tg))); if (!opts.length) { e.kcd = .35; return false; }
  let r = Math.random() * opts.reduce((s, m) => s + m.w, 0), pick = opts[0]; for (const m of opts) { r -= m.w; if (r <= 0) { pick = m; break; } }
  e.kcd = rnd(K.cd[0], K.cd[1]) * (ph >= 3 ? .7 : ph === 2 ? .85 : 1); if (e.bt !== undefined) e.bt = Math.max(e.bt, 1.4);
  kmStart(e, tg, pick.k); return true; }
function kmStart(e, tg, k) { const D = KM[k]; relSlot(e); e.clearTele(); e.state = 'kit'; const m = e.km = { k, D, tg, t: 0, wd: D.wd * (w3Phase(e) >= 3 ? .85 : 1), ph: 0, tl: [] }; e.face(tg.x - e.x, tg.z - e.z, 1); e.curName = ''; e.inLoco = false; if (D.ub) ubMark(e, m.wd); D.start(e, tg, m); }
function kmTick(e, dt) { const m = e.km, D = m.D, tg = m.tg && !m.tg.dead ? m.tg : G.player; m.t += dt;
  if (m.ph === 0) { if (D.tick) D.tick(e, tg, m, dt); else if (m.t < m.wd * .5) e.face(tg.x - e.x, tg.z - e.z, dt * 4); if (m.t >= m.wd) { m.ph = 1; m.t = 0; D.hit(e, tg, m); } return true; }
  if (m.ph === 1) { if (D.act && D.act(e, tg, m, dt)) return true; if (e.km !== m) return true; m.ph = 2; m.t = 0; const rec = (D.rec || .8) * (w3Phase(e) >= 3 ? .8 : 1); m.rec = rec; e.punT = G.time + rec; if (D.weak && e.d.heavy) { ringFx(e.x, e.z, e.r * 2 + 1, 0xffe070); num(e, tx('weakp'), 'c'); sparks(e.x, e.h * .35, e.z, 0xffe070, 12, 5); } e.play('Idle_Combat', { force: true }); return true; }
  if (D.weak && e.d.heavy && Math.random() < .3) sparks(e.x + rnd(-.6, .6), e.h * .3, e.z + rnd(-.6, .6), 0xffe070, 1, 2);
  if (m.t >= (m.rec || .8)) { e.km = null; e.state = 'chase'; e.cd = Math.max(e.cd, .35); tokFree(e); } return true; }
function w3KitCancel(e) { const m = e.km; if (!m) return; for (const o of m.tl) o.dead = true; if (m.D.end) m.D.end(e, m); e.km = null; if (e.state === 'kit') e.state = 'chase'; e.ubT = 0; }
// ---- per-frame: stamina, buffer, guard resume, lock, camera, telegraph list, red glow ----
let lockArrow = null, guardArc = null;
function w3Tick(dt) {
  const p = G.player; for (let i = W3T.length - 1; i >= 0; i--) { const o = W3T[i]; o.t += dt; const u = clamp(o.t / o.dur, 0, 1);
    if (o.kind === 'line') { if (o.own) { o.g.position.set(o.own.x, .08, o.own.z); o.g.rotation.y = o.own.rot; if (o.own.dead) o.dead = true; } o.fill.scale.z = Math.max(.01, o.len * u); }
    else if (o.kind === 'wave') { o.r = .5 + o.v * o.t; o.g.scale.set(o.r, 1, o.r); o.ring.material.opacity = o.band.material.opacity * 2 * (1 - u * .6); o.band.material.opacity = .45 * (1 - u * .7);
      for (const e of G.ents) { if (e.dead || o.hit.has(e) || !hostile(o.src.team, e.team) || e.bg) continue; const d = Math.hypot(e.x - o.x, e.z - o.z); if (Math.abs(d - o.r) < .75) { o.hit.add(e); if (e === p && (p.y || 0) > .4) { num(p, '✓', 'n'); continue; } e.damage(o.dmg, o.src.dead ? null : o.src, { ub: 1, low: 1, kb: 9, nf: 1 }); } } }
    else if (o.kind === 'rock') { const x = o.x0 + (o.x1 - o.x0) * u, z = o.z0 + (o.z1 - o.z0) * u; o.m.position.set(x, o.y0 * (1 - u) + Math.sin(u * Math.PI) * 6, z); o.m.rotation.x += dt * 7; o.m.rotation.z += dt * 5;
      if (u >= 1) { hitCircle(o.x1, o.z1, 2.5, o.dmg, o.src.team, o.src.dead ? null : o.src, { ub: 1, kb: 10, nf: 1 }); ringFx(o.x1, o.z1, 2.6, 0xffa060); burst(o.x1, .5, o.z1, 0x8a7258, 3.2, true); sparks(o.x1, .5, o.z1, 0xc8a070, 12, 7); Sfx.big(); G.shake = Math.max(G.shake, .4); hitBreak(o.x1, o.z1, 2.5, 'slam'); } }
    else if (o.kind === 'bang') { const e = o.own; o.s.position.set(e.x, (e.h || 2) + 1.1 + (e.y || 0), e.z); o.s.material.opacity = .6 + Math.sin(o.t * 22) * .4; if (e.dead || e.state !== 'kit' && e !== p) o.dead = true; }
    if (o.dead || o.t >= o.dur) { fxg.remove(o.g || o.m || o.s); W3T.splice(i, 1); } }
  for (const e of G.ents) if (e.ubT > 0) { e.ubT -= dt; const k = e.ubT > 0 && !e.dead ? .55 + Math.sin(G.time * 30) * .45 : 0; for (const m of e.mats) if (m.emissive) { if (k) m.emissive.setRGB(k, 0, 0); else if (m.userData.em0) m.emissive.copy(m.userData.em0); else m.emissive.setRGB(0, 0, 0); } }
  if (!p) return; w3P(p);
  if (!p.dead) { const rg = p.guard ? 0 : G.time - p.stAt > .65 ? (p.st < 1 ? 20 : 32) : 0; p.st = Math.min(p.stMax, p.st + rg * dt); }
  if (p.hl && (p.hl.dead || p.hl.gone || Math.hypot(p.hl.x - p.x, p.hl.z - p.z) > 22)) { const was = p.hl; p.hl = null; if (was.dead) { let b = null, bd = 12; for (const e of G.ents) { if (e.dead || e.gone || e.bg || !hostile('ally', e.team)) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; b = e; } } p.hl = b; } }
  if (p.hl) { p.lock = p.hl; p.lockAt = G.time; }
  if (!lockArrow) { lockArrow = new THREE.Mesh(new THREE.ConeGeometry(.28, .55, 4), new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: .95, depthTest: false })); lockArrow.rotation.x = Math.PI; lockArrow.renderOrder = 15; fxg.add(lockArrow); }
  lockArrow.visible = !!p.hl && !p.dead; if (p.hl) { lockArrow.position.set(p.hl.x, (p.hl.h || 2) + 1.0 + (p.hl.y || 0) + Math.sin(G.time * 6) * .12, p.hl.z); lockArrow.rotation.y += dt * 3; }
  if (!guardArc) { const g = new THREE.CircleGeometry(1, 20, -Math.PI / 2 - .8, 1.6); g.rotateX(-Math.PI / 2); guardArc = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })); guardArc.scale.setScalar(1.6); fxg.add(guardArc); }
  guardArc.visible = !!p.guard; if (p.guard) { guardArc.position.set(p.x, .09, p.z); guardArc.rotation.y = p.rot; guardArc.material.opacity = G.time - (p.guardAt || 0) < .3 ? .75 : .3; }
  // buffered inputs
  if (G.wbuf && (!p.act || canCancel(p.act))) { const b = G.wbuf; G.wbuf = null; if (G.time - b.t < .42) { if (b.k === 'D' || b.k === 'R') w3Dodge(p, b.k === 'R', b.dir); else if (b.k === 'S') w3Strong(p); else if (b.k === 'J') w3Jump(p); else if (b.k === 'B' && p.guardHeld) w3Guard(p, true); } }
  if (p.guardHeld && !p.act && !p.dead && !p.mounted) w3Guard(p, true, true);
  // camera: hard lock pulls the view toward the target; executions zoom in close
  const L = p.hl, ex = p.act && p.act.kind === 'exec' ? p.act.tg : null, f = Math.min(1, dt * 4); let ox = 0, oz = 0;
  if (ex) { ox = (ex.x - p.x) * .5; oz = (ex.z - p.z) * .5; } else if (L && Math.hypot(L.x - p.x, L.z - p.z) < 16) { ox = (L.x - p.x) * .28; oz = (L.z - p.z) * .28; }
  G.lkx = (G.lkx || 0) + (ox - (G.lkx || 0)) * f; G.lkz = (G.lkz || 0) + (oz - (G.lkz || 0)) * f; G.ck3 = (G.ck3 || 1) + ((ex ? .5 : 1) - (G.ck3 || 1)) * Math.min(1, dt * (ex ? 7 : 3));
  w3Hud(p); }
// player damage taken while airborne-jumping / rolling is handled in w3Def; held-in-grab uses its own ticks
// ---- HUD: stamina bar, new buttons (inside #btns), counter prompt ----
let stEl = null, cpEl = null;
const W3ICON = { bS: '<path d="M10 30 L27 13 M23 9 L31 17 M8 32 l3 -1 l-2 -2z" stroke="#ffe7a8" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M24 6 l10 10 l3 -3 l-10 -10z" fill="#ffcf6a" stroke="#5a3a08" stroke-width="1.2"/><path d="M6 14 q4 -6 10 -7 M30 34 q6 -4 7 -10" stroke="#ff9a40" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  bB: '<path d="M20 5 L33 10 Q33 26 20 35 Q7 26 7 10 Z" fill="url(#w3g)" stroke="#5a3a08" stroke-width="1.6"/><path d="M20 10 L20 30 M13 17 L27 17" stroke="#7a4e10" stroke-width="2.2"/>',
  bJ: '<path d="M20 30 L20 9 M12 16 L20 8 L28 16" stroke="#ffe7a8" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 34 H30" stroke="#d8a040" stroke-width="2.6" stroke-linecap="round"/>',
  bL: '<circle cx="20" cy="20" r="10" stroke="#ffe7a8" stroke-width="2.6" fill="none"/><path d="M20 4 V12 M20 28 V36 M4 20 H12 M28 20 H36" stroke="#ffcf6a" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="20" r="2.6" fill="#ff5a3a"/>' };
function w3UI() {
  const btns = $('btns'); if (!btns || $('bS')) return;
  const css = document.createElement('style'); css.id = 'w3css'; css.textContent = `
#btns{width:332px;height:262px}
.ab.wb:before{background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.08),rgba(0,0,0,0) 60%)}
.ab.wb svg.wi{position:relative;z-index:1;width:62%;height:62%;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.8))}
#bS{width:62px;height:62px;right:29px;bottom:119px}#bB{width:60px;height:60px;right:104px;bottom:88px}#bD{width:62px;height:62px;right:121px;bottom:9px}
#bJ{width:48px;height:48px;right:208px;bottom:6px}#bL{width:44px;height:44px;right:2px;bottom:210px}
#b1{right:86px;bottom:188px}#b2{right:164px;bottom:150px}#b3{right:275px;bottom:45px}#b4{right:262px;bottom:122px}#b5{right:196px;bottom:76px}#b8{right:265px;bottom:125px}
#bB.on{box-shadow:0 0 0 2px rgba(150,210,255,.95),0 0 18px 6px rgba(120,190,255,.7)}#bL.on{box-shadow:0 0 0 2px rgba(255,200,80,.95),0 0 16px 5px rgba(255,180,60,.65)}
#sbar{height:6px;width:clamp(96px,16vw,140px);margin-top:2px}#sbar i{background:linear-gradient(180deg,#fff8b8,#f2d02a 45%,#9a7e08);transition:width .08s}#sbar.low i{background:linear-gradient(180deg,#ffb0a0,#e8402a 50%,#7a1008)}
#w3cp{position:absolute;right:6px;bottom:96px;padding:3px 9px;border-radius:12px;background:rgba(10,12,30,.82);box-shadow:0 0 0 1px rgba(160,220,255,.9),0 0 14px rgba(120,200,255,.7);color:#cfeeff;font:700 13px/18px var(--fu,sans-serif);pointer-events:none;display:none;animation:pulse 0.6s infinite;white-space:nowrap}
@media (max-width:720px){#sbar{width:92px}}`; document.head.appendChild(css);
  const mk = (id, key) => { const b = document.createElement('div'); b.className = 'ab wb'; b.id = id; b.innerHTML = '<svg class="wi" viewBox="0 0 40 40"><defs><linearGradient id="w3g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#e2a93a"/><stop offset="1" stop-color="#8a5a12"/></linearGradient></defs>' + W3ICON[id] + '</svg><span class="k">' + key + '</span>'; btns.appendChild(b); return b; };
  const bS = mk('bS', 'E'), bB = mk('bB', 'Q'), bJ = mk('bJ', 'F'), bL = mk('bL', 'Tab');
  const P = () => G.player, pd0 = (b, fn) => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(e); });
  pd0(bS, () => w3Strong(P())); pd0(bJ, () => w3Jump(P()));
  pd0(bB, e => { try { bB.setPointerCapture(e.pointerId); } catch (er) { } w3Guard(P(), true); }); for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bB.addEventListener(ev, () => w3Guard(P(), false));
  pd0(bL, () => { bL._t = performance.now(); }); bL.addEventListener('pointerup', () => { if (!P()) return; if (performance.now() - (bL._t || 0) > 450) w3Lock(P(), true); else w3Lock(P()); });
  const hb = $('hbar'); if (hb && !$('sbar')) { stEl = document.createElement('div'); stEl.className = 'bar'; stEl.id = 'sbar'; stEl.innerHTML = '<i></i>'; hb.parentNode.insertBefore(stEl, hb.nextSibling); }
  cpEl = document.createElement('div'); cpEl.id = 'w3cp'; btns.appendChild(cpEl);
  // swipe on the right half of the screen = dodge that way; double tap = roll
  const SW = {}; addEventListener('pointerdown', e => { if (!P() || busy() || e.clientX < innerWidth * .46 || (e.target.closest && e.target.closest('.ab,#joy,button,.ov,#dlg,#map,#set,#pause,a,input'))) return; SW[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now() }; }, true);
  addEventListener('pointerup', e => { const s = SW[e.pointerId]; if (!s) return; delete SW[e.pointerId]; const dx = e.clientX - s.x, dy = e.clientY - s.y, l = Math.hypot(dx, dy), dtm = performance.now() - s.t; const p = P(); if (!p) return;
    if (l > 42 && dtm < 380) { w3Dodge(p, false, { x: dx / l, z: dy / l }); G.tapT = 0; } else if (l < 18 && dtm < 260) { const now = performance.now(); if (now - (G.tapT || 0) < 320) { w3Dodge(p, true); G.tapT = 0; } else G.tapT = now; } }, true);
}
function w3Hud(p) { if (!stEl) stEl = $('sbar'); if (stEl) { stEl.firstChild.style.width = clamp(p.st / p.stMax * 100, 0, 100) + '%'; stEl.classList.toggle('low', performance.now() < (G.stLow || 0) || p.st < 15); stEl.style.visibility = p.dead ? 'hidden' : 'visible'; }
  const bB = $('bB'), bL = $('bL'); if (bB) bB.classList.toggle('on', !!p.guard); if (bL) bL.classList.toggle('on', !!p.hl);
  for (const id of ['bB', 'bJ']) { const b = $(id); if (b) b.style.display = p.mounted ? 'none' : ''; }
  if (cpEl) { const on = p.counterT > G.time && p.counterTg && !p.counterTg.dead; cpEl.style.display = on ? 'block' : 'none'; if (on && cpEl._k !== document.documentElement.lang) { cpEl._k = document.documentElement.lang; cpEl.textContent = '⚔ ' + tx('counter'); } } }
addEventListener('keydown', e => { if (e.repeat) return; const c = e.code, p = G.player; if (!p) return;
  if (c === 'KeyE' || c === 'KeyU') { w3Strong(p); e.preventDefault(); } else if (c === 'KeyQ' || c === 'KeyI') w3Guard(p, true); else if (c === 'KeyF') w3Jump(p); else if (c === 'KeyR') w3Dodge(p, true); else if (c === 'Tab' || c === 'KeyL') { w3Lock(p); e.preventDefault(); } else if (c === 'KeyX') w3Lock(p, true); });
addEventListener('keyup', e => { if ((e.code === 'KeyQ' || e.code === 'KeyI') && G.player) w3Guard(G.player, false); });
w3UI();
G.w3 = { dodge: (r, d) => w3Dodge(G.player, r, d), guard: on => w3Guard(G.player, on), jump: () => w3Jump(G.player), strong: () => w3Strong(G.player), lock: r => w3Lock(G.player, r), kit: (e, k) => kmStart(e, G.player, k), W3K, KM };
// ==== /W3 ====
