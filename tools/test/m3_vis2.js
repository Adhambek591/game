// canvas grabs via rAF + toDataURL (no compositor wait); fly-over frames then soft-bot play
const fs = require('fs');
module.exports = async (p) => {
  const N = process.env.NAME || 'm3w', K = +(process.env.NSHOT || 6), ST = +(process.env.SHOTSTEP || 8000), FLY = +(process.env.FLY ?? 3);
  const grab = async (name) => { const d = await p.evaluate(() => new Promise(r => requestAnimationFrame(() => { const c = document.querySelector('canvas'); r(c.toDataURL('image/jpeg', .72)); }))); fs.writeFileSync('/home/user/t/' + name + '.jpg', Buffer.from(d.split(',')[1], 'base64')); };
  await p.waitForFunction(() => window.__G && window.__MS && __G.mis && __G.player, null, { timeout: 300000 });
  if (process.env.EVAL) await p.evaluate(process.env.EVAL);
  let f = 0; const t0 = Date.now();
  while (FLY && Date.now() - t0 < 120000) { const s = await p.evaluate(() => ({ fly: !!__G.flying, d: __G.flyDbg ? __G.flyDbg() : null, lb: [...document.querySelectorAll('.flylbl,.flycard,[class*=fly]')].map(e => e.textContent.trim()).filter(Boolean).join('|').slice(0, 120) })); if (!s.fly) { if (f) break; await p.waitForTimeout(300); continue; } if (f < FLY && s.d && s.d.el > f * 2.6 + .8) { await grab(N + '_fly' + f); console.log('[fly]', f, JSON.stringify(s)); f++; } await p.waitForTimeout(200); }
  await p.evaluate(() => { __MS.auto(true, 1, 1, 1, true); });
  for (let i = 0; i < K; i++) { await p.waitForTimeout(ST); await grab(N + '_' + i); console.log('[s]', i, await p.evaluate(() => JSON.stringify({ t: __G.time | 0, pz: __G.player.z | 0, cv: __G.mis.cv ? [__G.mis.cv.z | 0, __G.mis.cv.pool | 0] : 0, obj: document.getElementById('obj').textContent.slice(0, 60), hint: document.getElementById('hint').textContent.slice(0, 60) }))); }
};
