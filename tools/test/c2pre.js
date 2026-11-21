module.exports = async (p) => {
  const wg = async (sec) => { const t0 = await p.evaluate(()=>__G.time); for (let i=0;i<600;i++){ await p.waitForTimeout(150); if ((await p.evaluate(()=>__G.time)) - t0 >= sec) break; } };
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 120000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click(); if(document.getElementById('dlg').classList.contains('on')) document.getElementById('dlg').click();}); };
  for (let k=0;k<60;k++){ await p.waitForTimeout(1500); await skip(); const v=p.viewportSize(); if (await p.evaluate(()=>document.getElementById('dlg').classList.contains('on'))) await p.mouse.click(v.width/2, v.height/2); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 1))) break; }
  const st = async (n, f) => console.log(n, await p.evaluate(f));
  return { wg, st };
};
