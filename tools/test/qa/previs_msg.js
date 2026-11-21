// Previs for a Higgsfield reference video (game level = layout/camera/motion; Higgsfield restyles it).
// Shot "Shabarman at Miywali": in the tutorial training ground, Gúlayım (BLUE, right of frame) stands on the near bank; the messenger
// gallops from beyond the plank bridge (z -112), crosses it (z ~ -79) and pulls up in front of her (z -66). Low camera behind her left shoulder,
// slow push-in. Usage in the game page with the tutorial level loaded (start=tut, any time after it was built):
//   await __stage({ secs: 10, name: 'msg_previs.webm' })  -> records the canvas and PUTs it to /__rec/<name> (serve.py with an upload dir)
window.__stage = function (o = {}) {
  const secs = o.secs || 10, name = o.name || 'msg_previs.webm';
  const E = window.__E, G = __G, THREE = E.THREE; window.__botOff = true; for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'Space']) dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true })); window.__nr = false; G.steps = 1; G.paused = false; G.freeze = false;
  for (const id of ['end', 'dead', 'dlg', 'cut', 'lore']) { const e = document.getElementById(id); if (e) e.classList.remove('on'); }
  const P = G.player, GX = 1.6, GZ = -62, RX = 0.6, R0 = -112, R1 = GZ - 4.2;
  P.x = GX; P.z = GZ; P.act = null;
  let rd = G.ents.find(e => e.type === 'son' && e.mounted && !e.dead);
  if (!rd) throw new Error('no mounted messenger in the level (run the tutorial to its end first)');
  rd.custom = () => { }; rd.x = RX; rd.z = R0; rd.rot = 0; rd.team = 'npc';
  // clean plate: only Gúlayım and the messenger. Extras with game walk cycles look wrong and Higgsfield copies bad poses -> the prompt adds the maidens instead
  if (G.mis) G.mis.started = false;   // an older bot copy in the page stops steering (its step() returns while the mission is not started)
  for (const e of G.ents) { if (e === P || e === rd || !e.o) continue; e.o.visible = false; e.w4hid = 1; }
  // clean the hero: no gold outline hull, no selection ring (they read as glowing objects to the video model)
  P.o.traverse(m => { if (m.isSkinnedMesh && !m.name && m.material && !m.material.map && m.material.color && m.material.color.getHexString() === 'ffd76e') m.visible = false; });
  { const v3 = new THREE.Vector3(); E.scene.traverse(m => { if (!m.isMesh || !m.visible) return; let inP = false, q = m; while (q) { if (q === P.o) { inP = true; break; } q = q.parent; } if (inP) return; m.getWorldPosition(v3); if (Math.hypot(v3.x - GX, v3.z - GZ) < 1.5 && v3.y < .5) m.visible = false; }); }
  // swords stay in hand (author); only sprites (objective marker) go
  E.scene.traverse(m => { if (m.isSprite) m.visible = false; });
  // acting (previs_anim.js): calm -> hears hooves -> follows the rider with head/neck -> shoulders/body turn as he arrives -> slight nod at the exhausted man
  P.rot = Math.PI; const ACT = __Anim.act(P, { base: 'idle', baseT: 0, look: () => rd, keys: [
    { t: 0, w: 0, head: -.3, neck: -.1, pitch: .05 }, { t: 2.0, w: 0, head: -.3, neck: -.1, pitch: .05 },
    { t: 2.8, w: 1, pitch: -.04 }, { t: 6.0, w: 1, body: .15, pitch: -.02 },
    { t: 7.6, w: 1, body: .55, spine: .05 }, { t: 8.6, w: 1, body: .6, pitch: .08 }, { t: 12, w: 1, body: .62, pitch: .09 } ] });
  let t = 0, v = 0;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), L = new THREE.Vector3();
  E.camOverride((cam, dt) => { dt = Math.min(dt, .05); t += dt; const k = Math.min(1, t / secs), s = k * k * (3 - 2 * k);
    // rider: gallop (10.5 m/s) then rein in over the last 9 m
    const left = R1 - rd.z; v = left > 9 ? Math.min(10.5, v + 9 * dt) : Math.max(0, Math.min(v, left * 1.25)); rd.z = Math.min(R1, rd.z + v * dt); rd.spd = v; rd.rot = 0;
    P.x = GX; P.z = GZ; P.vx = P.vz = 0; P.act = null; ACT.tick(dt);   // pinned in place; her acting comes from the keyframes
    for (const e of G.ents) if (e !== P && e !== rd && e.o && e.o.visible) e.o.visible = false;
    for (const e of G.ents) if (e.bar) e.bar.visible = false;   // no world HP bars in the plate
    A.set(GX - 3.6, 1.7, GZ + 5.4); B.set(GX - 2.4, 1.85, GZ + 3.2); cam.position.copy(A.lerp(B, s));
    L.set(GX * .4 + rd.x * .6, 1.55, GZ * .45 + rd.z * .55); cam.lookAt(L); if (cam.fov !== 36) { cam.fov = 36; cam.updateProjectionMatrix(); } });
  if (o.offline !== false) return offline(o, () => ({ riderEnd: +rd.z.toFixed(1) }), () => { t = 0; v = 0; rd.z = R0; });
  return new Promise(res => {
    const cv = document.querySelector('canvas'), st = cv.captureStream(30);
    const mr = new MediaRecorder(st, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 12e6 }), ch = [];
    mr.ondataavailable = e => e.data.size && ch.push(e.data);
    mr.onstop = async () => { const blob = new Blob(ch, { type: 'video/webm' }); const r = await fetch('/__rec/' + name, { method: 'PUT', body: blob }); res({ status: r.status, bytes: blob.size, riderEnd: +rd.z.toFixed(1) }); };
    setTimeout(() => { t = 0; mr.start(500); setTimeout(() => mr.stop(), secs * 1000 + 300); }, 600);   // 0.6 s settle before recording
  });
};

