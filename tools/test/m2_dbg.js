module.exports = async (p, shot) => {
  for (let i = 0; i < 45; i++) { await p.waitForTimeout(5000);
    const s = await Promise.race([p.evaluate(() => { window.__fc = window.__fc || (() => { let n = 0; const f = () => { n++; requestAnimationFrame(f); }; f(); return () => n; })(); return JSON.stringify({ mis: window.__G && __G.mis && __G.mis.id, fly: window.__G && __G.flying, d: window.__G && __G.flyDbg && __G.flyDbg(), paused: window.__G && __G.paused, t: window.__G && +__G.time.toFixed(1), frames: window.__fc(), ents: window.__G && __G.ents.length, obj: document.getElementById('obj').textContent, dlg: document.getElementById('dlg').classList.contains('on') }); }), new Promise(r => setTimeout(() => r('EVAL-TIMEOUT'), 4500))]).catch(e => 'ERR ' + e.message.slice(0, 100));
    console.log('[dbg]', i, s); }
};
