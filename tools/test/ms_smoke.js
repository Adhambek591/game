module.exports = async (p, shot) => {
  const t0 = Date.now();
  await p.waitForFunction(() => window.__G && window.__MS && __G.mis, null, { timeout: 120000 });
  await p.evaluate(() => window.__MS.auto(true, 8));
  try { await p.waitForFunction(() => __G.player && !__G.paused && document.getElementById('hud').classList.contains('on'), null, { timeout: 90000 }); } catch (e) { console.log('[smoke] not live'); }
  await p.waitForTimeout(+(process.env.RUNS || 20) * 1000);
  console.log('[smoke]', await p.evaluate(() => JSON.stringify({ id: __G.mis.id, p: __G.player ? [__G.player.x | 0, __G.player.z | 0] : null, en: __G.ents.filter(e => e.team === 'enemy' && !e.dead).length, obj: document.getElementById('obj').textContent.slice(0, 60), t: __G.time | 0, end: document.getElementById('end').classList.contains('on') })), ((Date.now() - t0) / 1000) | 0);
  if (process.env.SHOT) await shot(process.env.SHOT);
};
