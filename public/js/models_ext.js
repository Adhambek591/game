// models_ext.js — procedural props + enemy visual variety for Qırq qız (models agent).
// Pure three.js; no engine import at module level (so it can be used from tools / the model viewer).
// API (see /home/user/agents/models_log.md):
//   BUILD.<name>(opts) -> THREE.Group (origin = ground centre, +Z = front, metres)
//   install(engineModule)  -> starts the enemy-variant scanner (helmets / atlases / shields / captains' gold)
//   amulet(S)              -> the canonical golden down-pointing triangle tumar (same geometry as skinrig's)
import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/jsm/utils/BufferGeometryUtils.js?v=1795218616';

const rnd = (a, b) => a + Math.random() * (b - a);
let SEED = 1; const srand = s => { SEED = s >>> 0 || 1; }; const sr = () => { SEED = (SEED * 1664525 + 1013904223) >>> 0; return SEED / 4294967296; }; const srr = (a, b) => a + sr() * (b - a);
const PI = Math.PI;

// ---------------------------------------------------------------- textures (canvas, no download)
const TXC = {};
function ctex(key, w, h, fn, rep = [1, 1], srgb = true) { if (TXC[key]) return TXC[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return TXC[key] = t; }
const hex = (c, k = 1) => { const C = new THREE.Color(c).multiplyScalar(k); return `rgb(${Math.min(255, C.r * 255) | 0},${Math.min(255, C.g * 255) | 0},${Math.min(255, C.b * 255) | 0})`; };
function speck(g, w, h, n, a, sz = 2, light = '255,240,220') { for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${Math.random() * a})` : `rgba(${light},${Math.random() * a * .6})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * sz, 1 + Math.random() * sz); } }
export const TX = {
  wood: (base = 0x7a5534, k = 'w') => ctex('wood' + base + k, 128, 512, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = Math.random() * w, d = Math.random() < .5; g.strokeStyle = d ? `rgba(30,15,5,${rnd(.08, .3)})` : `rgba(255,220,170,${rnd(.04, .14)})`; g.lineWidth = rnd(.6, 2.4); g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * .02 + i) * 3 + Math.sin(y * .007 + i * 3) * 6, y); g.stroke(); }
    for (let i = 0; i < 4; i++) { const x = rnd(10, w - 10), y = rnd(20, h - 20); const r = g.createRadialGradient(x, y, 1, x, y, rnd(5, 10)); r.addColorStop(0, 'rgba(25,12,4,.85)'); r.addColorStop(.5, 'rgba(60,30,10,.4)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.beginPath(); g.ellipse(x, y, 7, 14, 0, 0, 7); g.fill(); }
    speck(g, w, h, 1500, .18, 2); }),
  bark: () => ctex('bark', 128, 256, (g, w, h) => { g.fillStyle = '#4a3624'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const x = Math.random() * w; g.strokeStyle = `rgba(${Math.random() < .5 ? '15,8,3' : '150,120,90'},${rnd(.15, .5)})`; g.lineWidth = rnd(1, 4); g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 12) g.lineTo(x + rnd(-2.5, 2.5), y); g.stroke(); } speck(g, w, h, 2000, .25, 3); }),
  felt: (base = 0xd9ccb0) => ctex('felt' + base, 256, 256, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.strokeStyle = Math.random() < .5 ? 'rgba(60,40,20,.10)' : 'rgba(255,250,240,.10)'; g.lineWidth = rnd(.5, 1.4); const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3, l = rnd(2, 7); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 18; i++) { const x = Math.random() * w, y = Math.random() * h, r = rnd(10, 40); const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, 'rgba(80,60,30,.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } }),
  band: (bg = '#8e1a14', fg = '#efe3c8', edge = '#1c120c') => ctex('band' + bg + fg, 512, 64, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = edge; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7); g.fillStyle = fg; g.fillRect(0, 9, w, 2); g.fillRect(0, h - 11, w, 2);
    g.strokeStyle = fg; g.lineWidth = 4; g.lineCap = 'round'; const s = 64; for (let x = 0; x < w; x += s) { const cx = x + s / 2, cy = h / 2; g.beginPath(); g.moveTo(cx, cy + 14); g.lineTo(cx, cy - 4); g.bezierCurveTo(cx, cy - 16, cx - 18, cy - 16, cx - 18, cy - 4); g.bezierCurveTo(cx - 18, cy + 4, cx - 9, cy + 6, cx - 8, cy - 2); g.moveTo(cx, cy - 4); g.bezierCurveTo(cx, cy - 16, cx + 18, cy - 16, cx + 18, cy - 4); g.bezierCurveTo(cx + 18, cy + 4, cx + 9, cy + 6, cx + 8, cy - 2); g.stroke();
      g.beginPath(); g.moveTo(x, cy); g.lineTo(x + 5, cy - 6); g.lineTo(x + 10, cy); g.lineTo(x + 5, cy + 6); g.closePath(); g.fill(); } speck(g, w, h, 600, .15, 2); }, [1, 1]),
  mail: () => ctex('mail', 128, 128, (g, w, h) => { g.fillStyle = '#2a2a2c'; g.fillRect(0, 0, w, h); for (let y = 0; y < h + 8; y += 8) for (let x = 0; x < w + 8; x += 8) { const ox = (y / 8) % 2 ? 4 : 0; g.strokeStyle = 'rgba(190,190,195,.85)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x + ox, y, 3.2, 0, 7); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = .8; g.beginPath(); g.arc(x + ox + .6, y + .6, 3.2, .3, 2.2); g.stroke(); } }, [3, 2]),
  lamellar: (base = 0x5a5e66, lace = 0x7a1a14) => ctex('lam' + base + lace, 128, 128, (g, w, h) => { g.fillStyle = hex(lace); g.fillRect(0, 0, w, h); const pw = 10, ph = 26; for (let r = 0; r * ph < h + ph; r++) for (let x = -pw; x < w + pw; x += pw) { const ox = r % 2 ? pw / 2 : 0, X = x + ox, Y = r * ph - 4; const gr = g.createLinearGradient(X, 0, X + pw, 0); gr.addColorStop(0, hex(base, .7)); gr.addColorStop(.5, hex(base, 1.25)); gr.addColorStop(1, hex(base, .6)); g.fillStyle = gr; g.beginPath(); g.moveTo(X + 1, Y); g.lineTo(X + pw - 1, Y); g.lineTo(X + pw - 1, Y + ph - 4); g.quadraticCurveTo(X + pw / 2, Y + ph + 1, X + 1, Y + ph - 4); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(X + pw / 2 - 1, Y + 5, 2, 2); g.fillRect(X + pw / 2 - 1, Y + ph - 9, 2, 2); } speck(g, w, h, 500, .2, 2); }, [2, 1]),
  fur: (base = 0x5a4632) => ctex('fur' + base, 128, 64, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const x = Math.random() * w, y = Math.random() * h; g.strokeStyle = Math.random() < .55 ? `rgba(15,8,2,${rnd(.15, .45)})` : `rgba(255,235,200,${rnd(.08, .3)})`; g.lineWidth = rnd(.6, 1.5); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-2, 2), y + rnd(4, 9)); g.stroke(); } }, [4, 1]),
  hide: (base = 0x8a6a48) => ctex('hide' + base, 256, 256, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h, r = rnd(15, 60); const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, `rgba(${Math.random() < .5 ? '40,25,10' : '255,230,190'},.12)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    g.strokeStyle = 'rgba(40,24,10,.55)'; g.lineWidth = 2; g.setLineDash([5, 4]); for (const y of [64, 192]) { g.beginPath(); g.moveTo(0, y + rnd(-6, 6)); g.bezierCurveTo(80, y + 10, 170, y - 10, 256, y); g.stroke(); } g.setLineDash([]); speck(g, w, h, 2500, .15, 2); }),
  rope: () => ctex('rope', 64, 64, (g, w, h) => { g.fillStyle = '#9a8460'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,28,14,.7)'; g.lineWidth = 3; for (let i = -64; i < 128; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 64); g.stroke(); } }, [6, 1]),
  stone: (base = 0x8a8072) => ctex('stone' + base, 256, 256, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const x = Math.random() * w, y = Math.random() * h, r = rnd(10, 50); const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, `rgba(${Math.random() < .5 ? '30,25,20' : '240,230,210'},.16)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } speck(g, w, h, 4000, .3, 2); }),
  cloth: (base = 0x8a1c14, stripe = 0xd8b048) => ctex('cloth' + base + stripe, 128, 256, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); g.fillStyle = hex(stripe); g.fillRect(0, h - 26, w, 6); g.fillRect(0, h - 14, w, 3); for (let x = 6; x < w; x += 16) { g.beginPath(); g.moveTo(x, h - 40); g.lineTo(x + 5, h - 32); g.lineTo(x, h - 28); g.lineTo(x - 5, h - 32); g.closePath(); g.fill(); } for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 3); } }),
};
const MC = {};
export function mat(key, o) { return MC[key] || (MC[key] = new THREE.MeshStandardMaterial(o)); }
export const M = {
  wood: (c = 0x7a5534) => mat('wood' + c, { map: TX.wood(c), bumpMap: TX.wood(c), bumpScale: .7, roughness: .92, color: 0xffffff }),
  woodDark: () => M.wood(0x4e3420),
  bark: () => mat('bark', { map: TX.bark(), bumpMap: TX.bark(), bumpScale: 1.2, roughness: 1 }),
  felt: (c = 0xd9ccb0) => mat('felt' + c, { map: TX.felt(c), bumpMap: TX.felt(c), bumpScale: 1.5, roughness: 1 }),
  band: (bg, fg) => mat('band' + bg + fg, { map: TX.band(bg, fg), roughness: .95 }),
  iron: () => mat('iron', { color: 0x3a3a3e, metalness: .85, roughness: .45 }),
  steel: () => mat('steel', { color: 0x8a8e96, metalness: .9, roughness: .32 }),
  dsteel: () => mat('dsteel', { color: 0x6a6e76, metalness: .9, roughness: .38 }),
  gold: () => mat('gold', { color: 0xe0b040, metalness: 1, roughness: .28, emissive: 0x3a2200, emissiveIntensity: .6 }),
  bronze: () => mat('bronze', { color: 0xa0702e, metalness: .95, roughness: .35 }),
  mail: () => mat('mail', { map: TX.mail(), bumpMap: TX.mail(), bumpScale: 2, metalness: .7, roughness: .5, side: THREE.DoubleSide }),
  lam: (c = 0x5a5e66, l = 0x7a1a14) => mat('lam' + c + l, { map: TX.lamellar(c, l), bumpMap: TX.lamellar(c, l), bumpScale: 2, metalness: .55, roughness: .5, side: THREE.DoubleSide }),
  fur: (c = 0x5a4632) => mat('fur' + c, { map: TX.fur(c), bumpMap: TX.fur(c), bumpScale: 3, roughness: 1 }),
  hide: (c = 0x8a6a48) => mat('hide' + c, { map: TX.hide(c), bumpMap: TX.hide(c), bumpScale: 1.2, roughness: .95, side: THREE.DoubleSide }),
  rope: () => mat('rope', { map: TX.rope(), bumpMap: TX.rope(), bumpScale: 2, roughness: 1 }),
  stone: (c = 0x8a8072) => mat('stone' + c, { map: TX.stone(c), bumpMap: TX.stone(c), bumpScale: 2, roughness: 1 }),
  cloth: (c = 0x8a1c14, s = 0xd8b048) => mat('cloth' + c + s, { map: TX.cloth(c, s), roughness: .9, side: THREE.DoubleSide }),
  col: (c, o = {}) => mat('c' + c + JSON.stringify(o), { color: c, roughness: .9, ...o }),
};
function mk(geo, m, x = 0, y = 0, z = 0, parent) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; if (parent) parent.add(o); return o; }
function beam(a, b, r, m, parent, seg = 7, wob = .12) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B); const g = new THREE.CylinderGeometry(r * srr(1 - wob, 1), r * srr(1, 1 + wob), L, seg, 1); const o = mk(g, m, 0, 0, 0, parent); o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); o.rotateY(sr() * 6.28); return o; }
function board(w, h, d, m, x, y, z, parent) { const g = new THREE.BoxGeometry(w, h, d); return mk(g, m, x, y, z, parent); }
function lathe(pts, seg, m, parent, phi0 = 0, phiL = PI * 2) { return mk(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg, phi0, phiL), m, 0, 0, 0, parent); }
function wheel(R, w, m, mi, parent, spokes = 10) { const g = new THREE.Group(); const rim = mk(new THREE.TorusGeometry(R - .045, .05, 6, 22), m, 0, 0, 0, g); rim.scale.z = w / .1; const tyre = mk(new THREE.TorusGeometry(R - .01, .022, 4, 22), mi, 0, 0, 0, g); tyre.scale.z = w / .05;
  const hub = mk(new THREE.CylinderGeometry(.09, .09, w * 1.8, 10), m, 0, 0, 0, g); hub.rotation.x = PI / 2; const cap = mk(new THREE.CylinderGeometry(.06, .06, w * 2.1, 8), mi, 0, 0, 0, g); cap.rotation.x = PI / 2;
  for (let i = 0; i < spokes; i++) { const a = i / spokes * PI * 2; const s = mk(new THREE.CylinderGeometry(.018, .025, R - .1, 5), m, Math.cos(a) * (R - .05) / 2, Math.sin(a) * (R - .05) / 2, 0, g); s.rotation.z = a - PI / 2; } if (parent) parent.add(g); return g; }
