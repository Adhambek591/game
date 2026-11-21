module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(2000);
  for (let i = 0; i < 8; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(200); }
  await p.evaluate(async () => { const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); const THREE = T.THREE; const c = T.camera; const e = __G.player; __G.paused = true;
    c.position.set = function () { return this; }; c.lookAt = function () { THREE.Vector3.prototype.set.call(c.position, e.x - 1.6, 1.7, e.z - 2.4); THREE.Object3D.prototype.lookAt.call(c, e.x, 1.0, e.z); }; T.gradePass.uniforms.tilt.value = 0; });
  const V = [[0, 0, 0], [Math.PI / 2, 0, 0], [-Math.PI / 2, 0, 0], [0, 0, Math.PI / 2], [0, 0, -Math.PI / 2], [Math.PI, 0, 0]];
  for (let i = 0; i < V.length; i++) { await p.evaluate(v => { const m = __G.player.rig.wm; m.rotation.set(v[0], v[1], v[2]); m.position.set(0, 0, 0); }, V[i]); await p.waitForTimeout(350); await shot('wq' + i); }
};
