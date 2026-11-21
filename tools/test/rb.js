module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(1200); const v = p.viewportSize(); for (let i = 0; i < 8; i++) { await p.mouse.click(v.width / 2, v.height / 2); await p.waitForTimeout(200); }
  await p.evaluate(async () => { const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); const THREE = T.THREE, c = T.camera; const e = __G.player; T.gradePass.uniforms.tilt.value = 0;
    c.position.set = function () { return this; }; c.lookAt = function () { THREE.Vector3.prototype.set.call(c.position, e.x + 2.2, 2.0, e.z + 3.4); THREE.Object3D.prototype.lookAt.call(c, e.x, 1.1, e.z); }; });
  await p.waitForTimeout(700); await shot('rb1'); await p.keyboard.down('KeyW'); await p.waitForTimeout(900); await shot('rb2'); await p.waitForTimeout(500); await shot('rb3'); await p.keyboard.up('KeyW');
};
