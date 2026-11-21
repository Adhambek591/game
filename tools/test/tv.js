module.exports = async (p, shot) => {
  await p.waitForFunction(() => document.getElementById('tplay').style.display === 'block', null, { timeout: 70000 });
  await p.waitForTimeout(1500); await shot('env0'); await p.evaluate(() => document.getElementById('tplay').click());
  await p.waitForFunction(() => window.__G && __G.player, null, { timeout: 40000 });
  await p.waitForTimeout(3000);
  for (let i = 0; i < 6; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(400); }
  await p.waitForTimeout(2500); await shot('env1');
  console.log(await p.evaluate(() => JSON.stringify({ env: !!(window.__G && document), fps: __G.fps | 0 })));
};
