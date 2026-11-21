module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 1))) break; }
  await p.evaluate(()=>{ const P=__G.player; P.rot=0.1; __G.freeze=true; __G.camK=.1; __G.camY=.45; if(P.mark) P.mark.g.visible=false; document.getElementById('hud').style.opacity=0; });
  await p.waitForTimeout(3000); await shot('amu2');
  console.log(await p.evaluate(()=>{ const a=__G.player.rig.amulet; const v=a.getWorldPosition(new a.position.constructor()); return JSON.stringify(v.toArray().map(x=>+x.toFixed(2))); }));
};
