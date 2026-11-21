module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  for (let k=0;k<30;k++){ await p.waitForTimeout(1000); await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();});
    if (await p.evaluate(()=>document.getElementById('dlg').classList.contains('on'))) { await p.waitForTimeout(800); await shot('dl1'); break; } }
};
