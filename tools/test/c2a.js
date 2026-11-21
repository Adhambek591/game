module.exports = async (p, shot) => {
  const wg = async (sec) => { const t0 = await p.evaluate(()=>__G.time); for (let i=0;i<400;i++){ await p.waitForTimeout(150); if ((await p.evaluate(()=>{ if(document.getElementById('dlg').classList.contains('on')) document.getElementById('dlg').click(); return __G.time; })) - t0 >= sec) break; } };
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<40;k++){ await p.waitForTimeout(1500); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 1))) break; }
  const st = async (n) => console.log(n, await p.evaluate(()=>{ const G=__G,P=G.player; const al=G.ents.filter(e=>e.team==='ally'&&e!==P&&!e.dead), en=G.ents.filter(e=>e.team==='enemy'&&!e.dead&&!e.bg);
    return JSON.stringify({t:+G.time.toFixed(1), P:[+P.x.toFixed(1),+P.z.toFixed(1),P.hp|0], al: al.map(e=>[+e.x.toFixed(1),+e.z.toFixed(1),+(e.spd||0).toFixed(1),e.state,e.tg?G.ents.indexOf(e.tg):-1, e.curName.slice(0,6)].join('/')), en: en.map(e=>[e.type.slice(0,3),+e.x.toFixed(1),+e.z.toFixed(1),e.state,e.tg===P?'P':e.tg?G.ents.indexOf(e.tg):-1,e.hp|0].join('/'))}); }));
  await p.evaluate(()=>{ __G.noDeath=true; __G.steps=12; __G.camK=1.25; });
  await st('start');
  // phase 2: clash
  await p.evaluate(()=>{ const P=__G.player; const L=[['askar',-6],['askar',-3],['askar',0],['askar',3],['askar',6],['wolf',-8],['wolf',8],['archer',-4],['archer',4],['mage',0]]; L.forEach(([t,x],i)=>{ const e=__T.spawn(t, x, P.z-17-(i>6?5:0)-(i%2)*1.5); }); });
  for (let i=0;i<9;i++){ await wg(1.6); await st('cl'+i); await shot('c2a_c'+i); }
};
