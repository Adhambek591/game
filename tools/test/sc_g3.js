module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G, null, { timeout: 90000 }); const t0 = Date.now();
  const skip = async () => { await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); if (document.getElementById('cut').classList.contains('on')) document.getElementById('cskip').click(); }); const v = p.viewportSize(); if (await p.evaluate(() => document.getElementById('dlg').classList.contains('on'))) await p.mouse.click(v.width / 2, v.height / 2); };
  while (Date.now() - t0 < 170000) { await skip(); if (await p.evaluate(() => String(window.__SCN) === '3' && __G.player && !__G.paused)) break; await p.waitForTimeout(500); }
  for (let i = 0; i < 12; i++) { await skip(); await p.waitForTimeout(400); }
  console.log('ready', Date.now() - t0, await p.evaluate(() => __G.paused));
  await p.evaluate(() => { __T.kill(); const P = __G.player; P.x = 9; P.z = -76; }); await p.waitForTimeout(800);
  console.log('in-river push (x9,z-76) ->', await p.evaluate(() => [__G.player.x.toFixed(1), __G.player.z.toFixed(1)].join(',')));
  await p.evaluate(() => { const P = __G.player; P.x = 0; P.z = -76; }); await p.waitForTimeout(800);
  console.log('on bridge (x0,z-76) ->', await p.evaluate(() => [__G.player.x.toFixed(1), __G.player.z.toFixed(1)].join(',')));
  await p.evaluate(() => { const P = __G.player; P.x = 0; P.z = -92; for (const e of __G.ents) if (e.team === 'ally' && e !== P) { e.x = 9 * (Math.random() < .5 ? -1 : 1); e.z = -66; } });
  for (let i = 0; i < 10; i++) { await skip(); await p.waitForTimeout(700); }
  console.log('allies after 7s (player z-92):', await p.evaluate(() => JSON.stringify(__G.ents.filter(e => e.team === 'ally' && e !== __G.player).map(e => [e.x | 0, e.z | 0]))));
  await p.evaluate(() => { const P = __G.player; P.x = 2; P.z = -70; __G.freeze = true; }); await p.waitForTimeout(2500);
  console.log('fps', await p.evaluate(() => __G.fps | 0)); await shot('sc_g3');
};
