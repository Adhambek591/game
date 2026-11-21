module.exports = async (p, shot) => {
  await p.waitForFunction(() => document.getElementById('tplay').style.display === 'block', null, { timeout: 60000 });
  await shot('title');
  await p.click('#tplay'); await p.waitForTimeout(2500);
  // dialog?
  for (let i = 0; i < 3; i++) { await p.mouse.click(640, 600); await p.waitForTimeout(500); }
  await p.waitForTimeout(1500); await shot('g1');
  console.log(await p.evaluate(() => JSON.stringify({ fps: __G.fps | 0, ents: __G.ents.length, p: [__G.player.x, __G.player.z], paused: __G.paused, obj: document.getElementById('obj').textContent })));
  await p.keyboard.down('KeyW'); await p.waitForTimeout(4000); await p.keyboard.up('KeyW'); await shot('g2');
  console.log(await p.evaluate(() => JSON.stringify({ fps: __G.fps | 0, ents: __G.ents.length, p: [__G.player.x | 0, __G.player.z | 0], obj: document.getElementById('obj').textContent })));
};
