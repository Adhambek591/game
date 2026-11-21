module.exports = async (p, shot) => {
  const t0 = Date.now(); while (Date.now() - t0 < 200000) { const ok = await p.evaluate(() => !!(window.__TUT_R && __G.mis && __G.mis.id === '0-0' && document.getElementById('tuskip'))).catch(() => false); if (ok) break; await p.waitForTimeout(700); }
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const b = document.getElementById('tuskip'); const vis = getComputedStyle(b).display; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return vis; });
  console.log('[skip] clicked, display was', r);
  for (let i = 0; i < 12; i++) { await p.waitForTimeout(4000); const s = await p.evaluate(() => JSON.stringify({ mis: __G.mis && __G.mis.id, tut: localStorage.getItem('qq_tut'), stars: localStorage.getItem('qq_stars'), hidden: document.querySelectorAll('#btns .ab.tuhide').length, card: getComputedStyle(document.getElementById('tuc')).display, pow: __G.powers, lore: !!document.querySelector('#lore.on'), cut: document.getElementById('cut').classList.contains('on') })).catch(e => 'ERR ' + e.message); console.log('[s]', s); if (/"mis":"0-1"/.test(s)) { await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); }); } }
};
