module.exports = async (p, shot) => {
  const T0 = Date.now(), lg = s => console.log(((Date.now() - T0) / 1000).toFixed(0) + 's', s);
  await p.waitForFunction(() => window.__META, null, { timeout: 60000 });
  if (!(await p.evaluate(() => localStorage.getItem('mt_seeded')))) {
    await p.evaluate(() => {
      const st = {}; for (const id of ['0-1','0-2','1-1','1-2','1-3','1-4','2-1','2-2','2-3','2-4']) st[id] = 3;
      localStorage.setItem('qq_stars', JSON.stringify(st)); localStorage.setItem('qq_ch', '3'); localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_save', JSON.stringify({ gold: 5000, up: { sword: 1, life: 1, maid: 0, squad: 0, horse: 0 } }));
      localStorage.setItem('qq_meta', JSON.stringify({ v: 1, xp: 0, sk: { blade: 3, bow: 3, dash: 3, leap: 3, call: 3 }, eq: { amulet: 'amu1', bow: 'bow1' }, team: ['sarbinaz', 'aysuliw', 'gulzar'] })); localStorage.setItem('mt_seeded', '1');
    });
    await p.reload(); await p.waitForFunction(() => window.__META, null, { timeout: 60000 });
  }
  await p.waitForFunction(() => window.__G && __G.mis && __G.player && __G.player._mt && !__G.paused && document.getElementById('hud').classList.contains('on'), null, { timeout: 200000 });
  lg('in mission ' + await p.evaluate(() => JSON.stringify({ mis: __G.mis.id, hp: __G.player.maxHp, boost: __G.dmgBoost, powers: __G.powers })));
  const iv = setInterval(() => p.evaluate(() => { if (__G.onEnter && !document.getElementById('end').classList.contains('on')) __G.onEnter(); __G.steps = 2; __G.player.hp = __G.player.maxHp; }).catch(() => { }), 1200);
  const gt = async (d) => { const t0 = await p.evaluate(() => __G.time); await p.waitForFunction((x) => __G.time >= x, t0 + d, { timeout: 300000, polling: 200 }); };
  const S = () => p.evaluate(() => JSON.stringify({ t: +__G.time.toFixed(2), act: __G.player.act && __G.player.act.kind, boost: +__G.dmgBoost.toFixed(3), en: __G.ents.filter(e => e.team === 'enemy' && !e.dead).map(e => (e.hp | 0) + '/' + (e.maxHp | 0)).slice(0, 8), rains: __G.rains.length, st: __META.state.st, xp: __META.state.xp, chGold: __G.chGold, ulti: __G.ulti | 0 }));
  await gt(.4); lg('runs ' + await S());
  // dummies around the hero so hits are measurable
  await p.evaluate(async () => { const v = document.querySelector('script[src*="story.js"]').src.split('?v=')[1]; const E = await import('/js/engine.js?v=' + v); window.__E = E; const pl = __G.player; window.__D = []; for (const [dx, dz] of [[2, 0], [-2.5, 1], [4.6, 0], [0, -4.8], [0, 2.2], [6.5, 0]]) { const e = E.spawn('askar', pl.x + dx, pl.z + dz); e.maxHp = e.hp = 100000; e.spawnT = 0; e.custom = () => { }; window.__D.push(e); }
    window.__hp = () => window.__D.map(e => 100000 - (e.hp | 0)); });
  await gt(.3); lg('dummies ' + await p.evaluate(() => JSON.stringify(__hp())));
  for (const k of ['1', '2', '5']) { const h0 = await p.evaluate(() => __hp()); await p.keyboard.press(k); await gt(.25); lg('key ' + k + ' ' + await S()); await gt(k === '2' ? 3.4 : 1.4); const h1 = await p.evaluate(() => __hp()); lg('  dmg by dummy [near, near, 4.6m, 4.8m, 2.2m, 6.5m] ' + JSON.stringify(h1.map((v, i) => v - h0[i])) + ' ' + await S()); }
  await p.evaluate(() => { for (const e of __D) e.damage(1e7, __G.player, {}); for (const e of __G.ents) if (e.team === 'enemy' && !e.dead) e.damage(1e7, __G.player, {}); });
  await gt(.3); lg('after kills ' + await S());
  await p.evaluate(() => __META.addXp(700)); await gt(.15); lg('lvup ' + await p.evaluate(() => JSON.stringify({ lv: __META.level(), hp: __G.player.maxHp, on: document.getElementById('mt-lvup').className, txt: document.getElementById('mt-lvup').textContent })));
  await p.setViewportSize({ width: 844, height: 390 }); await p.evaluate(() => __META.addXp(900)); await p.waitForTimeout(300); await shot('mt_lvup');
  await p.setViewportSize({ width: 300, height: 140 });
  await p.evaluate(() => { __MS.auto(true, 8); __MS.win(); });
  try { await p.waitForFunction(() => document.getElementById('end').classList.contains('on'), null, { timeout: 240000 }); await p.waitForTimeout(1500); lg('end ' + await p.evaluate(() => JSON.stringify({ row: document.getElementById('mt-end') && document.getElementById('mt-end').textContent, st: __META.state.st, q: __META.state.q.dc, lv: __META.level() })));
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(800); await shot('mt_end'); } catch (e) { lg('no end screen: ' + await S()); }
  clearInterval(iv);
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => { window.__M.openMap('end'); }); await p.waitForTimeout(1200); await shot('mt_map');
  lg('map ' + await p.evaluate(() => JSON.stringify({ btn: !!document.querySelector('.mt-mapbtn'), bar: !!document.getElementById('mt-chestbar') })));
  await p.click('.mt-cb.go'); await p.waitForTimeout(500); await shot('mt_map2'); lg('chest ' + await p.evaluate(() => JSON.stringify({ chest: __META.state.chest, items: __META.derived.items, gold: JSON.parse(localStorage.qq_save).gold })));
};
