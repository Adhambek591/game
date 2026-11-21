module.exports = async (p, shot) => {
  await p.waitForFunction(() => document.getElementById('tplay').style.display === 'block', null, { timeout: 70000 });
  await p.evaluate(() => document.getElementById('tplay').click());
  await p.waitForFunction(() => window.__G && __G.player, null, { timeout: 40000 });
  await p.waitForTimeout(2000);
  console.log(await p.evaluate(async () => { const m = await import('./js/env.js'); const E = m.ENV; return JSON.stringify({ ok: E.ok, pbr: Object.keys(E.pbr), mod: Object.fromEntries(Object.entries(E.mod).map(([k, v]) => [k, v.length + ':' + (v[0] && v[0].geometry.boundingSphere ? 1 : 0)])) }); }));
  console.log(await p.evaluate(async () => { const m = await import('./js/engine.js'); let n = 0, sz = []; m.world.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count > 500) { n++; if (sz.length < 5) { o.geometry.computeBoundingSphere(); sz.push((o.geometry.boundingSphere.radius * o.scale.x).toFixed(2)); } } }); return 'bigmeshes ' + n + ' r=' + sz.join(','); }));
};
