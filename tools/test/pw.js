module.exports = async (p, shot) => {
  const L = require('./lib.js')(p); await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const skip = async () => { await p.evaluate(()=>{const b=document.querySelector('#lore.on button'); if(b) b.click(); if(document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click();}); await L.dlg(400); };
  for (let k=0;k<20;k++){ await p.waitForTimeout(1000); await skip(); if (await p.evaluate(()=>!!(__G.player && !__G.paused))) break; }
  console.log('powers', await p.evaluate(()=>JSON.stringify(__G.powers)));
  await p.evaluate(()=>{const P=__G.player; for(let i=0;i<5;i++) __T.spawn('askar', P.x+(i-2)*2, P.z-4);});
  for (const key of ['Digit1','Digit2','Digit8','KeyK','Digit9','Digit0']) { await p.keyboard.press(key); await p.waitForTimeout(900); await skip(); }
  await shot('pw1');
  console.log('vis', await p.evaluate(()=>[...document.querySelectorAll('#btns > *')].filter(b=>b.offsetParent).map(b=>b.id+':'+b.textContent.slice(0,2)).join(' ')));
  await L.info('i');
};
