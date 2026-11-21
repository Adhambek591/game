module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 90000 });
  await p.evaluate(() => { __G.noDeath = true; __G.steps = 3; __G.ts = 2; }); await L.tp(-30); await L.clear(4); await L.tp(-60); await L.clear(5);
  await L.tp(-150); await p.waitForTimeout(2500); await L.dlg(8000); await L.tp(-160); await p.waitForTimeout(3000); await shot('drg'); await L.info('d');
};
