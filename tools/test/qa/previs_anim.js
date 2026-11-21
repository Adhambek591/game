// Keyframe animation for previs plates: per-scene acting on the game's humanoid rig (24 Mixamo-style bones), applied on top of a
// FROZEN base pose (so the game's idle never waves the sword around). Used by previs_msg.js; reusable for other shots.
// __Anim.act(ent, { base: 'idle', baseT: 0, keys: [...], look: () => target|null })
//   keys: [{ t, w, head, neck, spine, pitch, body }]  (seconds; radians)
//     w      0..1  how much of the look target the upper body follows (distributed head 50 % / neck 25 % / spine 25 %)
//     head/neck/spine  extra local yaw (+ = her left) on top of the look
//     pitch  head nod (+ = down)
//     body   0..1  how much the whole body (ent.rot) turns toward the look target, from its start facing
//   returns { tick(dt) } — call every frame (the previs camera callback does it); it also sets ent.rot.
window.__Anim = (() => {
  const T = __E.THREE, Y = new T.Vector3(0, 1, 0), X = new T.Vector3(1, 0, 0), q = new T.Quaternion();
  const ss = k => k * k * (3 - 2 * k);
  function sample(keys, t) { if (t <= keys[0].t) return keys[0]; for (let i = 1; i < keys.length; i++) { const a = keys[i - 1], b = keys[i]; if (t <= b.t) { const k = ss((t - a.t) / (b.t - a.t)), o = {}; for (const n of ['w', 'head', 'neck', 'spine', 'pitch', 'body']) o[n] = (a[n] || 0) + ((b[n] || 0) - (a[n] || 0)) * k; return o; } } return keys[keys.length - 1]; }
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  function act(e, o) {
    const rig = e.rig, a = rig.acts[o.base || 'idle']; let t = 0; const rot0 = e.rot; let cur = {}; const base = {};
    if (a) { a.reset(); a.play(); a.time = o.baseT || 0; a.timeScale = 0; a.setEffectiveWeight(1); }
    // the bone's value in the base clip at baseT (the rig's look-at layer saves/restores these bones between frames, so the live value can carry old offsets)
    const clipQ = bn => { if (!a) return null; const tr = a.getClip().tracks.find(k => k.name === bn + '.quaternion'); if (!tr) return null; const it = tr.createInterpolant(); const r = it.evaluate(o.baseT || 0); return new T.Quaternion(r[0], r[1], r[2], r[3]).normalize(); };
    rig.post = rg => { if (a) { a.time = o.baseT || 0; a.timeScale = 0; }
      const B = rg.B, c = cur; const L = c.look || 0;
      // absolute, not cumulative: every frame starts from the frozen base pose (the paused mixer does not rewrite these bones -> multiply() alone kept spinning them)
      for (const bn of ['Spine01', 'neck', 'Head']) if (B[bn]) { if (!base[bn]) base[bn] = clipQ(bn) || B[bn].quaternion.clone(); B[bn].quaternion.copy(base[bn]); }
      const add = (bn, ax, ang) => { if (B[bn] && ang) { q.setFromAxisAngle(ax, ang); B[bn].quaternion.multiply(q); } };
      add('Spine01', Y, L * .25 * c.w + (c.spine || 0)); add('neck', Y, L * .25 * c.w + (c.neck || 0)); add('Head', Y, L * .5 * c.w + (c.head || 0)); add('Head', X, c.pitch || 0);
    };
    return { tick(dt) { t += dt; const k = sample(o.keys, t); const tg = o.look && o.look();
      let rel = 0; if (tg) { const want = Math.atan2(tg.x - e.x, tg.z - e.z); e.rot = rot0 + wrap(want - rot0) * (k.body || 0); rel = wrap(want - e.rot); }
      rel = Math.max(-1.4, Math.min(1.4, rel)); cur = { ...k, look: rel }; }, stop() { rig.post = null; if (a) a.timeScale = 1; } };
  }
  return { act };
})();
