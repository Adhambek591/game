// archery agent: fast logic run (rendering stubbed): a bot plays a sniper mission to the end screen
module.exports = async (p) => {
  const ID = process.env.MID || '3-S', MODE = process.env.MODE || 'clean';
  const t0 = Date.now(); while (Date.now() - t0 < 150000) { const ok = await p.evaluate(() => !!(window.__MS && window.__G && document.getElementById('tplay') && document.getElementById('tplay').style.display === 'block')).catch(() => false); if (ok) break; await p.waitForTimeout(1500); }
  await p.evaluate(async id => { const v = (await (await fetch('./js/missions.js')).text()).match(/engine\.js\?v=(\d+)/)[1]; const E = await import('/js/engine.js?v=' + v); const r = E.renderer, o = r.render.bind(r); r.render = function () { }; if (E.composer) E.composer.render = () => { };
    window.__ARCH_NOINTRO = true; localStorage.setItem('qq_arch_tut', '1'); document.getElementById('title').style.display = 'none'; window.__MS.run(id); }, ID);
  const t1 = Date.now(); while (Date.now() - t1 < 60000) { const ok = await p.evaluate(() => !!(window.__QQBOW && __QQBOW.S && document.getElementById('arch').classList.contains('on'))).catch(() => false); if (ok) break; await p.waitForTimeout(500); }
  console.log('[t] start', await p.evaluate(() => JSON.stringify({ n: __QQBOW.S.guards.length, arrows: __QQBOW.S.arrows, obj: document.querySelector('#arch .obj').innerText })));
  for (let k = 0; k < 400; k++) {
    const r = await p.evaluate(mode => { const A = __QQBOW, S = A.S; if (!S) return 'nostate'; if (S.over) return 'over'; const L = S.L.state;
      const fly = S.flying.some(a => !a.done); if (fly || S.reload > 0 || S.cine) { if (S.cine) document.querySelector('#arch .look').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); A.step(1 / 60, 20); S.reload = 0; return 'wait'; }
      const live = S.guards.filter(g => !g.dead && g.on && g.e.o.visible);
      let tg = null;
      if (S.L.id === '5-S') { tg = live.find(g => g.spot > .05) || (mode === 'clean' ? [L.pa, L.pb, L.g1, L.w2, L.w1, L.t1, L.t2].find(g => g && !g.dead) : null) || live.find(g => g.mode === 'rush');
        if (!tg) { if (document.querySelector('#arch .go').style.display !== 'none') { S.L.go(); return 'go'; } A.step(1 / 30, 30); return 'walk ' + S.maids.map(m => m.st[0]).join(''); } }
      else if (S.L.id === '6-S') { tg = live.find(g => g.mode === 'rush') || (L.kGo && !L.kp.dead ? L.kp : null) || live.filter(g => !g.bonus || mode === 'all').sort((a, b) => (a === L.e6 ? -1 : 0) - (b === L.e6 ? -1 : 0))[0];
        if (!tg && L.phase === 2) { const r = [L.r1, L.r2].find(r => !r.cut); if (r) { A.aimAtPt((r.a[0] + r.b[0]) / 2, (r.a[1] + r.b[1]) / 2, (r.a[2] + r.b[2]) / 2); const h = A.shoot(); return 'rope ' + h.kind + ' ' + (h.obj && h.obj.min ? JSON.stringify([h.obj.min.map(v => +v.toFixed(1)), h.obj.max.map(v => +v.toFixed(1)), !!h.obj.o, h.obj.o && (h.obj.o.type + ':' + (h.obj.o.name || ''))]) : '') + ' last=' + JSON.stringify(Array.from(h.pts.slice(-3)).map(v => +v.toFixed(1))) + ' tgt=' + JSON.stringify([r.a, r.b]); } A.step(1 / 30, 30); return 'charge'; } }
      else { tg = live.find(g => g.mode === 'rush') || (L.a && !L.a.dead ? L.a : null) || (L.b && !L.b.dead ? L.b : null) || live[0]; }
      if (!tg) { A.step(1 / 30, 30); return 'idle'; }
      A.aimAt(S.guards.indexOf(tg), { head: true }); const h = A.shoot(); if (tg.mate && !tg.mate.dead && h.kind === 'guard') { A.step(1 / 60, 3); S.reload = 0; }
      return 'shot ' + tg.type + ' ' + h.kind + (h.head ? ' HEAD' : '') + ' a=' + S.arrows + ' al=' + S.alarm; }, MODE);
    if (r !== 'wait' && !/^walk/.test(r)) console.log('[b]', k, r); if (r === 'over' || r === 'nostate') break; }
  await p.waitForTimeout(3000); for (let i = 0; i < 20; i++) { const e = await p.evaluate(() => document.getElementById('end').classList.contains('on')); if (e) break; await p.waitForTimeout(1500); }
  console.log('[end]', await p.evaluate(() => document.getElementById('end').classList.contains('on') + ' | ' + document.getElementById('eh').textContent + ' | ' + document.getElementById('stl').innerText.replace(/\n/g, ' / ') + ' | ' + localStorage.qq_stars + ' | ban:' + document.getElementById('ban').innerText.replace(/\n/g, ' ')));
};
