module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await L.ready(); await p.waitForTimeout(1000);
  await L.tp(-94); await p.waitForTimeout(6000); await L.info('soak 6s'); await shot('k1');
  await L.clear(2); await p.waitForTimeout(500); console.log(JSON.stringify(await p.evaluate(() => [__G.dbg(), __G.time])));
  await L.tp(-100, 5); await p.waitForTimeout(2000); console.log(JSON.stringify(await p.evaluate(() => [__G.dbg(), __G.time])));
  for (let i = 0; i < 5; i++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(450); console.log(JSON.stringify(await p.evaluate(() => [__G.dbg(), __G.time, !!__G.player.act]))); }
};
