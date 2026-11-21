module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(1500); for (let i = 0; i < 6; i++) { await p.mouse.click(400, 200); await p.waitForTimeout(200); }
  await L.tp(-10, 6); await p.waitForTimeout(1500); await shot('s1'); await L.info('i');
};
