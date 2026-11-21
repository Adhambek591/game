module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  for (let k=0;k<40;k++){ await p.waitForTimeout(1500); await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); const c=document.getElementById('cskip'); if(document.getElementById('cut').classList.contains('on')) c.click();}); await L.dlg(500); await p.keyboard.press('KeyJ'); if(k==15) await shot('sm2'); }
  await L.info('i');
};
