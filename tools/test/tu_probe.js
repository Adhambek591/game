module.exports = async (p, shot) => {
  const t1 = Date.now(); while (Date.now() - t1 < 150000) { const ok = await p.evaluate(() => !!(window.__MS && document.getElementById('tplay') && document.getElementById('tplay').style.display === 'block')).catch(() => false); if (ok) break; await p.waitForTimeout(700); }
  await p.evaluate(() => { document.getElementById('title').style.display = 'none'; __MS.run(process_id = '3-S'); }).catch(e => console.log('e1', e.message));
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(6000); console.log('[pr]', await p.evaluate(() => { const A = window.__QQBOW; return JSON.stringify({ gt: __G.time.toFixed(1), paused: __G.paused, fr: __G.freeze, S: A && A.S ? { t: A.S.t.toFixed(1), over: A.S.over } : null, tick: !!__G.tick, pl: !!__G.player }); }).catch(e => 'ERR ' + e.message)); }
};
