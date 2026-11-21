module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(400); };
  for (let k=0;k<25;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused && !document.getElementById('dlg').classList.contains('on')))) break; }
  await p.evaluate(()=>{ __G.camK=+(window.__CK||.4); });
  await p.evaluate(()=>{const P=__G.player; for(let i=0;i<3;i++) __T.spawn('askar', P.x+(i-1)*1.8, P.z-2.6);});
  await shot('c5a');
  for (let k=0;k<14;k++){ await skip(); await p.keyboard.press(process.env.KEYS ? process.env.KEYS.split(',')[k%process.env.KEYS.split(',').length] : 'KeyJ'); await p.waitForTimeout(150); if (k==1) await shot('c5b'); if (k==4) await shot('c5c'); if (k==8) await shot('c5d'); }
  await L.info('i');
};