export function bake(root) { root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(); const byM = new Map(), drop = [];
  root.traverse(o => { if (!o.isMesh || o.userData.keep) return; let p = o.parent, kept = false; while (p && p !== root) { if (p.userData.keep) kept = true; p = p.parent; } if (kept) return; let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); g.applyMatrix4(inv.clone().multiply(o.matrixWorld)); const L = byM.get(o.material) || []; L.push(g); byM.set(o.material, L); drop.push(o); });
  for (const o of drop) o.parent.remove(o); for (const [m, L] of byM) { const g = mergeGeometries(L, false); if (!g) continue; g.computeBoundingSphere(); const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = true; root.add(me); } return root; }
export function amulet(S = 1) { const g = new THREE.Group(); const t = (r, dep) => { const sh = new THREE.Shape(); sh.moveTo(-r * .866, r * .5); sh.lineTo(r * .866, r * .5); sh.lineTo(0, -r); sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: dep * .4, bevelSize: r * .08, bevelSegments: 1 }); };
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b040, metalness: 1, roughness: .28, emissive: 0x6a4000, emissiveIntensity: .9 }); g.add(new THREE.Mesh(t(.058, .009), gold)); const ins = new THREE.Mesh(t(.024, .004), new THREE.MeshStandardMaterial({ color: 0x7a4e10, metalness: .9, roughness: .45 })); ins.position.z = .011; g.add(ins);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(.012, .003, 6, 12), gold); cord.position.y = .038; g.add(cord); g.scale.setScalar(S); g.userData.mat = gold; return g; }
export const BUILD = {};
// adobe (Khorezm mud-brick / pakhsa) plaster: straw specks, cracks, faint brick courses, rain streaks + darker base
TX.adobe = (base = 0xb89a72) => ctex('adobe' + base, 256, 256, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { const x = Math.random() * w, y = Math.random() * h, r = rnd(12, 50); const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, `rgba(${Math.random() < .5 ? '70,50,30' : '235,215,180'},.13)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.strokeStyle = 'rgba(60,40,25,.10)'; g.lineWidth = 2; for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y + rnd(-1, 1)); g.lineTo(w, y + rnd(-1, 1)); g.stroke(); for (let x = (y / 16 % 2) * 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } }
  for (let i = 0; i < 700; i++) { g.strokeStyle = `rgba(${Math.random() < .5 ? '220,190,120' : '90,65,35'},${rnd(.2, .5)})`; g.lineWidth = .7; const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); g.stroke(); }
  for (let i = 0; i < 7; i++) { g.strokeStyle = 'rgba(50,32,18,.45)'; g.lineWidth = rnd(.6, 1.3); let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-9, 9); y += rnd(3, 12); g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 25; i++) { const x = Math.random() * w; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(60,40,20,.10)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(x, 0, rnd(2, 6), rnd(40, 200)); }
  speck(g, w, h, 3000, .18, 2); });
M.adobe = (c = 0xb89a72) => mat('adobe' + c, { map: TX.adobe(c), bumpMap: TX.adobe(c), bumpScale: .9, roughness: 1 });
// box with world-scaled UVs (texture density `d` metres per repeat), so walls never look stretched
function wbox(w, h, d, m, x, y, z, parent, den = 2.2) { const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv, n = g.attributes.normal, p = g.attributes.position; for (let i = 0; i < uv.count; i++) { const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)); const X = p.getX(i) + x, Y = p.getY(i) + y, Z = p.getZ(i) + z; if (ny > .5) uv.setXY(i, X / den, Z / den); else if (nx > .5) uv.setXY(i, Z / den, Y / den); else uv.setXY(i, X / den, Y / den); } return mk(g, m, x, y, z, parent); }
// battered (sloped) wall slab: bottom width w, top w*k, along X; thickness t
function batter(w, h, t, kx, kz, m, x, y, z, parent, den = 2.2) { const o = wbox(w, h, t, m, x, y, z, parent, den); const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * kx); p.setZ(i, p.getZ(i) * kz); } o.geometry.computeVertexNormals(); return o; }

// ---- B_house replacement: flat-roof Karakalpak/Khorezm adobe house, front (door) at +X. nominal 6.5 x 3.3 x 5 (x,y,z)
BUILD.house = () => { srand(41); const g = new THREE.Group(), A = M.adobe(0xdcc29a), A2 = M.adobe(0xc4a47c), W = M.wood(0x6a4a2a), D = M.woodDark(), R = M.col(0x8a7448, { roughness: 1 });
  batter(6.3, 2.9, 4.8, .985, .985, A, 0, 1.45, 0, g); wbox(6.6, .45, 5.1, A2, 0, .22, 0, g);  // body + darker plinth (sokol)
  // roof: reed mat layer, mud cap with rounded parapet edge, beam ends sticking out of the front & back
  wbox(6.5, .14, 5.0, R, 0, 2.97, 0, g, 1); const cap = wbox(6.6, .26, 5.1, A2, 0, 3.15, 0, g); for (const s of [-1, 1]) { wbox(6.7, .22, .3, A, 0, 3.32, s * 2.45, g); } wbox(.3, .22, 5.1, A, 3.2, 3.32, 0, g); wbox(.3, .22, 5.1, A, -3.2, 3.32, 0, g);
  for (let z = -2.1; z <= 2.11; z += .6) for (const s of [-1, 1]) beam([s * 3.05, 2.95, z], [s * 3.42, 2.95 + srr(-.02, .02), z], .075, D, g, 6, .2);
  // aywan porch on the front: carved posts on stone bases, beam, reed shade
  for (const z of [-1.9, -.1, 1.7]) { const p = beam([3.95, .15, z], [3.95, 2.55, z], .1, W, g, 8, .02); mk(new THREE.CylinderGeometry(.17, .2, .18, 8), M.stone(0x8a8072), 3.95, .09, z, g); mk(new THREE.CylinderGeometry(.14, .1, .25, 8), W, 3.95, 2.45, z, g); for (const y of [.8, 1.6]) mk(new THREE.TorusGeometry(.105, .02, 4, 10), D, 3.95, y, z, g).rotation.x = PI / 2; }
  wbox(.22, .2, 4.4, W, 3.95, 2.62, -.1, g, 1); for (let z = -2.2; z < 2.1; z += .32) beam([3.15, 2.86, z], [4.15, 2.74, z], .045, W, g, 5); wbox(1.25, .06, 4.6, R, 3.6, 2.85, -.1, g, 1);
  wbox(1.1, .12, 4.6, A2, 3.7, .06, -.1, g); // porch floor
  // carved wooden double door + frame, small window with lattice (panjara), niche
  const dz = .55; wbox(.12, 2.2, 1.45, D, 3.17, 1.1 + .25, dz, g, 1); for (const s of [-1, 1]) { const lf = board(.06, 1.9, .6, M.wood(0x7a4a24), 3.24, 1.25, dz + s * .31, g); for (const y of [.75, 1.6]) board(.03, .55, .42, M.wood(0x5a3418), 3.28, y, dz + s * .31, g); mk(new THREE.TorusGeometry(.035, .009, 4, 8), M.iron(), 3.3, 1.25, dz + s * .07, g).rotation.y = PI / 2; }
  wbox(.1, .25, 1.6, D, 3.18, 2.32, dz, g, 1);
  const wz = -1.35; wbox(.1, .78, .78, D, 3.17, 1.75, wz, g, 1); board(.05, .64, .64, M.col(0x0e0a08), 3.2, 1.75, wz, g); for (let k = -1; k <= 1; k++) { board(.03, .64, .04, W, 3.24, 1.75, wz + k * .2, g); board(.03, .04, .64, W, 3.24, 1.75 + k * .2, wz, g); }
  // side/back details: small vent windows, ladder to the roof, clay pots, firewood stack
  for (const z of [-1.2, 1.2]) board(.08, .3, .4, M.col(0x140e0a), -3.17, 2.2, z, g);
  for (const s of [-1, 1]) beam([-1.6 + s * .25, 0, 2.75], [-1.6 + s * .25, 3.5, 2.55], .04, W, g, 5); for (let k = 1; k < 9; k++) { const f = k / 9; beam([-1.88, f * 3.5, 2.75 - .2 * f], [-1.32, f * 3.5, 2.75 - .2 * f], .025, W, g, 4); }
  for (const [x, z, s] of [[3.5, 2.25, 1], [3.3, -2.3, .8]]) { const pot = lathe([[0, 0], [.14, .02], [.24, .2], [.22, .42], [.1, .52], [.11, .58]], 10, M.adobe(0x9a6a44), g); pot.position.set(x, 0, z); pot.scale.setScalar(s * 1.3); }
  for (let k = 0; k < 9; k++) beam([-2.6 + (k % 3) * .02, .12 + Math.floor(k / 3) * .17, -2.62 - (k % 3) * .17], [-1.4, .12 + Math.floor(k / 3) * .17, -2.62 - (k % 3) * .17], .075, M.bark(), g, 6);
  bake(g); g.traverse(m => { if (m.isMesh) m.geometry.translate(-.5, 0, 0); }); return g; };
// ---- B_wall replacement: Khorezm fortress wall segment (pakhsa base + mud-brick upper), battered, merlons, arrow slits. nominal 6 x 6 x 2.2
BUILD.wall = () => { srand(43); const g = new THREE.Group(), A = M.adobe(0xd6ba92), A2 = M.adobe(0xbc9c76);
  batter(6.02, 2.2, 2.2, 1, .86, A2, 0, 1.1, 0, g, 2.4); batter(6.02, 3.4, 1.9, 1, .88, A, 0, 2.2 + 1.7, 0, g, 2.4);
  // walkway lip + merlons (rounded tops) on the outer side (+Z) and a low inner parapet
  wbox(6.02, .2, 1.85, A2, 0, 5.7, 0, g); for (let k = 0; k < 4; k++) { const x = -2.25 + k * 1.5; const m = wbox(.95, .9, .5, A, x, 6.2, .62, g); const top = mk(new THREE.CylinderGeometry(.475, .475, .5, 10, 1, false, 0, PI), A, x, 6.65, .62, g); top.rotation.set(PI / 2, 0, PI / 2); top.rotation.order = 'ZXY'; }
  wbox(6.02, .4, .3, A, 0, 6.0, -.72, g);
  for (const x of [-1.5, 1.5]) board(.18, .7, .1, M.col(0x120c08), x, 3.6, .9, g);   // arrow slits
  // erosion: rounded rubble at the foot, beam holes
  for (let i = 0; i < 6; i++) { const r = mk(new THREE.DodecahedronGeometry(srr(.2, .38), 0), A2, srr(-2.8, 2.8), .1, srr(1.05, 1.35), g); r.scale.y = .5; }
  for (let x = -2.4; x <= 2.41; x += 1.2) board(.16, .16, .1, M.col(0x1a120c), x, 4.9, .86, g);
  return bake(g); };
// ---- B_tower replacement: round, tapered Khorezm tower (like Ayaz-qala / Toprak-qala), ribbed buttresses, crenellated top, slits. nominal 6 x 9.6 x 6
BUILD.tower = () => { srand(47); const g = new THREE.Group(), A = M.adobe(0xd6ba92), A2 = M.adobe(0xbc9c76), W = M.woodDark();
  const body = mk(new THREE.CylinderGeometry(2.45, 2.95, 7.6, 24, 4), A, 0, 3.8, 0, g); { const uv = body.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 7, uv.getY(i) * 3.4); }
  const base = mk(new THREE.CylinderGeometry(3.0, 3.05, 1.2, 24), A2, 0, .6, 0, g); { const uv = base.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 7, uv.getY(i) * .6); }
  for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2 + .2; const rib = batter(.7, 7.0, .5, .8, .8, A, 0, 3.5, 0, g, 2); rib.position.set(Math.cos(a) * 2.68, 3.5, Math.sin(a) * 2.68); rib.rotation.y = -a + PI / 2; rib.rotation.x = 0; rib.rotateX(-.065); }
  // top: overhang ring, parapet with 10 rounded merlons, wooden hoardings beams
  const ring = mk(new THREE.CylinderGeometry(2.75, 2.5, .45, 24), A2, 0, 7.75, 0, g); const par = mk(new THREE.CylinderGeometry(2.75, 2.75, .9, 24, 1, true), A, 0, 8.4, 0, g); par.material = A; const parI = mk(new THREE.CylinderGeometry(2.45, 2.45, .9, 24, 1, true), A2, 0, 8.4, 0, g); parI.material = A2;
  { const uv = par.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 7, uv.getY(i) * .5); }
  for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2; const m = wbox(.95, .75, .32, A, Math.cos(a) * 2.6, 9.2, Math.sin(a) * 2.6, g); m.rotation.y = -a + PI / 2; }
  wbox(5.0, .15, 5.0, A2, 0, 8.0, 0, g);
  for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2 + .3; beam([Math.cos(a) * 2.4, 7.55, Math.sin(a) * 2.4], [Math.cos(a) * 3.05, 7.55, Math.sin(a) * 3.05], .08, W, g, 5); }
  for (const [a, y] of [[0, 3], [1.6, 5.2], [3.3, 3.6], [4.8, 5.6], [.8, 6.4]]) { const s = board(.2, .9, .2, M.col(0x120c08), Math.cos(a) * 2.68, y, Math.sin(a) * 2.68, g); s.rotation.y = -a; }
  // door at +Z with wooden frame
  const dg = new THREE.Group(); dg.position.set(0, 0, 2.98); g.add(dg); board(1.2, 2.0, .12, M.wood(0x5a3418), 0, 1.0, 0, dg); board(1.5, .2, .3, W, 0, 2.1, 0, dg); for (const s of [-1, 1]) board(.18, 2.1, .3, W, s * .7, 1.05, 0, dg); for (const y of [.5, 1.5]) board(1.2, .08, .05, M.iron(), 0, y, .07, dg);
  return bake(g); };

// ---- catapult cart (manjanıq): 4-wheel cart, A-frame, throwing beam with cup + counterweight crate.
//  side 'enemy' (dark wood, black pennant) | 'ally' (light wood, red/gold band). userData.arm = animated group (rotation.x -0.6 rest .. +0.9 cocked), userData.cup = stone mesh
BUILD.catapult = (side = 'enemy') => { srand(side === 'ally' ? 7 : 3); const g = new THREE.Group(), en = side !== 'ally'; const W = M.wood(en ? 0x5a3c22 : 0x8a6238), Wd = M.wood(en ? 0x3e2a18 : 0x6a4a2a), I = M.iron(), R = M.rope();
  for (const s of [-1, 1]) board(.18, .2, 3.4, Wd, s * .72, .62, 0, g); for (const z of [-1.5, -.6, .6, 1.5]) board(1.64, .16, .16, Wd, 0, .62, z, g);
  for (let x = -.6; x <= .61; x += .2) board(.19, .05, 2.2, W, x, .73, .2, g);
  for (const z of [-1.15, 1.15]) { const ax = mk(new THREE.CylinderGeometry(.06, .06, 1.9, 8), I, 0, .42, z, g); ax.rotation.z = PI / 2; for (const s of [-1, 1]) { const w = wheel(.42, .1, Wd, I, g, 8); w.position.set(s * .9, .42, z); w.rotation.y = PI / 2; } }
  for (const s of [-1, 1]) { beam([s * .62, .7, -.75], [s * .5, 2.35, 0], .085, W, g); beam([s * .62, .7, .75], [s * .5, 2.35, 0], .085, W, g); beam([s * .62, 1.3, -.5], [s * .62, 1.3, .5], .05, W, g); for (const z of [-.75, .75]) mk(new THREE.BoxGeometry(.2, .06, .22), I, s * .62, .78, z, g); }
  const pv = mk(new THREE.CylinderGeometry(.07, .07, 1.3, 10), I, 0, 2.35, 0, g); pv.rotation.z = PI / 2; for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(.12, .12, .1, 10), I, s * .5, 2.35, 0, g).rotation.z = PI / 2;
  const wl = mk(new THREE.CylinderGeometry(.11, .11, 1.2, 10), W, 0, 1.0, 1.35, g); wl.rotation.z = PI / 2; mk(new THREE.CylinderGeometry(.125, .125, .5, 10), R, 0, 1.0, 1.35, g).rotation.z = PI / 2;
  for (const s of [-1, 1]) { board(.1, .55, .12, Wd, s * .65, .9, 1.35, g); const h = mk(new THREE.CylinderGeometry(.03, .03, .6, 6), W, s * .74, 1.0, 1.35, g); h.rotation.x = PI / 2; }
  const arm = new THREE.Group(); arm.position.set(0, 2.35, 0); arm.userData.keep = 1; g.add(arm);
  mk(new THREE.BoxGeometry(.16, .18, 3.3), W, 0, 0, -.55, arm); for (const z of [-1.9, -.4, .5]) mk(new THREE.BoxGeometry(.2, .22, .06), I, 0, 0, z, arm);
  const cw = new THREE.Group(); cw.position.set(0, -.25, 1.05); arm.add(cw); board(.56, .5, .5, Wd, 0, -.1, 0, cw); for (const y of [-.32, .12]) board(.6, .05, .54, I, 0, y, 0, cw); for (let i = 0; i < 5; i++) mk(new THREE.DodecahedronGeometry(.11, 0), M.stone(), srr(-.18, .18), .2, srr(-.15, .15), cw);
  const cupG = new THREE.Group(); cupG.position.set(0, .14, -2.15); arm.add(cupG); lathe([[0, -.05], [.2, -.03], [.27, .1], [.28, .16]], 10, W, cupG); mk(new THREE.TorusGeometry(.27, .025, 5, 12), I, 0, .16, 0, cupG).rotation.x = PI / 2;
  const stone = mk(new THREE.DodecahedronGeometry(.2, 1), M.stone(0x7a7266), 0, .2, 0, cupG); stone.scale.set(1, .85, 1.1);
  beam([.62, .7, 1.6], [.62, 3.3, 1.6], .03, Wd, g); const fl = mk(new THREE.PlaneGeometry(.7, .45, 4, 1), en ? M.cloth(0x1c1a1c, 0x8a1c14) : M.cloth(0x8e1a14, 0xd8b048), .62 + .35, 3.05, 1.6, g); fl.rotation.y = PI / 2; { const p = fl.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 6) * .05); fl.geometry.computeVertexNormals(); }
  const coil = mk(new THREE.TorusGeometry(.18, .045, 6, 14), R, -.35, .8, .9, g); coil.rotation.x = PI / 2; for (let i = 0; i < 4; i++) mk(new THREE.DodecahedronGeometry(.16, 0), M.stone(0x7a7266), .3 + srr(-.1, .1), .85, -.9 + i * .22, g);
  // bake the arm separately (keeps it animatable but cheap)
  arm.userData.keep = 0; const armB = bake(arm); armB.userData.keep = 1; bake(g); g.userData.arm = armB; g.userData.cup = armB.children.find(k => k.material === M.stone(0x7a7266)) || null; return g; };
// ---- palisade: sharpened log stakes with two lashed cross rails. len metres along X, outside = +Z
BUILD.palisade = (len = 6, h = 2.8) => { srand(len * 31 | 0); const g = new THREE.Group(), B = M.bark(), W = M.wood(0x8a6a48), R = M.rope(); const n = Math.max(3, Math.round(len / .34));
  for (let i = 0; i < n; i++) { const x = -len / 2 + (i + .5) * len / n, r = srr(.13, .18), hh = h * srr(.9, 1.08); const lg = mk(new THREE.CylinderGeometry(r, r * 1.05, hh, 7), B, x, hh / 2 - .15, srr(-.04, .04), g); lg.rotation.set(srr(-.04, .04), sr() * 6, srr(-.035, .035)); const tip = mk(new THREE.ConeGeometry(r, r * 2.6, 7), W, x, hh - .15 + r * 1.3, lg.position.z, g); tip.rotation.copy(lg.rotation); }
  for (const y of [.7, h * .72]) { beam([-len / 2, y, -.2], [len / 2, y + srr(-.05, .05), -.2], .07, B, g, 6, .05); for (let x = -len / 2 + .5; x < len / 2; x += 1.4) mk(new THREE.TorusGeometry(.17, .03, 4, 8), R, x, y, -.08, g); }
  for (let x = -len / 2 + 1; x < len / 2; x += 2.6) beam([x, 0, -1.1], [x, h * .7, -.25], .08, B, g, 6);
  return bake(g); };
// ---- watchtower: 4 log legs with X braces, plank platform, railing with hides, hide roof, ladder (+Z), tug on top. ~9.5 m, footprint 3x3
BUILD.watchtower = (side = 'enemy') => { srand(11); const g = new THREE.Group(), B = M.bark(), W = M.wood(side === 'ally' ? 0x8a6238 : 0x5e4028); const H = 5.2, a = 1.4, t = 1.1;
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; for (const [sx, sz] of legs) beam([sx * a, -.2, sz * a], [sx * t, H + 2.1, sz * t], .14, B, g, 7, .05);
  const at = y => a + (t - a) * (y + .2) / (H + 2.3); for (let k = 0; k < 4; k++) { const [x1, z1] = legs[k], [x2, z2] = legs[(k + 1) % 4]; for (const [y0, y1] of [[.4, 2.6], [2.6, H - .1]]) { beam([x1 * at(y0), y0, z1 * at(y0)], [x2 * at(y1), y1, z2 * at(y1)], .06, B, g, 5); beam([x2 * at(y0), y0, z2 * at(y0)], [x1 * at(y1), y1, z1 * at(y1)], .06, B, g, 5); } beam([x1 * at(2.6), 2.6, z1 * at(2.6)], [x2 * at(2.6), 2.6, z2 * at(2.6)], .07, B, g, 5); }
  const pw = 2 * at(H) + .5; for (let x = -pw / 2 + .12; x < pw / 2; x += .24) board(.22, .07, pw, W, x, H, 0, g); for (const s of [-1, 1]) board(pw + .1, .14, .14, W, 0, H - .1, s * pw / 2, g);
  for (let k = 0; k < 4; k++) { const p = new THREE.Group(); p.rotation.y = k * PI / 2; g.add(p); board(pw, .08, .08, W, 0, H + 1.05, pw / 2, p); board(pw, .06, .06, W, 0, H + .55, pw / 2, p); for (let x = -pw / 2 + .2; x <= pw / 2; x += .45) board(.07, 1.1, .07, W, x, H + .55, pw / 2, p); mk(new THREE.PlaneGeometry(pw * .9, .75, 3, 2), M.hide(0x7a5a3a), 0, H + .55, pw / 2 + .06, p); }
  for (const [sx, sz] of legs) beam([sx * t * 1.05, H, sz * t * 1.05], [sx * t, H + 2.25, sz * t], .06, B, g, 5);
  const roof = mk(new THREE.ConeGeometry(pw * .82, 1.3, 4, 1, true), M.hide(0x6a4a2e), 0, H + 2.85, 0, g); roof.rotation.y = PI / 4; const rim = mk(new THREE.ConeGeometry(pw * .84, .2, 4, 1, true), M.rope(), 0, H + 2.28, 0, g); rim.rotation.y = PI / 4;
  for (const s of [-1, 1]) beam([s * .28, 0, a + .7], [s * .28, H + .1, t + .3], .045, W, g, 5); for (let k = 1; k < 13; k++) { const f = k / 13, y = f * H, z = a + .7 + (t + .3 - a - .7) * f; beam([-.3, y, z], [.3, y, z], .03, W, g, 5); }
  beam([0, H + 2.7, 0], [0, H + 4.1, 0], .035, W, g, 5); const tug = new THREE.Group(); tug.position.set(0, H + 3.9, 0); g.add(tug); mk(new THREE.SphereGeometry(.09, 8, 6), M.gold(), 0, .25, 0, tug); for (let i = 0; i < 9; i++) { const a2 = i / 9 * 6.28; const st = mk(new THREE.CylinderGeometry(.03, .006, .9, 4), M.col(side === 'ally' ? 0xe8e0d0 : 0x1a1614), Math.cos(a2) * .07, -.35, Math.sin(a2) * .07, tug); st.rotation.set(Math.sin(a2) * .25, 0, -Math.cos(a2) * .25); }
  return bake(g); };
BUILD.weaponRack = () => { srand(5); const g = new THREE.Group(), W = M.wood(0x5e4028), I = M.steel();
  for (const s of [-1, 1]) { beam([s * 1, 0, -.35], [s * 1, 1.5, 0], .05, W, g); beam([s * 1, 0, .35], [s * 1, 1.5, 0], .05, W, g); } beam([-1.1, 1.45, 0], [1.1, 1.45, 0], .045, W, g); beam([-1.05, .5, .22], [1.05, .5, .22], .04, W, g);
  for (let i = 0; i < 6; i++) { const x = -.85 + i * .34; beam([x, .05, .45], [x + srr(-.05, .05), 2.25, -.05], .02, W, g, 5); const tip = mk(new THREE.ConeGeometry(.035, .28, 4), I, x, 2.38, -.08, g); tip.rotation.x = -.2; mk(new THREE.ConeGeometry(.05, .16, 6), M.col(0x8a1c14), x, 2.18, -.05, g); }
  for (const s of [-1, 1]) { const sh = BUILD.shield(s > 0 ? 0 : 2, .4); sh.position.set(s * .55, .62, .32); sh.rotation.x = -.25; g.add(sh); }
  return bake(g); };
BUILD.tent = (c = 0x6e5236) => { srand(c & 255); const g = new THREE.Group(), H = M.hide(c), W = M.wood(0x5e4028), R = M.rope(); const L = 3, h = 1.9;
  const sh = new THREE.Shape(); sh.moveTo(-1.25, 0); sh.lineTo(0, h); sh.lineTo(1.25, 0); const geo = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2); mk(geo, H, 0, 0, 0, g);
  mk(new THREE.PlaneGeometry(2.3, 1.7), M.col(0x120c08, { side: THREE.DoubleSide }), 0, .8, L / 2 + .01, g);
  for (const z of [-L / 2 - .05, L / 2 + .05]) beam([0, 0, z], [0, h + .35, z], .04, W, g, 5); beam([0, h + .02, -L / 2 - .1], [0, h + .02, L / 2 + .1], .035, W, g, 5);
  for (const [x, z] of [[-1.25, -L / 2], [1.25, -L / 2], [-1.25, L / 2], [1.25, L / 2]]) { beam([x * .35, h * .7, z], [x * 1.5, 0, z + Math.sign(z) * .6], .01, R, g, 3); mk(new THREE.ConeGeometry(.03, .25, 4), W, x * 1.5, .05, z + Math.sign(z) * .6, g); }
  return bake(g); };
BUILD.tug = (tail = 0x1a1614, cloth = 0x8a1c14) => { srand(9); const g = new THREE.Group(), W = M.wood(0x4e3420); beam([0, 0, 0], [0, 4.2, 0], .04, W, g, 6); mk(new THREE.ConeGeometry(.06, .4, 4), M.steel(), 0, 4.4, 0, g); mk(new THREE.TorusGeometry(.12, .02, 5, 12), M.gold(), 0, 4.05, 0, g).rotation.x = PI / 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; const st = mk(new THREE.CylinderGeometry(.035, .006, 1.3, 4), M.col(tail, { roughness: .8 }), Math.cos(a) * .1, 3.4, Math.sin(a) * .1, g); st.rotation.set(Math.sin(a) * .18, 0, -Math.cos(a) * .18); }
  const fl = mk(new THREE.PlaneGeometry(.9, .55, 5, 1), M.cloth(cloth, 0xd8b048), .47, 3.75, 0, g); { const p = fl.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + .45) * 5) * .06); fl.geometry.computeVertexNormals(); }
  return bake(g); };
BUILD.campfire = (qazan = 1) => { srand(13); const g = new THREE.Group(), S = M.stone(0x6e665a), W = M.bark(), I = M.iron();
  for (let i = 0; i < 11; i++) { const a = i / 11 * 6.28; const s = mk(new THREE.DodecahedronGeometry(srr(.12, .17), 0), S, Math.cos(a) * .62, .07, Math.sin(a) * .62, g); s.scale.y = .7; s.rotation.set(sr() * 3, sr() * 3, 0); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; beam([Math.cos(a) * .5, .05, Math.sin(a) * .5], [Math.cos(a) * .05, .35, Math.sin(a) * .05], .05, W, g, 6); }
  mk(new THREE.CircleGeometry(.55, 14), M.col(0x1a1410), 0, .02, 0, g).rotation.x = -PI / 2;
  if (qazan) { for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28 + .3; beam([Math.cos(a) * .85, 0, Math.sin(a) * .85], [0, 1.55, 0], .03, M.woodDark(), g, 5); } beam([0, 1.55, 0], [0, 1.0, 0], .006, I, g, 3); const q = lathe([[0, -.02], [.2, 0], [.33, .12], [.36, .3], [.34, .34], [.38, .36]], 14, I, g); q.position.y = .62; mk(new THREE.TorusGeometry(.36, .02, 4, 14), I, 0, .98, 0, g).rotation.x = PI / 2; }
  return bake(g); };
BUILD.mantlet = () => { srand(17); const g = new THREE.Group(), W = M.wood(0x8a6a48), wk = M.wood(0x9a7a50, 'k'); const w = 1.6, h = 1.5;
  for (let i = 0; i < 9; i++) { const x = -w / 2 + i * w / 8; beam([x, -.1, 0], [x, h + .1, 0], .025, W, g, 5); }
  for (let y = .05; y < h; y += .07) { const pts = []; for (let i = 0; i <= 16; i++) pts.push(new THREE.Vector3(-w / 2 + i * w / 16, y, Math.sin((i + y * 14) * PI) * .025)); mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .018, 3), wk, 0, 0, 0, g); }
  beam([0, .9, -.05], [0, 0, -.9], .03, W, g, 5); g.rotation.x = -.12; const o = new THREE.Group(); o.add(g); return bake(o); };
BUILD.arrowBasket = () => { srand(19); const g = new THREE.Group(); lathe([[0, 0], [.16, 0], [.19, .5], [.2, .55]], 10, M.wood(0x9a7a50, 'k'), g); for (let i = 0; i < 16; i++) { const a = sr() * 6.28, r = sr() * .14; const x = Math.cos(a) * r, z = Math.sin(a) * r; beam([x, .1, z], [x * 1.6, .95, z * 1.6], .007, M.wood(0x8a6a48), g, 3); const f = mk(new THREE.PlaneGeometry(.04, .12), M.col(sr() < .5 ? 0xe8e0d0 : 0x2a2420, { side: THREE.DoubleSide }), x * 1.6, .9, z * 1.6, g); f.rotation.y = a; } return bake(g); };
BUILD.reeds = (n = 26) => { srand(n); const g = new THREE.Group(); const mt = M.col(0x6a7a3a, { side: THREE.DoubleSide }), mt2 = M.col(0x9a8a4a, { side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) { const a = sr() * 6.28, r = Math.sqrt(sr()) * .7, h = srr(.9, 1.8); const b = mk(new THREE.PlaneGeometry(.05, h, 1, 3), sr() < .7 ? mt : mt2, Math.cos(a) * r, h / 2, Math.sin(a) * r, g); b.rotation.set(srr(-.25, .25), sr() * 3, srr(-.25, .25)); { const p = b.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k) + h / 2; p.setX(k, p.getX(k) * (1 - y / h * .8)); p.setZ(k, (y / h) ** 2 * .15); } }
    if (sr() < .3) mk(new THREE.CylinderGeometry(.025, .025, .18, 5), M.col(0x5a3a1a), Math.cos(a) * r, h + .05, Math.sin(a) * r, g); }
  return bake(g); };
BUILD.fordStones = (len = 8) => { srand(len * 7 | 0); const g = new THREE.Group(); for (let z = -len / 2; z <= len / 2; z += .85) { const s = mk(new THREE.CylinderGeometry(srr(.35, .5), srr(.45, .6), .4, 7), M.stone(0x6e6a60), srr(-.35, .35), .05, z, g); s.rotation.y = sr() * 3; s.scale.z = srr(.7, 1); } return bake(g); };
BUILD.fordStakes = (len = 10) => { srand(23); const g = new THREE.Group(), W = M.bark(), R = M.rope(); const pts = []; for (let z = -len / 2; z <= len / 2 + .01; z += len / 4) { beam([0, -.6, z], [srr(-.1, .1), 1.3, z], .06, W, g, 6); pts.push(new THREE.Vector3(0, 1.15, z)); }
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; mk(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, .5).add(new THREE.Vector3(0, -.25, 0)), b), 8, .015, 3), R, 0, 0, 0, g); } return bake(g); };
BUILD.boat = () => { srand(29); const g = new THREE.Group(), W = M.wood(0x6a4a2a), D = M.woodDark(); const L = 4.2, B = .6, H = .5;
  for (let k = 0; k < 4; k++) { const y = k * H / 4; const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, z = (t - .5) * L, w = B * Math.sin(t * PI) ** .6 * (.6 + .4 * k / 3); pts.push(new THREE.Vector3(w, y + Math.abs(t - .5) ** 2 * .6, z)); } for (const s of [-1, 1]) mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x * s, p.y, p.z))), 20, .07, 4), k ? W : D, 0, 0, 0, g); }
  const hull = mk(new THREE.CylinderGeometry(B * .9, B * .9, L * .92, 12, 1, false, PI / 2, PI), D, 0, H * .7, 0, g); hull.rotation.x = PI / 2; hull.scale.set(1, 1, .55);
  for (const z of [-.8, .6]) board(B * 1.5, .05, .25, W, 0, H * .65, z, g); beam([.3, .55, -.3], [1.3, .05, 1.4], .025, W, g, 5); board(.14, .02, .5, W, 1.3, .05, 1.5, g).rotation.y = -.5;
  return bake(g); };
// ---- yurt: style 'qq' (Karakalpak white aq úy, red ornament band) | 'enemy' (grey felt, black/ochre band). door at +Z
BUILD.yurt = (style = 'qq') => { srand(style === 'qq' ? 31 : 37); const g = new THREE.Group(), en = style !== 'qq'; const R = 2.75, Hw = 1.55, Hr = 3.05;
  const F = en ? M.felt(0x9a9284) : M.felt(0xe2d6bc), Fr = en ? M.felt(0x86806f) : M.felt(0xd6c8aa), W = M.wood(0x8a5a30);
  lathe([[R * .985, 0], [R * 1.01, .25], [R, Hw * .7], [R * .97, Hw]], 28, F, g, PI * .5 + .32, PI * 2 - .64);
  const rp = []; for (let i = 0; i <= 8; i++) { const t = i / 8; rp.push([R * .99 * (1 - t) + .42 * t, Hw + (Hr - Hw) * (Math.sin(t * PI / 2) * .85 + t * .15)]); } const roof = lathe(rp, 28, Fr, g); { const p = roof.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); p.setY(i, p.getY(i) - (1 - Math.abs(Math.cos(a * 14))) * .045 * Math.sin((r - .4) / (R - .4) * PI)); } roof.geometry.computeVertexNormals(); }
  mk(new THREE.TorusGeometry(.44, .07, 6, 18), W, 0, Hr + .02, 0, g).rotation.x = PI / 2; for (const a of [0, PI / 2]) { const b = mk(new THREE.CylinderGeometry(.03, .03, .9, 5), W, 0, Hr + .1, 0, g); b.rotation.order = 'YXZ'; b.rotation.set(PI / 2, a, 0); }
  const flap = mk(new THREE.PlaneGeometry(1.2, 1.0, 3, 3), Fr, 0, Hr - .15, -.75, g); flap.rotation.x = -1.0;
  const bandT = en ? M.band('#2a2420', '#b08a40') : M.band('#8e1a14', '#efe3c8'); bandT.map.repeat.set(10, 1); mk(new THREE.CylinderGeometry(R, R, .28, 32, 1, true, PI * .5 + .34, PI * 2 - .68), bandT, 0, Hw - .12, 0, g); mk(new THREE.CylinderGeometry(R * 1.005, R * 1.005, .16, 32, 1, true, PI * .5 + .34, PI * 2 - .68), bandT, 0, .55, 0, g);
  for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2 + .2; if (Math.abs(Math.atan2(Math.sin(a - PI / 2), Math.cos(a - PI / 2))) < .45) continue; const p = [Math.cos(a) * R, 0, Math.sin(a) * R]; beam([p[0] * .99, Hw + .05, p[2] * .99], [p[0] * .45, Hr - .3, p[2] * .45], .018, M.rope(), g, 3); }
  const dg = new THREE.Group(); dg.position.set(0, 0, R * .985); g.add(dg); const fw = M.wood(0x6a3a1c); board(.12, 1.65, .14, fw, -.56, .82, 0, dg); board(.12, 1.65, .14, fw, .56, .82, 0, dg); board(1.26, .14, .16, fw, 0, 1.68, 0, dg); board(1.26, .1, .16, fw, 0, .05, 0, dg);
  for (const s of [-1, 1]) { board(.5, 1.5, .05, M.wood(en ? 0x3a2a1c : 0x8a2a18), s * .26, .85, -.02, dg); for (const y of [.45, 1.2]) board(.38, .5, .02, M.wood(en ? 0x2a2016 : 0xb07a30), s * .26, y, .015, dg); mk(new THREE.TorusGeometry(.04, .01, 4, 8), M.iron(), s * .06, .9, .04, dg); }
  mk(new THREE.CylinderGeometry(.09, .09, 1.1, 8), en ? M.felt(0x4a443c) : M.felt(0xc8b48a), 0, 1.86, .08, dg).rotation.z = PI / 2;
  return bake(g); };
// ---- round Central-Asian shield (qalqan): hide dome, painted ring, iron rim, umbo + 4 bosses. paint 0..3. Face = +Z
BUILD.shield = (paint = 0, R = .45) => { const g = new THREE.Group(); const P = [[0x9a6a3e, 0x8a1c14], [0x6a5038, 0xb08a40], [0xa08058, 0x1a1a1a], [0x7a2a1e, 0xd8b048]][paint % 4];
  lathe([[0, R * .3], [R * .45, R * .26], [R * .8, R * .14], [R, 0]], 20, M.hide(P[0]), g).rotation.x = PI / 2; mk(new THREE.TorusGeometry(R * .62, R * .035, 4, 20), M.col(P[1], { roughness: .7 }), 0, 0, R * .19, g);
  mk(new THREE.TorusGeometry(R, R * .04, 5, 24), M.iron(), 0, 0, 0, g); mk(new THREE.SphereGeometry(R * .2, 10, 6, 0, 6.3, 0, 1.5), M.steel(), 0, 0, R * .26, g).rotation.x = PI / 2;
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + .78; mk(new THREE.SphereGeometry(R * .07, 6, 4, 0, 6.3, 0, 1.5), M.steel(), Math.cos(a) * R * .45, Math.sin(a) * R * .45, R * .24, g).rotation.x = PI / 2; }
  return bake(g); };
// W_shield.glb replacement orientation (dome towards +Y, like the old file); 0.65 m diameter
BUILD.shieldY = (paint = 0) => { const o = new THREE.Group(); const s = BUILD.shield(paint, .325); s.rotation.x = -PI / 2; o.add(s); return o; };
// ---- helmets (canonical: base ring radius 1 at y 0, +Y up, +Z face); scaled to the head by vary()
const HELM = {};
HELM.cone = (o = {}) => { const g = new THREE.Group(), S = o.gold ? M.gold() : (o.dark ? M.dsteel() : M.steel());
  lathe([[1.0, -.05], [1.02, .25], [.92, .7], [.68, 1.1], [.36, 1.42], [.12, 1.66], [.05, 1.9], [0, 2.05]], 16, S, g);
  mk(new THREE.TorusGeometry(1.02, .09, 5, 20), o.gold ? M.gold() : M.bronze(), 0, .02, 0, g).rotation.x = PI / 2;
  if (o.nose !== false) mk(new THREE.BoxGeometry(.14, .75, .06), S, 0, -.22, 1.03, g);
  mk(new THREE.CylinderGeometry(1.06, 1.22, .95, 18, 3, true, PI * .5 + .75, PI * 2 - 1.5), M.mail(), 0, -.48, 0, g);
  if (o.plume) { const p = new THREE.Group(); p.position.set(0, 1.95, 0); g.add(p); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; const st = mk(new THREE.CylinderGeometry(.06, .015, 1.2, 4), M.col(o.plume, { roughness: .85 }), Math.cos(a) * .06, -.45, Math.sin(a) * .06 - .1, p); st.rotation.set(-.55 + Math.sin(a) * .2, 0, -Math.cos(a) * .25); } }
  return bake(g); };
HELM.fur = (o = {}) => { const g = new THREE.Group(); const crown = M.col(o.cloth || 0x7a1a14, { roughness: .9 });
  lathe([[.95, .1], [.92, .55], [.75, .95], [.45, 1.18], [0, 1.25]], 14, crown, g);
  const br = mk(new THREE.TorusGeometry(1.0, .26, 8, 20), M.fur(o.fur || 0x4a3626), 0, .14, 0, g); br.rotation.x = PI / 2; br.scale.z = 1.25;
  const t = new THREE.Group(); t.position.set(0, 1.22, 0); g.add(t); mk(new THREE.SphereGeometry(.1, 6, 4), M.col(o.tas || 0xb01a10), 0, .03, 0, t); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; const st = mk(new THREE.CylinderGeometry(.035, .01, .45, 3), M.col(o.tas || 0xb01a10, { roughness: .8 }), Math.cos(a) * .2, -.1, Math.sin(a) * .2, t); st.rotation.set(Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0); }
  if (o.flaps) for (const s of [-1, 1]) { const f = mk(new THREE.BoxGeometry(.2, .7, .5), M.fur(o.fur || 0x4a3626), s * .98, -.25, 0, g); f.rotation.z = s * .1; }
  return bake(g); };
HELM.lam = (o = {}) => { const g = new THREE.Group(), S = o.gold ? M.gold() : M.dsteel();
  lathe([[1.0, 0], [1.0, .35], [.9, .8], [.62, 1.12], [.25, 1.3], [0, 1.33]], 16, S, g); mk(new THREE.CylinderGeometry(.08, .12, .35, 8), o.gold ? M.gold() : M.bronze(), 0, 1.45, 0, g); mk(new THREE.TorusGeometry(1.0, .08, 5, 20), o.gold ? M.gold() : M.bronze(), 0, .04, 0, g).rotation.x = PI / 2;
  mk(new THREE.CylinderGeometry(1.05, 1.3, 1.0, 18, 1, true, PI * .5 + .85, PI * 2 - 1.7), M.lam(0x4e5258, o.lace || 0x6a1610), 0, -.5, 0, g);
  if (o.plume !== null) { const p = new THREE.Group(); p.position.set(0, 1.6, 0); g.add(p); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; const st = mk(new THREE.CylinderGeometry(.07, .015, 1.0, 4), M.col(o.plume || 0xa01810, { roughness: .85 }), Math.cos(a) * .07, -.4, Math.sin(a) * .07, p); st.rotation.set(Math.sin(a) * .7 - .25, 0, -Math.cos(a) * .7); } }
  return bake(g); };
BUILD.helmet = (k = 'cone', gold = 0, plume = 0) => { const g = HELM[k]({ gold: !!gold, plume: plume || (gold ? 0xb01a10 : (k === 'lam' ? 0xa01810 : 0)), flaps: k === 'fur' }); const o = new THREE.Group(); o.add(g); g.scale.setScalar(.12); return o; };
function pauldron(r, gold) { const g = new THREE.Group(); for (let k = 0; k < 3; k++) mk(new THREE.CylinderGeometry(r * (1 + k * .12), r * (1.1 + k * .12), r * .55, 10, 1, true, -PI * .45, PI * .9), M.lam(gold ? 0x8a6a30 : 0x50545c, 0x6a1610), 0, -k * r * .42, 0, g); if (gold) { const d = mk(new THREE.CylinderGeometry(r * .32, r * .32, r * .06, 12), M.gold(), 0, .02, r * 1.02, g); d.rotation.x = PI / 2; } return bake(g); }
function quiver(S) { const g = new THREE.Group(); lathe([[.0, 0], [.07, 0], [.075, .3], [.085, .55], [.09, .56]], 10, M.hide(0x5a3a22), g); mk(new THREE.TorusGeometry(.085, .012, 4, 10), M.col(0x8a1c14), 0, .45, 0, g).rotation.x = PI / 2; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; const x = Math.cos(a) * .045, z = Math.sin(a) * .045; mk(new THREE.CylinderGeometry(.005, .005, .3, 3), M.wood(0x8a6a48), x, .62, z, g); const f = mk(new THREE.PlaneGeometry(.025, .09), M.col(i % 2 ? 0xe8e0d0 : 0x3a2a20, { side: THREE.DoubleSide }), x, .74, z, g); f.rotation.y = a; } bake(g); g.scale.setScalar(S); return g; }
BUILD.pauldron = (gold = 0) => pauldron(.12, gold);
BUILD.quiver = () => quiver(1);

// ================================================================ ENEMY VARIETY (runtime)
// atlases: assets/props/var/<name>.jpg = recoloured copies of the soldier atlases (cloth hue changed; skin / steel kept)
const VARTEX = { askar: ['askar_r', 'askar_b', 'askar_o', 'askar_k'], archer: ['kamonchi_r', 'kamonchi_b', 'kamonchi_o'], wolf: ['bori_s', 'bori_g'] };
const TXL = {}; const ldr = () => ldr.l || (ldr.l = new THREE.TextureLoader());
function varMap(name, src, m) { const p = TXL[name] || (TXL[name] = ldr().loadAsync('./assets/props/var/' + name + '.jpg').catch(() => null)); p.then(t => { if (!t || !m) return; t.flipY = src.flipY; t.colorSpace = src.colorSpace; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.channel = src.channel; t.anisotropy = src.anisotropy; m.map = t; m.needsUpdate = true; }); }
// per chapter band: [helmet kind | 'none', atlas index (-1 = original), helmet options]
const LOOK = {
  early: [['fur', 2, { cloth: 0x5a4a2a, fur: 0x4a3626 }], ['fur', -1, { cloth: 0x7a1a14, fur: 0x2e2218 }], ['cone', 0, { nose: false }], ['none', 1, {}]],
  mid: [['cone', 0, {}], ['fur', 1, { cloth: 0x1e2a44, fur: 0x3a2a1c, flaps: true }], ['lam', -1, { plume: 0x8a1810 }], ['cone', 2, { nose: false }]],
  late: [['lam', 3, { plume: 0x1a1414, lace: 0x2a2a2a }], ['cone', 0, { dark: true, plume: 0x8a1810 }], ['lam', 1, { plume: 0xa01810 }], ['fur', 3, { cloth: 0x101010, fur: 0x1e1810, flaps: true }]],
};
const band = c => c <= 2 ? 'early' : c <= 4 ? 'mid' : 'late';
const CNT = {}; const HC = {};
function helm(kind, o) { const k = kind + JSON.stringify(o); return (HC[k] || (HC[k] = HELM[kind](o))).clone(); }
// head measurement in world space (current pose): brow centre, axes, radius at brow height
function headFit(rig, root) { const H = rig.B.Head || rig.B.head; if (!H) return null; let sm = null; rig.scene.traverse(k => { if (k.isSkinnedMesh && !sm && k.skeleton.bones.includes(H)) sm = k; }); if (!sm) return null;
  root.updateMatrixWorld(true); sm.skeleton.update(); const bi = sm.skeleton.bones.indexOf(H); const geo = sm.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, pos = geo.attributes.position; const v = new THREE.Vector3(); const P = [];
  const key = geo.uuid; let idx = HC['i' + key]; if (!idx) { idx = []; for (let i = 0; i < pos.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi) w += sw.getComponent(i, k); if (w >= .55) idx.push(i); } if (idx.length > 1500) idx = idx.filter((_, j) => j % Math.ceil(idx.length / 1500) === 0); HC['i' + key] = idx; }
  for (const i of idx) { v.fromBufferAttribute(pos, i); sm.applyBoneTransform(i, v); v.applyMatrix4(sm.matrixWorld); P.push(v.clone()); }
  if (P.length < 30) return null; const q = root.getWorldQuaternion(new THREE.Quaternion()); const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q); fwd.y = 0; fwd.normalize(); const side = new THREE.Vector3().crossVectors(up, fwd);
  let top = -1e9, bot = 1e9; for (const p of P) { top = Math.max(top, p.y); bot = Math.min(bot, p.y); } const hh = top - bot; const yb = top - hh * .42;
  let cx = 0, cz = 0, n = 0; for (const p of P) if (Math.abs(p.y - yb) < hh * .1) { cx += p.dot(side); cz += p.dot(fwd); n++; } if (!n) return null; cx /= n; cz /= n; let r = 0; for (const p of P) if (p.y > yb - hh * .08) r = Math.max(r, Math.hypot(p.dot(side) - cx, p.dot(fwd) - cz));
  const ctr = side.clone().multiplyScalar(cx).add(fwd.clone().multiplyScalar(cz)); ctr.y = yb; return { H, ctr, up, fwd, side, r, top, hh, yb, q }; }
function attachWorld(bone, obj, pos, quat, scl) { obj.position.copy(pos); obj.quaternion.copy(quat); obj.scale.setScalar(scl); obj.updateMatrixWorld(true); bone.attach(obj); obj.traverse(k => { if (k.isMesh) { k.castShadow = true; k.frustumCulled = false; } }); }
export function vary(e) { const rig = e.rig; if (!rig || !rig.B || e._mx) return; e._mx = 1; const ty = e.type, d = e.d || {};
  if (ty === 'qiz' && e.team !== 'enemy') { if (MX.G && e === MX.G.player) return; const n = CNT.qizA = (CNT.qizA || 0) + 1; let src = null; rig.scene.traverse(k => { if (k.isSkinnedMesh && k.material && k.material.map && !src) src = k; }); const L = [null, 'qiz_r', 'qiz_o', 'qiz_v']; if (src && L[n % 4]) varMap(L[n % 4], src.material.map, src.material); rig.body.scale.multiplyScalar([1, .97, 1.03, .985][n % 4]); return; }
  if (d.heavy || e.maxHp > 1e8 || ['mage', 'shaman'].includes(ty) || e.team !== 'enemy' || e.w4cat) return;
  const ch = (MX.G && MX.G.mis && MX.G.mis.c) || 1, b = band(ch); const cap = !!(e.hunt || /cap/.test(d.name || '') || d.cap);
  const base = ty === 'archer' ? 'archer' : (ty === 'wolf' || ty === 'boribasi') ? 'wolf' : 'askar'; const n = CNT[ty] = (CNT[ty] || 0) + 1;
  let src = null; rig.scene.traverse(k => { if (k.isSkinnedMesh && k.material && k.material.map && !src) src = k; });
  if (base === 'wolf') { if (ty === 'wolf' && src) { const L = VARTEX.wolf, i = n % 3; if (i < L.length) varMap(L[i], src.material.map, src.material); } if (ty === 'wolf') rig.body.scale.multiplyScalar([1, .92, 1.07][n % 3]); return; }
  const looks = LOOK[b]; let lk = looks[(n + (ty === 'archer' ? 1 : 0)) % looks.length];
  if (ty === 'nayza') lk = ['cone', b === 'late' ? 3 : 0, { dark: b === 'late', plume: b === 'early' ? 0 : 0x8a1810 }]; else if (ty === 'qilich') lk = ['lam', [-1, 0, 3][n % 3], { plume: [0xa01810, 0x1a1414, 0xd8c8a8][n % 3] }]; else if (ty === 'qalqan') lk = ['cone', [1, 2, 0][n % 3], {}];
  else if (d.name === 'w4_cav') lk = ['fur', [0, 2, 1][n % 3], { cloth: [0x7a1a14, 0x1e2a44, 0x3a3a1a][n % 3], fur: 0x2e2218, flaps: true }];
  if (ty === 'archer' && lk[0] !== 'fur') lk = ['fur', lk[1], { cloth: [0x4a3a22, 0x6a1a12, 0x22283a][n % 3], fur: 0x3a2a1c }];
  if (cap) lk = ['cone', 3, { gold: true, plume: 0xb01a10 }];
  if (src && lk[1] >= 0 && !(rig && rig.proc === 'wolf')) { const L = VARTEX[base];   /* wave4 (models agent idle): no wolf-man atlas on the quadruped R_bori4 */ varMap(L[Math.min(lk[1], L.length - 1)], src.material.map, src.material); }
  rig.body.scale.multiplyScalar(cap ? 1.06 : [1, .95, 1.04, .98][n % 4]);
  const f = headFit(rig, e.o || rig.root); if (!f) return;
  const qb = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.side, f.up, f.fwd));
  if (lk[0] !== 'none') { const hm = helm(lk[0], lk[2]); attachWorld(f.H, hm, f.ctr.clone().addScaledVector(f.fwd, -f.r * .04), qb, f.r * (lk[0] === 'fur' ? 1.04 : 1.1)); e._helm = hm; }
  if (cap || ty === 'nayza' || ty === 'qalqan' || (b === 'late' && n % 2)) for (const s of ['Left', 'Right']) { const A = rig.B[s + 'Arm']; if (!A) continue; const ap = A.getWorldPosition(new THREE.Vector3()); const sp = rig.B.Spine02 ? rig.B.Spine02.getWorldPosition(new THREE.Vector3()) : f.ctr; const out = ap.clone().sub(sp); out.y = 0; out.normalize();
    const pq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(f.up, out), f.up, out)); attachWorld(A, pauldron(1, cap), ap.clone().addScaledVector(out, f.r * .25).addScaledVector(f.up, f.r * .35), pq, f.r * 1.05); }
  const lf = rig.B.LeftForeArm; if (lf) { const sg = lf.children.find(k => k.isGroup && !k.isBone); if (sg) { if (ty === 'qalqan') sg.scale.multiplyScalar(1.45); const tint = new THREE.Color([0xffffff, 0xd09080, 0x9098b8, 0xc0b080][(n + (cap ? 1 : 0)) % 4]); sg.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(tint); } }); } }
  if (ty === 'archer' && rig.B.Spine02) { const sp = rig.B.Spine02, p = sp.getWorldPosition(new THREE.Vector3()); const qq = qb.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.35, 0, -.45))); attachWorld(sp, quiver(1), p.clone().addScaledVector(f.fwd, -f.r * 1.5).addScaledVector(f.side, f.r * .4).addScaledVector(f.up, -f.r * 2.2), qq, f.r * 6.5); }
}
export const MX = { G: null, on: true };
export function install(E) { if (MX.inst) return; MX.inst = 1; MX.G = E.G; window.__MX = { MX, vary, BUILD, amulet, headFit, put };
  const scan = () => { try { if (MX.on && MX.G && MX.G.ents) for (const e of MX.G.ents) if (!e._mx && e.rig && (e.team === 'enemy' || e.type === 'qiz') && !e.dead) vary(e); } catch (er) { console.warn('mx', er); } };
  setInterval(scan, 250); }
// auto-install when loaded by the game (tools set window.__MX_NOAUTO before importing)
// uses window.__G (set by engine.js) instead of importing engine.js: no risk of a second engine instance if ?v tags ever differ
if (typeof window !== 'undefined' && !window.__MX_NOAUTO) { const w = () => window.__G ? install({ G: window.__G }) : setTimeout(w, 300); w(); }
// put(parent, name, x, z, ry, ...args): build once per (name,args), then clone (shared geometry/materials) and place on the ground
const PC = {};
export function put(parent, name, x, z, ry = 0, ...args) { const k = name + ':' + args.join(':'); const src = PC[k] || (PC[k] = BUILD[name](...args)); const o = src.clone(true); if (src.userData.arm) { o.userData.arm = o.children.find(c => c.userData.keep); o.userData.cup = src.userData.cup && o.userData.arm ? o.userData.arm.children[src.userData.arm.children.indexOf(src.userData.cup)] : null; } o.position.set(x, 0, z); o.rotation.y = ry; if (parent) parent.add(o); return o; }
if (typeof window !== 'undefined') window.__MXB = { BUILD, put, amulet };
