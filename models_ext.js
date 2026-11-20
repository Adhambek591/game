// models_ext.js — procedural props + enemy visual variety for Qırq qız (models agent).
// Pure three.js; no engine import at module level (so it can be used from tools / the model viewer).
// API (see /home/user/agents/models_log.md):
//   BUILD.<name>(opts) -> THREE.Group (origin = ground centre, +Z = front, metres)
//   install(engineModule)  -> starts the enemy-variant scanner (helmets / atlases / shields / captains' gold)
//   amulet(S)              -> the canonical golden down-pointing triangle tumar (same geometry as skinrig's)
import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/jsm/utils/BufferGeometryUtils.js?v=1795199701';

const rnd = (a, b) => a + Math.random() * (b - a);
let SEED = 1; const srand = s => { SEED = s >>> 0 || 1; }; const sr = () => { SEED = (SEED * 1664525 + 1013904223) >>> 0; return SEED / 4294967296; }; const srr = (a, b) => a + sr() * (b - a);
const PI = Math.PI;

// ---------------------------------------------------------------- textures (canvas, no download)
const TXC = {};
function ctex(key, w, h, fn, rep = [1, 1], srgb = true) { if (TXC[key]) return TXC[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return TXC[key] = t; }
const hex = (c, k = 1) => { const C = new THREE.Color(c).multiplyScalar(k); return `rgb(${Math.min(255, C.r * 255) | 0},${Math.min(255, C.g * 255) | 0},${Math.min(255, C.b * 255) | 0})`; };
function speck(g, w, h, n, a, sz = 2, light = '255,240,220') { for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${Math.random() * a})` : `rgba(${light},${Math.random() * a * .6})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * sz, 1 + Math.random() * sz); } }
// wood: long grain along V (texture Y), with knots and darker plank seams
export const TX = {
  wood: (base = 0x7a5534, k = 'w') => ctex('wood' + base + k, 128, 512, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = Math.random() * w, d = Math.random() < .5; g.strokeStyle = d ? `rgba(30,15,5,${rnd(.08, .3)})` : `rgba(255,220,170,${rnd(.04, .14)})`; g.lineWidth = rnd(.6, 2.4); g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * .02 + i) * 3 + Math.sin(y * .007 + i * 3) * 6, y); g.stroke(); }
    for (let i = 0; i < 4; i++) { const x = rnd(10, w - 10), y = rnd(20, h - 20); const r = g.createRadialGradient(x, y, 1, x, y, rnd(5, 10)); r.addColorStop(0, 'rgba(25,12,4,.85)'); r.addColorStop(.5, 'rgba(60,30,10,.4)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.beginPath(); g.ellipse(x, y, 7, 14, 0, 0, 7); g.fill(); }
    speck(g, w, h, 1500, .18, 2); }),
  bark: () => ctex('bark', 128, 256, (g, w, h) => { g.fillStyle = '#4a3624'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const x = Math.random() * w; g.strokeStyle = `rgba(${Math.random() < .5 ? '15,8,3' : '150,120,90'},${rnd(.15, .5)})`; g.lineWidth = rnd(1, 4); g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 12) g.lineTo(x + rnd(-2.5, 2.5), y); g.stroke(); } speck(g, w, h, 2000, .25, 3); }),
  felt: (base = 0xd9ccb0) => ctex('felt' + base, 256, 256, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.strokeStyle = Math.random() < .5 ? 'rgba(60,40,20,.10)' : 'rgba(255,250,240,.10)'; g.lineWidth = rnd(.5, 1.4); const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3, l = rnd(2, 7); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 18; i++) { const x = Math.random() * w, y = Math.random() * h, r = rnd(10, 40); const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, 'rgba(80,60,30,.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } }),
  // Karakalpak ornament band: red ground, white ram's-horn (qoshqar múyiz) scrolls, dark border lines
  band: (bg = '#8e1a14', fg = '#efe3c8', edge = '#1c120c') => ctex('band' + bg + fg, 512, 64, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = edge; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7); g.fillStyle = fg; g.fillRect(0, 9, w, 2); g.fillRect(0, h - 11, w, 2);
    g.strokeStyle = fg; g.lineWidth = 4; g.lineCap = 'round'; const s = 64; for (let x = 0; x < w; x += s) { const cx = x + s / 2, cy = h / 2; g.beginPath(); g.moveTo(cx, cy + 14); g.lineTo(cx, cy - 4); g.bezierCurveTo(cx, cy - 16, cx - 18, cy - 16, cx - 18, cy - 4); g.bezierCurveTo(cx - 18, cy + 4, cx - 9, cy + 6, cx - 8, cy - 2); g.moveTo(cx, cy - 4); g.bezierCurveTo(cx, cy - 16, cx + 18, cy - 16, cx + 18, cy - 4); g.bezierCurveTo(cx + 18, cy + 4, cx + 9, cy + 6, cx + 8, cy - 2); g.stroke();
      g.beginPath(); g.moveTo(x, cy); g.lineTo(x + 5, cy - 6); g.lineTo(x + 10, cy); g.lineTo(x + 5, cy + 6); g.closePath(); g.fill(); } speck(g, w, h, 600, .15, 2); }, [1, 1]),
  // dark Oirat felt with black/ochre band (enemy yurts)
  mail: () => ctex('mail', 128, 128, (g, w, h) => { g.fillStyle = '#2a2a2c'; g.fillRect(0, 0, w, h); for (let y = 0; y < h + 8; y += 8) for (let x = 0; x < w + 8; x += 8) { const ox = (y / 8) % 2 ? 4 : 0; g.strokeStyle = 'rgba(190,190,195,.85)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x + ox, y, 3.2, 0, 7); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = .8; g.beginPath(); g.arc(x + ox + .6, y + .6, 3.2, .3, 2.2); g.stroke(); } }, [3, 2]),
  lamellar: (base = 0x5a5e66, lace = 0x7a1a14) => ctex('lam' + base + lace, 128, 128, (g, w, h) => { g.fillStyle = hex(lace); g.fillRect(0, 0, w, h); const pw = 10, ph = 26; for (let r = 0; r * ph < h + ph; r++) for (let x = -pw; x < w + pw; x += pw) { const ox = r % 2 ? pw / 2 : 0, X = x + ox, Y = r * ph - 4; const gr = g.createLinearGradient(X, 0, X + pw, 0); gr.addColorStop(0, hex(base, .7)); gr.addColorStop(.5, hex(base, 1.25)); gr.addColorStop(1, hex(base, .6)); g.fillStyle = gr; g.beginPath(); g.moveTo(X + 1, Y); g.lineTo(X + pw - 1, Y); g.lineTo(X + pw - 1, Y + ph - 4); g.quadraticCurveTo(X + pw / 2, Y + ph + 1, X + 1, Y + ph - 4); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(X + pw / 2 - 1, Y + 5, 2, 2); g.fillRect(X + pw / 2 - 1, Y + ph - 9, 2, 2); } speck(g, w, h, 500, .2, 2); }, [2, 1]),
  fur: (base = 0x5a4632) => ctex('fur' + base, 128, 64, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const x = Math.random() * w, y = Math.random() * h; g.strokeStyle = Math.random() < .55 ? `rgba(15,8,2,${rnd(.15, .45)})` : `rgba(255,235,200,${rnd(.08, .3)})`; g.lineWidth = rnd(.6, 1.5); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-2, 2), y + rnd(4, 9)); g.stroke(); } }, [4, 1]),
  hide: (base = 0x8a6a48) => ctex('hide' + base, 256, 256, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h, r = rnd(15, 60); const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, `rgba(${Math.random() < .5 ? '40,25,10' : '255,230,190'},.12)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    g.strokeStyle = 'rgba(40,24,10,.55)'; g.lineWidth = 2; g.setLineDash([5, 4]); for (const y of [64, 192]) { g.beginPath(); g.moveTo(0, y + rnd(-6, 6)); g.bezierCurveTo(80, y + 10, 170, y - 10, 256, y); g.stroke(); } g.setLineDash([]); speck(g, w, h, 2500, .15, 2); }),
  rope: () => ctex('rope', 64, 64, (g, w, h) => { g.fillStyle = '#9a8460'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,28,14,.7)'; g.lineWidth = 3; for (let i = -64; i < 128; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 64); g.stroke(); } }, [6, 1]),
  stone: (base = 0x8a8072) => ctex('stone' + base, 256, 256, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const x = Math.random() * w, y = Math.random() * h, r = rnd(10, 50); const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, `rgba(${Math.random() < .5 ? '30,25,20' : '240,230,210'},.16)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } speck(g, w, h, 4000, .3, 2); }),
  cloth: (base = 0x8a1c14, stripe = 0xd8b048) => ctex('cloth' + base + stripe, 128, 256, (g, w, h) => { g.fillStyle = hex(base); g.fillRect(0, 0, w, h); g.fillStyle = hex(stripe); g.fillRect(0, h - 26, w, 6); g.fillRect(0, h - 14, w, 3); for (let x = 6; x < w; x += 16) { g.beginPath(); g.moveTo(x, h - 40); g.lineTo(x + 5, h - 32); g.lineTo(x, h - 28); g.lineTo(x - 5, h - 32); g.closePath(); g.fill(); } for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 3); } }),
};
// ---------------------------------------------------------------- materials (cached)
const MC = {};
export function mat(key, o) { return MC[key] || (MC[key] = new THREE.MeshStandardMaterial(o)); }
export const M = {
  wood: (c = 0x7a5534) => mat('wood' + c, { map: TX.wood(c), bumpMap: TX.wood(c), bumpScale: 1.2, roughness: .92, color: 0xffffff }),
  woodDark: () => M.wood(0x4e3420),
  bark: () => mat('bark', { map: TX.bark(), bumpMap: TX.bark(), bumpScale: 2, roughness: 1 }),
  felt: (c = 0xd9ccb0) => mat('felt' + c, { map: TX.felt(c), bumpMap: TX.felt(c), bumpScale: 1.5, roughness: 1 }),
  band: (bg, fg) => mat('band' + bg + fg, { map: TX.band(bg, fg), roughness: .95 }),
  iron: () => mat('iron', { color: 0x3a3a3e, metalness: .85, roughness: .45 }),
  steel: () => mat('steel', { color: 0x8a8e96, metalness: .9, roughness: .32 }),
  dsteel: () => mat('dsteel', { color: 0x4a4c52, metalness: .9, roughness: .38 }),
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
// ---------------------------------------------------------------- geometry helpers
function mk(geo, m, x = 0, y = 0, z = 0, parent) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; if (parent) parent.add(o); return o; }
// a log/beam from point a to b (radius r, slightly irregular)
function beam(a, b, r, m, parent, seg = 7, wob = .12) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B); const g = new THREE.CylinderGeometry(r * srr(1 - wob, 1), r * srr(1, 1 + wob), L, seg, 1); const o = mk(g, m, 0, 0, 0, parent); o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); o.rotateY(sr() * 6.28); return o; }
function board(w, h, d, m, x, y, z, parent, bev = .015) { const g = new THREE.BoxGeometry(w, h, d); return mk(g, m, x, y, z, parent); }
function lathe(pts, seg, m, parent, phi0 = 0, phiL = PI * 2) { return mk(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg, phi0, phiL), m, 0, 0, 0, parent); }
function wheel(R, w, m, mi, parent, spokes = 10) { const g = new THREE.Group(); const rim = mk(new THREE.TorusGeometry(R - .045, .05, 6, 22), m, 0, 0, 0, g); rim.scale.z = w / .1; const tyre = mk(new THREE.TorusGeometry(R - .01, .022, 4, 22), mi, 0, 0, 0, g); tyre.scale.z = w / .05;
  const hub = mk(new THREE.CylinderGeometry(.09, .09, w * 1.8, 10), m, 0, 0, 0, g); hub.rotation.x = PI / 2; const cap = mk(new THREE.CylinderGeometry(.06, .06, w * 2.1, 8), mi, 0, 0, 0, g); cap.rotation.x = PI / 2;
  for (let i = 0; i < spokes; i++) { const a = i / spokes * PI * 2; const s = mk(new THREE.CylinderGeometry(.018, .025, R - .1, 5), m, Math.cos(a) * (R - .05) / 2, Math.sin(a) * (R - .05) / 2, 0, g); s.rotation.z = a - PI / 2; } if (parent) parent.add(g); return g; }
