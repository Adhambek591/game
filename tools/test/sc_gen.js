module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G, null, { timeout: 90000 }); const t0 = Date.now(), ch = process.env.SCN, z = +(process.env.Z || -40), x = +(process.env.PX || 0);
  const skip = async () => { await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); if (document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click(); if (__G.player && __G.player.mounted) __T.kill(); }); const v = p.viewportSize(); if (await p.evaluate(() => document.getElementById('dlg').classList.contains('on'))) await p.mouse.click(v.width / 2, v.height / 2); };
  while (Date.now() - t0 < 300000) { await skip(); if (await p.evaluate(c => String(window.__SCN) === c && __G.player && !__G.player.mounted && !__G.paused, ch)) break; await p.waitForTimeout(500); }
  for (let i = 0; i < 10; i++) { await skip(); await p.waitForTimeout(400); }
  console.log('ready', Date.now() - t0, 'colB', await p.evaluate(() => __G.colB.length));
  await p.evaluate(([x, z]) => { __T.kill(); const P = __G.player; P.x = x; P.z = z; let i = 0; for (const e of __G.ents) if (e.team === 'ally' && e !== P) { e.x = x + (i % 2 ? 2.4 : -2.4); e.z = z + 2 + (i >> 1) * 1.5; i++; } }, [x, z]);
  await p.waitForTimeout(4000); await p.evaluate(() => { __G.freeze = true; });
  console.log('rafs/3s', await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); })), 'R', await p.evaluate(() => JSON.stringify(window.__R && window.__R())));
  await shot(process.env.NAME);
};
