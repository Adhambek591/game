module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__META, null, { timeout: 60000 });
  await p.evaluate(() => {
    const st = {}; for (const id of ['0-1','0-2','1-1','1-2','1-3','1-4','2-1','2-2','2-3','2-4','3-1','3-2']) st[id] = 3; st['3-3'] = 2;
    localStorage.setItem('qq_stars', JSON.stringify(st)); localStorage.setItem('qq_ch', '3'); localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_save', JSON.stringify({ gold: 1450, up: { sword: 2, life: 1, maid: 0, squad: 0, horse: 0 } })); localStorage.removeItem('qq_meta');
  });
  await p.reload(); await p.waitForFunction(() => window.__META, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  console.log('state', await p.evaluate(() => JSON.stringify({ lv: __META.level(), d: __META.derived, b: __META.bonus, q: __META.state.q })));
  await shot('mt_title');
  await p.evaluate(() => { __META._bump('kills', 45); __META._bump('missions', 2); __META._bump('stars', 5); __META.openCamp('hero'); });
  await p.waitForTimeout(400); await shot('mt_hero');
  for (const tb of ['skills', 'equip', 'maids', 'quests', 'book']) { await p.click(`.mt-tab[data-v="${tb}"]`); await p.waitForTimeout(300); await shot('mt_' + tb); }
};
