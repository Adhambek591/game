module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(400); };
  for (let k=0;k<20;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused))) break; }
  await p.evaluate(()=>{ const P=__G.player; window.__S=[]; for (const [t,dx] of [['sarbinaz',-1.6],['archer',0],['mage',1.6],['qashqir',3.4]]) { const e=__T.spawn(t, P.x+dx, P.z-2.5, t==='sarbinaz'?'npc':'npc'); e.spawnT=0; e.o.scale.setScalar(e.vs); e.rot=0; __S.push(e);} __G.camK=.32; });
  await p.waitForTimeout(800); await shot('sp1');
  await p.evaluate(()=>{ for (const e of __S) e.play('E_Attack',{force:true}); });
  await p.waitForTimeout(450); await shot('sp2');
  await p.evaluate(()=>{ for (const e of __S) { e.rot=Math.PI/2; e.play('Running_A',{force:true}); } });
  await p.waitForTimeout(500); await shot('sp3');
};
