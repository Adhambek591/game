module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(1500); await shot('c0'); await L.info('start');
  await p.evaluate(() => { __G.noDeath = true; __G.steps = 3; });
  await L.tp(-29, 6); await L.dlg(8000); await L.info('afterDlg');
  await L.tp(-56); await L.clear(4); await L.info('w'); await L.clear(4); await L.info('w2');
  await L.tp(-112); await p.waitForTimeout(1500); await L.dlg(8000); await p.waitForTimeout(1500); await shot('c1'); await L.info('boss');
};
