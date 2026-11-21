// QA mission bot: keyboard input only (WASD, J attack, Space dodge, E amulet). GOD=1 refills hp (cheat, reported). SHOTS=gameTimes, STEPS=sim steps/frame
const aud = require('./aud.js');
module.exports = async (p, shot) => {
  const TMAX = +(process.env.TMAX || 95), N = process.env.NAME || 'bot', STEPS = +(process.env.STEPS || 6), SH = (process.env.SHOTS || '').split(',').filter(Boolean).map(Number), GOD = !!process.env.GOD, T0 = Date.now();
  const el = () => ((Date.now() - T0) / 1000) | 0;
  while (el() < 70) { const ok = await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); const c = document.getElementById('cut'); if (c && c.classList.contains('on')) document.getElementById('cskip').click(); return !!(window.__G && window.__MS && __G.mis && __G.player); }).catch(() => false); if (ok) break; await p.waitForTimeout(700); }
  console.log('[ready]', el());
  await p.evaluate(async ([steps, GOD]) => {
    const v = (await (await fetch('./js/story.js')).text()).match(/engine\.js\?v=(\d+)/)[1]; const E = await import('/js/engine.js?v=' + v); window.__E = E;
    const r = E.renderer, o = r.render.bind(r); window.__nr = true; r.render = function (...a) { if (!window.__nr) return o(...a); };
    const G = __G, $ = id => document.getElementById(id); window.__TL = []; const ST = window.__ST = { deaths: 0, blocked: 0, visSpawn: 0, duelS: 0, duelNear: 0, allyFar: 0, allyS: 0, maxArrow: 0, qte: 0, hitsTaken: 0, dlg: 0, bossMinHp: null, pMinHp: 1, slide: 0, names: {} };
    let lo = '', keys = {}, lastPos = null, stillT = 0, seen = new WeakSet(), lastHp = null, wT = 0, lb0 = '';
    const key = (c, on) => { if (!!keys[c] === on) return; keys[c] = on; dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: c, bubbles: true })); };
    const tap = c => { key(c, true); setTimeout(() => key(c, false), 60); };
    const steer = (dx, dz) => { const l = Math.hypot(dx, dz); const mx = l > .3 ? dx / l : 0, mz = l > .3 ? dz / l : 0; key('KeyD', mx > .38); key('KeyA', mx < -.38); key('KeyS', mz > .38); key('KeyW', mz < -.38); };
    G.steps = steps;
    window.__bot = setInterval(() => { try {
      const t = +G.time.toFixed(1);
      if (G.onEnter && !$('end').classList.contains('on')) { const dl = $('dname').textContent + ': ' + $('dline').textContent; if ($('dlg').classList.contains('on') && dl !== lb0) { lb0 = dl; ST.dlg++; if (/undefined|NaN|\{\w+\}|^[a-z0-9_]+: |: [a-z0-9]+_[a-z0-9_]+$/.test(dl)) __TL.push(t + ' BADDLG ' + dl.slice(0, 80)); } G.onEnter(); }
      const lb = document.querySelector('#lore.on button'); if (lb) lb.click(); const c = $('cut'); if (c && c.classList.contains('on')) $('cskip').click();
      if ($('dead') && $('dead').classList.contains('on')) { ST.deaths++; __TL.push(t + ' DEATH'); $('dretry').click(); return; }
      if (G.qte) { ST.qte++; tap('Space'); setTimeout(() => tap('KeyJ'), 90); return; }
      const ob = $('obj').textContent; if (ob !== lo) { lo = ob; __TL.push(t + ' OBJ ' + ob); }
      const bn = $('boss') && getComputedStyle($('boss')).display !== 'none' ? $('bname').textContent : ''; if (bn && !ST.names[bn]) { ST.names[bn] = 1; __TL.push(t + ' BOSSBAR ' + bn); }
      const P = G.player; if (!P || G.paused || G.flying || P.dead) { steer(0, 0); return; }
      if (GOD && P.hp < P.maxHp * .6) P.hp = P.maxHp;
      if (lastHp !== null && P.hp < lastHp - 1) ST.hitsTaken++; lastHp = P.hp; ST.pMinHp = Math.min(ST.pMinHp, +(P.hp / P.maxHp).toFixed(2));
      const de = $('dir'); if (de && de.style.display !== 'none') { const d = parseInt(de.lastChild.textContent) || 0; if (d > ST.maxArrow) ST.maxArrow = d; }
      const ens = G.ents.filter(e => e.team === 'enemy' && !e.dead && !e.bg && !e.prop);
      for (const e of ens) if (!seen.has(e)) { seen.add(e); const d = Math.hypot(e.x - P.x, e.z - P.z); if (t > (G.mis.t0 || 0) + 3 && d < 13 && e.o && e.o.visible) { ST.visSpawn++; __TL.push(t + ' VISSPAWN ' + e.type + ' d=' + d.toFixed(1) + ' at(' + (e.x | 0) + ',' + (e.z | 0) + ')'); } }
      const aw = ens.filter(e => ((e.farT || 0) > -1e8 || (e === G.boss && !e.asleep)));
      const B = G.boss; if (B && !B.dead && !B.asleep && Math.hypot(B.x - P.x, B.z - P.z) < 18) { ST.duelS++; ST.bossMinHp = Math.min(ST.bossMinHp ?? 1, +(B.hp / B.maxHp).toFixed(2)); if (ens.some(e => e !== B && (Math.hypot(e.x - B.x, e.z - B.z) < 7 || Math.hypot(e.x - P.x, e.z - P.z) < 5))) ST.duelNear++; }
      for (const e of G.ents) if (e.team === 'ally' && !e.dead && e !== P && e.d && e.d.follow) { ST.allyS++; if (Math.hypot(e.x - P.x, e.z - P.z) > 22) ST.allyFar++; }
      let near = null, nd = 1e9; for (const e of aw) { const d = Math.hypot(e.x - P.x, e.z - P.z) - (e.r || 0); if (d < nd) { nd = d; near = e; } }
      const aim = G.mis && G.mis.aim && G.mis.aim();
      const hunt = (G.mis.hunt || []).filter(e => !e.dead).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
      const mk = (G.markers || []).filter(m => !m.opt && m.z < P.z + 8).pop() || null; let tg;
      if (near && nd < 9) tg = near; else if (aim) tg = aim; else if (mk) tg = mk; else if (near) tg = near; else if (hunt && Math.hypot(hunt.x - P.x, hunt.z - P.z) < 30) tg = hunt; else if (G.mis && G.mis.cv) tg = { x: G.mis.cv.x + 3, z: G.mis.cv.z - 3 }; else tg = { x: 0, z: P.z - 8 };
      const dx = tg.x - P.x, dz = tg.z - P.z, d = Math.hypot(dx, dz), isE = tg.team === 'enemy';
      const brk = (G.breakables || []).find(o => !o.dead && Math.hypot(o.x - P.x, o.z - P.z) < 2.6 + (o.rad || 1) && aim && !aim.team && Math.hypot(o.x - aim.x, o.z - aim.z) < 4.5);
      // dodge: enemy winding up at us / telegraph circle
      const wu = aw.find(e => e.state === 'windup' && Math.hypot(e.x - P.x, e.z - P.z) < 4.2 + (e.r || 0));
      const tele = (G.tele || []).some(o => !o.dead && o.g && Math.hypot(o.g.position.x - P.x, o.g.position.z - P.z) < (o.r || 2) && o.t > o.dur * .5);
      if ((wu || tele) && t - wT > .7 && Math.random() < .75) { wT = t; tap('Space'); }
      else if ((isE && d < 2.7 + (tg.r || 0)) || brk) { steer(0, 0); P.face && P.face(brk ? brk.x - P.x : dx, brk ? brk.z - P.z : dz, 1); tap('KeyJ'); if ((G.ulti || 0) >= 100 && Math.random() < .3) tap('KeyE'); }
      else if (d > 1.6) steer(dx, dz); else steer(0, 0);
      if (G.ravineAhead && !aw.length) { steer(0, -1); }
      if (lastPos) { const mv = Math.hypot(P.x - lastPos.x, P.z - lastPos.z); if (d > 3 && !isE && mv < .03) { stillT += .2; if (stillT > 4) { ST.blocked++; __TL.push(t + ' BLOCKED at ' + P.x.toFixed(1) + ',' + P.z.toFixed(1) + ' -> ' + (tg.type || 'pt') + '(' + (tg.x | 0) + ',' + (tg.z | 0) + ')'); stillT = 0; key('KeyW', false); key('KeyA', true); setTimeout(() => key('KeyA', false), 500); } } else stillT = 0; }
      lastPos = { x: P.x, z: P.z };
    } catch (e) { if (!window.__be) { window.__be = 1; console.warn('[bot]', e.message); } } }, 200);
  }, [STEPS, GOD]);
  let si = 0, bad = new Set(), endSeen = false;
  const audit = async () => { const a = await p.evaluate(aud).catch(() => null); if (a) { try { const j = JSON.parse(a); j.bad.forEach(x => bad.add('BAD ' + x)); j.off.forEach(x => bad.add('OFF ' + x)); } catch (e) { } } };
  while (el() < TMAX) {
    await p.waitForTimeout(5000);
    const s = await Promise.race([p.evaluate(() => JSON.stringify({ t: +__G.time.toFixed(0), end: document.getElementById('end').classList.contains('on'), map: !!(document.getElementById('map') && document.getElementById('map').classList.contains('on')), fly: !!__G.flying, P: __G.player ? [__G.player.x | 0, __G.player.z | 0] : null, hp: __G.player ? __G.player.hp | 0 : 0, en: __G.ents.filter(e => e.team === 'enemy' && !e.dead && !e.prop).length, boss: __G.boss && !__G.boss.dead ? __G.boss.type + ':' + (__G.boss.hp | 0) + '/' + (__G.boss.maxHp | 0) : '', obj: document.getElementById('obj').textContent.slice(0, 60), E: (l => l.length <= 4 ? l.map(e => e.type + '(' + (e.x | 0) + ',' + (e.z | 0) + ((e.farT || 0) < -1e8 ? ',z' : '') + (e.asleep ? ',as' : '') + (e.invuln ? ',inv' : '') + (e.o && !e.o.visible ? ',hid' : '') + ',hp' + (e.hp | 0) + ')').join(' ') : '')(__G.ents.filter(e => e.team === 'enemy' && !e.dead && !e.prop)), hint: (document.getElementById('hint').textContent || '').slice(0, 50) })), new Promise(r => setTimeout(() => r('EVAL-TIMEOUT'), 5000))]).catch(e => 'ERR ' + e.message.slice(0, 80));
    console.log('[st]', el(), s); await audit();
    if (process.env.STEPS2 && el() > 50 && !global.__s2) { global.__s2 = 1; await p.evaluate(n => { __G.steps = n; }, +process.env.STEPS2); }
    const m = /"t":(\d+)/.exec(s);
    if (m && si < SH.length && +m[1] >= SH[si] && !/"fly":true/.test(s) && el() < TMAX - 25) { await p.evaluate(() => { window.__nr = false; __G.steps = 1; }); await p.waitForTimeout(1800); console.log('[info]', await p.evaluate(() => { const i = __E.renderer.info; return 'calls=' + i.render.calls + ' tris=' + i.render.triangles + ' fps=' + (__G.fps | 0); })); await shot('qa/' + N + '_' + SH[si]).catch(e => console.log('shotfail')); await audit(); si++; await p.evaluate(([st]) => { window.__nr = true; __G.steps = st; }, [STEPS]); }
    if (/"map":true/.test(s) || /"end":true/.test(s)) { endSeen = true; await p.evaluate(() => { window.__nr = false; }); await p.waitForTimeout(1500); await audit(); if (el() < TMAX - 12) await shot('qa/' + N + '_end').catch(() => { });
      console.log('[end]', el(), await p.evaluate(() => document.getElementById('eh').textContent + ' | ' + document.getElementById('stl').innerText.replace(/\n/g, ' / ') + ' | btn=' + document.getElementById('ereplay').textContent)); break; }
  }
  console.log('[result]', endSeen ? 'FINISHED' : 'NOT-FINISHED');
  console.log('[audit]', [...bad].join(' || '));
  console.log('[timeline]\n' + (await p.evaluate(() => __TL.join('\n') + '\nST ' + JSON.stringify(window.__ST)).catch(e => 'tl-fail')));
  if (!endSeen && process.env.FINALSHOT && el() < TMAX + 5) { await p.evaluate(() => { window.__nr = false; __G.steps = 1; }); await p.waitForTimeout(1500); await shot('qa/' + N + '_final').catch(() => { }); }
};
