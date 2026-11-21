module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 1))) break; }
  await p.evaluate(()=>{ const P=__G.player; P.o.visible=false; if(P.mark) P.mark.g.visible=false; const e=__T.spawn('sarbinaz', P.x, P.z-0.3, 'npc'); e.spawnT=0; e.o.scale.setScalar(e.vs); e.rot=Math.PI/2+0.3; window.__E=e; __G.camK=.14; __G.camY=.15; document.getElementById('hud').style.opacity=0; });
  await p.waitForTimeout(2500); await shot('spq1');
  await p.evaluate(()=>{ __E.play('E_Attack',{force:true}); }); await p.waitForTimeout(1200); await shot('spq2');
  console.log(await p.evaluate(()=>JSON.stringify({fix:__E.rig.gripFix})));
};
