module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.evaluate(() => { __G.noDeath = true; __G.steps = 3; }); await L.tp(-128); await p.waitForTimeout(2500); await L.dlg(6000);
  await p.evaluate(() => { __G.boss.damage(1e6, __G.player); }); await p.waitForTimeout(6000); await L.info('afterBoss');
  for (let i = 0; i < 12; i++) { const c = await p.evaluate(() => document.getElementById('cut').classList.contains('on')); if (c) await p.evaluate(() => document.getElementById('cskip').click()); await p.waitForTimeout(800); }
  await L.dlg(4000); await L.info('pw');
  await L.tp(-158); await p.evaluate(() => { __G.steps = 1; }); await p.waitForTimeout(600); await p.keyboard.press('Digit5'); await p.waitForFunction(() => !__G.player.leaping && !__G.player.act, null, { timeout: 20000 }); await p.evaluate(() => { __G.steps = 3; }); await L.info('leap');
  await L.info('leap2'); console.log(await p.evaluate(() => JSON.stringify({ B: __G.colB.filter(b => b.z2 > -200 && b.z1 < -150).map(b => [b.x1|0, b.x2|0, b.z1|0, b.z2|0, !!b.ravine, !!b.off]), C: __G.colC.filter(c => c.z < -150 && Math.abs(c.x) < 14).map(c => [c.x|0, c.z|0, c.r]) }))); await L.tp(-177); await p.waitForTimeout(3000); await L.info('t177'); console.log(await p.evaluate(() => JSON.stringify({ lz: __G.limitZ, leaping: __G.player.leaping, act: __G.player.act && __G.player.act.kind, fade: document.getElementById('fade').className, cut: document.getElementById('cut').className, lore: document.getElementById('lore').className })));
  for (let i = 0; i < 12; i++) { const c = await p.evaluate(() => document.getElementById('cut').classList.contains('on')); if (c) await p.evaluate(() => document.getElementById('cskip').click()); await p.waitForTimeout(800); }
  console.log('end', await p.evaluate(() => document.getElementById('end').classList.contains('on') + ' ' + document.getElementById('ereplay').textContent + ' ch ' + localStorage.getItem('qq_ch')));
};