// merge all static meshes of a group by material (fewer draw calls); children flagged userData.keep stay separate
export function bake(root) { root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(); const byM = new Map(), drop = [];
  root.traverse(o => { if (!o.isMesh || o.userData.keep) return; let p = o.parent, kept = false; while (p && p !== root) { if (p.userData.keep) kept = true; p = p.parent; } if (kept) return; let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); g.applyMatrix4(inv.clone().multiply(o.matrixWorld)); const L = byM.get(o.material) || []; L.push(g); byM.set(o.material, L); drop.push(o); });
  for (const o of drop) o.parent.remove(o); for (const [m, L] of byM) { const g = mergeGeometries(L, false); if (!g) continue; g.computeBoundingSphere(); const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = true; root.add(me); } return root; }
const tri = n => { let t = 0; n.traverse(o => { if (o.isMesh) { const g = o.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return t | 0; };

// ---------------------------------------------------------------- the tumar (amulet): small golden triangle pointing DOWN
// Identical to skinrig.addAmulet (r .058, depth .009, inner engraved triangle .024, cord ring) — use this for any other wearer.
export function amulet(S = 1) { const g = new THREE.Group(); const t = (r, dep) => { const sh = new THREE.Shape(); sh.moveTo(-r * .866, r * .5); sh.lineTo(r * .866, r * .5); sh.lineTo(0, -r); sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: dep * .4, bevelSize: r * .08, bevelSegments: 1 }); };
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b040, metalness: 1, roughness: .28, emissive: 0x6a4000, emissiveIntensity: .9 }); g.add(new THREE.Mesh(t(.058, .009), gold)); const ins = new THREE.Mesh(t(.024, .004), new THREE.MeshStandardMaterial({ color: 0x7a4e10, metalness: .9, roughness: .45 })); ins.position.z = .011; g.add(ins);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(.012, .003, 6, 12), gold); cord.position.y = .038; g.add(cord); g.scale.setScalar(S); g.userData.mat = gold; return g; }

