// logic run with rendering stubbed (fast): plays ?start=mission with the test bot, logs a game-time timeline; optional screenshots at game times (SHOTS="12,40,..")
module.exports = async (p, shot) => {
  const TMAX = +(process.env.TMAX || 600), N = process.env.NAME || 'r', SOFT = process.env.SOFT !== '0', STEPS = +(process.env.STEPS || 12), SH = (process.env.SHOTS || '').split(',').filter(Boolean).map(Number);
  const t0s = Date.now(); while (Date.now() - t0s < 280000) { const ok = await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); const c = document.getElementById('cut'); if (c && c.classList.contains('on')) { const k = document.getElementById('cskip'); if (k) k.click(); } return !!(window.__G && window.__MS && __G.mis && __G.player); }).catch(() => false); if (ok) break; await p.waitForTimeout(700); }
  await p.evaluate(async ([soft, steps]) => {
    const v = (await (await fetch('./js/story.js')).text()).match(/engine\.js\?v=(\d+)/)[1]; const E = await import('/js/engine.js?v=' + v); window.__E = E;
    const r = E.renderer, o = r.render.bind(r); window.__nr = true; r.render = function (...a) { if (!window.__nr) return o(...a); };
    window.__TL = []; let lo = '', lh = '', la = -1, lastAct = 0, maxGap = 0, gapAt = 0;
    const G = __G; setInterval(() => { try { const t = +G.time.toFixed(1), ob = document.getElementById('obj').textContent, hi = document.getElementById('hint').classList.contains('show') ? document.getElementById('hint').textContent : '';
      const aw = G.ents.filter(e => e.team === 'enemy' && !e.dead && !e.bg && !e.asleep && !(e.grp && !e.grp.awake)).length; const P = G.player;
      if (ob !== lo) { lo = ob; __TL.push(t + ' OBJ ' + ob); } if (hi && hi !== lh) { lh = hi; __TL.push(t + ' HINT ' + hi); }
      if (!G.paused && !G.flying) { if (aw > 0 || document.getElementById('dlg').classList.contains('on')) { if (t - lastAct > maxGap) { maxGap = t - lastAct; gapAt = lastAct; } lastAct = t; } }
      if ((aw > 0) !== (la > 0)) { __TL.push(t + (aw > 0 ? ' FIGHT ' + aw : ' calm') + ' z=' + (P ? P.z | 0 : '')); } la = aw; window.__GAP = [+maxGap.toFixed(1), gapAt]; } catch (e) { } }, 150);
    __MS.auto(true, 1, steps, 2, soft);
  }, [SOFT, STEPS]);
  const t0 = Date.now(); let si = 0;
  while ((Date.now() - t0) / 1000 < TMAX) {
    await p.waitForTimeout(6000);
    const s = await Promise.race([p.evaluate(() => JSON.stringify({ t: +__G.time.toFixed(0), end: document.getElementById('end').classList.contains('on'), fly: !!__G.flying, paused: __G.paused, pz: __G.player ? __G.player.z | 0 : null, hp: __G.player ? __G.player.hp | 0 : 0, en: __G.ents.filter(e => e.team === 'enemy' && !e.dead).length, cv: __G.mis && __G.mis.cv ? [__G.mis.cv.z | 0, __G.mis.cv.pool | 0] : null, obj: document.getElementById('obj').textContent.slice(0, 50), gap: window.__GAP, cut: document.getElementById('cut').classList.contains('on') })), new Promise(r => setTimeout(() => r('EVAL-TIMEOUT'), 5000))]).catch(e => 'ERR ' + e.message.slice(0, 80));
    console.log('[st]', ((Date.now() - t0) / 1000) | 0, s);
    const m = /"t":(\d+)/.exec(s); if (m && si < SH.length && +m[1] >= SH[si] && !/"fly":true/.test(s)) { await p.evaluate(() => { window.__nr = false; __G.steps = 1; __G.ts = 1; __MS.auto(false); }); await p.waitForTimeout(2500); await shot(N + '_' + SH[si]).catch(e => console.log('shotfail', String(e).slice(0, 80))); si++; await p.evaluate(([so, st]) => { window.__nr = true; __MS.auto(true, 1, st, 2, so); }, [SOFT, STEPS]); }
    if (/"end":true/.test(s)) { await p.evaluate(() => { window.__nr = false; }); await p.waitForTimeout(3000); await shot(N + '_end').catch(() => { }); console.log('[end]', await p.evaluate(() => document.getElementById('eh').textContent + ' | ' + document.getElementById('stl').textContent + ' | ' + localStorage.qq_stars)); break; }
  }
  console.log('[timeline]\n' + (await p.evaluate(() => __TL.join('\n') + '\nMAXGAP ' + JSON.stringify(window.__GAP))));
};
