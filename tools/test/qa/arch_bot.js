// Archery (sniper) missions 3-S / 5-S / 6-S autoplayer for QA: uses archery.js's own test API (window.__ARCH: aimAt / shoot / S).
// Dismisses dialogs, shoots every live guard (head shot), then ropes if the level has them, until the end screen. Real-time; not a skill test.
window.__archBot = async (maxSec = 120) => {
  const A = window.__ARCH, G = __G, t0 = performance.now(), log = [];
  const endOn = () => { const e = document.getElementById('end'); return e && e.classList.contains('on'); };
  while ((performance.now() - t0) / 1000 < maxSec && !endOn()) {
    if (document.getElementById('dlg').classList.contains('on') && G.onEnter) G.onEnter();
    const lore = document.querySelector('#lore.on button'); if (lore) lore.click();
    const S = A.S; if (!S || !S.run) { await new Promise(r => setTimeout(r, 300)); continue; }
    { const go = [...document.querySelectorAll('#arch .go, .go')].find(b => b.offsetParent !== null && getComputedStyle(b).display !== 'none'); if (go && !(S.guards || []).some(g => g && g.e && !g.dead && g.on !== false && g.mode !== 'rush')) { go.click(); go.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); log.push('go'); } }   // 5-S: send the maidens to the next cover once the watchers are down
    if (S.reload > 0 || S.flying && S.flying.length) { await new Promise(r => setTimeout(r, 120)); continue; }
    const gi = (S.guards || []).findIndex(g => g && g.e && !g.e.dead && !g.dead);
    if (gi >= 0) { A.aimAt(gi, { head: true }); A.shoot(); log.push('g' + gi); }
    else { const ri = (S.ropes || []).findIndex(r => r && !r.cut && !r.dead); if (ri >= 0 && A.aimAtPt) { const r = S.ropes[ri], m = r.a && r.b ? [(r.a[0] + r.b[0]) / 2, (r.a[1] + r.b[1]) / 2, (r.a[2] + r.b[2]) / 2] : [r.x, r.y, r.z]; A.aimAtPt(m[0], m[1], m[2]); A.shoot(); log.push('r' + ri); } }   // rope = segment a..b: aim at its middle
    await new Promise(r => setTimeout(r, 450));
  }
  const S = A.S || {}; return { end: endOn(), sec: +((performance.now() - t0) / 1000).toFixed(0), shots: S.shots, kills: S.kills, alarm: S.alarm, eh: endOn() ? document.getElementById('eh').textContent + ' | ' + document.getElementById('stl').innerText.split('\n').join(' / ') : null, n: log.length };
};
