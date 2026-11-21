module.exports = async (p, shot) => {
  const ID = process.env.MID || '3-S';
  const t0 = Date.now(); while (Date.now() - t0 < 150000) { const ok = await p.evaluate(() => !!(window.__MS && window.__G && document.getElementById('tplay') && document.getElementById('tplay').style.display === 'block')).catch(() => false); if (ok) break; await p.waitForTimeout(1500); }
  await p.evaluate(id => { window.__ARCH_NOINTRO = true; document.getElementById('title').style.display = 'none'; window.__fr = 0; const f = () => { window.__fr++; requestAnimationFrame(f); }; f(); window.__MS.run(id); }, ID);
  const st = async (lab) => console.log('[st]', lab, ((Date.now() - t0) / 1000) | 0, await p.evaluate(() => JSON.stringify({ fr: window.__fr, on: document.getElementById('arch') && document.getElementById('arch').className, t: window.__QQBOW && __QQBOW.S ? +__QQBOW.S.t.toFixed(1) : null, ts: __G.ts, frz: __G.freeze, p: __G.paused })).catch(e => 'ERR ' + e.message.slice(0, 80)));
  for (let i = 0; i < 5; i++) { await p.waitForTimeout(5000); await st("a"); }
  await p.evaluate(() => { document.getElementById('arch').style.display = 'none'; }); for (let i = 0; i < 3; i++) { await p.waitForTimeout(5000); await st('archhidden'); }
  await p.evaluate(() => { document.getElementById('arch').style.display = ''; __G.tick = null; }); for (let i = 0; i < 3; i++) { await p.waitForTimeout(5000); await st('notick'); }
};
