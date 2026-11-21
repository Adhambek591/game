module.exports = async (p, shot) => {
  const { wg, st } = await require('./c2pre.js')(p);
  const f = ()=>{ const G=__G,P=G.player; const en=G.ents.filter(e=>e.team==='enemy'&&!e.dead&&!e.bg); return JSON.stringify({t:+G.time.toFixed(1), P:[+P.x.toFixed(1),+P.z.toFixed(1),P.hp|0,P.act?P.act.kind:'-',(P.wolfT||0).toFixed(1),'cd5:'+G.sk[5].cd.toFixed(1)], pd:G.stats.pd||0, brk:G.stats.brk||0, zones:(G.zones||[]).length, en: en.map(e=>[e.type.slice(0,4),+e.x.toFixed(1),+e.z.toFixed(1),e.state,e.hp|0,e.poise!==undefined?(e.poise|0):'',e.buffT>0?'B':'',e.downT>0?'D':'',e.air?'A':''].join('/'))}); };
  await p.evaluate(()=>{ const G=__G,P=G.player; G.noDeath=true; G.steps=8; G.camK=1.15; G.sk[5].on=true; for (const m of G.ents) if (m.type==='qiz') { m.x += 0; } G.noVar=true;
    __T.spawn('nayza', -2, P.z-9); __T.spawn('askar', 2, P.z-9); __T.spawn('askar', 4, P.z-10); __T.spawn('mage', 0, P.z-16); __T.spawn('archer', -5, P.z-15); });
  for (let i=0;i<5;i++){ await wg(1.5); await st('e'+i, f); await shot('c2c_e'+i); }
  // wolf spirit dash through the pack
  await p.keyboard.press('Digit5'); await wg(.25); await shot('c2c_w0'); await st('w0', f); await wg(.5); await shot('c2c_w1'); await st('w1', f);
  // heavy attack + light combo
  for (let k=0;k<3;k++){ await p.keyboard.press('KeyJ'); await wg(.4); } await p.evaluate(()=>__G.heavy()); await wg(.4); await shot('c2c_h0'); await st('h0', f); await wg(.6); await st('h1', f);
  // perfect dodge: dodge when an enemy is about to strike
  let got = false; for (let k=0;k<60 && !got;k++){ await p.waitForTimeout(120); got = await p.evaluate(()=>{ const G=__G,P=G.player; const e=G.ents.find(e=>e.team==='enemy'&&!e.dead&&e.state==='windup'&&e.tg===P&&e.tm<.25&&Math.hypot(e.x-P.x,e.z-P.z)<4); if(e&&!P.act){ P.dodgeCd=0; G.sk[3].cd=9; return true;} return false; }); if (got) { await p.keyboard.press('KeyK'); } }
  await wg(.3); await st('pd', f); await shot('c2c_pd'); await p.keyboard.press('KeyJ'); await wg(.3); await shot('c2c_ct'); await st('ct', f);
  // chieftain pack
  await p.evaluate(()=>{ const G=__G,P=G.player; __T.kill(); __T.spawn('boribasi', 0, P.z-12); for (const x of [-6,-3,3,6]) __T.spawn('wolf', x, P.z-11); });
  for (let i=0;i<7;i++){ await wg(1.5); await st('b'+i, f); await shot('c2c_b'+i); }
};
