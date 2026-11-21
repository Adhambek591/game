module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(2000);
  for (let i = 0; i < 8; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(200); }
  await p.evaluate(async () => { const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); const THREE = T.THREE; const c = T.camera; const e = __G.player; __G.ts = .25;
    c.position.set = function () { return this; }; c.lookAt = function () { THREE.Vector3.prototype.set.call(c.position, e.x - 2.4, 2.0, e.z - 3.2); THREE.Object3D.prototype.lookAt.call(c, e.x, 1.0, e.z); }; T.gradePass.uniforms.tilt.value = 0; });
  await p.waitForTimeout(300); await shot('k0');
  await p.keyboard.press('KeyJ'); for (const n of ['k1', 'k2', 'k3']) { await p.waitForTimeout(450); await shot(n); }
  await p.keyboard.press('KeyK'); for (const n of ['k4', 'k5']) { await p.waitForTimeout(600); await shot(n); }
};
