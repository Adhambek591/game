module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(400); };
  for (let k=0;k<25;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on')))) break; }
  await p.evaluate(()=>{ const P=__G.player; __G.noDeath=true; window.__C=__T.spawn('camel', P.x+2, P.z-9); __C.spawnT=0; __C.o.scale.setScalar(__C.vs); for(let i=0;i<4;i++) __T.spawn('askar', P.x+(i-1.5)*2, P.z-4); __G.camK=.75; });
  await p.waitForTimeout(1500); await shot('pr1');
  console.log('camel', await p.evaluate(()=>JSON.stringify({n:__C.curName, k:__C.rig.kind, sp:+(__C.spd||0).toFixed(2), rigsp:__C.rig.sp, cls:__C.rig.constructor.name})));
  await p.keyboard.press('Digit1'); await p.waitForTimeout(260); await shot('pr2');
  await p.waitForTimeout(500); await p.keyboard.press('Digit2'); await p.waitForTimeout(350); await shot('pr3');
  await p.waitForTimeout(700); await p.keyboard.press('Digit3'); await p.waitForTimeout(480); await shot('pr4');
  console.log('camel', await p.evaluate(()=>JSON.stringify({n:__C.curName, k:__C.rig.kind, sp:+(__C.spd||0).toFixed(2), cry:__G.player.cryT, b1:document.getElementById('b1').textContent, b2:document.getElementById('b2').textContent, b3:document.getElementById('b3').textContent, b3d:document.getElementById('b3').style.display})));
  await L.info('i');
};