// ================================================================ BUILDERS
export const BUILD = {};
// ---- catapult cart (manjanıq): 4-wheel cart, A-frame, throwing beam with sling cup + counterweight crate.
//  side: 'enemy' (dark wood, black/red pennant) | 'ally' (light wood, red/gold Karakalpak band)
//  returns group with .userData.arm (rotate .rotation.x: -0.6 rest .. +0.9 cocked) and .userData.cup (stone), same as wave4's w4arm/w4cup
BUILD.catapult = (side = 'enemy') => { srand(side === 'ally' ? 7 : 3); const g = new THREE.Group(), en = side !== 'ally'; const W = M.wood(en ? 0x5a3c22 : 0x8a6238), Wd = M.wood(en ? 0x3e2a18 : 0x6a4a2a), I = M.iron(), R = M.rope();
  // chassis: two long side beams + cross beams + plank bed
  for (const s of [-1, 1]) board(.18, .2, 3.4, Wd, s * .72, .62, 0, g); for (const z of [-1.5, -.6, .6, 1.5]) board(1.64, .16, .16, Wd, 0, .62, z, g);
  for (let x = -.6; x <= .61; x += .2) board(.19, .05, 2.2, W, x, .73, .2, g);
  // axles + wheels
  for (const z of [-1.15, 1.15]) { const ax = mk(new THREE.CylinderGeometry(.06, .06, 1.9, 8), I, 0, .42, z, g); ax.rotation.z = PI / 2; for (const s of [-1, 1]) { const w = wheel(.42, .1, Wd, I, g, 8); w.position.set(s * .9, .42, z); w.rotation.y = PI / 2; } }
  // A-frame trestles with braces
  for (const s of [-1, 1]) { beam([s * .62, .7, -.75], [s * .5, 2.35, 0], .085, W, g); beam([s * .62, .7, .75], [s * .5, 2.35, 0], .085, W, g); beam([s * .62, 1.3, -.5], [s * .62, 1.3, .5], .05, W, g); for (const z of [-.75, .75]) mk(new THREE.BoxGeometry(.2, .06, .22), I, s * .62, .78, z, g); }
  const pv = mk(new THREE.CylinderGeometry(.07, .07, 1.3, 10), I, 0, 2.35, 0, g); pv.rotation.z = PI / 2; for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(.12, .12, .1, 10), I, s * .5, 2.35, 0, g).rotation.z = PI / 2;
  // windlass at the back
  const wl = mk(new THREE.CylinderGeometry(.11, .11, 1.2, 10), W, 0, 1.0, 1.35, g); wl.rotation.z = PI / 2; mk(new THREE.CylinderGeometry(.125, .125, .5, 10), R, 0, 1.0, 1.35, g).rotation.z = PI / 2;
  for (const s of [-1, 1]) { board(.1, .55, .12, Wd, s * .65, .9, 1.35, g); const h = mk(new THREE.CylinderGeometry(.03, .03, .6, 6), W, s * .74, 1.0, 1.35, g); h.rotation.x = PI / 2; }
  // throwing arm (animated): pivot at y 2.35; long end towards -Z with the cup, short end with the counterweight crate
  const arm = new THREE.Group(); arm.position.set(0, 2.35, 0); arm.userData.keep = 1; g.add(arm);
  const b = mk(new THREE.BoxGeometry(.16, .18, 3.3), W, 0, 0, -.55, arm); b.geometry.translate(0, 0, 0); for (const z of [-1.9, -.4, .5]) { const band = mk(new THREE.BoxGeometry(.2, .22, .06), I, 0, 0, z, arm); }
  const cw = new THREE.Group(); cw.position.set(0, -.25, 1.05); arm.add(cw); board(.56, .5, .5, Wd, 0, -.1, 0, cw); for (const y of [-.32, .12]) board(.6, .05, .54, I, 0, y, 0, cw); for (let i = 0; i < 5; i++) mk(new THREE.DodecahedronGeometry(.11, 0), M.stone(), srr(-.18, .18), .2, srr(-.15, .15), cw);
  const cupG = new THREE.Group(); cupG.position.set(0, .14, -2.15); arm.add(cupG); const bowl = lathe([[0, -.05], [.2, -.03], [.27, .1], [.28, .16]], 10, W, cupG); bowl.material = W; mk(new THREE.TorusGeometry(.27, .025, 5, 12), I, 0, .16, 0, cupG).rotation.x = PI / 2;
  const stone = mk(new THREE.DodecahedronGeometry(.2, 1), M.stone(0x7a7266), 0, .2, 0, cupG); stone.scale.set(1, .85, 1.1);
  // pennant
  const pole = beam([.62, .7, 1.6], [.62, 3.3, 1.6], .03, Wd, g); const fl = mk(new THREE.PlaneGeometry(.7, .45, 4, 1), en ? M.cloth(0x1c1a1c, 0x8a1c14) : M.cloth(0x8e1a14, 0xd8b048), .62 + .35, 3.05, 1.6, g); fl.rotation.y = PI / 2; { const p = fl.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 6) * .05); fl.geometry.computeVertexNormals(); }
  // rope coil + stones pile on the bed
  const coil = mk(new THREE.TorusGeometry(.18, .045, 6, 14), R, -.35, .8, .9, g); coil.rotation.x = PI / 2; for (let i = 0; i < 4; i++) mk(new THREE.DodecahedronGeometry(.16, 0), M.stone(0x7a7266), .3 + srr(-.1, .1), .85, -.9 + i * .22, g);
  bake(g); g.userData.arm = arm; g.userData.cup = stone; g.userData.cupG = cupG; return g; };

// ---- palisade: sharpened log stakes with two lashed cross rails. len metres along X.
BUILD.palisade = (len = 6, h = 2.8) => { srand(len * 31 | 0); const g = new THREE.Group(), B = M.bark(), W = M.wood(0x8a6a48), R = M.rope(); const n = Math.max(3, Math.round(len / .34));
  for (let i = 0; i < n; i++) { const x = -len / 2 + (i + .5) * len / n, r = srr(.13, .18), hh = h * srr(.9, 1.08); const lg = mk(new THREE.CylinderGeometry(r, r * 1.05, hh, 7), B, x, hh / 2 - .15, srr(-.04, .04), g); lg.rotation.set(srr(-.04, .04), sr() * 6, srr(-.035, .035)); const tip = mk(new THREE.ConeGeometry(r, r * 2.6, 7), W, x, hh - .15 + r * 1.3, lg.position.z, g); tip.rotation.copy(lg.rotation); }
  for (const y of [.7, h * .72]) { beam([-len / 2, y, -.2], [len / 2, y + srr(-.05, .05), -.2], .07, B, g, 6, .05); for (let x = -len / 2 + .5; x < len / 2; x += 1.4) mk(new THREE.TorusGeometry(.17, .03, 4, 8), R, x, y, -.08, g); }
  for (let x = -len / 2 + 1; x < len / 2; x += 2.6) beam([x, 0, -1.1], [x, h * .7, -.25], .08, B, g, 6);  // back props
  return bake(g); };
