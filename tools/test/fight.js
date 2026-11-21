module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(1500); for (let i = 0; i < 6; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(200); }
  await p.evaluate(() => { __G.steps = 4; }); await L.tp(-24, 2); await p.waitForTimeout(800); await L.dlg(6000); await p.evaluate(() => { __G.steps = 3; }); await L.tp(-40); await p.waitForTimeout(2500); await p.evaluate(() => { __G.steps = 1; });
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(250); await shot('f1'); await p.keyboard.press('KeyJ'); await p.waitForTimeout(500); await shot('f2');
  await L.info('i');
};
