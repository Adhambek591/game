module.exports = async (p, shot) => {
  const info = async (l) => console.log(l, await p.evaluate(() => JSON.stringify({ fps: __G.fps | 0, ents: __G.ents.length, en: __G.ents.filter(e => e.team === 'enemy' && !e.dead).length, p: [__G.player.x | 0, __G.player.z | 0], hp: __G.player.hp | 0, paused: __G.paused, obj: document.getElementById('obj').textContent })));
  const dlg = async () => { for (let i = 0; i < 8; i++) { if (await p.evaluate(() => document.getElementById('dlg').classList.contains('on'))) { await p.mouse.click(640, 400); await p.waitForTimeout(450); } else break; } };
  await p.waitForFunction(() => window.__G && __G.player, null, { timeout: 60000 });
  await p.waitForTimeout(3500); await dlg();
  await p.evaluate(() => { __G.player.z = -12; }); await p.waitForTimeout(1500);
  await p.evaluate(() => { __G.player.z = -22; }); await p.waitForTimeout(2200);
  for (let i = 0; i < 6; i++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(200); }
  await shot('f1'); await info('wave1');
  await p.keyboard.press('Digit1'); await p.waitForTimeout(500); await shot('f2');
  await p.evaluate(() => __T.kill()); await p.waitForTimeout(1500); await info('after kill');
  await p.evaluate(() => __T.kill()); await p.waitForTimeout(1200);
  await p.evaluate(() => { __G.player.z = -56; }); await p.waitForTimeout(3500); await shot('f3'); await info('camel');
};
