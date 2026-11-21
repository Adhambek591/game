// real-render look: fly-over frames, then play with the soft bot and shoot every SHOTSTEP s of wall time
module.exports = async (p, shot) => {
  const N = process.env.NAME || 'm3v', K = +(process.env.NSHOT || 6), ST = +(process.env.SHOTSTEP || 8000);
  await p.waitForFunction(() => window.__G && window.__MS && __G.mis && __G.player, null, { timeout: 200000 });
  let f = 0; const t0 = Date.now();
  while (Date.now() - t0 < 90000) { const s = await p.evaluate(() => ({ fly: !!__G.flying, d: __G.flyDbg ? __G.flyDbg() : null })); if (!s.fly) { if (f) break; await p.waitForTimeout(400); continue; } if (f < 3 && s.d && s.d.el > f * 3 + 1) { await shot(N + '_fly' + f); f++; } await p.waitForTimeout(300); }
  await p.evaluate((cvs) => { __MS.auto(true, 1, 1, 1, true); }, 0);
  for (let i = 0; i < K; i++) { await p.waitForTimeout(ST); await shot(N + '_' + i); console.log('[s]', i, await p.evaluate(() => JSON.stringify({ t: __G.time | 0, cv: __G.mis.cv ? [__G.mis.cv.z | 0, __G.mis.cv.pool | 0] : 0, obj: document.getElementById('obj').textContent.slice(0, 60) }))); }
};
