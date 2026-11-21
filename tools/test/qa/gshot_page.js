// Graphics review shots: render the running mission at full resolution, frame-exact (works with a hidden pane), and PUT JPEGs to /__rec/.
// Usage (mission loaded and started): await __gshot({ name: 'g11', frames: 1, settle: 30 })
window.__gshot = async (o = {}) => {
  const E = window.__E || (window.__E = await import(new URL('./js/engine.js?v=' + (await (await fetch('./js/story.js')).text()).match(/engine\.js\?v=(\d+)/)[1], location.href).href));
  const cv = document.querySelector('canvas'); if (E.renderer.getPixelRatio() !== 1) { E.renderer.setPixelRatio(1); dispatchEvent(new Event('resize')); await new Promise(z => setTimeout(z, 500)); }
  // take the ENGINE's frame(): start() hands it to rAF synchronously; every other rAF user keeps running normally
  const r0 = window.requestAnimationFrame; let eng = null, grab = true;
  window.requestAnimationFrame = cb => { if (grab) { eng = cb; grab = false; return 0; } if (cb === eng) return 0; return r0(cb); };
  E.start();
  let clock = performance.now(); const step = () => { clock += 1000 / 30; eng(clock); };
  for (let i = 0; i < (o.settle || 30); i++) step();
  const out = [];
  for (let i = 1; i <= (o.frames || 1); i++) { for (let k = 0; k < (o.every || 1); k++) step(); const b = await new Promise(z => cv.toBlob(z, 'image/jpeg', .92)); const n = (o.name || 'g') + '_' + i + '.jpg'; await fetch('/__rec/' + n, { method: 'PUT', body: b }); out.push(n); }
  window.requestAnimationFrame = r0; r0(eng);
  const inf = E.renderer.info.render; return { out, size: [cv.width, cv.height], calls: inf.calls, tris: inf.triangles, t: +window.__G.time.toFixed(1) };
};
