const hint = (k, d = 6) => hintRaw(t(k));
// stealth sentry: idles/patrols, sees ~7 m in front (2.6 m all around); a hit before the alarm is a silent takedown
function sentry(ty, x, z, patrol = 0) { const e = spawn(ty, x, z); e.rot = 0; e.px = x; e.pd = Math.random() < .5 ? 1 : -1; e.seeT = 0;
  e.custom = (e, dt) => { e.farT = -1e9; const S = G.mis.st; if (S.alarm) { e.custom = null; e.farT = 0; return false; } const P = G.player; if (!P || P.dead) return true;
    if (e.hp < e.maxHp) { e.damage(1e6, P, { silent: true }); return true; }
    if (patrol) { e.x += e.pd * dt * 1.3; if (Math.abs(e.x - e.px) > patrol) e.pd *= -1; e.rot = e.pd > 0 ? Math.PI / 2 : -Math.PI / 2; e.play('Walking_A'); } else { e.rot += Math.sin(G.time * .6 + x) * dt * .5; e.play('Idle'); }
    const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz), dot = (dx * Math.sin(e.rot) + dz * Math.cos(e.rot)) / (d || 1);
    if (d < 2.6 || (d < 7.5 && dot > .45)) { e.seeT += dt; if (e.seeT > .7) alarm(); } else e.seeT = Math.max(0, e.seeT - dt);
    return true; }; return e; }
function alarm() { const S = G.mis.st; if (S.alarm) return; S.alarm = true; G.mis.flag = false; Sfx.horn(); flash(.3); hint('ms_alarm', 5); const P = G.player; for (const [ty, x, dz] of [['wolf', -6, -9], ['wolf', 6, -9], ['askar', -3, -12], ['askar', 3, -12], ['archer', 0, -15]]) spawn(ty, x, P.z + dz); setMusic('battle'); }
// raiders go for the captives unless the hero is right next to them
function raidAI(caps) { return (e, dt) => { e.raider = true; const P = G.player; if (P && !P.dead && Math.hypot(P.x - e.x, P.z - e.z) < 6) return false; let tg = null, bd = 1e9; for (const c of caps) { if (c.dead) continue; const d = Math.hypot(c.x - e.x, c.z - e.z); if (d < bd) { bd = d; tg = c; } } if (!tg) return false;
  const dx = tg.x - e.x, dz = tg.z - e.z; e.face(dx, dz, dt * 8); if (bd > 1.7) { e.x += dx / bd * e.speed * dt; e.z += dz / bd * e.speed * dt; e.play(e.d.run || 'Running_A'); } else { e.cd2 = (e.cd2 ?? .8) - dt; if (e.cd2 <= 0) { e.cd2 = 1.4; e.play('E_Attack', { once: true, force: true }); tg.damage(e.type === 'wolf' ? 26 : 22, e); } } return true; }; }
// big potion soldier that turns into a giant wolf (mini-boss)
function potionBoss(x, z) { const e = H.potionSoldier(x, z); e.maxHp = e.hp = 500; e.d = { ...e.d, name: 'mb_pot' }; e.vs *= 1.25; setBoss(e); e.onDeath = () => setBoss(null);
  const w = { done: false }; const old = G.tick; G.tick = dt => { if (old) old(dt); if (!w.done && e.type === 'wolf') { w.done = true; e.maxHp = e.hp = 1600; e.vs *= 1.6; e.r *= 1.5; e.dmgMul = 2; e.speed *= 1.1; setBoss(e); $('bname').textContent = t('mb_pot'); } }; return e; }

