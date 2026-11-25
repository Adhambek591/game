// Story slots check: every narration still + text + skip, every lore card. usage: node runp.cjs "lang=uz" 844 390 story_check.js shotprefix
module.exports = async (p, shot) => {
  for (let i = 0; i < 120; i++) { if (await p.evaluate("!!(window.__T&&document.getElementById('tplay').style.display==='block')")) break; await p.waitForTimeout(500); }
  const L = [['v1','nar1','p_su'],['v2','nar2','p_al'],['k1','nark1','keyart'],['v3','nar3m'],['v4','nar4'],[null,'nar5','ruins'],['c2','nar6','ruins'],['c3','nar7','ruins'],['c4','nar8','ruins'],['c5','nar9','ruins'],['c6','nar10','ruins'],['c7','nar11','ruins'],['e1','nar12','keyart'],['e2','nar13','ruins']];
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [k, n, s] of L) {
    if (only && !only.includes(n)) continue;
    await p.evaluate(`window.__cd=0;__T.cut(${JSON.stringify(k)},'${n}',${JSON.stringify(s||null)}).then(()=>window.__cd=1)`);
    await p.waitForTimeout(1600);
    const r = await p.evaluate(`(()=>{const c=document.getElementById('cut'),st=c.querySelector('.still'),bg=st.style.backgroundImage.match(/img\\/(.*?)\\.jpg/);return {on:c.classList.contains('on'),still:bg&&bg[1],txt:document.getElementById('cnar').textContent.slice(0,70),skip:document.getElementById('cskip').textContent,vis:getComputedStyle(document.getElementById('cnar')).display}})()`);
    await shot(n);
    await p.evaluate("document.getElementById('cskip').click()"); await p.waitForTimeout(500);
    const d = await p.evaluate("window.__cd===1&&!document.getElementById('cut').classList.contains('on')");
    const ok = await p.evaluate(`new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth);i.onerror=()=>r(0);i.src='./assets/img/${r.still}.jpg'})`);
    console.log('[slot] ' + n + ' ' + JSON.stringify(r) + ' imgW=' + ok + ' skipped=' + d);
  }
  if (process.env.NOLORE) return;
  for (const k of ['lore0','lore_sur','lore1','lore2','lore3','lore4','lore5','lore6','lore7']) {
    await p.evaluate(`window.__ld=0;__T.lore('${k}').then(()=>window.__ld=1)`); await p.waitForTimeout(700);
    const r = await p.evaluate(`(()=>{const e=document.getElementById('lore');return {on:e.classList.contains('on'),h:e.querySelector('h3').textContent,p:e.querySelector('p').textContent.slice(0,60)}})()`);
    if (k === 'lore0') await shot(k);
    await p.evaluate("document.querySelector('#lore button').click()"); await p.waitForTimeout(300);
    console.log('[lore] ' + k + ' ' + JSON.stringify(r) + ' closed=' + await p.evaluate('window.__ld===1'));
  }
};
