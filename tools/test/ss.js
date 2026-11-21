module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(400); };
  for (let k=0;k<14;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused))) break; }
  await p.evaluate(()=>{const P=__G.player; for(let i=0;i<7;i++) __T.spawn(i%2?'askar':'wolf', P.x+(i%4-1.5)*2.2, P.z-3.5-(i>3?2.2:0));});
  for (let k=0;k<16;k++){ await skip(); await p.keyboard.press(k%5==4?'Digit1':'KeyJ'); await p.waitForTimeout(240); if (k==9) await shot(process.env.SS||'ss_a'); }
};
