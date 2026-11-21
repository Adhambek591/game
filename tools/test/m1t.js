module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(2500);
  for (let i = 0; i < 8; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(300); }
  await p.evaluate(() => { __G.steps = 2; }); await p.keyboard.down('KeyW'); await p.waitForTimeout(2500); await p.keyboard.up('KeyW'); await p.evaluate(() => { __G.steps = 1; });
  await p.keyboard.down('KeyW'); await p.waitForTimeout(500); await shot('m1a'); await p.keyboard.up('KeyW');
  await p.waitForTimeout(1200); await shot('m1b');
  console.log(await p.evaluate(() => 'fps ' + (__G.fps | 0) + ' ' + __G.ents.map(e => e.type + ':' + e.vs.toFixed(2)).join(' ')));
};
