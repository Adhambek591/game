module.exports = async (p, shot) => {
  const T0 = Date.now(), lg = s => console.log(((Date.now() - T0) / 1000).toFixed(0) + 's', s);
  await p.waitForFunction(() => window.__META, null, { timeout: 90000 });
  await p.evaluate(() => {
    const st = {}; for (const id of ['0-1','0-2','1-1','1-2','1-3','1-4','2-1','2-2','2-3','2-4','3-1','3-2']) st[id] = 3; st['3-3'] = 2;
    localStorage.setItem('qq_stars', JSON.stringify(st)); localStorage.setItem('qq_ch', '3'); localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_save', JSON.stringify({ gold: 1450, up: { sword: 2, life: 1, maid: 0, squad: 0, horse: 0 } })); localStorage.removeItem('qq_meta');
  });
  await p.reload(); await p.waitForFunction(() => window.__META, null, { timeout: 90000 });
  await p.waitForFunction(() => document.getElementById('tplay') && document.getElementById('tplay').style.display === 'block', null, { timeout: 200000 }).catch(() => lg('title not ready'));
  await p.waitForTimeout(1500);
  lg('migrated ' + await p.evaluate(() => JSON.stringify({ v: __META.state.v, lv: __META.level(), items: __META.derived.items, maids: Object.keys(__META.derived.maids), stars: __META.derived.stars, nat: __META.isNative('dmg'), pd: __META.pdMul() })));
  await shot('m5_title');
  await p.click('#tcamp'); await p.waitForTimeout(500);
  lg('camp ' + await p.evaluate(() => getComputedStyle(document.getElementById('mt-camp')).display));
  await shot('m5_hero');
  for (const tb of ['skills', 'equip', 'maids', 'quests', 'book']) { await p.click(`.mt-tab[data-v="${tb}"]`); await p.waitForTimeout(300); await shot('m5_' + tb); }
  // buy a skill tier, equip, toggle maid, claim
  await p.click('.mt-tab[data-v="skills"]'); await p.waitForTimeout(200);
  const g0 = await p.evaluate(() => JSON.parse(localStorage.qq_save).gold);
  await p.click('.mt-sk .mt-btn'); await p.waitForTimeout(300);
  lg('buy tier ' + await p.evaluate(() => JSON.stringify({ sk: __META.state.sk, spin: [__META.mul('spin.dmg'), __META.mul('spin.r')], gold: JSON.parse(localStorage.qq_save).gold }))) + ' g0=' + g0;
  await shot('m5_skills2');
  await p.evaluate(() => { localStorage.setItem('qq_lang', 'ru'); }); 
  for (const l of ['ru', 'en', 'uz']) { await p.evaluate((l) => { const b = document.querySelector('#langs [data-l="' + l + '"]'); b && b.click(); }, l); await p.waitForTimeout(200); await p.evaluate(() => __META.closeCamp()); await p.waitForTimeout(200); await p.evaluate(() => __META.openCamp('quests')); await p.waitForTimeout(500); await shot('m5_q_' + l); }
  lg('saved ' + await p.evaluate(() => localStorage.qq_meta.slice(0, 300)));
};
