module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 100000 });
  await p.waitForTimeout(2500);
  for (let i = 0; i < 8; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(350); }
  await p.waitForTimeout(1500); console.log(await p.evaluate(() => 'fps ' + (__G.fps | 0) + ' rig ' + __G.player.rig.constructor.name)); await shot('gl1');
  await p.keyboard.down('KeyW'); await p.waitForTimeout(2500); await shot('gl2'); await p.keyboard.up('KeyW');
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(400); await shot('gl3');
};
