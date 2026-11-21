module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(2500);
  console.log(await p.evaluate(async () => {
    const T = await import('./js/engine.js'); const THREE = T.THREE; const out = []; const v = new THREE.Vector3();
    for (const e of __G.ents) { let hy = 0, nm=''; e.o.updateMatrixWorld(true); e.o.traverse(o => { if (o.isBone && /head/i.test(o.name)) { o.getWorldPosition(v); if (v.y > hy) { hy = v.y; nm=o.name; } } }); out.push(e.type + ' head=' + hy.toFixed(2)+' '+nm); }
    return out.join('\n');
  }));
  await shot('hz2');
};
