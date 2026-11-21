// screenshots along the intro fly-over, then a few seconds of play
module.exports = async (p, shot) => {
  const N = process.env.NAME || 'm2f';
  await p.waitForFunction(() => window.__G && window.__MS && __G.mis && __G.player, null, { timeout: 110000 });
  const t0 = Date.now(); let n = 0, last = -1;
  while (Date.now() - t0 < (+process.env.TMAX || 150) * 1000) {
    const s = await p.evaluate(() => ({ fly: !!__G.flying, d: __G.flyDbg ? __G.flyDbg() : null, paused: __G.paused, dlg: document.getElementById('dlg').classList.contains('on'), lore: document.getElementById('lore').classList.contains('on'), en: __G.ents.filter(e => e.team === 'enemy' && !e.dead).length, obj: document.getElementById('obj').textContent, fps: __G.fps | 0 }));
    if (s.lore) { await p.evaluate(() => document.getElementById('lore').querySelector('button').click()); continue; }
    if (s.fly && s.d) { const k = Math.floor(s.d.el / (+process.env.STEP || 1.6)); if (k !== last && n < 7) { last = k; await shot(N + '_' + n++); console.log('[fly]', JSON.stringify(s)); } }
    else if (n > 0 || Date.now() - t0 > 60000) { console.log('[after]', JSON.stringify(s)); if (s.dlg) { await p.evaluate(() => __G.onEnter && __G.onEnter()); await p.waitForTimeout(500); continue; } await p.waitForTimeout(4000); await shot(N + '_play'); break; }
    await p.waitForTimeout(300);
  }
};
