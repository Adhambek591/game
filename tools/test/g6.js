module.exports = async (p, shot) => {
  const wg = async (sec) => { const t0 = await p.evaluate(()=>__G.time); for (let i=0;i<200;i++){ await p.waitForTimeout(150); if ((await p.evaluate(()=>__G.time)) - t0 >= sec) break; } };
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on')))) break; }
  await p.evaluate(()=>{ __G.noDeath=true; });
  for (let k=0;k<40;k++){ await skip(); const z = await p.evaluate(()=>{ const P=__G.player; const bk=(__G.breakables||[]).find(b=>b.bar); if (bk) return 'gate'; P.z=Math.max(__G.limitZ+1.5, P.z-12); P.x=0; __T.kill(); return P.z; }); if (z==='gate') break; await p.waitForTimeout(700); }
  await p.evaluate(()=>{ const P=__G.player; P.x=0; P.z=-116.5; P.rot=Math.PI; __G.camK=1.05; });
  await p.waitForTimeout(600); await shot('g6a');
  for (let i=0;i<3;i++){ await p.keyboard.press('KeyJ'); await p.waitForTimeout(400); }
  console.log('afterJ', await p.evaluate(()=>{const b=__G.breakables.find(b=>b.bar); return b? b.hp : 'none';}));
  for (let i=0;i<4;i++){ await p.evaluate(()=>{ __G.sk[6].cd=0; __G.player.act=null; }); await p.keyboard.press('Digit1'); await wg(.8); }
  await shot('g6b');
  console.log('after4', await p.evaluate(()=>{const b=__G.breakables.find(b=>b.mesh); return b? [b.hp,b.nc,b.dead] : 'none';}));
  for (let i=0;i<2;i++){ await p.evaluate(()=>{ __G.sk[6].cd=0; __G.player.act=null; }); await p.keyboard.press('Digit1'); await wg(i?.5:.8); }
  await shot('g6c'); await wg(.6); await shot('g6d');
  console.log('end', await p.evaluate(()=>{const b=__G.breakables.find(b=>b.mesh); return [b.hp,b.dead,__G.colB.includes(b.col), !!b.mesh.parent, __G.chunks.length];}));
  await L.info('i');
};
