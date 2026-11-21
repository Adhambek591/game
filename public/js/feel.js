// Combat feel layer (anim agent). Hooks the engine from outside: wraps Ent.damage / Ent.die and runs its own per-frame pass.
// Nothing here changes game rules: lunge limits, duel ring, damage numbers and AI are the engine's.
import * as THREE from 'three';
import * as ENG from './engine.js?v=1795247421';
import { SkinRig } from './skinrig.js?v=1795247421';
const G = ENG.G, Ent = ENG.Ent, cam = ENG.camera, scene = ENG.scene;
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
// ---- THE hit-stop / shake table (single owner; stacking is max, never sum). stop = seconds, tr = trauma 0..1; camera offset = trauma^2 x 0.35 m, trauma decays 2.2/s.
export const FEEL = { light: [.05, .15], third: [.08, .3], heavy: [.11, .45], kill: [.09, .25], parry: [.07, .2], heroHit: [.05, .2], heroHeavy: [.08, .35], bossOnHero: [.12, .6], finisher: [.18, .8], maxOff: .35, decay: 2.2, vib: { light: 15, heavy: 35, finisher: [30, 40, 60] } };
const F = { trauma: 0, shakeSet: 0, table: FEEL, punch: 0, fov0: cam.fov, lastFov: cam.fov, trails: [], on: true, cheerQ: [] };
if (G === globalThis.__G && Ent && !Ent.prototype.__feel) {
  Ent.prototype.__feel = 1; SkinRig.feel = true; G.feel = F;
  // ---- death / knockdown flag for the rig (death = fall and stay, knockdown = fall and get up)
  const oDie = Ent.prototype.die;
  Ent.prototype.die = function () { const was = this.dead; if (!was && this.rig) this.rig.isDead = true; const r = oDie.apply(this, arguments);
    try { if (!was && this.team === 'enemy' && !this.bg && (this === G.boss || this.d.heavy || this.d.elite)) { F.punch = Math.max(F.punch, this.d.heavy ? 1.8 : 1.1); G.zk = Math.max(G.zk || 0, this.d.heavy ? .14 : .12); const P = G.player; if (P && !this.d.heavy && Math.hypot(P.x - this.x, P.z - this.z) < 7) { G.slow = Math.max(G.slow || 0, .6); ENG.vib(FEEL.vib.finisher); } } } catch (e) { } return r; };
  // ---- hits: directional torso recoil, hit-stop when the hero is involved, FOV punch, contact sparks, dust on knockdowns, watchers react
  const oDmg = Ent.prototype.damage;
  Ent.prototype.damage = function (amt, src, op) { const wasDown = this.downT > 0, wasAir = this.air, hs0 = G.hitStop || 0, sh0 = G.shake || 0, st0 = this.state, P = G.player, inv = src === P || this === P; const r = oDmg.call(this, amt, src, op || {});
    try { if (inv && r > 0) { G.hitStop = hs0; G.shake = sh0; } if (r > 0) onHit(this, src, op || {}, r, wasDown, wasAir, st0); } catch (e) { } return r; };
  const impact = (k) => { const v = FEEL[k]; G.hitStop = Math.max(G.hitStop || 0, v[0]); F.trauma = Math.max(F.trauma, v[1]); };
  function onHit(e, src, op, dealt, wasDown, wasAir, st0) { const P = G.player, rig = e.rig; if (!src || src === e) return;
    const dx = e.x - src.x, dz = e.z - src.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, s = Math.sin(e.rot), c = Math.cos(e.rot);
    const heavy = !!(op.crit || op.kd || op.launch || op.ub || dealt > e.maxHp * .22);
    const lz = ux * s + uz * c; if (rig && rig.os && rig.os.key === 'Hit_A' && rig.os.t === 0) { rig.kind = rig.os.key = lz > .25 ? 'Hit_Back' : 'Hit_Front'; }
    if (rig && rig.recoil && e.state === 'block' && st0 !== 'windup' && !e.dead && !e.d.heavy) rig.blockT = .25;
    if (rig && rig.recoil && !e.mounted) rig.recoil(ux * c - uz * s, ux * s + uz * c, cl((heavy ? .75 : .42) * (e.d.heavy ? .35 : e.d.elite ? .6 : 1) + dealt / e.maxHp, .12, 1.1));
    if (src === P || e === P) {
      const fin = !!op.exec, big = !!(op.crit || op.kd || op.launch || op.gb);
      if (e === P) impact(src.d.heavy ? 'bossOnHero' : heavy ? 'heroHeavy' : 'heroHit'); else { impact(fin ? 'finisher' : big ? 'heavy' : P.combo === 3 ? 'third' : 'light'); if (e.dead) impact('kill'); }
      if (fin) ENG.vib(FEEL.vib.finisher); else if (big || (e === P && heavy)) ENG.vib(FEEL.vib.heavy); else ENG.vib(FEEL.vib.light);  // ENG.vib honours the vibration setting and guards navigator.vibrate
      F.punch = Math.max(F.punch, heavy ? 1 : .4);
      if (heavy && !op.proj) ENG.sparks(e.x - ux * e.r * .7, e.h * (.5 + Math.random() * .2), e.z - uz * e.r * .7, e === P ? 0xff8060 : 0xfff2c0, 6, 7);
      if ((e.downT > 0 && !wasDown) || (e.air && !wasAir)) ENG.burst(e.x, .22, e.z, 0xc8a070, 1.5, true);
    }
    // a duel: the ring reacts when the boss is hurt badly, and winces when the hero is
    const D = G.duel; if (D && !D.dead && heavy && (e === D || e === P)) { for (const w of G.ents) { if (w === P || w === D || w.dead || w.mounted || !w.rig || Math.hypot(w.x - D.x, w.z - D.z) > 18) continue; const glad = (e === D) === (w.team === 'ally'); if (glad && Math.random() < .3) F.cheerQ.push([w, G.time + Math.random() * .7]); else if (!glad && w.rig.recoil && Math.random() < .5) w.rig.recoil(0, -1, .22); } }
  }
  // ---- blade trails: a short additive ribbon swept by the weapon during the strike window of an attack
  const TN = 8, SUB = 6, TLIFE = .13, MAXT = 6;
  function mkTrail() { const n = (TN - 1) * SUB + 1, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 6), 3)); const idx = []; for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false })); m.frustumCulled = false; m.visible = false; m.renderOrder = 6; scene.add(m); return { m, S: [], e: null, n, col: new THREE.Color() }; }
  const _b = new THREE.Vector3(), _t = new THREE.Vector3();
    function trailTick(now) { const P = G.player; if (!P) return;
    // who is swinging
    for (const e of G.ents) { const rig = e.rig, o = rig && rig.os; if (!o || e.gone || !rig.wpn || !/Attack|Slam/.test(o.key) || (rig.bowM && rig.bowM.visible)) continue; if (o.t < o.hT * .7 || o.t > o.hT + .1) continue; if (e !== P && Math.hypot(e.x - P.x, e.z - P.z) > 15) continue;
      let T = F.trails.find(t => t.e === e); if (!T) { T = F.trails.find(t => !t.e && !t.S.length); if (!T && F.trails.length < MAXT) { T = mkTrail(); F.trails.push(T); } if (!T) continue; T.e = e; T.col.set(e === P ? 0xffe9b0 : e.team === 'ally' ? 0xcfe0ff : 0xff7048); T.len = (e.d.wpn === 'spear' ? 1.5 : 1.0); }
      rig.wpn.updateWorldMatrix(true, false); const b = rig.wpn.localToWorld(_b.set(0, 0, 0)), t = rig.wpn.localToWorld(_t.set(0, T.len, 0)); T.S.push([now, b.x, b.y, b.z, t.x, t.y, t.z]); if (T.S.length > TN) T.S.shift(); T.live = now; }
    for (const T of F.trails) { while (T.S.length && now - T.S[0][0] > TLIFE) T.S.shift(); if (now - (T.live || 0) > .03) T.e = null; const S = T.S, n = S.length; if (n < 2) { T.m.visible = false; if (!T.e) T.S.length = 0; continue; }
      // between two samples the grip moves on a line and the blade DIRECTION is interpolated and re-normalised, so a fast swing draws a round arc even at low frame rates
      const pos = T.m.geometry.attributes.position, col = T.m.geometry.attributes.color; let k = 0;
      for (let i = 0; i < n - 1; i++) { const b = S[i], c = S[i + 1], lb = Math.hypot(b[4] - b[1], b[5] - b[2], b[6] - b[3]), lc = Math.hypot(c[4] - c[1], c[5] - c[2], c[6] - c[3]);
        for (let s = 0; s < SUB + (i === n - 2 ? 1 : 0); s++) { const u = s / SUB, v = 1 - u, tm = b[0] * v + c[0] * u, f = cl(1 - (now - tm) / TLIFE, 0, 1), w = f * f * .6;
          const gx = b[1] * v + c[1] * u, gy = b[2] * v + c[2] * u, gz = b[3] * v + c[3] * u; let dx = (b[4] - b[1]) * v + (c[4] - c[1]) * u, dy = (b[5] - b[2]) * v + (c[5] - c[2]) * u, dz = (b[6] - b[3]) * v + (c[6] - c[3]) * u; const dl = Math.hypot(dx, dy, dz) || 1, L = (lb * v + lc * u) / dl; dx *= L; dy *= L; dz *= L;
          pos.setXYZ(k * 2, gx + dx * .35, gy + dy * .35, gz + dz * .35); pos.setXYZ(k * 2 + 1, gx + dx, gy + dy, gz + dz);
          col.setXYZ(k * 2, 0, 0, 0); col.setXYZ(k * 2 + 1, T.col.r * w, T.col.g * w, T.col.b * w); k++; } }
      T.m.geometry.setDrawRange(0, Math.max(0, (k - 1) * 6)); pos.needsUpdate = true; col.needsUpdate = true; T.m.visible = true; } }
  // ---- per-frame pass (after the engine's own frame)
  let last = 0, clock = 0;
  function tick(now) { requestAnimationFrame(tick); const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; if (!F.on) return; clock += dt;
    try { const P = G.player;
      if (P && !G.paused) { const D = G.duel && !G.duel.dead ? G.duel : null;
        for (const e of G.ents) { const rig = e.rig; if (!rig || !rig.recoil || e.gone) continue; if (e === P) rig.hero = true; if (!e.dead && rig.isDead) { rig.isDead = false; rig.kd = false; }
          if (e.dead) { rig.lookY = rig.lookP = 0; continue; }
          // look at: the current target, the duel, the hero's lock or nearest threat; civilians and idle allies glance at the hero
          let tg = null; if (e === P) { tg = (P.hl && !P.hl.dead && P.hl) || (P.lock && !P.lock.dead && G.time - (P.lockAt || 0) < 2 && P.lock) || null; if (!tg) { let md = 81; for (const o of G.ents) { if (o.dead || o.team !== 'enemy' || o.bg) continue; const q = (o.x - P.x) ** 2 + (o.z - P.z) ** 2; if (q < md) { md = q; tg = o; } } } }
          else tg = (e.tg && !e.tg.dead && e.tg) || (D && e !== D && Math.hypot(D.x - e.x, D.z - e.z) < 22 ? ((e.lkS ?? (e.lkS = Math.random())) < .65 ? D : P) : null) || (e.team !== 'enemy' && Math.hypot(P.x - e.x, P.z - e.z) < 7 ? P : null);
          if (tg && tg !== e) { const dx = tg.x - e.x, dz = tg.z - e.z, dist = Math.hypot(dx, dz) || 1, a = wrap(Math.atan2(dx, dz) - e.rot); if (Math.abs(a) < 1.9 && dist < 30) { rig.lookY = a; rig.lookP = cl(-Math.atan2(((tg.h || 2) - (e.h || 2)) * .8 + (tg.y || 0) - (e.y || 0), dist), -.45, .45); } else { rig.lookY *= .9; rig.lookP = 0; } } else { rig.lookY = 0; rig.lookP = 0; } }
        for (let i = F.cheerQ.length - 1; i >= 0; i--) { const [w, t] = F.cheerQ[i]; if (G.time >= t) { F.cheerQ.splice(i, 1); if (!w.dead && !w.gone && /^Idle/.test(w.curName || '') && G.duel) w.play('Cheer', { once: true, force: true }); } } if (F.cheerQ.length > 24) F.cheerQ.length = 0;
      }
      // trauma shake: the engine draws the offset from G.shake (x0.6 m); anything the engine bumped elsewhere is folded in with max()
      if ((G.shake || 0) > F.shakeSet + .02) F.trauma = Math.max(F.trauma, Math.min(1, Math.sqrt(Math.min(G.shake, .6) * .6 / FEEL.maxOff) * .8)); F.trauma = Math.max(0, F.trauma - FEEL.decay * dt * (G.hitStop > 0 ? .3 : 1)); G.shake = F.shakeSet = F.trauma * F.trauma * FEEL.maxOff / .6; if (G.hitStop > .2) G.hitStop = .2;
      trailTick(clock);
      // FOV punch: a quick push-in on impact that eases back
      if (cam.fov !== F.lastFov) F.fov0 = cam.fov; if (F.punch > .01) { F.punch *= Math.pow(.0009, dt); cam.fov = F.fov0 - Math.min(2.2, F.punch) * 1.5; cam.updateProjectionMatrix(); F.lastFov = cam.fov; } else if (F.lastFov !== F.fov0) { F.punch = 0; cam.fov = F.lastFov = F.fov0; cam.updateProjectionMatrix(); }
    } catch (err) { if (!F.err) { F.err = 1; console.warn('feel tick', err); } } }
  requestAnimationFrame(tick);
} else console.warn('feel: engine instance mismatch, feel layer off');
