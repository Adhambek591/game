module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 2.5))) break; }
  await p.evaluate(()=>{ const P=__G.player; __G.noDeath=true; window.__C=__T.spawn('camel', P.x+3, P.z-12); __C.spawnT=0; __C.o.scale.setScalar(__C.vs); __G.camK=1.0; });
  for (let i=0;i<4;i++){ await p.waitForTimeout(500); console.log('camel', await p.evaluate(()=>JSON.stringify({n:__C.curName, k:__C.rig.kind, sp:+(__C.spd||0).toFixed(2), rigsp:+__C.rig.sp.toFixed(2), lL:+__C.rig.cur.lL.toFixed(2), z:+__C.z.toFixed(1)}))); if (i==1) await shot('pw1'); }
  await p.evaluate(()=>{ const P=__G.player; __C.damage(1e6); for(let i=0;i<5;i++) { const e=__T.spawn('askar', P.x+(i-2)*1.6, P.z-2.4); e.spawnT=0; e.o.scale.setScalar(e.vs);} __G.camK=.8; });
  await p.waitForTimeout(600);
  await p.keyboard.press('Digit1'); await p.waitForTimeout(220); await shot('pw2');
  await p.waitForTimeout(600); await p.keyboard.press('Digit2'); await p.waitForTimeout(380); await shot('pw3');
  await p.waitForTimeout(800); await p.keyboard.press('Digit3'); await p.waitForTimeout(470); await shot('pw4');
  await L.info('i');
};