// Offline capture: frame-exact, independent of the tab being visible. The engine's loop takes dt from the rAF timestamp, so we capture its
// frame() function and call it with a fake clock (+1/fps s per frame), then save each rendered frame as JPEG: <prefix>_0001.jpg ... (ffmpeg -framerate fps).
async function offline(o, info, reset) {
  const fps = o.fps || 30, n = Math.round((o.secs || 10) * fps), pre = (o.name || 'shot').replace(/\.\w+$/, ''), cv = document.querySelector('canvas');
  if (__E.renderer.getPixelRatio() !== 1) { __E.renderer.setPixelRatio(1); dispatchEvent(new Event('resize')); await new Promise(z => setTimeout(z, 600)); }   // full-res plate (the game may run at 0.5x)
  if (cv.width !== 1280 || cv.height !== 720) throw new Error('canvas is ' + cv.width + 'x' + cv.height + ' - set the viewport to 1280x720 first');
  const r0 = window.requestAnimationFrame; let fn = null; window.requestAnimationFrame = cb => { fn = cb; return 0; };
  await new Promise(z => setTimeout(z, 200)); if (!fn) { __E.start(); }   // the running loop hands us frame() on its next tick (or start() does)
  let clock = performance.now(); const step = () => { clock += 1000 / fps; fn(clock); };
  for (let i = 0; i < 8; i++) step(); reset && reset();   // settle, then rewind the shot to t = 0
  let ok = 0;
  for (let i = 1; i <= n; i++) { step(); const blob = await new Promise(z => cv.toBlob(z, 'image/jpeg', .92));
    const r = await fetch('/__rec/' + pre + '_' + String(i).padStart(4, '0') + '.jpg', { method: 'PUT', body: blob }); if (r.status === 201) ok++; }
  window.requestAnimationFrame = r0; r0(fn);   // hand the loop back
  return { frames: ok, of: n, fps, prefix: pre, ...info() };
}
