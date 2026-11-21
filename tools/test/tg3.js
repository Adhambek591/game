module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  for (let i = 0; i < 10; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(350); }
  await p.evaluate(() => { __G.steps = 3; }); await p.keyboard.down('KeyW'); await p.waitForTimeout(6000); await p.keyboard.up('KeyW'); await p.evaluate(() => { __G.steps = 1; });
  await p.waitForTimeout(1500); console.log(await p.evaluate(() => 'fps ' + (__G.fps | 0) + ' z ' + (__G.player.z | 0) + ' ents ' + __G.ents.filter(e => !e.dead).map(e => e.type[0] + (e.bg ? '*' : '')).join(' '))); await shot('sk1');
};
