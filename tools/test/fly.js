module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  // skip lore/cutscene/ride until fly overlay appears
  for (let k = 0; k < 60; k++) { await p.waitForTimeout(700);
    const st = await p.evaluate(() => { const f = document.getElementById('fly'); if (f && f.classList.contains('on')) return 'fly'; const b = document.querySelector('#lore.on button'); if (b) b.click(); if (document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click(); if (window.__T && __G.player && __G.player.mounted) __T.kill(); return ''; });
    await L.dlg(200); if (st === 'fly') break; }
  console.log('fly on', await p.evaluate(() => !!document.querySelector('#fly.on')));
  for (const [i, ms] of [[1, 300], [2, 1200], [3, 1200], [4, 1200], [6, 1200], [7, 1200]]) { await p.waitForTimeout(ms); await shot('fly' + i); }
  await p.waitForTimeout(4000); console.log('after', await p.evaluate(() => ({ fly: !!document.querySelector('#fly.on'), paused: __G.paused, camFn: !!__G.camFn, hud: document.getElementById('hud').classList.contains('on') }))); await shot('fly5');
};
