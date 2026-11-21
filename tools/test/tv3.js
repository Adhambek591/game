module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  for (let i = 0; i < 8; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(350); }
  await p.waitForTimeout(2000); console.log(await p.evaluate(()=>'fps '+(__G.fps|0))); await shot('day1');
  await p.evaluate(() => { __G.player.z -= 30; }); await p.waitForTimeout(3000); await shot('day2');
};
