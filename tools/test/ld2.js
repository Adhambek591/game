module.exports = async (p, shot) => {
  for (let i=0;i<8;i++){ await p.waitForTimeout(5000); const s = await p.evaluate(()=>({lt:(document.getElementById('loadtxt')||{}).innerText, lb:(document.getElementById('loadbar')||{}).style&&document.getElementById('loadbar').style.width, tl:document.getElementById('title').className, tdisp:getComputedStyle(document.getElementById('title')).display, btn:!!document.getElementById('tplay'), btnv:document.getElementById('tplay')&&getComputedStyle(document.getElementById('tplay')).display})); console.log(i, JSON.stringify(s)); }
};
