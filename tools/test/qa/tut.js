// tutorial 0-0 bot for the 3-button scheme: WASD, J (tap / hold), Space, E. No teleports, no flags set.
const aud = require('./aud.js');
module.exports = async (p, shot) => {
  const TMAX = +(process.env.TMAX || 97), N = process.env.NAME || 'tut', STEPS = +(process.env.STEPS || 8), SH = (process.env.SHOTSET || '').split(',').filter(Boolean), T0 = Date.now(), el = () => ((Date.now() - T0) / 1000) | 0;
  while (el() < 70) { const ok = await p.evaluate(() => !!(window.__G && window.__MS && __G.mis && __G.player)).catch(() => false); if (ok) break; await p.waitForTimeout(700); }
  console.log('[ready]', el());
  await p.evaluate(k => { window.__KEYE = k; }, !!process.env.KEYE);
  await p.evaluate(async (steps) => {
    const v = (await (await fetch('./js/story.js')).text()).match(/engine\.js\?v=(\d+)/)[1]; const E = await import('/js/engine.js?v=' + v); window.__E = E;
    const r = E.renderer, o = r.render.bind(r); window.__nr = true; r.render = function (...a) { if (!window.__nr) return o(...a); };
    const G = __G, $ = id => document.getElementById(id); G.steps = steps; window.__TL = []; { const r0 = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => window.__nr ? setTimeout(() => cb(performance.now()), 1) : r0(cb); } let keys = {}, lastId = '', pressT = 0, lastW = null, dlgT = 0, lc = '', ldl = '';
    const key = (c, on) => { if (!!keys[c] === on) return; keys[c] = on; dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: c, bubbles: true })); };
    const tap = c => { key(c, true); setTimeout(() => key(c, false), 60); };
    const steer = (dx, dz) => { const l = Math.hypot(dx, dz); const mx = l > .3 ? dx / l : 0, mz = l > .3 ? dz / l : 0; key('KeyD', mx > .38); key('KeyA', mx < -.38); key('KeyS', mz > .38); key('KeyW', mz < -.38); };
    const go = (x, z, r = .6) => { const P = G.player, dx = x - P.x, dz = z - P.z; if (Math.hypot(dx, dz) > r) { steer(dx, dz); return false; } steer(0, 0); return true; };
    window.__bot = setInterval(() => { try {
      const lb = document.querySelector('#lore.on button'); if (lb) lb.click();
      if ($('dlg').classList.contains('on')) { const dl = $('dname').textContent + ': ' + $('dline').textContent; if (dl !== ldl) { ldl = dl; __TL.push(G.time.toFixed(1) + ' DLG ' + dl.slice(0, 90)); } }
      if (G.onEnter && !$('end').classList.contains('on') && performance.now() - dlgT > 500) { dlgT = performance.now(); G.onEnter(); }
      const P = G.player, R = window.__TUT_R; if (!P || G.paused || !R) { steer(0, 0); return; }
      const id = R.cur ? R.cur.id : (G.boss && !G.boss.dead ? 'duel' : ''); const card = ($('tuc') || {}).textContent || '';
      if (card !== lc) { lc = card; __TL.push(G.time.toFixed(1) + ' CARD[' + id + '] ' + card.slice(0, 90)); }
      if (id !== lastId) { __TL.push(G.time.toFixed(1) + ' STEP ' + (id || '-')); lastId = id; }
      const now = G.time, SP = R.spar, you = !card.includes('👀');
      switch (id) {
        case 'move': { const a = G.mis.aim && G.mis.aim(); if (a) go(a.x, a.z, .3); else go(0, -8.5, .3); break; }
        case 'light': if (R.d1 && go(R.d1.x, R.d1.z + 1.3, .4)) { P.face(R.d1.x - P.x, R.d1.z - P.z, 1); if (now - pressT > .3) { pressT = now; tap('KeyJ'); } } break;
        case 'heavy': { const sd = (R.sd && !R.sd.dead) ? R.sd : { x: 0, z: -17 }; if (go(sd.x, sd.z + 1.3, .4)) { P.face(sd.x - P.x, sd.z - P.z, 1); if (now - pressT > 1.6) { pressT = now; key('KeyJ', true); setTimeout(() => key('KeyJ', false), 600); } } break; }
        case 'dodge': { steer(0, 0); const c = R.dzC; if (c && c !== lastW && c.t - now < .9) { lastW = c; tap('Space'); } break; }
        case 'parry': { if (!SP) break; const d = Math.hypot(SP.x - P.x, SP.z - P.z); if (d > 3.2) go(SP.x, SP.z + 2.2, .5); else steer(0, 0);
          if (SP.state === 'windup' && lastW !== SP.tm0 && SP.tm <= SP.wd * .5) { lastW = SP.tm0 = now; tap('Space'); } break; }
        case 'bow': { steer(0, 0); const a = G.mis.aim && G.mis.aim(); if (a) { P.face(a.x - P.x, a.z - P.z, 1); if (now - pressT > 1) { pressT = now; tap('KeyJ'); } } break; }
        case 'amu': { steer(0, 0); if (now - pressT > 1.5 && window.__KEYE) { pressT = now; tap('KeyE'); } else if (now - pressT > 1.5) { pressT = now; { const b = $('bP'); if (b) { b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 })); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })); } } } break; }
        case 'duel': { const b = G.boss; const d = Math.hypot(b.x - P.x, b.z - P.z); if (d > 2.2) go(b.x, b.z, 2); else { steer(0, 0); P.face(b.x - P.x, b.z - P.z, 1); if (b.state === 'windup' && b.tm <= b.wd * .6 && now - pressT > .5) { pressT = now; tap('Space'); } else if (b.state !== 'windup' && now - pressT > .32) { pressT = now; tap('KeyJ'); } } break; }
        case 'spin': { const sd = (R.sd && !R.sd.dead) ? R.sd : { x: 0, z: -17 }; if (go(sd.x, sd.z + 1.3, .4)) { P.face(sd.x - P.x, sd.z - P.z, 1); if (now - pressT > 1.6) { pressT = now; key('KeyJ', true); setTimeout(() => key('KeyJ', false), 600); } } break; }
        default: steer(0, 0); if (id && !window['__u' + id]) { window['__u' + id] = 1; __TL.push('UNKNOWN STEP ' + id); }
      }
    } catch (e) { if (!window.__be) { window.__be = 1; console.log('[bot]', e.message); } } }, 100);
  }, STEPS);
  let lastSt = '', bad = new Set(), fin = false;
  while (el() < TMAX) {
    await p.waitForTimeout(4000);
    const s = await Promise.race([p.evaluate(() => { const R = window.__TUT_R; return JSON.stringify({ t: +__G.time.toFixed(0), mis: __G.mis && __G.mis.id, id: R && R.cur ? R.cur.id : (__G.boss ? 'duel' : ''), k: R && R.k, tot: R && R.total, end: document.getElementById('end').classList.contains('on'), card: ((document.getElementById('tuc') || {}).textContent || '').slice(0, 50), hp: __G.player ? __G.player.hp | 0 : 0, hero: __G.hero, P: __G.player ? [+__G.player.x.toFixed(1), +__G.player.z.toFixed(1)] : null, act: __G.player && __G.player.act ? __G.player.act.kind : '', Rk: R ? Object.keys(R).join(',').slice(0, 120) : '', R: R ? { combo: R.combo, lh: R.lh, sd: R.sdTry, dz: R.dz, dzF: R.dzF, pf: R.pfail, bh: R.bh && R.bh.size } : null, arch: !!(window.__ARCH && __ARCH.S && !__ARCH.S.over) }); }), new Promise(r => setTimeout(() => r('EVAL-TIMEOUT'), 5000))]).catch(e => 'ERR ' + e.message.slice(0, 80));
    console.log('[st]', el(), s); const a = await p.evaluate(aud).catch(() => null); if (a) try { const j = JSON.parse(a); j.bad.forEach(x => bad.add('BAD ' + x)); j.off.forEach(x => bad.add('OFF ' + x)); } catch (e) { }
    const m = /"id":"([a-z]*)"/.exec(s), sid = m ? m[1] : '';
    if (sid && sid !== lastSt && SH.includes(sid) && el() < TMAX - 25) { await p.evaluate(() => { window.__nr = false; __G.steps = 1; }); await p.waitForTimeout(1500); await shot('qa/' + N + '_' + sid).catch(e => console.log('shotfail')); await p.evaluate((st) => { window.__nr = true; __G.steps = st; }, STEPS); }
    if (sid) lastSt = sid;
    if (/"end":true/.test(s) || /"mis":"0-1"/.test(s)) { fin = true; await p.evaluate(() => { window.__nr = false; }); await p.waitForTimeout(1500); if (el() < TMAX - 10) await shot('qa/' + N + '_end').catch(() => { }); console.log('[end]', el(), await p.evaluate(() => document.getElementById('eh').textContent + ' | ' + document.getElementById('stl').innerText.replace(/\n/g, ' / ') + ' | btn=' + document.getElementById('ereplay').textContent)); break; }
  }
  console.log('[result]', fin ? 'FINISHED' : 'NOT-FINISHED'); console.log('[audit]', [...bad].join(' || '));
  console.log('[timeline]\n' + (await p.evaluate(() => __TL.join('\n') + '\nLOG ' + (window.__TUT_R && __TUT_R.log ? __TUT_R.log.join(' ') : '')).catch(() => 'tl-fail')));
};
