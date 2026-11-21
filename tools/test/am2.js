module.exports = async (p, shot) => {
  const wg = async (sec) => { const t0 = await p.evaluate(()=>__G.time); for (let i=0;i<300;i++){ await p.waitForTimeout(120); if ((await p.evaluate(()=>__G.time)) - t0 >= sec) break; } };
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 1))) break; }
  await p.evaluate(()=>{ const P=__G.player; P.rot=0.2; __G.freeze=true; __G.camK=.13; __G.camY=.95; if(P.mark) P.mark.g.visible=false; });
  await wg(.3); await shot('a1');
  await p.evaluate(()=>{ const P=__G.player; __G.freeze=false; __G.camK=.9; __G.camY=0; P.rot=Math.PI; if(P.mark) P.mark.g.visible=true; window.__Q=__T.spawn('qashqir', P.x, P.z-5); __Q.spawnT=0; __Q.o.scale.setScalar(__Q.vs); __Q.speed=0; });
  await wg(.3); await p.evaluate(()=>{ __Q.damage(1e7); __T.soul(__Q); });
  await wg(.5); await shot('a2'); await wg(.5); await shot('a3'); await wg(.8); await shot('a4');
  console.log('st', await p.evaluate(()=>JSON.stringify({gone:__Q.gone, souls:(__G.souls||[]).length, amu:!!__G.player.rig.amulet})));
  await p.evaluate(()=>{ const P=__G.player; __G.noDeath=true; for (const e of __G.ents) if (e.team==='ally' && e!==P) { e.x+=30; } window.__D=__T.potion(P.x+1.5, P.z-2.5); __D.spawnT=0; __D.o.scale.setScalar(__D.vs); __D.potT=0; __G.camK=.45; __G.camY=.3; });
  await wg(.9); await shot('p1');
  console.log('drink', await p.evaluate(()=>JSON.stringify({d:!!__D.drink, t:__D.drink&&__D.drink.t, type:__D.type})));
  await wg(.9); await shot('p2'); await wg(.6); await shot('p3');
  console.log('after', await p.evaluate(()=>JSON.stringify({type:__D.type, hp:__D.hp, vs:__D.vs})));
};
