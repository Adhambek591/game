module.exports = async (p, shot) => {
  const wg = async (sec) => { const t0 = await p.evaluate(()=>__G.time); for (let i=0;i<400;i++){ await p.waitForTimeout(100); if ((await p.evaluate(()=>__G.time)) - t0 >= sec) break; } };
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 1))) break; }
  await p.evaluate(()=>{ const P=__G.player; __G.noDeath=true; __T.mount(P,true); for (const m of __G.ents) if (m.type==='qiz') __T.mount(m,true); __G.camYaw=Math.PI/2; __G.camK=1.15; __G.camY=-.3; });
  await wg(1.0); await shot('hl1');
  console.log('idle', await p.evaluate(()=>JSON.stringify(__G.ents.filter(e=>e.hz).map(e=>[e.hz.coat, e.hz.tris, e.hz.lod, !!e.hz.farM]))));
  await p.keyboard.down('KeyW'); await wg(.9); await shot('hl2');
  console.log('run', await p.evaluate(()=>JSON.stringify(__G.ents.filter(e=>e.hz).map(e=>[e.hz.S.gait, +(e.spd||0).toFixed(1), +e.hz.S.ph.toFixed(2)]))));
  await wg(.35); await shot('hl3'); await p.keyboard.up('KeyW');
  await wg(.5); await shot('hl4');
  console.log('stop', await p.evaluate(()=>JSON.stringify(__G.ents.filter(e=>e.hz).map(e=>[e.hz.S.gait, +e.hz.S.rear.toFixed(2)]))));
};
