module.exports = async (p, shot) => {
  const wg = async (sec) => { const t0 = await p.evaluate(()=>__G.time); for (let i=0;i<300;i++){ await p.waitForTimeout(120); if ((await p.evaluate(()=>__G.time)) - t0 >= sec) break; } };
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 1))) break; }
  await p.evaluate(()=>{ const P=__G.player; P.rot=Math.PI*0.75; __G.freeze=true; __G.camK=.2; __G.camY=.7; });
  await p.waitForTimeout(700); await shot('s5a');
  await p.evaluate(()=>{ const P=__G.player; __G.freeze=false; __G.noDeath=true; __G.camK=.75; __G.camY=0; for(let i=0;i<4;i++){ const e=__T.spawn('askar', P.x+(i-1.5)*1.8, P.z-3); e.spawnT=0; e.o.scale.setScalar(e.vs);} for (const x of [-4,4]) { const e=__T.potion(P.x+x, P.z-6); e.potT=.3; } });
  await wg(.4);
  await p.keyboard.press('Digit1'); await wg(.15); await shot('s5b');
  await wg(.5); await p.keyboard.press('Digit2'); await wg(.35); await shot('s5c');
  await wg(.7); await p.keyboard.press('Digit5'); await wg(.3); await shot('s5d');
  console.log('st', await p.evaluate(()=>JSON.stringify({b1:document.getElementById('b1').textContent,b2:document.getElementById('b2').textContent,b5:document.getElementById('b5').textContent, drink:__G.ents.filter(e=>e.drink).length, wolves:__G.ents.filter(e=>e.type==='wolf'&&!e.dead).map(e=>[e.hp,+e.vs.toFixed(2)])})));
  await wg(1.2); await shot('s5e');
  console.log('st2', await p.evaluate(()=>JSON.stringify({drink:__G.ents.filter(e=>e.drink).length, wolves:__G.ents.filter(e=>e.type==='wolf'&&!e.dead).map(e=>[e.hp,+e.vs.toFixed(2)])})));
  await L.info('i');
};
