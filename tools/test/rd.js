module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  await p.waitForFunction(() => document.getElementById('lore').classList.contains('on'), null, { timeout: 120000 }); await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused && __G.player.mounted, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  console.log(await p.evaluate(() => JSON.stringify({ m: __G.ents.filter(e => e.mounted).map(e => e.type).join(','), obj: document.getElementById('obj').textContent })));
  await p.keyboard.down('KeyW'); await p.waitForTimeout(2500); await shot('rd1'); for (let i = 0; i < 12; i++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(300); } await p.keyboard.up('KeyW'); await shot('rd2');
  await L.info('r'); console.log(await p.evaluate(() => 'gold ' + document.getElementById('gold').textContent + ' esc ' + __G.rideEsc));
};
