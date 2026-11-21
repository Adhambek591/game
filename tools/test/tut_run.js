// tutorial agent: plays the 0-0 tutorial with real key input, screenshots each step (NAME prefix), logs the step timeline
module.exports = async (p, shot) => {
  const N = process.env.NAME || 'tu', TMAX = +(process.env.TMAX || 400), SHOTS = process.env.SHOTS !== '0';
  const st = () => p.evaluate(() => { const G = window.__G, R = window.__TUT_R; if (!G || !G.player) return null; const P = G.player; const ays = R && R.ays;
    return { t: +G.time.toFixed(1), id: R && R.cur ? R.cur.id : null, k: R ? R.k : 0, dlg: document.getElementById('dlg').classList.contains('on'), end: document.getElementById('end').classList.contains('on'), lore: !!document.querySelector('#lore.on'), cut: document.getElementById('cut').classList.contains('on'),
      x: +P.x.toFixed(1), z: +P.z.toFixed(1), hp: P.hp | 0, mounted: !!P.mounted, ays: ays ? { s: ays.state, tm: +(ays.tm || 0).toFixed(2), x: +ays.x.toFixed(1), z: +ays.z.toFixed(1), c: ays.custom ? (ays.custom.name || 'anon') : 0, d: ays.dead, tm2: ays.team, st: ays.stagger > 0 ? 1 : 0, dn: ays.downT > 0 ? 1 : 0 } : null, mis: G.mis && G.mis.id, boss: !!G.boss, paused: G.paused,
      obj: document.getElementById('obj').textContent.slice(0, 60), card: (document.getElementById('tuc') || {}).textContent, log: R ? R.log.join(' ') : '', rider: !!(R && R.rider), arr: !!(R && R.rider && R.rider.arrived), dname: document.getElementById('dname').textContent, rings: R && R.rings ? R.rings.filter(r => !r.done).map(r => [r.x, r.z]) : null, tg: R && R.tgs ? R.tgs.filter(e => !e.dead).map(e => [e.x, e.z]) : null, b: [...document.querySelectorAll('#btns .ab')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.id).join(',') }; }).catch(e => 'ERR ' + e.message.slice(0, 80));
  const tp = (x, z, rot) => p.evaluate(([x, z, rot]) => { const P = __G.player; P.x = x; P.z = z; if (rot !== undefined) P.rot = rot; }, [x, z, rot]);
  const key = async (k, ms = 60) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); };
  // logic runs with rendering stubbed (fast); real frames only for screenshots
  if (process.env.TUS) { const t1 = Date.now(); while (Date.now() - t1 < 200000) { const ok = await p.evaluate(() => !!(window.__MS && document.getElementById('tplay') && document.getElementById('tplay').style.display === 'block')).catch(() => false); if (ok) break; await p.waitForTimeout(700); }
    console.log('[tus]', await p.evaluate(async () => { const v = (await (await fetch('./js/story.js')).text()).match(/engine\.js\?v=(\d+)/)[1]; const A = await import('/js/archery.js?v=' + v); window.__TUT_FAKEARCH = true; document.getElementById('title').style.display = 'none'; document.getElementById('title').classList.remove('on'); __MS.run('0-0'); return Object.keys(A.LEVELS).join(','); })); }
  const t00 = Date.now(); while (Date.now() - t00 < 200000) { const ok = await p.evaluate(() => !!(window.__G && __G.player && __G.mis)).catch(() => false); if (ok) break; await p.waitForTimeout(700); }
  await p.evaluate(async () => { const v = (await (await fetch('./js/story.js')).text()).match(/engine\.js\?v=(\d+)/)[1]; const E = await import('/js/engine.js?v=' + v); const r = E.renderer, o = r.render.bind(r); window.__nr = true; r.render = function (...a) { if (!window.__nr) return o(...a); }; __G.steps = +(window.__STEPS || 3); });
  const realShot = shot; shot = async (nm) => { await p.evaluate(() => { window.__nr = false; __G.steps = 1; }); await p.waitForTimeout(2200); await realShot(nm).catch(e => console.log('shotfail', String(e).slice(0, 80))); await p.evaluate(() => { window.__nr = true; __G.steps = 3; }); };
  const t0 = Date.now(); let seen = {}, last = '', n = 0;
  while ((Date.now() - t0) / 1000 < TMAX) {
    const s = await st(); if (!s || typeof s === 'string') { await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); }).catch(() => { }); await p.waitForTimeout(800); continue; }
    const line = JSON.stringify({ t: s.t, id: s.id, k: s.k, z: s.z, x: s.x, hp: s.hp, ays: s.ays, obj: s.obj, card: s.card, b: s.b });
    if (n++ % 4 === 0 || s.id !== last) console.log('[st]', ((Date.now() - t0) / 1000) | 0, line);
    if (s.mis && s.mis !== '0-0') { console.log('[left]', s.mis); break; }
    if (s.end) { console.log('[end]', s.log); await p.waitForTimeout(1500); await shot(N + '_end'); break; }
    if (s.lore) { await p.evaluate(() => document.querySelector('#lore.on button').click()); continue; }
    if (s.dlg && SHOTS && process.env.HOOKONLY && s.rider && !seen.msd && /Shabarman|Chopar|Messenger|Гонец/.test(s.dname)) { seen.msd = 1; await shot(N + '_hook_dlg'); }
    if (!s.dlg && SHOTS && process.env.HOOKONLY && s.rider && !s.arr && !seen.gal) { seen.gal = 1; await shot(N + '_hook_ride'); continue; }
    if (s.dlg) { if (!seen['dlg' + s.t]) { seen['dlg' + s.t] = 1; if (SHOTS && !seen.dlgshot && !process.env.NODLG) { seen.dlgshot = 1; await shot(N + '_dlg'); } } await p.waitForTimeout(500); await p.mouse.click(420, 200); continue; }
    const SET_ = (process.env.SHOTSET || '').split(',').filter(Boolean), FT = process.env.FASTTO;
    if (FT && s.id && !seen.ft) { if (s.id === FT) seen.ft = 1; else { await p.evaluate(() => __TUT.next()); await p.waitForTimeout(400); last = s.id; continue; } }
    if (s.id && s.id !== last && SHOTS && (!SET_.length || SET_.includes(s.id))) { await p.waitForTimeout(1600); await shot(N + '_' + s.k + '_' + s.id); }
    last = s.id;
    switch (s.id) {
      case 'move': await key('KeyW', 900); break;
      case 'light': await tp(-2.3, -10.4, Math.PI); for (let i = 0; i < 4; i++) { await key('KeyJ', 40); await p.waitForTimeout(220); } break;
      case 'heavy': await tp(0, -15.3, Math.PI); await key('KeyJ', 900); await p.waitForTimeout(600); break;
      case 'block': if (s.ays && s.ays.s === 'windup' && s.ays.tm < .7) { await p.keyboard.down('KeyQ'); await p.waitForTimeout(900); await p.keyboard.up('KeyQ'); } else await p.waitForTimeout(80); break;
      case 'parry': if (s.ays && s.ays.s === 'windup' && s.ays.tm < .3) { await key('KeyQ', 250); await p.waitForTimeout(500); } else await p.waitForTimeout(40); break;
      case 'jump': await tp(-3.4, -19.6, Math.PI); await key('KeyF', 40); await p.waitForTimeout(120); await key('KeyJ', 40); await p.waitForTimeout(900); break;
      case 'lock': await key('Tab', 40); await p.waitForTimeout(700); break;
      case 'roll': if (s.ays && s.ays.s === 'windup' && s.ays.tm < .45) { await key('KeyR'); await p.waitForTimeout(500); } else await p.waitForTimeout(60); break;
      case 'dodge': case 'amu': {
        if (s.id === 'amu' && !seen.amu) { seen.amu = 1; await key('Digit8'); }
        if (s.id === 'amu') { const a = await p.evaluate(() => __G.player.shield > 0); if (!a) await key('Digit8'); await p.waitForTimeout(300); break; }
        if (s.ays && s.ays.s === 'windup' && s.ays.tm < .45) { await key('KeyK'); await p.waitForTimeout(400); } else await p.waitForTimeout(80); break; }
      case 'range': await tp(0, -33.4, Math.PI); break;
      case 'rain': await key('Digit2'); await p.waitForTimeout(1500); break;
      case 'ride': if (s.rings && s.rings.length) { const [x, z] = s.rings[0]; await tp(x, z + 2.5, Math.PI); await p.waitForTimeout(400); await tp(x, z, Math.PI); if (SHOTS && !seen.ride2 && !process.env.HOOKONLY) { seen.ride2 = 1; await p.waitForTimeout(500); await shot(N + '_ride2'); } } break;
      default:
        if (s.boss) { if (SHOTS && !seen.duel) { seen.duel = 1; if (!process.env.HOOKONLY) { await p.waitForTimeout(2500); await shot(N + '_duel'); } } await p.evaluate(() => { const e = __G.ents.find(e => e.type === 'sarbinaz' && e.team === 'enemy' && !e.dead); if (e) e.damage(250, __G.player); }); await p.waitForTimeout(400); }
        else if (s.k > 3 && !s.id && SHOTS && !process.env.HOOKONLY && seen.duel && (seen.hk || 0) < 3 && !seen['hook' + Math.floor(s.t / 3)]) { seen.hk = (seen.hk || 0) + 1; seen['hook' + Math.floor(s.t / 4)] = 1; await shot(N + '_x' + Math.floor(s.t)); }
        await p.waitForTimeout(300);
    }
  }
  console.log('[final]', JSON.stringify(await st()).slice(0, 600));
};
