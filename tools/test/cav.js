module.exports = async (p, shot) => {
  const wg = async (sec) => { const t0 = await p.evaluate(()=>__G.time); for (let i=0;i<300;i++){ await p.waitForTimeout(120); if ((await p.evaluate(()=>__G.time)) - t0 >= sec) break; } };
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on') && __G.time > 1))) break; }
  await p.evaluate(()=>{ const P=__G.player; P.rot=0.15; __G.freeze=true; __G.camK=.14; __G.camY=.6; if(P.mark) P.mark.g.visible=false; document.getElementById('hud').style.opacity=0; });
  await shot('amu');
  await p.evaluate(()=>{ const P=__G.player; __G.freeze=false; __G.camY=0; P.rot=Math.PI; if(P.mark) P.mark.g.visible=true; document.getElementById('hud').style.opacity=1; });
  await p.evaluate(()=>{ const P=__G.player; __G.noDeath=true; __G.camK=1.3; __T.mount(P,true); for (const m of __G.ents) if (m.type==='qiz') __T.mount(m,true); for (let i=0;i<7;i++){ const e=__T.spawn(i%3==2?'archer':'askar', P.x+(i-3)*2.4, P.z-12-(i%2)*2); e.spawnT=0; e.o.scale.setScalar(e.vs); __T.mount(e,true);} });
  const stat = async (n) => console.log(n, await p.evaluate(()=>{ const m=__G.ents.filter(e=>e.mounted&&!e.dead); let mn=99; for(let i=0;i<m.length;i++) for(let j=i+1;j<m.length;j++) mn=Math.min(mn, Math.hypot(m[i].x-m[j].x,m[i].z-m[j].z)); let sx=0,sz=0; for(const e of m){sx+=e.x;sz+=e.z;} sx/=m.length; sz/=m.length; let sp=0; for(const e of m) sp+=Math.hypot(e.x-sx,e.z-sz); return JSON.stringify({n:m.length, minDist:+mn.toFixed(2), spread:+(sp/m.length).toFixed(2), t:+__G.time.toFixed(1)}); }));
  await wg(2.5); await stat('a'); await shot('cv1');
};
