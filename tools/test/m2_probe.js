module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && window.__MS && __G.mis && __G.player, null, { timeout: 110000 });
  const r = await p.evaluate(async () => {
    const src = [...document.querySelectorAll('script')].map(s => s.src).join(' ');
    const v = (await (await fetch('./js/story.js')).text()).match(/engine\.js\?v=(\d+)/)[1];
    const E = await import('/js/engine.js?v=' + v);
    const out = { v, W: E.G.W, props: Object.keys(E.A.props), anims: Object.keys(E.A.anims || {}).slice(0, 200) };
    const a = E.A.props.R_arava; const d = [];
    a.updateMatrixWorld(true);
    a.traverse(m => { const b = m.isMesh ? new E.THREE.Box3().setFromObject(m) : null; d.push([m.type, m.name, m.isMesh ? m.geometry.attributes.position.count : 0, b ? [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map(n => +n.toFixed(2)) : null, m.material ? (Array.isArray(m.material) ? m.material.length : m.material.name) : null]); });
    out.arava = d;
    const pl = E.G.player; out.clips = pl.rig && pl.rig.clips ? Object.keys(pl.rig.clips) : (pl.mixer && pl.mixer._actions ? pl.mixer._actions.map(a => a._clip.name) : null);
    out.Akeys = Object.keys(E.A); out.sk = E.G.sk.map ? E.G.sk.map(s => s && s.on) : Object.keys(E.G.sk);
    out.T = Object.keys(E.T);
    return JSON.stringify(out);
  });
  console.log(r);
};
