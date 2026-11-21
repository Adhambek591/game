module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  const cam = (dx, dy, dz, ty, who) => p.evaluate(async ([dx, dy, dz, ty, who]) => { const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); const THREE = T.THREE, c = T.camera; const e = who ? __G.ents.find(x => x.type === who) : __G.player; T.gradePass.uniforms.tilt.value = 0;
    c.position.set = function () { return this; }; c.lookAt = function () { THREE.Vector3.prototype.set.call(c.position, e.x + dx, dy, e.z + dz); THREE.Object3D.prototype.lookAt.call(c, e.x, ty, e.z); }; }, [dx, dy, dz, ty, who]);
  await cam(-1.8, 1.7, -3.2, 1.0); await p.waitForTimeout(800); await shot('q1');
  await p.keyboard.down('KeyW'); await p.waitForTimeout(1200); await shot('q2'); await p.keyboard.up('KeyW');
  await p.evaluate(() => { __G.ts = .3; }); await p.keyboard.press('KeyJ'); await p.waitForTimeout(500); await shot('q3'); await p.evaluate(() => { __G.ts = 1; });
  await p.evaluate(() => { __G.steps = 3; }); await L.tp(-26); await p.waitForTimeout(2500); await p.evaluate(() => { __G.steps = 1; }); await cam(2.2, 1.8, -3.4, 1.0, 'askar'); await p.waitForTimeout(600); await shot('q4'); await cam(0, 9, 9, 0); await p.waitForTimeout(500); await shot('q5'); await p.waitForTimeout(700); await shot('q6');
  console.log(await p.evaluate(() => __G.ents.map(e => e.type + ':' + e.rig.kind + ':' + e.state + ':' + (e.rig.cur ? e.rig.cur.time.toFixed(2) : '')).join(' ')));
};
