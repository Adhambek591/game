module.exports = async (p, shot) => {
  for (let i=0;i<10;i++){ await p.waitForTimeout(5000); const s = await p.evaluate(()=>({load:(document.getElementById('load')||{}).className, tl:(document.getElementById('title')||{}).className, txt:(document.querySelector('#load')||{}).innerText, G:!!window.__G})); console.log(i, JSON.stringify(s).slice(0,300)); }
  await shot('ld');
};
