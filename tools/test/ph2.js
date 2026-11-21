module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G && __G.player, null, { timeout: 90000 });
  let n=0;
  for (let k=0;k<12;k++){ await p.waitForTimeout(1600);
    await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click();});
    await L.dlg(800);
    if (!(await p.evaluate(()=>__G.paused)) && n<2) { await shot('pq_'+(n++)); }
  }
  await p.click('#bset'); await p.waitForTimeout(500); await shot('pq_set'); await L.info('i');
};
