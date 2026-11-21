// env: Z PX NAME SPAWN=1 (spawn test enemies) WT
module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G, null, { timeout: 90000 }); const t0 = Date.now(), z = process.env.Z, x = +(process.env.PX || 0);
  const skip = async () => { await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); const c = document.getElementById('cut'); if (c && c.classList.contains('on')) document.getElementById('cskip').click(); for (const e of document.querySelectorAll('body > *')) if (/Rotate your phone/.test(e.textContent || '') && e.tagName !== 'SCRIPT' && !e.querySelector('canvas')) e.style.display = 'none'; }); const v = p.viewportSize(); if (await p.evaluate(() => { const d = document.getElementById('dlg'); return d && d.classList.contains('on'); })) await p.mouse.click(v.width / 2, v.height / 2); };
  while (Date.now() - t0 < 240000) { await skip(); if (await p.evaluate(() => window.__SCN !== undefined && __G.player && !__G.paused && !__G.camFn)) break; await p.waitForTimeout(500); }
  for (let i = 0; i < 8; i++) { await skip(); await p.waitForTimeout(400); }
  console.log('ready', Date.now() - t0, 'scn', await p.evaluate(() => window.__SCN));
  await p.evaluate(([x, z, sp]) => { const P = __G.player; if (z !== null) { __T.kill(); P.x = x; P.z = z; let i = 0; for (const e of __G.ents) if (e.team === 'ally' && e !== P) { e.x = x + (i % 2 ? 2.4 : -2.4); e.z = z + 2 + (i >> 1) * 1.5; i++; } }
    if (sp) { const Z = P.z, X = P.x; const L = [['askar', -3, -3], ['askar', 2.5, -3.5], ['archer', 4.5, -5], ['wolf', -5, -1], ['mage', 0, -6], ['askar', 5.5, 0.5]]; for (const [t, dx, dz] of L) { const e = __T.spawn(t, X + dx, Z + dz, 'enemy'); if (e) { e.speed = 0; e.cd = 99; } } if (!__G.ents.some(e => e.team === 'ally' && e !== P)) for (const [dx, dz] of [[-2.2, 1.5], [2.4, 1]]) __T.spawn('qiz', X + dx, Z + dz, 'ally'); } }, [x, z === undefined ? null : +z, !!process.env.SPAWN]).catch(e => console.log('ev', String(e).slice(0, 200)));
  await p.waitForTimeout(600); await p.evaluate(() => { const P = __G.player; if (__G.cam && P) { __G.cam.x = P.x; __G.cam.z = P.z; } }).catch(()=>0); await p.waitForTimeout(+(process.env.WT || 3500)); await p.evaluate(() => { __G.freeze = true; }); await p.waitForTimeout(800);
  console.log('CAM', await p.evaluate(() => JSON.stringify([__G.cam, !!__G.camFn, __G.camK, __G.paused, __G.player && [__G.player.x, __G.player.z]])));
  console.log('ENTS', await p.evaluate(() => JSON.stringify(__G.ents.map(e => [e.type, e.team, e.dead ? 'D' : '', e.gone ? 'G' : '', +e.x.toFixed(1), +e.z.toFixed(1), +(e.y||0).toFixed(1), e.o.visible, e.rig.constructor.name]))));
  console.log('R', await p.evaluate(() => JSON.stringify(window.__R && window.__R())));
  await shot(process.env.NAME);
};
