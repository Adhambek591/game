module.exports = async (p, shot) => {
  const { wg, st } = await require('./c2pre.js')(p);
  await p.evaluate(()=>{ const G=__G,P=G.player; G.noDeath=true; G.steps=6; G.noVar=true;
    for (const e of G.ents) if (e.team==='enemy' && Math.abs(e.z-P.z)<40) { e.hp=0; e.dead=true; e.o.visible=false; }
    for (const m of G.ents) if (m.type==='qiz') { m.x=0; m.z=40; m.gone=true; }
    P.x=0; P.z=0; window.__A=[__T.spawn('archer', 0, -10), __T.spawn('archer', 5, -11), __T.spawn('boribasi', -4, -12), __T.spawn('askar', 3, -6)];
    const od=P.damage.bind(P); window.__hits={n:0,amt:0}; P.damage=(a,s2,o)=>{const r=od(a,s2,o); __hits.n++; __hits.amt+=r||0; return r;};
    setInterval(()=>{ if (Math.random()<.3) { dispatchEvent(new KeyboardEvent('keydown',{code:'Space'})); setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{code:'Space'})),30);} },60); window.__pj=[]; setInterval(()=>{ for (const q of G.proj) if (!q.seen) { q.seen=1; __pj.push(1); } },20);
  });
  const f = ()=>{ const G=__G,P=G.player; return JSON.stringify({t:+G.time.toFixed(1), hp:P.hp|0, PP:[P.x.toFixed(1),P.z.toFixed(1),P.act?P.act.kind:'-',(P.iframe||0).toFixed(2)], H:__hits, shots:__pj.length, A:__A.map(e=>[e.x.toFixed(1),e.z.toFixed(1),e.state,e.tg===P?'P':e.tg?e.tg.type:'-',e.cd.toFixed(1), Math.hypot(e.x-P.x,e.z-P.z).toFixed(1), e.hp|0].join('/'))}); };
  for (let i=0;i<7;i++){ await wg(1.5); await st('a'+i, f); }
};