// ---- watchtower: 4 log legs with X braces, plank platform with railing, hide-covered roof, ladder. Height ~7.5 m, footprint 3x3
BUILD.watchtower = (side = 'enemy') => { srand(11); const g = new THREE.Group(), B = M.bark(), W = M.wood(side === 'ally' ? 0x8a6238 : 0x5e4028), R = M.rope(); const H = 5.2, a = 1.4, t = 1.1;
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; for (const [sx, sz] of legs) beam([sx * a, -.2, sz * a], [sx * t, H + 2.1, sz * t], .14, B, g, 7, .05);
  const at = y => a + (t - a) * (y + .2) / (H + 2.3); for (let k = 0; k < 4; k++) { const [x1, z1] = legs[k], [x2, z2] = legs[(k + 1) % 4]; for (const [y0, y1] of [[.4, 2.6], [2.6, H - .1]]) { beam([x1 * at(y0), y0, z1 * at(y0)], [x2 * at(y1), y1, z2 * at(y1)], .06, B, g, 5); beam([x2 * at(y0), y0, z2 * at(y0)], [x1 * at(y1), y1, z1 * at(y1)], .06, B, g, 5); } beam([x1 * at(2.6), 2.6, z1 * at(2.6)], [x2 * at(2.6), 2.6, z2 * at(2.6)], .07, B, g, 5); }
  // platform
  const pw = 2 * at(H) + .5; for (let x = -pw / 2 + .12; x < pw / 2; x += .24) board(.22, .07, pw, W, x, H, 0, g); for (const s of [-1, 1]) board(pw + .1, .14, .14, W, 0, H - .1, s * pw / 2, g);
  // railing + hide shields on the railing
  for (let k = 0; k < 4; k++) { const ang = k * PI / 2; const c = Math.cos(ang), s = Math.sin(ang); const p = new THREE.Group(); p.rotation.y = ang; g.add(p); board(pw, .08, .08, W, 0, H + 1.05, pw / 2, p); board(pw, .06, .06, W, 0, H + .55, pw / 2, p); for (let x = -pw / 2 + .2; x <= pw / 2; x += .45) board(.07, 1.1, .07, W, x, H + .55, pw / 2, p);
    const hd = mk(new THREE.PlaneGeometry(pw * .9, .75, 3, 2), M.hide(0x7a5a3a), 0, H + .55, pw / 2 + .06, p); }
  // roof: four-sided hide/reed pyramid on posts
  for (const [sx, sz] of legs) beam([sx * t * 1.05, H, sz * t * 1.05], [sx * t, H + 2.25, sz * t], .06, B, g, 5);
  const roof = mk(new THREE.ConeGeometry(pw * .82, 1.3, 4, 1, true), M.hide(0x6a4a2e), 0, H + 2.85, 0, g); roof.rotation.y = PI / 4; const rim = mk(new THREE.ConeGeometry(pw * .84, .2, 4, 1, true), M.rope(), 0, H + 2.28, 0, g); rim.rotation.y = PI / 4;
  // ladder on the front
  for (const s of [-1, 1]) beam([s * .28, 0, a + .7], [s * .28, H + .1, t + .3], .045, W, g, 5); for (let k = 1; k < 13; k++) { const f = k / 13, y = f * H, z = a + .7 + (t + .3 - a - .7) * f; beam([-.3, y, z], [.3, y, z], .03, W, g, 5); }
  // tug (horse-tail standard) on top
  const sp = beam([0, H + 2.7, 0], [0, H + 4.1, 0], .035, W, g, 5); const tug = new THREE.Group(); tug.position.set(0, H + 3.9, 0); g.add(tug); mk(new THREE.SphereGeometry(.09, 8, 6), M.gold(), 0, .25, 0, tug); for (let i = 0; i < 9; i++) { const a2 = i / 9 * 6.28; const st = mk(new THREE.CylinderGeometry(.03, .006, .9, 4), M.col(side === 'ally' ? 0xe8e0d0 : 0x1a1614), Math.cos(a2) * .07, -.35, Math.sin(a2) * .07, tug); st.rotation.set(Math.sin(a2) * .25, 0, -Math.cos(a2) * .25); }
  return bake(g); };
// ---- weapon rack: A-frame with spears and sabres + two round shields
BUILD.weaponRack = () => { srand(5); const g = new THREE.Group(), W = M.wood(0x5e4028), I = M.steel();
  for (const s of [-1, 1]) { beam([s * 1, 0, -.35], [s * 1, 1.5, 0], .05, W, g); beam([s * 1, 0, .35], [s * 1, 1.5, 0], .05, W, g); } beam([-1.1, 1.45, 0], [1.1, 1.45, 0], .045, W, g); beam([-1.05, .5, .22], [1.05, .5, .22], .04, W, g);
  for (let i = 0; i < 6; i++) { const x = -.85 + i * .34; beam([x, .05, .45], [x + srr(-.05, .05), 2.25, -.05], .02, W, g, 5); const tip = mk(new THREE.ConeGeometry(.035, .28, 4), I, 0, 0, 0, g); tip.position.set(x, 2.38, -.08); tip.rotation.x = -.2; const tas = mk(new THREE.ConeGeometry(.05, .16, 6), M.col(0x8a1c14), x, 2.18, -.05, g); }
  for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * .55, .62, .32); sh.rotation.x = -.25; g.add(sh); lathe([[0, .1], [.2, .08], [.36, .03], [.4, 0]], 14, M.hide(0x6a4426), sh).rotation.x = -PI / 2; mk(new THREE.SphereGeometry(.07, 8, 6, 0, 6.3, 0, 1.6), I, 0, 0, .1, sh).rotation.x = PI / 2; mk(new THREE.TorusGeometry(.39, .02, 4, 18), M.iron(), 0, 0, .01, sh); }
  return bake(g); };
// ---- small tent (hide/felt lean-to for soldiers) 3 x 2.4 m
BUILD.tent = (c = 0x6e5236) => { srand(c & 255); const g = new THREE.Group(), H = M.hide(c), W = M.wood(0x5e4028), R = M.rope(); const L = 3, h = 1.9;
  const sh = new THREE.Shape(); sh.moveTo(-1.25, 0); sh.lineTo(0, h); sh.lineTo(1.25, 0); const geo = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2); const cloth = mk(geo, H, 0, 0, 0, g); { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > .05 && y < h - .05) p.setX(i, p.getX(i) * (1 - .06 * Math.sin(y / h * PI))); } geo.computeVertexNormals(); }
  const inner = mk(new THREE.PlaneGeometry(2.3, 1.7), M.col(0x120c08, { side: THREE.DoubleSide }), 0, .8, L / 2 + .01, g);
  for (const z of [-L / 2 - .05, L / 2 + .05]) beam([0, 0, z], [0, h + .35, z], .04, W, g, 5); beam([0, h + .02, -L / 2 - .1], [0, h + .02, L / 2 + .1], .035, W, g, 5);
  for (const [x, z] of [[-1.25, -L / 2], [1.25, -L / 2], [-1.25, L / 2], [1.25, L / 2]]) { beam([x * .35, h * .7, z], [x * 1.5, 0, z + Math.sign(z) * .6], .01, R, g, 3); mk(new THREE.ConeGeometry(.03, .25, 4), W, x * 1.5, .05, z + Math.sign(z) * .6, g); }
  return bake(g); };
// ---- tug: horse-tail standard (steppe banner), 4.2 m
BUILD.tug = (tail = 0x1a1614, cloth = 0x8a1c14) => { srand(9); const g = new THREE.Group(), W = M.wood(0x4e3420); beam([0, 0, 0], [0, 4.2, 0], .04, W, g, 6); mk(new THREE.ConeGeometry(.06, .4, 4), M.steel(), 0, 4.4, 0, g); mk(new THREE.TorusGeometry(.12, .02, 5, 12), M.gold(), 0, 4.05, 0, g).rotation.x = PI / 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; const st = mk(new THREE.CylinderGeometry(.035, .006, 1.3, 4), M.col(tail, { roughness: .8 }), Math.cos(a) * .1, 3.4, Math.sin(a) * .1, g); st.rotation.set(Math.sin(a) * .18, 0, -Math.cos(a) * .18); }
  const fl = mk(new THREE.PlaneGeometry(.9, .55, 5, 1), M.cloth(cloth, 0xd8b048), .47, 3.75, 0, g); { const p = fl.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + .45) * 5) * .06); fl.geometry.computeVertexNormals(); }
  return bake(g); };
