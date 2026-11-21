// teleport test: skip fly-over, move the hero to TZ, then screenshots every STEP ms (with the soft bot on after the intro)
module.exports = async (p) => {
  const N = process.env.NAME || 'dv', K = +(process.env.NSHOT || 5), ST = +(process.env.STEP || 5000), TZ = +(process.env.TZ || 0), TX = +(process.env.TX || 0), BOT = process.env.BOT !== '0';
  await p.waitForFunction(() => window.__G && window.__MS && __G.mis && __G.player, null, { timeout: 300000 });
  await p.evaluate(async () => { const v = (await (await fetch('./js/story.js')).text()).match(/engine\.js\?v=(\d+)/)[1]; const E = await import('/js/engine.js?v=' + v); const r = E.renderer, o = r.render.bind(r); window.__nr = false; r.render = function (...a) { if (!window.__nr) return o(...a); }; });
  const sh = async n => { await p.evaluate(() => { window.__nr = true; }); await p.waitForTimeout(400); await p.screenshot({ path: '/home/user/t/' + n + '.jpg', type: 'jpeg', quality: 70, timeout: 120000 }).catch(e => console.log('shotfail', n, String(e).slice(0, 90))); await p.evaluate(() => { window.__nr = false; }); };
  for (let i = 0; i < 300; i++) { const s = await p.evaluate(() => ({ fly: !!__G.flying, p: __G.paused })); if (s.fly) { await p.keyboard.press('Enter'); } if (!s.fly && i > 10) break; await p.waitForTimeout(300); }
  await p.evaluate(() => { const b = document.querySelector('#dlg.on'); }); 
  await p.evaluate(([x, z]) => { const P = __G.player; if (z) { P.x = x; P.z = z; if (__G.cam) { __G.cam.x = x; __G.cam.z = z; } } }, [TX, TZ]);
  if (BOT) await p.evaluate(() => { __MS.auto(true, 1, 1, 1, true); });
  for (let i = 0; i < K; i++) { await p.waitForTimeout(ST); await sh(N + '_' + i); console.log('[s]', i, await p.evaluate(() => JSON.stringify({ t: __G.time | 0, pz: __G.player.z | 0, boss: __G.boss ? __G.boss.d.name : '', obj: document.getElementById('obj').textContent.slice(0, 50), en: __G.ents.filter(e => e.team === 'enemy' && !e.dead).length, res: (__G.mis.res || []).map(g => [g.kind, g.on ? 1 : 0, g.freed ? 1 : 0, Math.ceil(g.T), g.el.style.display, g.el.style.left, g.el.style.top, g.el.parentNode && g.el.parentNode.id]) }))); }
};
