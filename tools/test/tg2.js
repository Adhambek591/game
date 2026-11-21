module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  for (let i = 0; i < 8; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(350); }
  await p.waitForTimeout(2500); console.log(await p.evaluate(() => 'fps ' + (__G.fps | 0) + ' ents ' + __G.ents.map(e => e.rig.constructor.name[0]).join(''))); await shot('pr1');
  await p.keyboard.down('KeyW'); await p.waitForTimeout(5000); await shot('pr2'); await p.keyboard.up('KeyW');
  console.log(await p.evaluate(() => 'fps ' + (__G.fps | 0) + ' ents ' + __G.ents.map(e => e.rig.constructor.name[0]).join('')));
};