// ---- campfire with stone ring, logs, tripod and qazan (cauldron). (Flames/smoke: use FX.fire on top, y .25)
BUILD.campfire = (qazan = true) => { srand(13); const g = new THREE.Group(), S = M.stone(0x6e665a), W = M.bark(), I = M.iron();
  for (let i = 0; i < 11; i++) { const a = i / 11 * 6.28; const s = mk(new THREE.DodecahedronGeometry(srr(.12, .17), 0), S, Math.cos(a) * .62, .07, Math.sin(a) * .62, g); s.scale.y = .7; s.rotation.set(sr() * 3, sr() * 3, 0); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; beam([Math.cos(a) * .5, .05, Math.sin(a) * .5], [Math.cos(a) * .05, .35, Math.sin(a) * .05], .05, W, g, 6); }
  mk(new THREE.CircleGeometry(.55, 14), M.col(0x1a1410), 0, .02, 0, g).rotation.x = -PI / 2;
  if (qazan) { for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28 + .3; beam([Math.cos(a) * .85, 0, Math.sin(a) * .85], [0, 1.55, 0], .03, M.woodDark(), g, 5); } beam([0, 1.55, 0], [0, 1.0, 0], .006, I, g, 3); const q = lathe([[0, -.02], [.2, 0], [.33, .12], [.36, .3], [.34, .34], [.38, .36]], 14, I, g); q.position.y = .62; mk(new THREE.TorusGeometry(.36, .02, 4, 14), I, 0, .98, 0, g).rotation.x = PI / 2; }
  return bake(g); };
// ---- archer line props: wicker mantlet (pavise) row element, arrow basket
BUILD.mantlet = () => { srand(17); const g = new THREE.Group(), W = M.wood(0x8a6a48), wk = M.wood(0x9a7a50, 'k'); const w = 1.6, h = 1.5;
  for (let i = 0; i < 9; i++) { const x = -w / 2 + i * w / 8; beam([x, -.1, 0], [x, h + .1, 0], .025, W, g, 5); }
  for (let y = .05; y < h; y += .07) { const pts = []; for (let i = 0; i <= 16; i++) { const x = -w / 2 + i * w / 16; pts.push(new THREE.Vector3(x, y, Math.sin((i + y * 14) * PI) * .025)); } const c = new THREE.CatmullRomCurve3(pts); mk(new THREE.TubeGeometry(c, 16, .018, 3), wk, 0, 0, 0, g); }
  beam([0, .9, -.05], [0, 0, -.9], .03, W, g, 5); g.rotation.x = -.12; const o = new THREE.Group(); o.add(g); return bake(o); };
BUILD.arrowBasket = () => { srand(19); const g = new THREE.Group(); lathe([[0, 0], [.16, 0], [.19, .5], [.2, .55]], 10, M.wood(0x9a7a50, 'k'), g); for (let i = 0; i < 16; i++) { const a = sr() * 6.28, r = sr() * .14; const x = Math.cos(a) * r, z = Math.sin(a) * r; beam([x, .1, z], [x * 1.6, .95, z * 1.6], .007, M.wood(0x8a6a48), g, 3); const f = mk(new THREE.PlaneGeometry(.04, .12), M.col(sr() < .5 ? 0xe8e0d0 : 0x2a2420, { side: THREE.DoubleSide }), x * 1.6, .9, z * 1.6, g); f.rotation.y = a; } return bake(g); };
// ---- river ford set: stepping stones (flat), reed clumps, marker stakes with a guide rope, a moored boat (qayıq)
BUILD.reeds = (n = 26) => { srand(n); const g = new THREE.Group(); const mt = M.col(0x6a7a3a, { side: THREE.DoubleSide }), mt2 = M.col(0x9a8a4a, { side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) { const a = sr() * 6.28, r = Math.sqrt(sr()) * .7, h = srr(.9, 1.8); const b = mk(new THREE.PlaneGeometry(.05, h, 1, 3), sr() < .7 ? mt : mt2, Math.cos(a) * r, h / 2, Math.sin(a) * r, g); b.rotation.set(srr(-.25, .25), sr() * 3, srr(-.25, .25)); { const p = b.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k) + h / 2; p.setX(k, p.getX(k) * (1 - y / h * .8)); p.setZ(k, (y / h) ** 2 * .15); } }
    if (sr() < .3) mk(new THREE.CylinderGeometry(.025, .025, .18, 5), M.col(0x5a3a1a), Math.cos(a) * r, h + .05, Math.sin(a) * r, g); }
  return bake(g); };
BUILD.fordStones = (len = 8) => { srand(len * 7 | 0); const g = new THREE.Group(); for (let z = -len / 2; z <= len / 2; z += .85) { const s = mk(new THREE.CylinderGeometry(srr(.35, .5), srr(.45, .6), .4, 7), M.stone(0x6e6a60), srr(-.35, .35), .05, z, g); s.rotation.y = sr() * 3; s.scale.z = srr(.7, 1); } return bake(g); };
BUILD.fordStakes = (len = 10) => { srand(23); const g = new THREE.Group(), W = M.bark(), R = M.rope(); const pts = []; for (let z = -len / 2; z <= len / 2 + .01; z += len / 4) { beam([0, -.6, z], [srr(-.1, .1), 1.3, z], .06, W, g, 6); pts.push(new THREE.Vector3(0, 1.15, z)); }
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const c = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, .5).add(new THREE.Vector3(0, -.25, 0)), b); mk(new THREE.TubeGeometry(c, 8, .015, 3), R, 0, 0, 0, g); } return bake(g); };
BUILD.boat = () => { srand(29); const g = new THREE.Group(), W = M.wood(0x6a4a2a), D = M.woodDark(); const L = 4.2, B = .6, H = .5;
  for (let k = 0; k < 4; k++) { const y = k * H / 4; const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, z = (t - .5) * L, w = B * Math.sin(t * PI) ** .6 * (.6 + .4 * k / 3); pts.push(new THREE.Vector3(w, y + Math.abs(t - .5) ** 2 * .6, z)); } for (const s of [-1, 1]) { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x * s, p.y, p.z))); mk(new THREE.TubeGeometry(c, 20, .07, 4), k ? W : D, 0, 0, 0, g); } }
  const hull = mk(new THREE.CylinderGeometry(B * .9, B * .9, L * .92, 12, 1, false, PI / 2, PI), D, 0, H * .7, 0, g); hull.rotation.x = PI / 2; hull.scale.set(1, 1, .55);
  for (const z of [-.8, .6]) board(B * 1.5, .05, .25, W, 0, H * .65, z, g); const oar = beam([.3, .55, -.3], [1.3, .05, 1.4], .025, W, g, 5); board(.14, .02, .5, W, 1.3, .05, 1.5, g).rotation.y = -.5;
  return bake(g); };
