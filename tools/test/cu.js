module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(2500);
  for (let i = 0; i < 8; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(250); }
  const setcam = async (who, dx, dy, dz, ty) => p.evaluate(async ([who, dx, dy, dz, ty]) => {
    const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); const THREE = T.THREE; const c = T.camera; const e = who === 'p' ? __G.player : __G.ents.find(x => x.type === who);
    window.__cf = () => { const px = e.x + dx, py = dy, pz = e.z + dz; THREE.Vector3.prototype.set.call(c.position, px, py, pz); THREE.Object3D.prototype.lookAt.call(c, e.x, ty, e.z); };
    c.position.set = function () { return this; }; c.lookAt = function () { window.__cf(); };
  }, [who, dx, dy, dz, ty]);
  await setcam('p', -1.6, 1.8, -2.6, 1.1); await p.waitForTimeout(600); await shot('cu1');
  await setcam('son', 1.0, 1.9, -1.9, 1.1); await p.waitForTimeout(600); await shot('cu2');
  await p.evaluate(() => { __G.paused = false; }); await setcam('p', 0, 30, 30, 0); await p.evaluate(() => { const c = window.__cf; window.__cf = () => { c(); }; });
};
