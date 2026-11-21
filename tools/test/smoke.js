module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  try { await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 90000 }); } catch (e) { console.log('never started'); }
  await p.waitForTimeout(2500); await L.info('s'); await p.evaluate(() => { __G.noDeath = true; });
  await L.tp(-24); await p.waitForTimeout(2500); await L.info('t24'); await L.clear(3); await L.info('c');
};
