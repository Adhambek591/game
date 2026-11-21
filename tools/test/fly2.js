module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  for (let k = 0; k < 60; k++) { await p.waitForTimeout(700);
    const st = await p.evaluate(() => { const f = document.getElementById('fly'); if (f && f.classList.contains('on')) return 'fly'; const b = document.querySelector('#lore.on button'); if (b) b.click(); if (document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click(); if (window.__T && __G.player && __G.player.mounted) __T.kill(); return ''; });
    await L.dlg(200); if (st === 'fly') break; }
  for (let i=0;i<4;i++){ await p.waitForTimeout(1500); console.log('dbg', await p.evaluate(()=>JSON.stringify([__G.flyDbg&&__G.flyDbg(), __G.fps|0]))); } await p.mouse.click(300, 200); for (let i=0;i<14;i++){ await p.waitForTimeout(3000); console.log('dbg2', await p.evaluate(()=>JSON.stringify([__G.flyDbg&&__G.flyDbg(), !!__G.camFn]))); }
  console.log('after skip', await p.evaluate(() => ({ fly: !!document.querySelector('#fly.on'), paused: __G.paused, camFn: !!__G.camFn, hud: document.getElementById('hud').classList.contains('on'), ban: document.getElementById('ban2').textContent, rings: __G.player && 1 })));
  await L.dlg(3000); await p.waitForTimeout(800); await shot('fly_after');
};