// ---- yurt (Karakalpak qara úy / aq úy, or enemy dark-felt kibitka): lattice-wall hemisphere-cone profile, ornamented band, wooden door
BUILD.yurt = (style = 'qq') => { srand(style === 'qq' ? 31 : 37); const g = new THREE.Group(), en = style !== 'qq'; const R = 2.75, Hw = 1.55, Hr = 3.05;
  const F = en ? M.felt(0x6a6258) : M.felt(0xe2d6bc), Fr = en ? M.felt(0x58524a) : M.felt(0xd6c8aa), W = M.wood(0x8a5a30);
  // wall: slight outward bulge, door gap at +Z
  const wall = lathe([[R * .985, 0], [R * 1.01, .25], [R, Hw * .7], [R * .97, Hw]], 28, F, g, PI * .5 + .32, PI * 2 - .64);
  // roof: curved (uyq poles), sagging between poles a bit
  const rp = []; for (let i = 0; i <= 8; i++) { const t = i / 8; rp.push([R * .99 * (1 - t) + .42 * t, Hw + (Hr - Hw) * (Math.sin(t * PI / 2) * .85 + t * .15)]); } const roof = lathe(rp, 28, Fr, g); { const p = roof.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); const sag = (1 - Math.abs(Math.cos(a * 14))) * .045 * Math.sin((r - .4) / (R - .4) * PI); p.setY(i, p.getY(i) - sag); } roof.geometry.computeVertexNormals(); }
  // shańaraq crown ring + cross bars + smoke flap
  mk(new THREE.TorusGeometry(.44, .07, 6, 18), W, 0, Hr + .02, 0, g).rotation.x = PI / 2; for (const a of [0, PI / 2]) { const b = mk(new THREE.CylinderGeometry(.03, .03, .9, 5), W, 0, Hr + .1, 0, g); b.rotation.set(PI / 2, 0, a); b.rotation.order = 'YXZ'; b.rotation.y = a; }
  const flap = mk(new THREE.PlaneGeometry(1.2, 1.0, 3, 3), Fr, 0, Hr - .15, -.75, g); flap.rotation.x = -1.0;
  // ornamented band (baskúr) around the wall top + white/ochre rope ties
  const bandT = en ? M.band('#2a2420', '#b08a40') : M.band('#8e1a14', '#efe3c8'); const bg = new THREE.CylinderGeometry(R * 1.0, R * 1.0, .28, 32, 1, true, PI * .5 + .34, PI * 2 - .68); bandT.map.repeat.set(10, 1); mk(bg, bandT, 0, Hw - .12, 0, g);
  const bg2 = new THREE.CylinderGeometry(R * 1.005, R * 1.005, .16, 32, 1, true, PI * .5 + .34, PI * 2 - .68); mk(bg2, bandT, 0, .55, 0, g);
  for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2 + .2; if (Math.abs(Math.atan2(Math.sin(a - PI / 2), Math.cos(a - PI / 2))) < .45) continue; const p = [Math.cos(a) * R * 1.0, 0, Math.sin(a) * R * 1.0]; beam([p[0] * .99, Hw + .05, p[2] * .99], [p[0] * .45, Hr - .3, p[2] * .45], .018, M.rope(), g, 3); }
  // door: carved double-leaf wooden door with red/ochre panels in a frame (at +Z)
  const dg = new THREE.Group(); dg.position.set(0, 0, R * .985); g.add(dg); const fw = M.wood(0x6a3a1c); board(.12, 1.65, .14, fw, -.56, .82, 0, dg); board(.12, 1.65, .14, fw, .56, .82, 0, dg); board(1.26, .14, .16, fw, 0, 1.68, 0, dg); board(1.26, .1, .16, fw, 0, .05, 0, dg);
  for (const s of [-1, 1]) { const lf = board(.5, 1.5, .05, M.wood(en ? 0x3a2a1c : 0x8a2a18), s * .26, .85, -.02, dg); for (const y of [.45, 1.2]) board(.38, .5, .02, M.wood(en ? 0x2a2016 : 0xb07a30), s * .26, y, .015, dg); mk(new THREE.TorusGeometry(.04, .01, 4, 8), M.iron(), s * .06, .9, .04, dg); }
  // felt door curtain rolled above
  const roll = mk(new THREE.CylinderGeometry(.09, .09, 1.1, 8), en ? M.felt(0x4a443c) : M.felt(0xc8b48a), 0, 1.86, .08, dg); roll.rotation.z = PI / 2;
  // ground skirt / dirt ring
  mk(new THREE.RingGeometry(R * .96, R * 1.18, 32), M.col(0x5a4a38, { transparent: true, opacity: .5, depthWrite: false }), 0, .012, 0, g).rotation.x = -PI / 2;
  return bake(g); };
// ---- shield (round Central-Asian qalqan): wicker/hide dome, iron rim, 4 bosses + central umbo; paint 0..3
BUILD.shield = (paint = 0, R = .45) => { const g = new THREE.Group(); const P = [[0x6a4426, 0x8a1c14], [0x3a2a20, 0xb08a40], [0x7a5a36, 0x1a1a1a], [0x5a1a14, 0xd8b048]][paint % 4];
  const d = lathe([[0, R * .3], [R * .45, R * .26], [R * .8, R * .14], [R, 0]], 20, M.hide(P[0]), g); d.rotation.x = PI / 2; const ring = mk(new THREE.TorusGeometry(R * .62, R * .035, 4, 20), M.col(P[1], { roughness: .7 }), 0, 0, R * .19, g);
  mk(new THREE.TorusGeometry(R, R * .04, 5, 24), M.iron(), 0, 0, 0, g); const u = mk(new THREE.SphereGeometry(R * .2, 10, 6, 0, 6.3, 0, 1.5), M.steel(), 0, 0, R * .26, g); u.rotation.x = PI / 2;
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + .78; const b = mk(new THREE.SphereGeometry(R * .07, 6, 4, 0, 6.3, 0, 1.5), M.steel(), Math.cos(a) * R * .45, Math.sin(a) * R * .45, R * .24, g); b.rotation.x = PI / 2; }
  return bake(g); };

// ---- helmets (canonical: base ring radius 1 at y 0, +Y up, +Z face). Scaled to the head by the variant system.
const HELM = {};
HELM.cone = (o = {}) => { const g = new THREE.Group(), S = o.gold ? M.gold() : (o.dark ? M.dsteel() : M.steel());
  lathe([[1.0, -.05], [1.02, .25], [.92, .7], [.68, 1.1], [.36, 1.42], [.12, 1.66], [.05, 1.9], [0, 2.05]], 16, S, g);
  mk(new THREE.TorusGeometry(1.02, .09, 5, 20), o.gold ? M.gold() : M.bronze(), 0, .02, 0, g).rotation.x = PI / 2;
  if (o.nose !== false) { const n = mk(new THREE.BoxGeometry(.14, .75, .06), S, 0, -.22, 1.03, g); }
  // mail aventail (back + sides, open face)
  const av = mk(new THREE.CylinderGeometry(1.06, 1.22, .95, 18, 3, true, PI * .5 + .75, PI * 2 - 1.5), M.mail(), 0, -.48, 0, g);
  if (o.plume) { const p = new THREE.Group(); p.position.set(0, 1.95, 0); g.add(p); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; const st = mk(new THREE.CylinderGeometry(.06, .015, 1.2, 4), M.col(o.plume, { roughness: .85 }), Math.cos(a) * .06, -.45, Math.sin(a) * .06 - .1, p); st.rotation.set(-.55 + Math.sin(a) * .2, 0, -Math.cos(a) * .25); } }
  return g; };
