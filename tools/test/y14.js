module.exports = async (p, shot) => {
  const { wg, st } = await require('./c2pre.js')(p);
  await p.evaluate(()=>{ const G=__G,P=G.player; G.noDeath=true; G.steps=1; G.camK=1.3; G.noVar=true;
    for (const e of G.ents) if (e.team==='enemy' && Math.abs(e.z-P.z)<40) { e.hp=0; e.dead=true; e.o.visible=false; }
    for (const m of G.ents) if (m.team!=='enemy' && m!==P) { m.x=0; m.z=40; m.gone=true; }
    P.x=0; P.z=0; window.__B=__T.spawn('boribasi', 0, -9); __B.lsT=0.3; __B.howlT=99;
    // player walks sideways to test prediction
    dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}));
    window.__L=[]; setInterval(()=>{ const b=__B; if (b.state==='leapS' && !b._ls) { b._ls=1; __L.push({start:[P.x.toFixed(1),P.z.toFixed(1)]}); } if (b.state!=='leapS' && b._ls) { b._ls=0; const L=__L[__L.length-1]; L.land=[b.x.toFixed(1),b.z.toFixed(1)]; L.P=[P.x.toFixed(1),P.z.toFixed(1)]; L.after=b.state; } }, 16);
  });
  for (let i=0;i<40;i++){ await wg(.12); const s=await p.evaluate(()=>__B.state+'/'+(__B.tm||0).toFixed(2)); if (s.startsWith('leapS')) { await shot('y14_0'); break; } }
  await wg(1.5); await shot('y14_1');
  await st('L', ()=>JSON.stringify(window.__L));
};
