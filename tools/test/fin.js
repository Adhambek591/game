module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 90000 });
  await p.evaluate(() => { __G.noDeath = true; __G.steps = 3; }); await L.tp(-24); await L.clear(4); await L.tp(-60); await L.clear(5); await L.info('waves');
  await L.tp(-126); await p.waitForTimeout(1500); await L.dlg(8000); await L.info('boss'); await p.evaluate(() => { __G.ts = 3; });
  for (let i = 0; i < 4; i++) { await p.evaluate(() => { const s = __G.boss; __G.player.x = s.x; __G.player.z = s.z + 6; __G.sk[7].cd = 0; }); await p.keyboard.press('Digit7'); await p.waitForTimeout(2500); }
  await L.info('helm'); await p.waitForTimeout(2500);
  for (const [x, z] of [[-8, -140], [8, -140], [-8, -162], [8, -162]]) for (let k = 0; k < 3; k++) { await p.evaluate(([x, z]) => { __G.player.x = x; __G.player.z = z + 1; __G.sk[6].cd = 0; __G.player.act = null; }, [x, z]); await p.keyboard.press('Digit6'); await p.waitForTimeout(2500); }
  await L.info('totems'); await p.evaluate(() => { __G.boss.hp = __G.boss.maxHp * .3; }); await p.waitForTimeout(1500); await L.dlg(6000);
  for (let i = 0; i < 40; i++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(120); }
  await p.waitForTimeout(3000); await L.info('end'); await shot('fin');
};
