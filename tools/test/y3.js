module.exports = async (p, shot) => {
  const { wg, st } = await require('./c2pre.js')(p);
  await p.evaluate(()=>{ const G=__G,P=G.player; G.noDeath=true; G.steps=6; G.camK=1.6;
    for (const e of G.ents) if (e.team==='enemy' && Math.abs(e.z-P.z)<40) { e.hp=0; e.dead=true; e.o.visible=false; }
    P.x=0; P.z=0; __T.mount(P,true); for (const m of G.ents) if (m.type==='qiz') { m.x=(Math.random()-.5)*10; m.z=3+Math.random()*3; __T.mount(m,true); } G.noVar=true;
    for (let i=0;i<7;i++){ const e=__T.spawn(i%4==3?'archer':'askar', (i-3)*3, P.z-24-(i%2)*3); e.spawnT=0; e.o.scale.setScalar(e.vs); __T.mount(e,true);} 
    window.__R={rear:0,modes:{}}; setInterval(()=>{ for (const e of G.ents) { if (e.dead||!e.mounted) continue; if (e.hz&&e.hz.S&&e.hz.S.rear>0&&!e._rr){e._rr=1;__R.rear++;} if(!(e.hz&&e.hz.S&&e.hz.S.rear>0)) e._rr=0; if(e.cav) __R.modes[e.cav.m]=(__R.modes[e.cav.m]||0)+1; } },100);
    const K=(c,d)=>dispatchEvent(new KeyboardEvent(d?'keydown':'keyup',{code:c})); K('KeyW',1); setTimeout(()=>K('KeyW',0),1500);
    setInterval(()=>{ dispatchEvent(new KeyboardEvent('keydown',{code:'Space'})); setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{code:'Space'})),40); }, 500);
  });
  const f = ()=>{ const G=__G; const m=G.ents.filter(e=>e.mounted&&!e.dead&&e!==G.player); return JSON.stringify({t:+G.time.toFixed(1), R:window.__R, r:m.map(e=>[e.team[0],+e.x.toFixed(0),+e.z.toFixed(0),'v'+(e.cav?e.cav.v.toFixed(0):'-'),e.cav?e.cav.m[0]:'-',e.hp|0].join('/'))}); };
  for (let i=0;i<5;i++){ await wg(i?1.3:2.5); await st('cv'+i, f); await shot('y3_'+i); }
};
