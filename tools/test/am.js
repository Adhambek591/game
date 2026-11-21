module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(400); };
  for (let k=0;k<25;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on')))) break; }
  await p.evaluate(()=>{ const P=__G.player; P.rot=0.25; __G.freeze=true; __G.camK=.16; __G.camY=.75; document.getElementById('hud').style.opacity=0; if(P.mark) P.mark.g.visible=false; const e=__T.spawn('sarbinaz', P.x+1.2, P.z+0.2, 'npc'); e.spawnT=0; e.o.scale.setScalar(e.vs); e.rot=Math.PI/2; window.__E=e; });
  await p.waitForTimeout(900); await shot('am1');
  await p.evaluate(()=>{ __E.play('E_Attack',{force:true}); });
  await p.waitForTimeout(400); await shot('am2');
};
