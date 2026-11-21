// fly-over screenshots (full page incl. labels) then soft-bot play with page screenshots every SHOTSTEP ms
module.exports = async (p, shot) => {
  const N = process.env.NAME || 'm4v', K = +(process.env.NSHOT || 5), ST = +(process.env.SHOTSTEP || 9000), FLY = +(process.env.FLY ?? 3);
  const sh = async n => { await p.evaluate(() => { window.__nr = true; }); await p.waitForTimeout(400); await p.screenshot({ path: '/home/user/t/' + n + '.jpg', type: 'jpeg', quality: 70, timeout: 120000 }).catch(e => console.log('shotfail', n, String(e).slice(0, 90))); await p.evaluate(() => { window.__nr = false; }); };
  await p.waitForFunction(() => window.__G && window.__MS && __G.mis && __G.player, null, { timeout: 300000 });
  if (process.env.EVAL) await p.evaluate(process.env.EVAL);
  await p.evaluate(async () => { const v = (await (await fetch('./js/story.js')).text()).match(/engine\.js\?v=(\d+)/)[1]; const E = await import('/js/engine.js?v=' + v); const r = E.renderer, o = r.render.bind(r); window.__nr = false; r.render = function (...a) { if (!window.__nr) return o(...a); }; });
  let f = 0; const t0 = Date.now();
  while (FLY && Date.now() - t0 < 150000) { const s = await p.evaluate(() => ({ fly: !!__G.flying, d: __G.flyDbg ? __G.flyDbg() : null })); if (!s.fly) { if (f) break; await p.waitForTimeout(300); continue; } if (f < FLY && s.d && s.d.el > f * 2.8 + 1.2) { await p.evaluate(() => { __G.paused = true; }); await sh(N + '_fly' + f); await p.evaluate(() => { __G.paused = false; }); console.log('[fly]', f, JSON.stringify(s.d).slice(0, 200)); f++; } await p.waitForTimeout(150); }
  await p.evaluate(() => { __MS.auto(true, 1, 1, 1, true); });
  for (let i = 0; i < K; i++) { await p.waitForTimeout(ST); await p.evaluate(() => { __G.paused = true; }); await sh(N + '_' + i); await p.evaluate(() => { __G.paused = false; }); console.log('[s]', i, await p.evaluate(() => JSON.stringify({ t: __G.time | 0, pz: __G.player.z | 0, cv: __G.mis.cv ? [__G.mis.cv.z | 0, __G.mis.cv.pool | 0] : 0, obj: document.getElementById('obj').textContent.slice(0, 60) }))); }
};
