module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await L.ready(); await p.evaluate(() => { __G.steps = 6; }); await p.waitForTimeout(1200);
  await L.tp(-40); await p.waitForTimeout(3500); await p.keyboard.press('KeyJ'); await p.waitForTimeout(500); await shot('c1');
};