HELM.fur = (o = {}) => { const g = new THREE.Group(); const crown = M.col(o.cloth || 0x7a1a14, { roughness: .9 });
  lathe([[.95, .1], [.92, .55], [.75, .95], [.45, 1.18], [0, 1.25]], 14, crown, g);
  const br = mk(new THREE.TorusGeometry(1.0, .26, 8, 20), M.fur(o.fur || 0x4a3626), 0, .14, 0, g); br.rotation.x = PI / 2; br.scale.z = 1.25;
  // red tassel (Oirat/Kalmyk cap) on top
  const t = new THREE.Group(); t.position.set(0, 1.22, 0); g.add(t); mk(new THREE.SphereGeometry(.1, 6, 4), M.col(o.tas || 0xb01a10), 0, .03, 0, t); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; const st = mk(new THREE.CylinderGeometry(.035, .01, .45, 3), M.col(o.tas || 0xb01a10, { roughness: .8 }), Math.cos(a) * .2, -.1, Math.sin(a) * .2, t); st.rotation.set(Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0); }
  if (o.flaps) for (const s of [-1, 1]) { const f = mk(new THREE.BoxGeometry(.2, .7, .5), M.fur(o.fur || 0x4a3626), s * .98, -.25, 0, g); f.rotation.z = s * .1; }
  return g; };
HELM.lam = (o = {}) => { const g = new THREE.Group(), S = o.gold ? M.gold() : M.dsteel();
  lathe([[1.0, 0], [1.0, .35], [.9, .8], [.62, 1.12], [.25, 1.3], [0, 1.33]], 16, S, g); mk(new THREE.CylinderGeometry(.08, .12, .35, 8), o.gold ? M.gold() : M.bronze(), 0, 1.45, 0, g); mk(new THREE.TorusGeometry(1.0, .08, 5, 20), o.gold ? M.gold() : M.bronze(), 0, .04, 0, g).rotation.x = PI / 2;
  // lamellar neck guard + cheek flaps
  const ng = mk(new THREE.CylinderGeometry(1.05, 1.3, 1.0, 18, 1, true, PI * .5 + .85, PI * 2 - 1.7), M.lam(0x4e5258, o.lace || 0x6a1610), 0, -.5, 0, g);
  if (o.plume !== null) { const p = new THREE.Group(); p.position.set(0, 1.6, 0); g.add(p); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; const st = mk(new THREE.CylinderGeometry(.07, .015, 1.0, 4), M.col(o.plume || 0xa01810, { roughness: .85 }), Math.cos(a) * .07, -.4, Math.sin(a) * .07, p); st.rotation.set(Math.sin(a) * .7 - .25, 0, -Math.cos(a) * .7); } }
  return g; };
BUILD.helmet = (k = 'cone', gold = 0) => { const g = HELM[k]({ gold: !!gold, plume: gold ? 0xb01a10 : (k === 'lam' ? 0xa01810 : 0) }); const o = new THREE.Group(); o.add(g); g.scale.setScalar(.12); return o; };
BUILD.pauldron = (gold = 0) => pauldron(.12, gold);
function pauldron(r, gold) { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const m = mk(new THREE.CylinderGeometry(r * (1 + k * .12), r * (1.1 + k * .12), r * .55, 10, 1, true, -PI * .45, PI * .9), M.lam(gold ? 0x8a6a30 : 0x50545c, 0x6a1610), 0, -k * r * .42, 0, g); } if (gold) { const d = mk(new THREE.CylinderGeometry(r * .32, r * .32, r * .06, 12), M.gold(), 0, .02, r * 1.02, g); d.rotation.x = PI / 2; } return g; }
BUILD.quiver = () => quiver(1);
function quiver(S) { const g = new THREE.Group(); const b = lathe([[.0, 0], [.07, 0], [.075, .3], [.085, .55], [.09, .56]], 10, M.hide(0x5a3a22), g); mk(new THREE.TorusGeometry(.085, .012, 4, 10), M.col(0x8a1c14), 0, .45, 0, g).rotation.x = PI / 2; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; const x = Math.cos(a) * .045, z = Math.sin(a) * .045; mk(new THREE.CylinderGeometry(.005, .005, .3, 3), M.wood(0x8a6a48), x, .62, z, g); const f = mk(new THREE.PlaneGeometry(.025, .09), M.col(i % 2 ? 0xe8e0d0 : 0x3a2a20, { side: THREE.DoubleSide }), x, .74, z, g); f.rotation.y = a; } g.scale.setScalar(S); return g; }

// ================================================================ ENEMY VARIETY (runtime)
// atlases: assets/props/var/<file>.jpg — recoloured copies of the soldier atlases (cloth hue changed; skin/steel kept)
const VARTEX = { askar: ['askar_r', 'askar_b', 'askar_o', 'askar_k'], archer: ['kamonchi_r', 'kamonchi_b', 'kamonchi_o'], wolf: ['bori_s', 'bori_g'] };
const TXL = {}; const ldr = () => ldr.l || (ldr.l = new THREE.TextureLoader());
function varMap(name, src, m) { const p = TXL[name] || (TXL[name] = ldr().loadAsync('./assets/props/var/' + name + '.jpg').catch(() => null)); p.then(t => { if (!t || !m) return; t.flipY = src.flipY; t.colorSpace = src.colorSpace; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.channel = src.channel; t.anisotropy = src.anisotropy; m.map = t; m.needsUpdate = true; }); }
// looks per chapter band: [helmet kind, atlas index or -1 = original, options]
const LOOK = {
  early: [['fur', 2, { cloth: 0x5a4a2a, fur: 0x4a3626 }], ['fur', -1, { cloth: 0x7a1a14, fur: 0x2e2218 }], ['cone', 0, { nose: false }], ['none', 1, {}]],
  mid: [['cone', 0, {}], ['fur', 1, { cloth: 0x1e2a44, fur: 0x3a2a1c, flaps: true }], ['lam', -1, { plume: 0x8a1810 }], ['cone', 2, { nose: false }]],
  late: [['lam', 3, { plume: 0x1a1414, lace: 0x2a2a2a }], ['cone', 0, { dark: true, plume: 0x8a1810 }], ['lam', 1, { plume: 0xa01810 }], ['fur', 3, { cloth: 0x101010, fur: 0x1e1810, flaps: true }]],
};
const band = c => c <= 2 ? 'early' : c <= 4 ? 'mid' : 'late';
const CNT = {};
// head measurement in world space (current pose): centre, up/side/fwd axes, radius at brow height, top
function headFit(rig, root) { const H = rig.B.Head || rig.B.head; if (!H) return null; let sm = null; rig.scene.traverse(k => { if (k.isSkinnedMesh && !sm && k.skeleton.bones.includes(H)) sm = k; }); if (!sm) return null;
  root.updateMatrixWorld(true); sm.skeleton.update(); const bi = sm.skeleton.bones.indexOf(H); const geo = sm.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, pos = geo.attributes.position; const v = new THREE.Vector3(); const P = [];
  const step = Math.max(1, Math.floor(pos.count / 9000)); for (let i = 0; i < pos.count; i += step) { let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi) w += sw.getComponent(i, k); if (w < .55) continue; v.fromBufferAttribute(pos, i); sm.applyBoneTransform(i, v); v.applyMatrix4(sm.matrixWorld); P.push(v.clone()); }
  if (P.length < 30) return null; const q = root.getWorldQuaternion(new THREE.Quaternion()); const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q); fwd.y = 0; fwd.normalize(); const side = new THREE.Vector3().crossVectors(up, fwd);
  let top = -1e9, bot = 1e9; const c = new THREE.Vector3(); for (const p of P) { top = Math.max(top, p.y); bot = Math.min(bot, p.y); c.add(p); } c.multiplyScalar(1 / P.length); const hh = top - bot; const yb = top - hh * .42;
  let cx = 0, cz = 0, n = 0; for (const p of P) if (Math.abs(p.y - yb) < hh * .1) { cx += p.dot(side); cz += p.dot(fwd); n++; } if (!n) return null; cx /= n; cz /= n; let r = 0; for (const p of P) if (p.y > yb - hh * .08) r = Math.max(r, Math.hypot(p.dot(side) - cx, p.dot(fwd) - cz));
  const ctr = side.clone().multiplyScalar(cx).add(fwd.clone().multiplyScalar(cz)); ctr.y = yb; return { H, ctr, up, fwd, side, r, top, hh, yb, q }; }
