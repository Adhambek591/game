module.exports = async (p, shot) => {
  const T0 = Date.now(), lg = s => console.log(((Date.now() - T0) / 1000).toFixed(0) + 's', s);
  await p.waitForFunction(() => window.__META, null, { timeout: 90000 });
  if (!(await p.evaluate(() => localStorage.getItem('mt7')))) { await p.evaluate(() => {
    const st = {}; for (const id of ['0-1','0-2','1-1','1-2','1-3','1-4','2-1']) st[id] = 3; st['2-2'] = 2;
    localStorage.setItem('qq_stars', JSON.stringify(st)); localStorage.setItem('qq_ch', '2'); localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_save', JSON.stringify({ gold: 500, up: { sword: 0, life: 0, maid: 0, squad: 0, horse: 0 } }));
    localStorage.setItem('qq_meta', JSON.stringify({ v: 1, xp: 900, sk: {}, eq: {}, team: ['sarbinaz'] })); localStorage.setItem('qq_lang', 'qq'); localStorage.setItem('mt7', '1'); });
    await p.reload(); await p.waitForFunction(() => window.__META, null, { timeout: 90000 }); }
  lg('v2 migration ' + await p.evaluate(() => JSON.stringify({ v: __META.state.v, eq: __META.state.eq, team: __META.state.team, auto: __META.state.auto })));
  await p.waitForFunction(() => document.getElementById('map') && getComputedStyle(document.getElementById('map')).display !== 'none' && document.getElementById('mt-chestbar'), null, { timeout: 300000 }).catch(() => lg('map not open'));
  await p.waitForTimeout(2500); await shot('m7_map');
  lg('bar ' + await p.evaluate(() => document.getElementById('mt-chestbar').textContent));
  await p.click('.mt-cb.go'); await p.waitForTimeout(800); await shot('m7_map2');
  lg('chest ' + await p.evaluate(() => JSON.stringify({ chest: __META.state.chest, eq: __META.state.eq, gold: JSON.parse(localStorage.qq_save).gold, bar: document.getElementById('mt-chestbar').textContent })));
  await p.click('.mt-mapbtn'); await p.waitForTimeout(600); lg('camp ' + await p.evaluate(() => document.getElementById('mt-camp').className));
  await p.click('.mt-tab[data-v="maids"]'); await p.waitForTimeout(400); await shot('m7_maids');
  await p.click('.mt-back'); await p.waitForTimeout(600); lg('back ' + await p.evaluate(() => JSON.stringify({ camp: document.getElementById('mt-camp').className, map: getComputedStyle(document.getElementById('map')).display })));
};
