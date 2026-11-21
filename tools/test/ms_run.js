// auto-plays the mission given by ?start=mX-Y and waits for the end screen
module.exports = async (p, shot) => {
  const TMAX = +(process.env.TMAX || 600), SH = process.env.SHOT || 'ms_x';
  const t0 = Date.now();
  await p.waitForFunction(() => window.__G && window.__MS && __G.mis, null, { timeout: 120000 });
  await p.evaluate(() => { window.__MS.auto(true, 8); });
  let shotMid = false;
  while ((Date.now() - t0) / 1000 < TMAX) {
    await p.waitForTimeout(15000);
    const s = await p.evaluate(() => JSON.stringify({ id: __G.mis && __G.mis.id, end: document.getElementById('end').classList.contains('on'), paused: __G.paused, fps: __G.fps | 0, p: __G.player ? [__G.player.x | 0, __G.player.z | 0, __G.player.hp | 0] : null, en: __G.ents.filter(e => e.team === 'enemy' && !e.dead).length, obj: document.getElementById('obj').textContent, boss: __G.boss ? __G.boss.hp | 0 : null, t: __G.time | 0 })).catch(e => 'ERR ' + e.message);
    console.log('[st]', ((Date.now() - t0) / 1000) | 0, s);
    if (!shotMid && /"paused":false/.test(s) && process.env.MID) { shotMid = true; await p.evaluate(() => window.__MS.auto(false)); await p.waitForTimeout(+process.env.MID * 1000); await shot(SH + '_play'); await p.evaluate(() => window.__MS.auto(true, 8)); }
    if (/"end":true/.test(s)) { await p.waitForTimeout(3000); await shot(SH + '_end'); console.log('[end]', await p.evaluate(() => document.getElementById('eh').textContent + ' | ' + document.getElementById('stl').textContent + ' | ' + localStorage.qq_stars)); break; }
  }
};
