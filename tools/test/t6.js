module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await L.ready(); await p.evaluate(() => { __G.steps = 6; }); await L.dlg(20000);
  await shot('a0'); await L.tp(-12); await p.waitForTimeout(1500); await L.tp(-23); await p.waitForTimeout(3500);
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(600); await shot('a1'); await L.info('w1');
  await p.keyboard.press('Digit1'); await p.waitForTimeout(900); await shot('a2'); await L.info('w1b');
};
