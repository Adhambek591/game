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
  lg('seeded');
  await p.waitForFunction(() => window.__G && __G.mis && __G.player && __G.player._mt && !__G.paused && document.getElementById('hud').classList.contains('on'), null, { timeout: 200000 });
  lg('in mission ' + await p.evaluate(() => JSON.stringify({ mis: __G.mis.id, hp: __G.player.maxHp, boost: __G.dmgBoost, sk: Object.fromEntries(Object.entries(__G.sk).map(([k, s]) => [k, s.max])), powers: __G.powers, lv: __META.level(), b: __META.bonus, mulspin: [__META.mul('spin.dmg'), __META.mul('spin.r'), __META.add('spin.hits'), __META.mul('rain.cd'), __META.mul('nope.x')] })));
  const gt = async (d) => { const t0 = await p.evaluate(() => __G.time); await p.waitForFunction((x) => __G.time >= x, t0 + d, { timeout: 400000, polling: 250 }); };
  const iv = setInterval(() => p.evaluate(() => { if (__G.onEnter && !document.getElementById('end').classList.contains('on')) __G.onEnter(); __G.steps = 3; }).catch(() => { }), 1500);
  await gt(.6); lg('time runs, fps ' + await p.evaluate(() => __G.fps.toFixed(1)));
  // use skills; log damage boost while acting
  const G = () => p.evaluate(() => JSON.stringify({ t: +__G.time.toFixed(2), act: __G.player.act && __G.player.act.kind, boost: +__G.dmgBoost.toFixed(3), ents: __G.ents.filter(e => e.team === 'enemy' && !e.dead).length, rains: __G.rains.length, kills: __META.state.st.kills, skills: __META.state.st.skills, xp: __META.state.xp, gold: __G.chGold }));
  for (const k of ['1', '2', '5', '1']) { await p.keyboard.press(k); await gt(.3); lg('key ' + k + ' ' + await G()); await gt(1.6); lg('  after ' + await G()); }
  // kill everything nearby the honest way (damage from player) to check XP flow
  await p.evaluate(() => { for (const e of __G.ents) if (e.team === 'enemy' && !e.dead) e.damage(99999, __G.player, {}); });
  await gt(.5); lg('after kills ' + await G());
  await p.keyboard.press('1'); await gt(.3); await p.evaluate(() => __META.addXp(700)); await gt(.25); await shot('mt_lvup'); lg('lvup ' + await p.evaluate(() => JSON.stringify(__META.level())));
  await p.evaluate(() => { __MS.auto(true, 8); __MS.win(); for (const e of __G.ents) if (e.team === 'enemy' && !e.dead) e.damage(99999, __G.player, {}); });
  try { await p.waitForFunction(() => document.getElementById('end').classList.contains('on'), null, { timeout: 150000 }); await p.waitForTimeout(2500); await shot('mt_end'); lg('end ' + await p.evaluate(() => JSON.stringify({ row: document.getElementById('mt-end') && document.getElementById('mt-end').textContent, st: __META.state.st, q: __META.state.q.dc }))); } catch (e) { lg('no end screen: ' + await G()); await shot('mt_noend'); }
  clearInterval(iv);
  await p.evaluate(() => { window.__M.openMap('end'); }); await p.waitForTimeout(1500); await shot('mt_map');
  lg('map ' + await p.evaluate(() => JSON.stringify({ btn: !!document.querySelector('.mt-mapbtn'), bar: !!document.getElementById('mt-chestbar') })));
  await p.click('.mt-cb.go'); await p.waitForTimeout(600); await shot('mt_map2'); lg('chest ' + await p.evaluate(() => JSON.stringify({ chest: __META.state.chest, items: __META.derived.items })));
};
