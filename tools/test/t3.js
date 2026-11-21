module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await L.ready(); await L.dlg();
  await L.tp(-12); await p.waitForTimeout(1200); await L.tp(-22); await p.waitForTimeout(2500);
  for (let i = 0; i < 5; i++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(220); }
  await shot('f1'); await L.info('wave1'); await p.keyboard.press('Digit1'); await p.waitForTimeout(450); await shot('f2');
  await L.clear(5); await L.info('cleared'); await L.tp(-58); await p.waitForTimeout(3200); await shot('f3'); await L.info('camel');
  await L.clear(4); await L.tp(-93); await p.waitForTimeout(1500); await L.dlg(); await p.waitForTimeout(2500); await shot('f4'); await L.info('duel');
  await p.evaluate(() => { __G.player.hp = 100; }); await L.dlg(); await p.waitForTimeout(600); await shot('f5'); await L.info('qte');
  await p.waitForTimeout(3500); await L.dlg(); await p.waitForTimeout(4000); await L.info('after'); await shot('f6');
};
