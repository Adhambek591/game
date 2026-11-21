import re
src=open('/home/user/t/gsnap/index.html').read()
v=re.search(r'story\.js\?v=(\d+)',src).group(1)
mod='''<script type="module">
import { THREE, camera, G, setMood, clearLevel, ground, wall, yurt, house, banner, fire, debris, decor, crate, loadAssets, start, world, spawn, ensureReal } from './js/engine.js?v=%s';
import * as FX from './js/fx.js?v=%s';
const q = new URLSearchParams(location.search);
const DAY = { bg: 0xc9d8e0, fog: [50, 130], hemi: [0xf2ecd8, 0x6a5232, 1.9], sun: [0xffe6b8, 4.6], sunDir: [.6, 1, .45], exp: 1.05, fireI: 10, ember: 0x5a5550, emberA: .45, ash: true };
const NIGHT = { bg: 0x0a0c14, fog: [30, 90], hemi: [0x5a6a9a, 0x1a1410, .7], sun: [0x8aa0d0, 1.2], sunDir: [.4, 1, .3], exp: 1.0, fireI: 60, ember: 0xffa040, emberA: .9 };
loadAssets(() => {}).then(async () => { document.getElementById('title').style.display = 'none'; clearLevel(); setMood(q.get('night') ? NIGHT : DAY);
  ground(14, -120, q.get('night') ? 'ground2' : 'ground1');
  const set = q.get('set') || 'a';
  world.traverse(o => { const r = o.material && o.material._road; if (r) { if (q.get('flat')) r.uLane.value.w = +q.get('flat'); if (q.get('rk')) r.uRoad.value.z = +q.get('rk'); if (q.get('dark')) r.uLane.value.y = +q.get('dark'); window.__RD = r; } });
  if (set === 'a') { banner(-5, -13); banner(-2, -13, 0x1a1a1a); banner(1, -13, 0x3a0606); banner(4, -13, 0x2a4a8a); fire(-5, -17, 1.2); fire(0, -17, 1.8); FX.torch(4, -17); fire(7, -17, .8); }
  if (set === 'b') { for (let i = 0; i < 6; i++) FX.cargo(-7 + i * 2.8, -19, i, { ry: .4 }); FX.bones(-6, -15); FX.cairn(-2, -15); FX.wheel(1, -15); crate(4, -15); crate(7, -15); }
  if (set === 'c') { decor('R_arava', -6, -19, .6); FX.cart(0, -19, 2.2, false, { broken: true }); FX.cart(6, -19, 1, true, { broken: true }); decor('R_horse', -5, -14, 1); decor('R_horse', 0, -14, 2.5); decor('R_horse', 5, -14, 4); }
  if (set === 'e') { window.__C1 = FX.convoyCart({ coat: 'bay', speed: 2.4, path: s => ({ x: -9 + (s %% 14), z: -18 }) }); window.__C2 = FX.convoyCart({ coat: 'dun', driver: true }); __C2.place(5, -14, -.6); }
  if (set === 'f') { await ensureReal(['askar', 'wolf', 'mage', 'qiz']); const L = [['askar', -4, -16], ['wolf', -1, -16], ['mage', 2, -16], ['qiz', 5, -16, 'ally']]; const es = L.map(([t, x, z, tm]) => { const e = spawn(t, x, z, tm || 'enemy'); e.speed = 0; e.cd = 99; e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); return e; }); window.__ES = es; ['askar','wolf'].forEach((t, i) => { const e = spawn(t, -3 + i * 5, -12, 'enemy'); e.d = { ...e.d, heavy: true }; e.speed = 0; e.cd = 99; e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); es.push(e); });
    setTimeout(() => { const v = new (world.position.constructor)(); for (const e of es) { const out = [e.type, e.x, e.z]; e.o.traverse(o => { if (o.isSkinnedMesh && out.length < 6) { o.skeleton.bones[0].getWorldPosition(v); out.push(o.name, +v.x.toFixed(2), +v.z.toFixed(2)); } if (o.isBone && /hip|pelvis/i.test(o.name) && out.length < 9) { o.getWorldPosition(v); out.push(o.name, +v.x.toFixed(2), +v.z.toFixed(2)); } }); console.warn('HIPS', JSON.stringify(out), e.curName); } }, 2500); }
  if (set === 'g') { [0, 1, 3, 6, 7, 4].forEach((v, i) => FX.cargo(-8 + i * 3.2, -17, v, { ry: .5 })); const dm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, .35), new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 1 })); dm.position.set(4, 1.3, -12); world.add(dm); const cm = new THREE.Mesh(new THREE.BoxGeometry(.95, .5, .6), new THREE.MeshStandardMaterial({ color: 0x6a4420 })); cm.position.set(7.5, .25, -12); cm.scale.setScalar(1.6); world.add(cm); FX.horse(-6, -12, 1, { coat: 'chestnut', bare: false }); FX.horse(-1, -12, 2, { coat: 'bay' }); }
  if (set === 'd') { yurt(-7, -20); house(7, -20, 5, 5, 3.3); house(0, -24, 6, 5, 3.3, true); yurt(-7, -12, true); wall(3, 12, -12, 3.4, 1.2); debris(0, -14, 5); }
  G.cam.x = +(q.get('x') || 0); G.cam.z = +(q.get('z') || -14); G.camK = +(q.get('k') || .62); G.paused = true; start(); setTimeout(() => window.__PV = 1, 1500); });
</script>''' % (v, v)
out=re.sub(r'<script type="module" src="./js/story.js\?v=\d+"></script>', mod, src)
out=out.replace("navigator.serviceWorker.register","(()=>{})")
open('/home/user/t/gsnap/gv.html','w').write(out)
print(v)
