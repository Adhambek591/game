module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(2000); await p.keyboard.press('KeyH'); await p.waitForTimeout(800);
  console.log(await p.evaluate(() => JSON.stringify({ m: __G.player.mounted, y: __G.player.rig.mountY, hip: __G.player.rig.hipY0 })));
  await p.evaluate(async () => { const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); const THREE = T.THREE, c = T.camera; const e = __G.player; T.gradePass.uniforms.tilt.value = 0;
    c.position.set = function () { return this; }; c.lookAt = function () { THREE.Vector3.prototype.set.call(c.position, e.x + 4.2, 2.6, e.z + 2.2); THREE.Object3D.prototype.lookAt.call(c, e.x, 1.4, e.z); }; });
  await p.waitForTimeout(500); await shot('h1');
  await p.keyboard.down('KeyW'); await p.waitForTimeout(700); await shot('h2'); await p.waitForTimeout(250); await shot('h3'); await p.keyboard.up('KeyW');
};
