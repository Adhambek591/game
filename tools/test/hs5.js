module.exports = async (p, shot) => {
  const wg = async (sec) => { const t0 = await p.evaluate(()=>__G.time); for (let i=0;i<400;i++){ await p.waitForTimeout(100); if ((await p.evaluate(()=>__G.time)) - t0 >= sec) break; } };
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 1))) break; }
  await p.evaluate(()=>{ const P=__G.player; __G.noDeath=true; P.x=10; P.z=-2; __G.cam.x=10; __G.cam.z=-2; __T.mount(P,true); P.hz.S.lastIdle=5; for (const m of __G.ents) if (m.type==='qiz') { m.x=10+Math.random()*2; m.z=Math.random()*3; __T.mount(m,true);} __G.camK=.55; __G.camY=.1; });
  await wg(1.6); await shot('h5a');
  await p.keyboard.down('KeyA'); await wg(.25); await shot('h5b');
  console.log('rear', await p.evaluate(()=>JSON.stringify({rear:+__G.player.hz.S.rear.toFixed(2), g:__G.player.hz.S.gait})));
  await wg(.5); await shot('h5c'); await wg(.2); await shot('h5d'); await p.keyboard.up('KeyA');
  await p.evaluate(()=>{ const m=__G.ents.find(e=>e.type==='qiz'&&e.hz); if (m){ m.horseHp=1; m.damage(20, null); window.__M=m; } });
  await wg(.6); await shot('h5e');
  console.log('corpse', await p.evaluate(()=>JSON.stringify({n:(__G.corpses||[]).length, mounted:__M&&__M.mounted})));
};
