module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(400); };
  for (let k=0;k<20;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused))) break; }
  const T = process.env.UT || 'sarbinaz';
  await p.evaluate((T)=>{ const P=__G.player; P.o.visible=false; if(P.mark) P.mark.g.visible=false; const e=__T.spawn(T, P.x, P.z-0.6, 'npc'); e.spawnT=0; e.o.scale.setScalar(e.vs); e.rot=Math.PI/2; window.__E=e; __G.camK=.12; document.getElementById('hud').style.opacity=0; }, T);
  await p.waitForTimeout(800); await shot('sr1');
  await p.evaluate(()=>{ __E.play('E_Attack',{force:true}); });
  await p.waitForTimeout(420); await shot('sr2');
  await p.evaluate(()=>{ __E.rot=Math.PI/2; __E.play('Running_A',{force:true}); });
  await p.waitForTimeout(500); await shot('sr3');
};
