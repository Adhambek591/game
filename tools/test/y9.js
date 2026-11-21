module.exports = async (p, shot) => {
  const { wg, st } = await require('./c2pre.js')(p);
  await p.evaluate(()=>{ const G=__G,P=G.player; G.noDeath=true; G.steps=6; G.camK=1.25; G.noVar=true; for (const k of [2,3,5]) G.sk[k].on=true;
    for (const e of G.ents) if (e.team==='enemy' && Math.abs(e.z-P.z)<40) { e.hp=0; e.dead=true; e.o.visible=false; }
    P.x=0; P.z=0;
    __T.spawn('nayza', -2, -8); __T.spawn('askar', 2, -8); __T.spawn('askar', 4, -9); __T.spawn('askar', -4, -9); __T.spawn('archer', 0, -16); __T.spawn('archer', 5, -15); __T.spawn('wolf', -6, -10); __T.spawn('boribasi', 3, -14); __T.spawn('shaman', 0, -18);
    try { __T.potion(-3, -12); } catch(e) { console.log('potion', e.message); }
    for (const m of G.ents) if (m.type==='qiz') { m.x=0; m.z=40; m.gone=true; }
    const K=c=>{ dispatchEvent(new KeyboardEvent('keydown',{code:c})); setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{code:c})),30); };
    const od=P.damage.bind(P); window.__hits={n:0,z:0,amt:0,by:{}}; P.damage=(a,s2,o)=>{const r=od(a,s2,o); const H=window.__hits; H.n++; if(!r)H.z++; H.amt+=r||0; const k=s2?s2.type:'?'; H.by[k]=(H.by[k]||0)+(r||0); return r;}; window.__dodgeP=0; window.__atkP=.3; window.__mx={tokMax:0,dodges:0,atk:0,w5:0,maxAtk:0,maxAtkP:0};
    setInterval(()=>{ const M=window.__mx; let n=0;
      for (const e of G.ents) { if (e.dead||e.team!=='enemy'||e.tg!==P) continue; if (/windup|crouch/.test(e.state)) n++; if (e.state==='windup' && e.tm<.22 && e.tm>0 && Math.hypot(e.x-P.x,e.z-P.z)<4.5 && Math.random()<window.__dodgeP) { K('KeyK'); M.dodges++; } }
      M.maxAtk=Math.max(M.maxAtk,n); M.tokMax=Math.max(M.tokMax,(G.tok||[]).length);
      if (Math.random()<window.__atkP) { K('Space'); M.atk++; } if (false) { K('Digit5'); M.w5++; } }, 60);
  });
  const f = ()=>{ const G=__G,P=G.player; const en=G.ents.filter(e=>e.team==='enemy'&&!e.dead&&!e.bg&&Math.abs(e.z-P.z)<40); return JSON.stringify({t:+G.time.toFixed(1), P:[P.hp|0,P.act?P.act.kind:'-'], mx:window.__mx, H:window.__hits, pd:G.stats.pd||0, brk:G.stats.brk||0, en: en.map(e=>[e.type.slice(0,4),e.state,e.hp|0,e.poise!==undefined?(e.poise|0):'',e.brokenT>0?'BRK':'',e.downT>0?'D':''].join('/'))}); };
  for (let i=0;i<5;i++){ await wg(2); await st('g'+i, f); if (i==1||i==3) await shot('y9_'+i); }
};
