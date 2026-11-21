module.exports = async (p, shot) => {
  const { wg, st } = await require('./c2pre.js')(p);
  await p.evaluate(()=>{ const G=__G,P=G.player; G.noDeath=true; G.steps=12; G.camK=1.6; __T.mount(P,true); for (const m of G.ents) if (m.type==='qiz') __T.mount(m,true); G.noVar=true; for (let i=0;i<7;i++){ const e=__T.spawn(i%4==3?'archer':'askar', (i-3)*3, P.z-24-(i%2)*3); e.spawnT=0; e.o.scale.setScalar(e.vs); __T.mount(e,true);} });
  const f = ()=>{ const G=__G; const m=G.ents.filter(e=>e.mounted&&!e.dead&&e!==G.player); return JSON.stringify({t:+G.time.toFixed(1), r:m.map(e=>[e.team[0],+e.x.toFixed(0),+e.z.toFixed(0),'h'+(((e.rot%6.283)+6.283)%6.283).toFixed(1),'v'+(e.cav?e.cav.v.toFixed(0):'-'),e.cav?e.cav.m[0]:'-',e.hp|0,e.horseHp|0,e.horse&&e.horse.rear?'R':''].join('/'))}); };
  for (let i=0;i<7;i++){ await wg(1.0); await st('cv'+i, f); await shot('x4_'+i); }
};
