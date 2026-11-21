module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 120000 });
  await p.waitForTimeout(2500);
  for (let i = 0; i < 8; i++) { await p.mouse.click(640, 300); await p.waitForTimeout(250); }
  await p.evaluate(async () => { const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); const THREE = T.THREE; const c = T.camera; const e = __G.player;
    c.position.set = function () { return this; }; c.lookAt = function () { THREE.Vector3.prototype.set.call(c.position, e.x + 4.5, 1.6, e.z + 1.0); THREE.Object3D.prototype.lookAt.call(c, e.x, .7, e.z); }; __G.player.rot = 0; });
  await p.waitForTimeout(400); await shot('r0');
  await p.evaluate(() => { __G.steps = 1; __G.ts = .12; }); await p.keyboard.down('KeyS'); await p.waitForTimeout(80); await p.keyboard.press('KeyK'); await p.keyboard.up('KeyS');
  await p.evaluate(() => { __G.paused = false; }); 
  for (const n of ['r1', 'r2', 'r3', 'r4', 'r5']) { await p.waitForTimeout(650); await shot(n); }
};
