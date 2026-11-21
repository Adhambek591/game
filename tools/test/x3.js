module.exports = async (p, shot) => {
  const { wg, st } = await require('./c2pre.js')(p);
  const f = ()=>{ const G=__G,P=G.player; const al=G.ents.filter(e=>e.team==='ally'&&e!==P&&!e.dead), en=G.ents.filter(e=>e.team==='enemy'&&!e.dead&&!e.bg);
    return JSON.stringify({t:+G.time.toFixed(1), P:[+P.x.toFixed(1),+P.z.toFixed(1),P.hp|0,P.act?P.act.kind:'-'], tok:(G.tok||[]).length, al: al.map(e=>[+e.x.toFixed(1),+e.z.toFixed(1),e.state,e.tg?G.ents.indexOf(e.tg):-1, e.curName.slice(0,8), (e.mixer&&e.cur? e.cur.time.toFixed(2):'')].join('/')), en: en.map(e=>[e.type.slice(0,3),G.ents.indexOf(e),+e.x.toFixed(1),+e.z.toFixed(1),e.state,e.tg===P?'P':e.tg?G.ents.indexOf(e.tg):-1,e.hp|0].join('/'))}); };
  await p.evaluate(()=>{ const G=__G,P=G.player; G.noDeath=true; G.steps=12; G.camK=1.15; const L=[['askar',-6],['askar',-3],['askar',0],['askar',3],['askar',6],['wolf',-8],['wolf',8],['archer',-4],['archer',4],['shaman',0]]; L.forEach(([t,x],i)=>__T.spawn(t, x, P.z-15-(i>6?5:0)-(i%2)*1.5)); });
  await p.keyboard.down('KeyW'); await wg(1.2); await p.keyboard.up('KeyW');
  for (let i=0;i<7;i++){ for (let k=0;k<3;k++){ await p.keyboard.press('Space'); await wg(.35); } await st('b'+i, f); await shot('x3_'+i); }
};