function attachWorld(bone, obj, pos, quat, scl) { obj.position.copy(pos); obj.quaternion.copy(quat); obj.scale.setScalar(scl); obj.updateMatrixWorld(true); bone.attach(obj); obj.traverse(k => { if (k.isMesh) { k.castShadow = true; k.frustumCulled = false; } }); }
export function vary(e) { const rig = e.rig; if (!rig || !rig.B || e._mx) return; e._mx = 1; const ty = e.type, d = e.d || {};
  if (d.heavy || e.maxHp > 1e8 || ['mage', 'shaman'].includes(ty) || e.team !== 'enemy') return;
  const ch = (MX.G && MX.G.mis && MX.G.mis.c) || 1, b = band(ch); const cap = !!(e.hunt || /cap/.test(d.name || '') || d.cap);
  const base = ty === 'archer' ? 'archer' : (ty === 'wolf' || ty === 'boribasi') ? 'wolf' : 'askar'; const n = CNT[ty] = (CNT[ty] || 0) + 1;
  let src = null; rig.scene.traverse(k => { if (k.isSkinnedMesh && k.material && k.material.map && !src) src = k; });
  if (base === 'wolf') { if (ty === 'wolf' && src) { const L = VARTEX.wolf, i = n % 3; if (i < L.length) varMap(L[i], src.material.map, src.material); } rig.body.scale.multiplyScalar(ty === 'wolf' ? [1, .92, 1.07][n % 3] : 1); return; }
  const looks = LOOK[b]; let lk = looks[(n + (ty === 'archer' ? 1 : 0)) % looks.length];
  if (ty === 'nayza') lk = ['cone', b === 'late' ? 3 : 0, { dark: b === 'late', plume: b === 'early' ? 0 : 0x8a1810 }]; else if (ty === 'qilich') lk = ['lam', [-1, 0, 3][n % 3], { plume: [0xa01810, 0x1a1414, 0xd8c8a8][n % 3] }]; else if (ty === 'qalqan') lk = ['cone', [1, 2, 0][n % 3], {}];
  else if (d.name === 'w4_cav') lk = ['fur', [0, 2, 1][n % 3], { cloth: [0x7a1a14, 0x1e2a44, 0x3a3a1a][n % 3], fur: 0x2e2218, flaps: true }];
  if (ty === 'archer' && lk[0] === 'cone') lk = ['fur', lk[1], { cloth: 0x4a3a22 }];
  if (cap) lk = ['cone', 3, { gold: true, plume: 0xb01a10 }];
  // atlas
  if (src && lk[1] >= 0) { const L = VARTEX[base]; varMap(L[Math.min(lk[1], L.length - 1)], src.material.map, src.material); }
  // body scale variety (captains a bit bigger)
  rig.body.scale.multiplyScalar(cap ? 1.06 : [1, .95, 1.04, .98][n % 4]); rig.root.updateMatrixWorld(true);
  const f = headFit(rig, e.o || rig.root); const ws = (e.o || rig.root).getWorldScale(new THREE.Vector3()).x; if (!f) return;
  const qb = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.side, f.up, f.fwd));
  if (lk[0] !== 'none') { const hm = HELM[lk[0]](lk[2]); const r = f.r * (lk[0] === 'fur' ? 1.04 : 1.1); attachWorld(f.H, hm, f.ctr.clone().addScaledVector(f.fwd, -f.r * .04), qb, r); e._helm = hm; }
  // pauldrons for heavy roles / captains / late chapters
  if (cap || ty === 'nayza' || ty === 'qalqan' || (b === 'late' && n % 2)) for (const s of ['Left', 'Right']) { const A = rig.B[s + 'Arm']; if (!A) continue; const ap = A.getWorldPosition(new THREE.Vector3()); const sp = rig.B.Spine02 ? rig.B.Spine02.getWorldPosition(new THREE.Vector3()) : f.ctr; const out = ap.clone().sub(sp); out.y = 0; out.normalize();
    const pq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(f.up, out), f.up, out)); const pd = pauldron(1, cap); attachWorld(A, pd, ap.clone().addScaledVector(out, f.r * .25).addScaledVector(f.up, f.r * .35), pq, f.r * 1.05); }
  // captain: gold disc + red sash ribbon handled by plate/aura; add a gold amulet-free chest disc
  // shields: qalqan gets a big painted qalqan, askar shield is repainted
  const lf = rig.B.LeftForeArm; if (lf) { const sg = lf.children.find(k => k.isGroup && !k.isBone); if (sg) { if (ty === 'qalqan') { sg.scale.multiplyScalar(1.7); } let k2 = 0; sg.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); if (k2++ === 0 || m.material.map) m.material.color.multiply(new THREE.Color([0xffffff, 0xd09080, 0x9098b8, 0xc0b080][(n + (cap ? 1 : 0)) % 4])); } }); } }
  // archers: quiver on the back
  if (ty === 'archer' && rig.B.Spine02) { const sp = rig.B.Spine02, p = sp.getWorldPosition(new THREE.Vector3()); const qv = quiver(1); const qq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.side, f.up, f.fwd)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.35, 0, -.45))); attachWorld(sp, qv, p.clone().addScaledVector(f.fwd, -f.r * 1.5).addScaledVector(f.side, f.r * .4).addScaledVector(f.up, -f.r * 2.2), qq, f.r * 6.5); }
}
export const MX = { G: null, on: true };
export function install(E) { if (MX.inst) return; MX.inst = 1; MX.G = E.G; window.__MX = { MX, vary, BUILD, amulet };
  const scan = () => { try { if (MX.on && MX.G && MX.G.ents) for (const e of MX.G.ents) if (!e._mx && e.rig && e.team === 'enemy' && !e.dead) vary(e); } catch (er) { console.warn('mx', er); } };
  setInterval(scan, 250); }
// auto-install when loaded by the game (not by tools that set window.__MX_NOAUTO)
if (typeof window !== 'undefined' && !window.__MX_NOAUTO) import('./engine.js?v=1795199701').then(install).catch(e => console.warn('models_ext', e));
