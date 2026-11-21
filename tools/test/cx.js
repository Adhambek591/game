module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(400); };
  for (let k=0;k<25;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on')))) break; }
  await p.evaluate(()=>{ const P=__G.player; __G.noDeath=true; for(let i=0;i<10;i++) __T.spawn(i%3==2?'wolf':'askar', P.x+(i%5-2)*2.2, P.z-6-(i>4?2.5:0)); window.__pot=[]; });
  for (let k=0;k<20;k++){ await skip(); await p.waitForTimeout(250); if (k==8) await shot('cx1'); if (k==16) await shot('cx2'); }
  const st = await p.evaluate(()=>__G.ents.filter(e=>!e.dead).map(e=>e.type[0]+':'+(e.curName||'').slice(0,6)+':'+(e.spd||0).toFixed(1)+':'+(e.slotI??'-')).join(' '));
  console.log('ST', st);
  await L.info('i');
};
