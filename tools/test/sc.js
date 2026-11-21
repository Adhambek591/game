// scenery check: SCN=<ch> ZS="z1,z2" NAME=prefix
module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const ch = +(process.env.SCN || 4), zs = (process.env.ZS || '-20,-80').split(',').map(Number), nm = process.env.NAME || 'sc';
  const t0 = Date.now(); let built = false;
  while (Date.now() - t0 < 150000) {
    await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); if (document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click(); if (document.getElementById('dlg').classList.contains('on')) document.getElementById('dlg').click(); });
    const st = await p.evaluate(() => ({ pl: !!__G.player, pa: __G.paused, ride: !!(__G.player && __G.player.mounted), scn: window.__SCN || 0, nd: __G.player ? 1 : 0 }));
    if (st.pl && st.ride) await p.evaluate(() => __T.kill());
    if (st.pl && !st.ride && !st.pa && (process.env.NOSCN || st.scn == ch)) { built = true; break; }
    await p.waitForTimeout(700); await L.dlg(300);
  }
  console.log('built', built);
  await p.evaluate((px) => { window.__PX = px; __G.freeze = true; __T.kill(); }, process.env.PX || 0);
  for (const z of zs) { await p.evaluate(z => { __G.player.z = z; __G.player.x = +(window.__PX || 0); __G.cam.z = z; }, z); await p.waitForTimeout(2500); await L.info('z' + z); await p.evaluate(() => console.warn('[info] ' + (window.__R ? JSON.stringify(window.__R()) : ''))); await shot(nm + '_' + Math.abs(z)); }
};
