module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(2500); await shot('w1');
  await p.keyboard.down('KeyW'); await p.waitForTimeout(2500); await p.keyboard.up('KeyW'); await p.waitForTimeout(1500); await shot('w2');
  console.log(await p.evaluate(() => __G.ents.map(e => e.type + ':' + e.curName).join(' ')));
  await p.evaluate(async () => { const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); const THREE = T.THREE, c = T.camera; const e = __G.player; T.gradePass.uniforms.tilt.value = 0;
    c.position.set = function () { return this; }; c.lookAt = function () { THREE.Vector3.prototype.set.call(c.position, e.x + 1.3, 1.4, e.z - 1.4); THREE.Object3D.prototype.lookAt.call(c, e.x + .3, 1.0, e.z); }; });
  await p.waitForTimeout(600); await shot('w3');
};
