module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await L.ready(); await p.evaluate(() => { __G.steps = 6; }); await p.waitForTimeout(1500);
  await L.tp(-128); await L.dlg(15000); await p.waitForTimeout(2500); await shot('b1'); await L.info('boss');
  await p.evaluate(() => { __G.boss.hp = __G.boss.maxHp * .45; }); await p.waitForTimeout(3000); await shot('b2'); await L.info('phase2');
  await L.kill(); await p.waitForTimeout(800); await L.kill(); await p.waitForTimeout(9000); await L.info('after boss'); await shot('b3');
  await p.evaluate(() => { __G.player.x = 0; __G.player.z = -158; __G.player.rot = Math.PI; }); await p.waitForTimeout(600); await p.keyboard.press('Digit5'); await p.waitForTimeout(2500); await L.info('leapt'); await shot('b4');
  await L.tp(-179); await p.waitForTimeout(6000); await shot('b5'); console.log('end on:', await p.evaluate(() => document.getElementById('end').classList.contains('on') + ' ' + document.getElementById('stars').textContent));
};
