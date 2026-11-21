module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  for (let i = 0; i < 10; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(300); }
  console.log(await p.evaluate(async () => {
    const T = await import('./js/engine.js'); const THREE = T.THREE; const out = [];
    for (const e of __G.ents) { const b = new THREE.Box3().setFromObject(e.o); out.push(e.type + ' vs=' + e.vs.toFixed(2) + ' h=' + (b.max.y - b.min.y).toFixed(2)); }
    const w = []; T.world.children.slice(0,400).forEach(o => { if (o.isMesh || o.isGroup) { const b = new THREE.Box3().setFromObject(o); const h=b.max.y-b.min.y; if (h > 2) w.push(h.toFixed(1)); } });
    return out.join('\n') + '\nworld tall objs: ' + w.join(' ');
  }));
  await shot('hz1');
};
