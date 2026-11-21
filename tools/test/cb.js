module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G && __G.player, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click();}); await L.dlg(600); };
  for (let k=0;k<6;k++){ await p.waitForTimeout(1200); await skip(); }
  await p.evaluate(()=>{const P=__G.player; for(let i=0;i<6;i++) __T.spawn('askar', P.x+(i%3-1)*2, P.z-3-(i>2?2:0));}); 
  for (let k=0;k<30;k++){ await skip(); await p.keyboard.press('KeyJ'); await p.waitForTimeout(260); if (k==12) await shot('cb1'); if (k==20) await shot('cb2'); }
  await L.info('i'); console.log('hc', await p.evaluate(()=>document.getElementById('hc').textContent));
};
