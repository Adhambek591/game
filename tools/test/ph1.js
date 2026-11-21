module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G && __G.player, null, { timeout: 90000 });
  let n=0;
  for (let k=0;k<14;k++){ await p.waitForTimeout(1800);
    await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click();});
    await L.dlg(800);
    if (!(await p.evaluate(()=>__G.paused)) && n<3) { await shot('ph_'+(n++)); await p.keyboard.down('KeyW'); await p.waitForTimeout(600); await p.keyboard.up('KeyW'); }
  }
  await L.info('i');
};
