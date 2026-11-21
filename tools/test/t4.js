module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await L.ready(); await p.waitForTimeout(1500);
  await shot('m0'); await L.info('start');
  await L.tp(-12, -8); await p.waitForTimeout(700); await L.tp(-21, 1); await p.waitForTimeout(800); await shot('m1'); await L.dlg(); await L.info('after mother');
  await L.tp(-40); await p.waitForTimeout(2500); for (let i = 0; i < 4; i++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(220); } await shot('m2'); await L.info('guards');
  await L.clear(5); await L.info('guards cleared'); await L.tp(-66); await p.waitForTimeout(1200); await L.dlg(); await p.waitForTimeout(2200); await shot('m3'); await L.info('horde');
  await p.keyboard.press('Digit4'); await p.waitForTimeout(1300); await shot('m4'); await L.info('after ulti'); await p.keyboard.press('Digit2'); await p.waitForTimeout(900); await shot('m5');
  await L.clear(3); await L.tp(-94); await p.waitForTimeout(2500); await L.info('stable'); await L.clear(3); await p.waitForTimeout(800); await L.tp(-100, 5); await p.waitForTimeout(500); await shot('m6'); await L.info('door');
  for (let i = 0; i < 12; i++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(430); } await p.waitForTimeout(3000); await L.info('door done'); await shot('m7');
};
