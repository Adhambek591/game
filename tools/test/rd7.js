module.exports = async (p, shot) => {
  const wg = async (sec) => { const t0 = await p.evaluate(()=>__G.time); for (let i=0;i<300;i++){ await p.waitForTimeout(120); if ((await p.evaluate(()=>__G.time)) - t0 >= sec) break; } };
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(300); };
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && __G.player.mounted && !__G.paused && __G.time > .5))) break; }
  console.log('pr', await p.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++; if(performance.now()-t0<1000) requestAnimationFrame(f); else r(JSON.stringify({t:+__G.time.toFixed(1), raf:n, pa:__G.paused, n:__G.ents.length}));}; requestAnimationFrame(f);})));
  await p.evaluate(()=>{ __G.noDeath=true; __G.camK=1.25; });
  console.log('pr', await p.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++; if(performance.now()-t0<1000) requestAnimationFrame(f); else r(JSON.stringify({t:+__G.time.toFixed(1), raf:n, pa:__G.paused, n:__G.ents.length}));}; requestAnimationFrame(f);})));
  // ride forward to the enemy line
  await p.keyboard.down('KeyW'); await wg(2.2); await p.keyboard.up('KeyW'); console.log('pr', await p.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++; if(performance.now()-t0<1000) requestAnimationFrame(f); else r(JSON.stringify({t:+__G.time.toFixed(1), raf:n, pa:__G.paused, n:__G.ents.length}));}; requestAnimationFrame(f);}))); await wg(1.5); console.log('pr', await p.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++; if(performance.now()-t0<1000) requestAnimationFrame(f); else r(JSON.stringify({t:+__G.time.toFixed(1), raf:n, pa:__G.paused, n:__G.ents.length}));}; requestAnimationFrame(f);}))); await shot('rd1');
  console.log('st', await p.evaluate(()=>{ const m=__G.ents.filter(e=>e.mounted&&!e.dead); let mn=99; for(let i=0;i<m.length;i++) for(let j=i+1;j<m.length;j++) mn=Math.min(mn, Math.hypot(m[i].x-m[j].x,m[i].z-m[j].z)); return JSON.stringify({n:m.length, minDist:+mn.toFixed(2), anims:m.map(e=>e.curName[0]+(e.spd||0).toFixed(1)).join(' ')}); }));
  await wg(1.5); await shot('rd2');
  console.log('st', await p.evaluate(()=>{ const m=__G.ents.filter(e=>e.mounted&&!e.dead); let mn=99; for(let i=0;i<m.length;i++) for(let j=i+1;j<m.length;j++) mn=Math.min(mn, Math.hypot(m[i].x-m[j].x,m[i].z-m[j].z)); return JSON.stringify({n:m.length, minDist:+mn.toFixed(2)}); }));
};
