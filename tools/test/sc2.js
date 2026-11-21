// quick: skip to level, screenshot at given z with low wait
module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const ch = process.env.SCN || '4', zs = (process.env.ZS || '-20').split(',').map(Number), nm = process.env.NAME || 'q';
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 160000) {
    await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); if (document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click(); if (document.getElementById('dlg').classList.contains('on')) document.getElementById('dlg').click(); if (__G.player && __G.player.mounted) __T.kill(); });
    const st = await p.evaluate(() => ({ scn: String(window.__SCN || ''), pl: !!__G.player, m: !!(__G.player && __G.player.mounted) }));
    if (st.scn === ch && st.pl && !st.m) { ok = true; break; }
    await p.waitForTimeout(600);
  }
  console.log('ok', ok); await p.waitForTimeout(1500);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { const d = document.getElementById('dlg'); if (d.classList.contains('on')) d.click(); }); await p.waitForTimeout(300); }
  await p.evaluate((px) => { __G.freeze = true; __T.kill(); }, 0);
  for (const z of zs) { await p.evaluate(([z, x]) => { __G.player.z = z; __G.player.x = x; __G.cam.z = z; __G.cam.x = x; }, [z, +(process.env.PX || 0)]); await p.waitForTimeout(1800); await L.info('z' + z); console.log('R', await p.evaluate(() => JSON.stringify(window.__R && window.__R()))); console.log('rafs/3s', await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }))); const t1 = Date.now(); await shot(nm + '_' + Math.abs(z)); console.log('shot ms', Date.now() - t1); }
};
