module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(1000); await L.tp(-93); await p.waitForTimeout(3500);
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(200); await shot('f1'); await p.waitForTimeout(1200); await p.keyboard.press('KeyJ'); await p.waitForTimeout(300); await shot('f2');
  await L.info('i'); console.log(await p.evaluate(() => __G.ents.map(e => e.type + ':' + (e.rig.constructor.name)).join(' ')));
};
