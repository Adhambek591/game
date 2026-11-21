import re
src=open('/home/user/website-5ef0831fd120367c52df72c9/app/public/index.html').read()
v=re.search(r'story\.js\?v=(\d+)',src).group(1)
mod='''<script type="module">
import { camera, G, setMood, clearLevel, ground, wall, yurt, house, banner, fire, debris, decor, crate, loadAssets, start, world, ensureReal } from './js/engine.js?v=%s';
import * as SC from './js/scenery.js?v=%s';
const q = new URLSearchParams(location.search), ch = q.get('ch') || '4';
const DAY = { bg: 0xc9d8e0, fog: [50, 130], hemi: [0xf2ecd8, 0x6a5232, 1.9], sun: [0xffe6b8, 4.6], sunDir: [.6, 1, .45], exp: 1.05, fireI: 10, ember: 0x5a5550, emberA: .45, ash: true };
loadAssets(() => {}).then(async () => { document.getElementById('title').style.display = 'none'; clearLevel(); setMood(DAY);
  const L = ch === 'r4' || ch === 'r2' || ch === 'r7' ? 215 : 190; ground(14, -L, ch === '5' || ch === '7' ? 'ground2' : 'ground1'); wall(-30, 30, 13, 2.2, 1.2, false); wall(-30, 30, -L + 4, 4, 1.6);
  if (ch === '5') for (let z = 10; z > -190; z -= 3.5) for (const s of [-1, 1]) { const { place } = await import('./js/env.js?v=%s'); place(world, 'boulder_01', s * (G.W + 1.5 + Math.random() * 2.5), z, 3 + Math.random() * 3); }
  if (ch === '6') { wall(-30, -3.5, -120, 5, 1.6); wall(3.5, 30, -120, 5, 1.6); for (const s of [-1, 1]) { house(s * 16, -140, 7, 8, 4); house(s * 16.5, -158, 7, 7, 4); } for (let z = 0; z > -110; z -= 8.5) for (const s of [-1, 1]) { if (Math.random() < .55) yurt(s * (G.W + 6.5), z, false, false); else house(s * (G.W + 7), z, 5, 5, 3.3); } for (const s of [-1, 1]) for (let z = 6; z > -110; z -= 24) wall(s * (G.W + 13), s * (G.W + 9), z - 12, 4, 26, false); }
  if (ch === '3') for (let z = -20; z > -170; z -= 14) yurt(G.W + 6, z, false, false);
  if (ch === '7') for (const s of [-1, 1]) for (let z = -120; z > -175; z -= 14) { yurt(s * (G.W + 5), z, false, false); banner(s * (G.W - 1), z + 4, 0x3a0606); }
  fire(-6, -60, 1.2); fire(6, -100, 1.2);
  if (ch[0] === 'r') { G.curCh = +ch[1] - 1; SC.ride(G.curCh); } else SC['ch' + ch]();
  G.cam.x = +(q.get('x') || 0) * .85; G.cam.z = +(q.get('z') || -20); G.paused = true; if (q.get('hi')) { const k = +q.get('hi'); const st = camera.position.set.bind(camera.position); camera.position.set = (x, y, z) => st(x, y * k, z + (k - 1) * 9); } start(); window.__PV = 1; });
</script>''' % (v, v, v)
out=re.sub(r'<script type="module" src="./js/story.js\?v=\d+"></script>', mod, src)
out=out.replace("navigator.serviceWorker.register","(()=>{})")
open('/home/user/t/www/pv.html','w').write(out)
print(v)
