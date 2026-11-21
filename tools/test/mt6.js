module.exports = async (p, shot) => {
  const T0 = Date.now(), lg = s => console.log(((Date.now() - T0) / 1000).toFixed(0) + 's', s);
  await p.waitForFunction(() => window.__META, null, { timeout: 90000 });
  if (!(await p.evaluate(() => localStorage.getItem('mt6_seeded')))) {
    await p.evaluate(() => {
      const st = {}; for (const id of ['0-1','0-2','1-1','1-2','1-3','1-4','2-1']) st[id] = 3; st['2-2'] = 1;
      localStorage.setItem('qq_stars', JSON.stringify(st)); localStorage.setItem('qq_ch', '2'); localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_save', JSON.stringify({ gold: 3000, up: { sword: 1, life: 1, maid: 0, squad: 0, horse: 0 } }));
      localStorage.setItem('qq_meta', JSON.stringify({ v: 1, xp: 0, sk: { blade: 2, bow: 3 }, eq: { amulet: 'amu1', bow: 'bow1' }, team: ['sarbinaz', 'aysuliw', 'gulzar'] })); localStorage.setItem('mt6_seeded', '1');
    });
    await p.reload(); await p.waitForFunction(() => window.__META, null, { timeout: 90000 });
  }
  await p.waitForFunction(() => window.__G && __G.mis && __G.player && __G.player._mt && document.getElementById('hud').classList.contains('on'), null, { timeout: 300000 });
  lg('in mission ' + await p.evaluate(() => JSON.stringify({ mis: __G.mis.id, nat: __META.isNative('dmg'), boost: __G.dmgBoost, hp: __G.player.maxHp, sk1: __G.sk[1].max, sk2: __G.sk[2].max })));
  // native damage check: pdMul for acts
  lg('pdMul ' + await p.evaluate(() => { const pl = __G.player, a0 = pl.act, o = {}; for (const k of ['spin', 'cast', 'dash', 'atk']) { pl.act = { kind: k, t: 0, dur: 1 }; o[k] = +__META.pdMul().toFixed(3); } pl.act = a0; o.rain = +__META.pdMul('rain').toFixed(3); o.mulspin = __META.mul('spin.dmg'); o.mulrain = __META.mul('rain.dmg'); o.hero = __META.mul('hero.dmg'); return JSON.stringify(o); }));
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => { __G.player.hp = __G.player.maxHp * .5; __META.addXp(400); }); await p.waitForTimeout(250); await shot('m6_lvup');
  lg('lvup ' + await p.evaluate(() => JSON.stringify({ lv: __META.level(), hp: (__G.player.hp|0) + '/' + __G.player.maxHp, cls: document.getElementById('mt-lvup').className })));
  await p.waitForTimeout(2500); await shot('m6_hud');
  await p.setViewportSize({ width: 320, height: 150 });
  const iv = setInterval(() => p.evaluate(() => { if (__G.onEnter && !document.getElementById('end').classList.contains('on')) __G.onEnter(); __G.steps = 2; if (__G.player) __G.player.hp = __G.player.maxHp; }).catch(() => { }), 1500);
  await p.evaluate(() => { __MS.auto && __MS.auto(true, 8); __MS.win(); });
  try { await p.waitForFunction(() => document.getElementById('end').classList.contains('on'), null, { timeout: 400000 }); await p.waitForTimeout(2500);
    lg('end ' + await p.evaluate(() => JSON.stringify({ row: document.getElementById('mt-end') && document.getElementById('mt-end').textContent, st: __META.state.st, lv: __META.level() })));
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(800); await shot('m6_end'); } catch (e) { lg('no end screen'); }
  clearInterval(iv);
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => { window.__M && window.__M.openMap('end'); }); await p.waitForTimeout(2500); await shot('m6_map');
  lg('map ' + await p.evaluate(() => JSON.stringify({ btn: !!document.querySelector('.mt-mapbtn'), bar: !!document.getElementById('mt-chestbar'), go: document.querySelectorAll('.mt-cb.go').length, stars: __META.derived.stars })));
  if (await p.$('.mt-cb.go')) { await p.click('.mt-cb.go'); await p.waitForTimeout(700); await shot('m6_map2'); lg('chest ' + await p.evaluate(() => JSON.stringify({ chest: __META.state.chest, items: __META.derived.items, gold: JSON.parse(localStorage.qq_save).gold }))); }
  if (await p.$('.mt-mapbtn')) { await p.click('.mt-mapbtn'); await p.waitForTimeout(600); lg('camp from map ' + await p.evaluate(() => document.getElementById('mt-camp').className)); await shot('m6_campmap'); }
};
