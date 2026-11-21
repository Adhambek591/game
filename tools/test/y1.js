module.exports = async (p, shot) => {
  const { wg, st } = await require('./c2pre.js')(p);
  await p.evaluate(()=>{ const G=__G,P=G.player; G.noDeath=true; G.steps=10; G.camK=1.35; G.noVar=false;
    const L=[['askar',-6],['askar',-3],['nayza',0],['askar',3],['askar',6],['wolf',-8],['wolf',8],['archer',-4],['archer',4],['shaman',0]]; L.forEach(([t,x],i)=>{ __T.spawn(t, x, P.z-17-(i>6?5:0)-(i%2)*1.5); }); });
  const f=()=>{ const G=__G,P=G.player; const al=G.ents.filter(e=>e.team==='ally'&&e!==P&&!e.dead), en=G.ents.filter(e=>e.team==='enemy'&&!e.dead&&!e.bg);
    return JSON.stringify({t:+G.time.toFixed(1), P:[+P.x.toFixed(1),+P.z.toFixed(1),P.hp|0], al: al.map(e=>[+e.x.toFixed(1),+e.z.toFixed(1),+(e.spd||0).toFixed(1),e.state,e.tg?G.ents.indexOf(e.tg):-1,(e.curName||'').slice(0,6)].join('/')), en: en.map(e=>[e.type.slice(0,3),+e.x.toFixed(1),+e.z.toFixed(1),e.state,e.tg===P?'P':e.tg?G.ents.indexOf(e.tg):-1,e.hp|0].join('/'))}); };
  await st('s', f);
  for (let i=0;i<6;i++){ await wg(2); await st('c'+i, f); await shot('y1_'+i); }
};
