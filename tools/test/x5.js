module.exports = async (p, shot) => {
  const { wg, st } = await require('./c2pre.js')(p);
  await p.evaluate(()=>{ const G=__G,P=G.player; G.noDeath=true; G.steps=8; G.camK=1.2; for (const k of [2,3,5]) G.sk[k].on=true;
    __T.spawn('nayza', -2, P.z-8); __T.spawn('askar', 2, P.z-8); __T.spawn('askar', 4, P.z-9); __T.spawn('askar', -4, P.z-9); __T.spawn('askar', 0, P.z-10); __T.spawn('boribasi', 3, P.z-14); __T.spawn('shaman', 0, P.z-16);
    for (const m of G.ents) if (m.type==='qiz') { m.x=0; m.z=P.z+40; m.hp=m.maxHp=1e6; m.dead=false; m.gone=true; }
    const K=c=>{ dispatchEvent(new KeyboardEvent('keydown',{code:c})); setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{code:c})),30); };
    window.__mx={tokMax:0,dodges:0,atk:0,w5:0,maxAtk:0};
    setInterval(()=>{ const M=window.__mx; const L=G.tok||[]; M.tokMax=Math.max(M.tokMax,L.length); let n=0;
      for (const e of G.ents) { if (e.dead||e.team!=='enemy'||e.tg!==P) continue; if (/windup|crouch/.test(e.state)) n++; if (e.state==='windup' && e.tm<.22 && e.tm>0 && Math.hypot(e.x-P.x,e.z-P.z)<4.5 && Math.random()<.7) { K('KeyK'); M.dodges++; } }
      M.maxAtk=Math.max(M.maxAtk,n);
      if (Math.random()<.25) { K('Space'); M.atk++; } if (G.sk[5].cd<=0 && Math.random()<.05) { K('Digit5'); M.w5++; } }, 60);
  });
  const f = ()=>{ const G=__G,P=G.player; const en=G.ents.filter(e=>e.team==='enemy'&&!e.dead&&!e.bg); return JSON.stringify({t:+G.time.toFixed(1), P:[P.hp|0,P.act?P.act.kind:'-',(P.wolfT||0).toFixed(1)], mx:window.__mx, pd:G.stats.pd||0, brk:G.stats.brk||0, zones:(G.zones||[]).length, en: en.map(e=>[e.type.slice(0,4),e.state,e.hp|0,e.poise!==undefined?(e.poise|0):'',e.brokenT>0?'BRK':'',e.buffT>0?'B':'',e.downT>0?'D':''].join('/'))}); };
  for (let i=0;i<8;i++){ await wg(3); await st('g'+i, f); if (i==2||i==5) await shot('x5_'+i); }
};
