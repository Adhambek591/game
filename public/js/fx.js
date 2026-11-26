// fx.js — in-level graphics: unit readability (rim light, contact blobs, team rings), waving cloth banners, layered shader fire
// (flame / smoke / embers / ground glow — one instanced draw each per level), real props (rigged idle horses, R_arava carts and
// wrecks, bevelled crates, jars, sacks, bones, cairns, torches) and caravan-trail dressing. Everything is lazy: nothing touches
// engine.js exports at module-evaluation time (engine.js <-> fx.js import cycle).
import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/jsm/utils/BufferGeometryUtils.js?v=1795249975';
import { G, SET, world, fxg, scene, camera, renderer, A, gradePass } from './engine.js?v=1795249975';
import { ENV, pbrMat, place, roadX, applyLight } from './env.js?v=1795249975';
import { makeHorse } from './horse.js?v=1795249975';
import { EffectComposer } from '../assets/vendor/jsm/postprocessing/EffectComposer.js?v=1795249975';

const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
export const U = { t: { value: 0 }, px: { value: 400 }, glow: { value: .3 } };
const Q = () => (SET.q === undefined ? 1 : SET.q);
const WIND = new THREE.Vector3(.85, 0, .3);
const OUT = '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';

// ---------- small canvas / geometry helpers ----------
function canvas(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
let _noise = null;
function noiseTex() { if (_noise) return _noise; const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), im = g.createImageData(S, S);
  const lat = (n, sd) => { const a = new Float32Array(n * n); let s = sd; for (let i = 0; i < n * n; i++) { s = (s * 16807) % 2147483647; a[i] = s / 2147483647; } return a; };
  const smp = (a, n, x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), p = (i, j) => a[((j % n + n) % n) * n + ((i % n + n) % n)]; return (p(xi, yi) * (1 - u) + p(xi + 1, yi) * u) * (1 - v) + (p(xi, yi + 1) * (1 - u) + p(xi + 1, yi + 1) * u) * v; };
  const L = [[4, .5], [8, .27], [16, .15], [32, .08]], ch = [0, 1, 2].map(k => L.map(([n], i) => lat(n, 1237 + k * 911 + i * 77)));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const o = (y * S + x) * 4; for (let k = 0; k < 3; k++) { let v = 0; L.forEach(([n, w], i) => v += smp(ch[k][i], n, x / S * n, y / S * n) * w); im.data[o + k] = Math.max(0, Math.min(255, (v - .5) * 1.7 * 255 + 128)); } im.data[o + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return _noise = t; }
const colG = (g, c, c2) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), C1 = new THREE.Color(c), C2 = c2 !== undefined ? new THREE.Color(c2) : null; let y0 = 1e9, y1 = -1e9; if (C2) for (let i = 0; i < n; i++) { const y = g.attributes.position.getY(i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let i = 0; i < n; i++) { const k = C2 ? (g.attributes.position.getY(i) - y0) / Math.max(1e-5, y1 - y0) : 0, j = .93 + Math.random() * .14; a[i * 3] = (C1.r + (C2 ? (C2.r - C1.r) * k : 0)) * j; a[i * 3 + 1] = (C1.g + (C2 ? (C2.g - C1.g) * k : 0)) * j; a[i * 3 + 2] = (C1.b + (C2 ? (C2.b - C1.b) * k : 0)) * j; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const merge = list => { const L = list.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) n.deleteAttribute(k); return n; }); return mergeGeometries(L, false); };
const xf = (g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => { if (s !== 1) g.scale(s, s, s); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
// chamfered box (all 12 edges bevelled)
function bbox(w, h, d, r = .025) { r = Math.min(r, w * .3, h * .3, d * .3); const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r; s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 1, steps: 1 }); g.translate(0, 0, -(d - 2 * r) / 2); return g; }
const cyl = (r1, r2, h, n = 10, open = false) => new THREE.CylinderGeometry(r1, r2, h, n, 1, open);
const lathe = (pts, n = 24) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), n);
function rock(r, seed = 1) { let g = new THREE.IcosahedronGeometry(r, 1); if (g.index) g = g.toNonIndexed(); const p = g.attributes.position; const h = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 9.1) * 43758.5453; return s - Math.floor(s); }; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = .78 + h(Math.round(x * 50), Math.round(y * 50), Math.round(z * 50)) * .4; p.setXYZ(i, x * k, y * k, z * k); } g.computeVertexNormals(); return g; }

// ---------- shared materials ----------
const M = {};
const woodV = () => M.wood || (M.wood = (ENV.ok && pbrMat('brown_planks_09', 1, 1, { vertexColors: true })) || new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: .9, vertexColors: true }));
const plainV = () => M.plain || (M.plain = new THREE.MeshStandardMaterial({ roughness: .86, metalness: 0, vertexColors: true }));
const rockV = () => M.rock || (M.rock = (ENV.ok && pbrMat('aerial_ground_rock', 1, 1, { vertexColors: true })) || new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 1, vertexColors: true }));
const ironM = () => M.iron || (M.iron = new THREE.MeshStandardMaterial({ color: 0x2c2a2a, roughness: .55, metalness: .8 }));
const add = (geo, mat, x, y, z, parent, sh = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = sh && Q() > 0; m.receiveShadow = true; (parent || world).add(m); return m; };

// =====================================================================================================================
// 1. UNIT READABILITY: contact-shadow blobs + team rings (2 instanced draws for all units) and a rim/saturation patch
// =====================================================================================================================
const UN = 96; let blobs = null, rings = null; const _o = new THREE.Object3D(), _c = new THREE.Color();
const TEAM = {   // author Nov 26: enemies clearly DARKER, our side clearly LIGHTER; the lane is flattened to mid luminance (env.js roadify), so both read against it
  ally: { rim: 0xfff0d0, k: .5, sat: 1.06, tint: [1.2, 1.17, 1.1], ring: 0 },    // light clothes + soft warm edge (no glowing halo: gfx3 removed k 1.35 / sat 1.3)
  enemy: { rim: 0xff4a2a, k: .42, sat: .82, tint: [.64, .62, .66], ring: 0 },   // dark, desaturated cloth; thin red-orange edge keeps the silhouette off dark ground
  elite: { rim: 0xff3a20, k: .62, sat: .86, tint: [.72, .66, .66], ring: 0x8a1810 },
  hero: { rim: 0xfff0c8, k: .45, sat: 1.06, tint: [1.1, 1.1, 1.14], ring: 0xffc64a },
  npc: { rim: 0xfff0d0, k: .38, sat: 1.04, tint: [1.14, 1.12, 1.07], ring: 0 },
};
function unitMeshes() {
  if (!blobs) {
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const bt = canvas(64, 64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(0,0,0,.95)'); r.addColorStop(.45, 'rgba(0,0,0,.62)'); r.addColorStop(.8, 'rgba(0,0,0,.14)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
    blobs = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: bt, transparent: true, depthWrite: false, opacity: .62, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), UN);
    const rt = canvas(128, 128, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, s * .2, s / 2, s / 2, s * .5); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.5, 'rgba(255,255,255,.07)'); r.addColorStop(.84, 'rgba(255,255,255,.1)'); r.addColorStop(.89, 'rgba(255,255,255,1)'); r.addColorStop(.93, 'rgba(255,255,255,.85)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
    rings = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false, opacity: .8, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), UN);
    for (const m of [blobs, rings]) { m.frustumCulled = false; m.renderOrder = 2; m.count = 0; } rings.renderOrder = 3; rings.setColorAt(0, _c.set(0xffffff));
  }
  if (!blobs.parent) world.add(blobs); if (!rings.parent) world.add(rings);
}
function rimPatch(m, P) {
  if (!m || !m.isMeshStandardMaterial) return; 
  if (m._fxRim) { const u = m._fxRim; u.c.value.set(P.rim); u.k.value = P.k; u.sat.value = P.sat; u.tint.value.set(...P.tint); return; }
  const u = m._fxRim = { c: { value: new THREE.Color(P.rim) }, k: { value: P.k }, sat: { value: P.sat }, tint: { value: new THREE.Vector3(...P.tint) } };
  const prev = m.onBeforeCompile, pk = m.customProgramCacheKey ? String(m.customProgramCacheKey()).slice(0, 80) : '';
  m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.uniforms.uRimC = u.c; sh.uniforms.uRimK = u.k; sh.uniforms.uSatK = u.sat; sh.uniforms.uTintC = u.tint;
    sh.fragmentShader = 'uniform vec3 uRimC; uniform float uRimK; uniform float uSatK; uniform vec3 uTintC;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n { float fxl = dot(diffuseColor.rgb, vec3(.299, .587, .114)); diffuseColor.rgb = max(mix(vec3(fxl), diffuseColor.rgb, uSatK), 0.) * uTintC; }')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n {\n #ifndef FLAT_SHADED\n vec3 fxn = normalize(vNormal);\n #else\n vec3 fxn = normalize(normal);\n #endif\n float fxf = 1. - abs(dot(fxn, normalize(vViewPosition))); totalEmissiveRadiance += uRimC * (pow(fxf, 2.6) * uRimK * (.6 + .4 * abs(fxn.y))); }'); };
  m.customProgramCacheKey = () => 'fxrim2|' + pk; m.needsUpdate = true;
}
const teamOf = e => (e.team === 'enemy' ? (e.d && e.d.heavy ? 'elite' : 'enemy') : e.team === 'ally' ? 'ally' : 'npc');
function patchEnt(e) { const tk = teamOf(e), P = e === G.player ? TEAM.hero : TEAM[tk]; e._fxT = tk; e._fxN = 0; const seen = new Set();
  const walk = o => { if (o === e.horse || o === e.bar || (e.mark && o === e.mark.g)) return; if (o.isMesh && o.material && !seen.has(o.material)) { seen.add(o.material); if (!o.material.transparent || o.isSkinnedMesh) rimPatch(o.material, P); } for (const c of o.children) walk(c); };
  walk(e.o); e._fxN = seen.size; let hip = null; e.o.traverse(o => { if (!hip && o.isBone && /hips?$|pelvis/i.test(o.name)) hip = o; }); e._fxHip = hip; }
// fix3: walk-surface height (same rules as engine deckY: flat deck boxes, scenery decks, lane over a river channel = bridge .07)
function deckH(x, z) { let y = 0; for (const d of G.decks || []) if (x > d.x1 && x < d.x2 && z > d.z1 && z < d.z2 && d.y > y) y = d.y;
  if (!y && G.scn) { const v = G.scn.deckAt(x, z); if (v !== null && v > y) y = v; }
  if (!y && G.groundH && (G.groundHT || 0) >= (G.clrT || 0) - 50 && Math.abs(x) < G.W + .5) { let h = 0; try { h = G.groundH(x, z); } catch (er) { } if (h < -.3) y = .07; } return y; }
// hero ring + attack telegraphs (engine draws them at y .05-.08): lift them to the deck / bridge surface so planks don't hide them
function tickRings() { const p = G.player; if (p && p.mark && p.mark.g && p.o) { const gy = Math.max(0, (p.o.position.y || 0) - (p.y || 0)); p.mark.g.position.y = gy; }
  for (const o of G.tele || []) { const g = o.g; if (!g || o.dead) continue; if (o._fy === undefined || Math.abs(g.position.y - o._fy - (o._fd || 0)) > 1e-4) o._fy = g.position.y; o._fd = deckH(g.position.x, g.position.z); g.position.y = o._fy + o._fd; } }
function tickUnits(t) {
  if (!G || !G.ents) return; unitMeshes(); let n = 0, rn = 0; const sd = G.sunDir, ox = sd ? -sd.x * .16 : 0, oz = sd ? -sd.z * .16 : 0;
  for (const e of G.ents) { if (e.aura && !e.aura.userData.fx) { const am = e.aura.material; e.aura.userData.fx = 1; am.color.set(0x7a140c); am.blending = THREE.NormalBlending; am.opacity = .5; am.needsUpdate = true; e.aura.scale.multiplyScalar(.58); } if (e.gone || !e.o || !e.o.visible || !e.o.parent || e.spawnT > .2) continue;
    if (e._fxT !== teamOf(e) || (e._fxC = (e._fxC || 0) + 1) % 90 === 1) patchEnt(e);
    if (n >= UN) break; const dk = e.dead ? Math.max(0, 1 - (e.deadT || 0) / 2.4) : 1; const sc = (e.d && e.d.scale) || 1, gy = e.dead ? deckH(e.x, e.z) : Math.max(0, (e.o.position.y || 0) - (e.y || 0)), y = (e.y || 0) + .05 + gy;   // fix3: foot height on decks/bridges
    const hm = !e.mounted && e._fxHip && e._fxHip.matrixWorld.elements, hx = hm && Math.abs(hm[12] - e.x) < 4 && Math.abs(hm[14] - e.z) < 4 ? hm[12] : e.x, hz = hx !== e.x ? hm[14] : e.z;
    const R = e.mounted ? 3.3 : 1.5 * sc + .2; _o.position.set(hx + ox, y - gy > .3 ? gy + .05 : y, hz + oz); _o.rotation.set(0, e.mounted ? e.rot : 0, 0); _o.scale.set(R * (e.mounted ? .72 : 1), 1, R * (e.mounted ? 1.25 : 1)).multiplyScalar(.35 + .65 * dk); _o.updateMatrix(); blobs.setMatrixAt(n++, _o.matrix);
    const P = TEAM[e._fxT]; if (!e.dead && P.ring && !e.aura && e !== G.player && !e.bg && rn < UN) { const el = e._fxT === 'elite', rr = (e.mounted ? 2.0 : .8 * sc + .2) * (el ? 1 + Math.sin(t * 4 + e.x) * .04 : 1); _o.position.set(hx, y - gy > .3 ? gy + .06 : y + .01, hz); _o.rotation.set(0, 0, 0); _o.scale.set(rr, 1, rr); _o.updateMatrix(); rings.setMatrixAt(rn, _o.matrix); rings.setColorAt(rn++, _c.set(P.ring)); } }
  blobs.count = n; rings.count = rn; blobs.instanceMatrix.needsUpdate = true; rings.instanceMatrix.needsUpdate = true; if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
}

// =====================================================================================================================
// 2. BANNERS: pole + finial + horse-hair tug, cloth waved in the vertex shader (per-banner phase from world position)
// =====================================================================================================================
const banTex = {}, banMat = {}; let poleGeo = null;
function bannerTex(color) { const key = color; if (banTex[key]) return banTex[key]; const C = new THREE.Color(color), hsl = {}; C.getHSL(hsl); const dark = hsl.l < .16;
  const base = '#' + C.getHexString(), acc = dark ? (hsl.s > .4 && hsl.h < .08 ? '#d8b070' : '#b9c4d6') : '#f0c860', acc2 = dark ? '#6a1410' : '#fff4dc';
  return banTex[key] = canvas(256, 192, (g, W, H) => { const FH = 168; g.clearRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, base); gr.addColorStop(1, '#' + C.clone().multiplyScalar(dark ? 1.9 : 1.18).getHexString()); g.fillStyle = gr; g.fillRect(0, 0, W, FH);
    g.globalAlpha = .16; for (let y = 0; y < FH; y += 2) { g.fillStyle = y % 4 ? '#000' : '#fff'; g.fillRect(0, y, W, 1); } for (let x = 0; x < W; x += 3) { g.fillStyle = '#000'; g.fillRect(x, 0, 1, FH); } g.globalAlpha = 1;
    g.fillStyle = acc; g.fillRect(0, 6, W, 9); g.fillRect(0, FH - 15, W, 9); g.fillStyle = acc2; g.fillRect(0, 17, W, 3); g.fillRect(0, FH - 20, W, 3); g.fillStyle = acc; g.fillRect(4, 0, 10, FH);
    // ram-horn (qoshqar muyiz) ornaments
    g.strokeStyle = acc; g.lineWidth = 7; g.lineCap = 'round'; for (const cx of [64, 140]) { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx, FH / 2); g.bezierCurveTo(cx + s * 4, FH / 2 - 34, cx + s * 40, FH / 2 - 42, cx + s * 34, FH / 2 - 14); g.bezierCurveTo(cx + s * 30, FH / 2 - 2, cx + s * 16, FH / 2 - 6, cx + s * 20, FH / 2 - 18); g.stroke(); g.beginPath(); g.moveTo(cx, FH / 2); g.bezierCurveTo(cx + s * 4, FH / 2 + 34, cx + s * 40, FH / 2 + 42, cx + s * 34, FH / 2 + 14); g.bezierCurveTo(cx + s * 30, FH / 2 + 2, cx + s * 16, FH / 2 + 6, cx + s * 20, FH / 2 + 18); g.stroke(); } g.fillStyle = acc2; g.beginPath(); g.arc(cx, FH / 2, 7, 0, 7); g.fill(); }
    // swallow-tail notch + frayed edge
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(W + 2, FH * .5 - 44); g.lineTo(W - 78, FH * .5); g.lineTo(W + 2, FH * .5 + 44); g.closePath(); g.fill(); for (let i = 0; i < 40; i++) { g.fillRect(rnd(0, W), FH - rnd(0, 4), rnd(2, 6), 6); } g.globalCompositeOperation = 'source-over';
    // tassel strands (bottom strip)
    g.clearRect(0, FH, W, H - FH); for (let x = 0; x < W; x += 3) { g.fillStyle = Math.random() < .5 ? '#1a1410' : (dark ? '#3a3028' : '#5a4634'); g.fillRect(x, FH + 2, 2, H - FH - 2 - rnd(0, 8)); } }); }
function bannerMat(color) { if (banMat[color]) return banMat[color]; const m = new THREE.MeshStandardMaterial({ map: bannerTex(color), side: THREE.DoubleSide, roughness: .92, alphaTest: .45 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = U.t; const fn = `uniform float uT; attribute float aW;
    float fxPh() { return modelMatrix[3].x * 1.7 + modelMatrix[3].z * .93; }
    vec2 fxWave(vec3 p) { float ph = fxPh(); float a1 = p.x * 3.1 - uT * 5.4 + ph + p.y * 1.2, a2 = p.x * 6.7 - uT * 8.6 + ph * 1.7 - p.y * 2.4; float amp = aW * (.17 + .06 * sin(uT * .8 + ph));
      return vec2((sin(a1) * .7 + sin(a2) * .3) * amp, (cos(a1) * .7 * 3.1 + cos(a2) * .3 * 6.7) * amp); }\n`;
    sh.vertexShader = fn + sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n { vec2 w = fxWave(position); objectNormal = normalize(objectNormal + vec3(-w.y, 0., 0.) * (objectNormal.z >= 0. ? 1. : -1.)); }')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n { vec2 w = fxWave(position); float ph = fxPh(); transformed.z += w.x; transformed.y -= aW * aW * .13 * (1. + .5 * sin(uT * 1.3 + ph)); transformed.x -= aW * .07 * (1. + sin(uT * 2.1 + ph)); }'); };
  m.customProgramCacheKey = () => 'fxban'; return banMat[color] = m; }
let clothGeo = null;
function bannerGeo() { if (clothGeo) return clothGeo; const FW = 1.95, FHh = 1.3, f = new THREE.PlaneGeometry(FW, FHh, 16, 8); f.translate(FW / 2 + .07, -FHh / 2, 0);
  const fp = f.attributes.position, fu = f.attributes.uv, fw = new Float32Array(fp.count); for (let i = 0; i < fp.count; i++) { fw[i] = Math.max(0, (fp.getX(i) - .07) / FW); fu.setY(i, .125 + fu.getY(i) * .875); } f.setAttribute('aW', new THREE.BufferAttribute(fw, 1));
  const tg = new THREE.CylinderGeometry(.06, .2, .75, 12, 4, true); tg.translate(0, -.5, 0); const tp = tg.attributes.position, tu = tg.attributes.uv, tw = new Float32Array(tp.count); for (let i = 0; i < tp.count; i++) { tw[i] = (1 - tu.getY(i)) * .22; tu.setY(i, .005 + tu.getY(i) * .11); } tg.setAttribute('aW', new THREE.BufferAttribute(tw, 1));
  return clothGeo = mergeGeometries([f, tg], false); }
function poleG() { if (poleGeo) return poleGeo; const H = 5.6, L = [colG(xf(cyl(.055, .085, H, 8), 0, H / 2, 0), 0x6a4c30, 0x8a6a44)];
  L.push(colG(xf(lathe([[0, 0], [.1, .03], [.13, .12], [.07, .22], [.03, .3], [.05, .36], [0, .5]], 12), 0, H - .02, 0), 0xd8a838));
  L.push(colG(xf(cyl(.03, .03, .5, 6), .2, H - .32, 0, 0, 0, Math.PI / 2), 0x4a3420)); L.push(colG(xf(new THREE.TorusGeometry(.1, .025, 6, 12), 0, H - .3, 0, Math.PI / 2), 0xd8a838));
  for (const y of [.5, 1.4]) L.push(colG(xf(new THREE.TorusGeometry(.085, .02, 5, 10), 0, y, 0, Math.PI / 2), 0x2a1c12));
  L.push(colG(xf(rock(.22, 3), .12, .06, .05), 0x8a8072)); L.push(colG(xf(rock(.17, 5), -.14, .05, .1), 0x7a7266)); L.push(colG(xf(rock(.15, 8), .02, .05, -.16), 0x90867a));
  return poleGeo = merge(L); }
export function banner(x, z, color = 0x8a1c14, o = {}) { const g = new THREE.Group(), s = o.scale || 1; g.position.set(x, o.y || 0, z); g.rotation.y = o.ry !== undefined ? o.ry : rnd(-.45, .45); g.scale.setScalar(s);
  const pm = M.pole || (M.pole = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: .1 })); add(poleG(), pm, 0, 0, 0, g);
  const c = new THREE.Mesh(bannerGeo(), bannerMat(color)); c.position.set(0, 5.28, 0); c.castShadow = false; c.receiveShadow = false; c.frustumCulled = false; g.add(c); (o.parent || world).add(g); return g; }

// =====================================================================================================================
// 3. FIRE: instanced shader flames (3 layers), smoke puffs, rising embers, ground heat glow, charred log base
// =====================================================================================================================
const MAXF = 72, FL = 3; let FS = null;
function fireSys() {
  if (!FS) { const q = Q(), SM = q === 0 ? 2 : 5, EM = q === 0 ? 6 : 14, nt = noiseTex();
    const quad = new THREE.PlaneGeometry(1, 1); quad.translate(0, .5, 0);
    const mkI = (base, n, sizes) => { const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv); const at = {}; for (const k in sizes) { at[k] = new THREE.InstancedBufferAttribute(new Float32Array(n * sizes[k]), sizes[k]); at[k].setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, at[k]); } g.instanceCount = 0; return [g, at]; };
    const VB = `uniform float uT; attribute vec4 iP; attribute vec4 iS; varying vec2 vUv; varying vec4 vS;
      vec3 cr() { return vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); } vec3 cu() { return vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]); }\n`;
    // flames
    const [fg, fa] = mkI(quad, MAXF * FL, { iP: 4, iS: 4 });
    const fm = new THREE.ShaderMaterial({ uniforms: { uT: U.t, tN: { value: nt } }, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide,
      vertexShader: VB + `void main() { vUv = uv; vS = iS; vec3 up = normalize(mix(vec3(0., 1., 0.), cu(), .5)); float sw = sin(uT * 2.3 + iS.x) * .1 * uv.y * uv.y;
        vec3 p = iP.xyz + cr() * ((position.x + sw + iS.w) * iP.w * iS.y) + up * (position.y * iP.w * iS.z); gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
      fragmentShader: `precision highp float; uniform float uT; uniform sampler2D tN; varying vec2 vUv; varying vec4 vS;
        void main() { vec2 uv = vUv; float t = uT * 1.15 + vS.x; float n1 = texture2D(tN, vec2(uv.x * .8 + vS.x * .37, uv.y * .62 - t * .85)).r; float n2 = texture2D(tN, vec2(uv.x * 1.7 - vS.x * .2, uv.y * 1.35 - t * 1.6)).g; float n = n1 * .62 + n2 * .38;
          float x = (uv.x - .5) * 2. + (n - .5) * .7 * uv.y; float wd = mix(.8, .06, pow(uv.y, .7)); float body = 1. - smoothstep(wd * .35, wd, abs(x));
          float top = 1. - smoothstep(.22 + n * .6, .5 + n * .62, uv.y); float f = body * top * smoothstep(0., .07, uv.y); f *= .5 + n * 1.05; f = clamp(f, 0., 1.);
          float core = f * (1.15 - uv.y); vec3 col = mix(vec3(.85, .1, .015), vec3(1., .42, .05), smoothstep(.12, .45, f)); col = mix(col, vec3(1., .8, .32), smoothstep(.42, .8, core)); col = mix(col, vec3(1., .96, .8), smoothstep(.8, 1.05, core));
          vec3 pc = col * f * 1.15; gl_FragColor = vec4(pc, f * (.82 - .5 * smoothstep(.55, 1., core))); ${OUT} }` });
    const flame = new THREE.Mesh(fg, fm);
    // smoke
    const [sg, sa] = mkI(new THREE.PlaneGeometry(1, 1), MAXF * SM, { iP: 4, iS: 4 });
    const sm = new THREE.ShaderMaterial({ uniforms: { uT: U.t, tN: { value: nt }, uW: { value: WIND } }, transparent: true, depthWrite: false,
      vertexShader: VB + `uniform vec3 uW; varying float vA; void main() { vUv = uv; vS = iS; float age = fract(uT * iS.y + iS.x); vA = age; float sz = iP.w * (.9 + age * 2.7);
        vec3 c = iP.xyz + vec3(0., iP.w * (1.3 + age * 5.2), 0.) + uW * (age * age * 3.4 * iP.w) + vec3(sin(uT * .9 + iS.x * 40.), 0., cos(uT * .7 + iS.x * 31.)) * (.22 * age * iP.w);
        float a = iS.z + age * iS.w, ca = cos(a), sa = sin(a); vec2 q = vec2(position.x * ca - position.y * sa, position.x * sa + position.y * ca) * sz; vec3 p = c + cr() * q.x + cu() * q.y; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
      fragmentShader: `precision highp float; uniform sampler2D tN; varying vec2 vUv; varying vec4 vS; varying float vA;
        void main() { vec2 q = vUv - .5; float r = length(q) * 2.; float n = texture2D(tN, vUv * .7 + vS.x * 3.1).b; float n2 = texture2D(tN, vUv * 1.6 - vS.x).r; float a = (1. - smoothstep(.25 + n * .35, .95, r)) * (.55 + n2 * .6);
          a *= smoothstep(0., .14, vA) * pow(1. - vA, 1.4) * .5; vec3 col = mix(vec3(.26, .13, .06), vec3(.2, .19, .185), smoothstep(0., .35, vA)) * (.7 + n * .6); gl_FragColor = vec4(col, a); ${OUT} }` });
    const smoke = new THREE.Mesh(sg, sm);
    // ground heat glow
    const gq = new THREE.PlaneGeometry(1, 1); gq.rotateX(-Math.PI / 2); const [gg, ga] = mkI(gq, MAXF, { iP: 4, iS: 4 });
    const gm = new THREE.ShaderMaterial({ uniforms: { uT: U.t, uK: U.glow }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      vertexShader: `uniform float uT; attribute vec4 iP; attribute vec4 iS; varying vec2 vUv; varying float vK; void main() { vUv = uv; vK = .78 + .14 * sin(uT * 11. + iS.x) + .08 * sin(uT * 23.7 + iS.x * 3.); vec3 p = iP.xyz + position * iP.w * (4.6 + .25 * sin(uT * 9. + iS.x)); gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
      fragmentShader: `precision highp float; uniform float uK; varying vec2 vUv; varying float vK; void main() { float r = length(vUv - .5) * 2.; float a = pow(max(0., 1. - r), 2.2); gl_FragColor = vec4(vec3(1., .42, .1) * vK * uK, a); ${OUT} }` });
    const glow = new THREE.Mesh(gg, gm);
    // embers
    const eg = new THREE.BufferGeometry(), ep = new THREE.BufferAttribute(new Float32Array(MAXF * EM * 3), 3), es = new THREE.BufferAttribute(new Float32Array(MAXF * EM * 4), 4); eg.setAttribute('position', ep); eg.setAttribute('aS', es); eg.setDrawRange(0, 0);
    const em = new THREE.ShaderMaterial({ uniforms: { uT: U.t, uPx: U.px, uW: { value: WIND } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uT, uPx; uniform vec3 uW; attribute vec4 aS; varying float vA; varying float vF; void main() { float age = fract(uT * (.22 + aS.y * .2) + aS.x); vA = age; float s = aS.w;
        vec3 p = position + vec3((aS.y - .5) * s * .7 + sin(uT * 2.1 + aS.x * 50.) * .28 * age, s * (.5 + age * (3.4 + aS.z * 3.2)), (aS.z - .5) * s * .7 + cos(uT * 1.7 + aS.x * 33.) * .22 * age) + uW * (age * age * 2.2 * s);
        vF = .6 + .4 * sin(uT * 17. + aS.x * 90.); vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (.05 + aS.y * .05) * (1. - age * .6) / -mv.z; }`,
      fragmentShader: `precision highp float; varying float vA; varying float vF; void main() { float r = length(gl_PointCoord - .5) * 2.; float a = pow(max(0., 1. - r), 1.6) * (1. - vA) * vF; gl_FragColor = vec4(mix(vec3(1., .75, .3), vec3(1., .3, .05), vA) * 2.2, a); ${OUT} }` });
    const embers = new THREE.Points(eg, em);
    for (const m of [flame, smoke, glow, embers]) { m.frustumCulled = false; m.userData.fx = 1; } glow.renderOrder = 1; smoke.renderOrder = 6; flame.renderOrder = 7; embers.renderOrder = 8;
    FS = { flame, smoke, glow, embers, fa, sa, ga, ep, es, SM, EM, n: 0, ns: 0, ng: 0, ne: 0 };
  }
  if (!FS.flame.parent) { FS.n = FS.ns = FS.ng = FS.ne = 0; FS.flame.geometry.instanceCount = FS.smoke.geometry.instanceCount = FS.glow.geometry.instanceCount = 0; FS.embers.geometry.setDrawRange(0, 0); fxg.add(FS.glow, FS.smoke, FS.flame, FS.embers); }
  return FS;
}
let baseGeo = null;
function fireBase() { if (baseGeo) return baseGeo; const L = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + rnd(-.1, .1); L.push(colG(xf(rock(rnd(.14, .2), i + 1), Math.cos(a) * .62, .07, Math.sin(a) * .62, 0, 0, 0), pick([0x6a645c, 0x7a7268, 0x585048]), 0x2a2622)); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; L.push(colG(xf(cyl(.07, .09, 1.0, 7), Math.cos(a) * .22, .26, Math.sin(a) * .22, 0, -a, 1.02), 0x0e0b09, 0x3a2416)); } L.push(colG(xf(cyl(.5, .56, .05, 14), 0, .025, 0), 0x0c0a09));
  return baseGeo = merge(L); }
// raw fire: world position (x, y, z); o: { base, smoke, glow, embers }
export function fireAt(x, y, z, size = 1.4, o = {}) { const S = fireSys(); if (S.n >= MAXF) return; const ph = rnd(0, 20), q = Q();
  const fw = rnd(.78, 1.25), fh = rnd(.75, 1.35), L = [[1.75 * fw, 2.5 * fh, 0], [1.05 * fw, 1.75 * fh * rnd(.85, 1.15), rnd(-.12, .12)], [.8 * fw, 1.3 * fh * rnd(.8, 1.2), rnd(.2, .4) * (Math.random() < .5 ? -1 : 1)]]; // gfx2: every fire has its own proportions
  for (let k = 0; k < FL; k++) { const i = S.n * FL + k; S.fa.iP.setXYZW(i, x, y + .02 + k * .01, z, size); S.fa.iS.setXYZW(i, ph + k * 3.7, L[k][0], L[k][1], L[k][2]); } S.n++; S.fa.iP.needsUpdate = S.fa.iS.needsUpdate = true; S.flame.geometry.instanceCount = S.n * FL;
  if (o.smoke !== false) { const ns = Math.min(S.SM, size < .7 ? 2 : S.SM); for (let k = 0; k < ns; k++) { const i = S.ns++; S.sa.iP.setXYZW(i, x + rnd(-.15, .15) * size, y + size * .6, z + rnd(-.15, .15) * size, size * rnd(.8, 1.15)); S.sa.iS.setXYZW(i, (k + Math.random() * .6) / ns, rnd(.13, .19), rnd(0, 6.28), rnd(-1.2, 1.2)); } S.sa.iP.needsUpdate = S.sa.iS.needsUpdate = true; S.smoke.geometry.instanceCount = S.ns; }
  if (o.glow !== false) { const i = S.ng++; S.ga.iP.setXYZW(i, x, o.glowY !== undefined ? o.glowY : y + .06, z, size * (o.glowK || 1)); S.ga.iS.setXYZW(i, ph, 0, 0, 0); S.ga.iP.needsUpdate = S.ga.iS.needsUpdate = true; S.glow.geometry.instanceCount = S.ng; }
  const ne = size < .7 ? Math.ceil(S.EM / 2) : S.EM; for (let k = 0; k < ne; k++) { const i = S.ne++; S.ep.setXYZ(i, x, y, z); S.es.setXYZW(i, Math.random(), Math.random(), Math.random(), size); } S.ep.needsUpdate = S.es.needsUpdate = true; S.embers.geometry.setDrawRange(0, S.ne);
  if (o.base) { const b = add(fireBase(), plainV(), x, y, z, null, false); b.scale.setScalar(Math.max(.8, size * .82)); b.rotation.y = rnd(0, 6.28); b.userData.fx = 1; }
}
// engine-compatible fire(x, z, size, y): campfire with log base on the ground, bare flames when lifted (roofs)
export function fire(x, z, size = 1.4, y = 0) { y *= 1.45; fireAt(x, y, z, size, { base: y < 2, glow: y < 2.6, glowK: y < 2 ? 1 : .6 }); G.fires.push({ x, z, y: y + size, size, sp: [], ph: rnd(0, 9) }); }
let torchGeo = null;
export function torch(x, z, h = 2.3, y0 = 0) { if (!torchGeo) { const L = [colG(xf(cyl(.045, .07, 2.3, 7), 0, 1.15, 0), 0x4a3422, 0x6a4c30)]; for (let i = 0; i < 3; i++) { const a = i * 2.094; L.push(colG(xf(cyl(.02, .03, .9, 5), Math.cos(a) * .22, .38, Math.sin(a) * .22, 0, -a, -.5), 0x4a3422)); } L.push(colG(xf(lathe([[.05, 0], [.13, .06], [.16, .2], [.14, .26]], 10), 0, 2.22, 0), 0x1c1a1a)); L.push(colG(xf(new THREE.TorusGeometry(.15, .02, 5, 12), 0, 2.44, 0, Math.PI / 2), 0x1c1a1a)); torchGeo = merge(L); }
  const m = add(torchGeo, plainV(), x, y0, z); m.scale.set(1, h / 2.3, 1); m.rotation.y = rnd(0, 6); fireAt(x, y0 + h * 1.06, z, .5, { glowY: y0 + .06, glowK: 1.5 }); G.fires.push({ x, z, y: y0 + h + .5, size: .5, sp: [], ph: rnd(0, 9) }); return m; }

// =====================================================================================================================
// 4. PROPS: rigged idle horses, R_arava carts (intact / wrecked), crates, jars, sacks, melons, wheels, bones, cairns
// =====================================================================================================================
const horses = [];
export function horse(x, z, ry = rnd(0, 6.28), o = {}) { const src = (Q() > 0 && A.props.R_horse) || A.props.R_horse_lo || A.props.R_horse; let hz = null; try { hz = src && makeHorse(src, { far: A.props.R_horse_far, bare: o.bare !== undefined ? o.bare : Math.random() < .45, noShadow: Q() === 0, coat: o.coat }); } catch (e) { console.warn('fx horse', e); }
  if (!hz) return null; const g = hz.group; g.scale.setScalar(o.scale || rnd(1.64, 1.8)); g.position.set(x, o.y || 0, z); g.rotation.y = ry; (o.parent || world).add(g); hz.S.t += rnd(0, 20); try { hz.update(.05, 0, 1.75); } catch (e) { } horses.push({ hz, g }); return g; }
function tickHorses(dt) { for (let i = horses.length - 1; i >= 0; i--) { const h = horses[i]; let p = h.g.parent, ok = false; while (p) { if (p === scene) { ok = true; break; } p = p.parent; } if (!ok) { horses.splice(i, 1); continue; }
    const dx = h.g.position.x - G.cam.x, dz = h.g.position.z - (G.cam.z - 4), d2 = dx * dx + dz * dz; const vis = d2 < 46 * 46 || !!G.camFn; h.g.visible = vis; if (!vis) continue; if (h.hz.farM) h.hz.setLod(Q() === 0 ? d2 > 150 : d2 > 500); if (dt > 0 && !G.freeze) h.hz.update(dt, 0, 1.75); } }
export const _hsrc = () => (Q() > 0 && A.props.R_horse) || A.props.R_horse_lo || A.props.R_horse;
const GEOS = {};
const wheelG = () => GEOS.wheel || (GEOS.wheel = (() => { const R = .62, L = [colG(new THREE.TorusGeometry(R, .055, 7, 26), 0x5a4028), colG(xf(new THREE.TorusGeometry(R + .03, .03, 5, 26), 0, 0, 0), 0x2a2624), colG(xf(cyl(.1, .1, .22, 10), 0, 0, 0, Math.PI / 2), 0x4a3420)]; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; L.push(colG(xf(cyl(.028, .035, R, 5), Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0, 0, 0, a - Math.PI / 2), 0x6e5234)); } return merge(L); })());
function crateParts(s, tint = 0x9a7a52) { const L = [colG(bbox(s, s, s, .03), tint)], e = s / 2 - .015, t = .09, dk = new THREE.Color(tint).multiplyScalar(.72).getHex();
  for (const a of [-1, 1]) for (const b of [-1, 1]) { L.push(colG(xf(bbox(s + .05, t, t * .6, .012), 0, a * (e - t / 2 + .03), b * (e + .01)), dk)); L.push(colG(xf(bbox(t * .6, t, s + .05, .012), b * (e + .01), a * (e - t / 2 + .03), 0), dk)); L.push(colG(xf(bbox(t, s, t * .6, .012), a * (e - t / 2 + .03), 0, b * (e + .01)), dk)); L.push(colG(xf(bbox(t * .6, s, t, .012), b * (e + .01), 0, a * (e - t / 2 + .03)), dk)); }
  for (const b of [-1, 1]) L.push(colG(xf(bbox(s * 1.28, t * .8, t * .5, .012), 0, 0, b * (e + .012), 0, 0, b * .785), dk)); return L.map(g => xf(g, 0, s / 2, 0)); }
const jarG = (k = 1) => { const g = lathe([[0, 0], [.2, .01], [.3, .12], [.37, .34], [.36, .52], [.27, .7], [.15, .8], [.14, .88], [.19, .93], [.2, .96], [.15, .97], [.12, .9]], 22); const p = g.attributes.position, n = p.count, a = new Float32Array(n * 3), c1 = new THREE.Color(0x8a4a28), c2 = new THREE.Color(0xb08a58), c3 = new THREE.Color(0x2a4660); for (let i = 0; i < n; i++) { const y = p.getY(i), c = (y > .56 && y < .62) || (y > .3 && y < .33) ? c3 : y > .44 && y < .56 ? c2 : c1, j = .92 + Math.random() * .12; a[i * 3] = c.r * j; a[i * 3 + 1] = c.g * j; a[i * 3 + 2] = c.b * j; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return xf(g, 0, 0, 0, 0, 0, 0, k); };
const sackG = (k = 1) => { const g = new THREE.SphereGeometry(.34, 12, 9), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), b = 1 + Math.sin(x * 9 + z * 7) * .05; p.setXYZ(i, x * 1.0 * b, Math.max(-.2, y * .72) + .2, z * 1.45 * b); } g.computeVertexNormals(); return merge([colG(g, 0x7a6844, 0x9a8658), colG(xf(cyl(.05, .1, .16, 7), 0, .3, .5, 1.2), 0x6a5a3c), colG(xf(new THREE.TorusGeometry(.07, .018, 4, 8), 0, .28, .46, 1.2 - Math.PI / 2), 0x3a2a1a)].map(q => xf(q, 0, 0, 0, 0, 0, 0, k))); };
const melonG = (k = 1) => { const g = new THREE.SphereGeometry(.2, 12, 8), p = g.attributes.position, n = p.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const x = p.getX(i), z = p.getZ(i), st = Math.sin(Math.atan2(z, x) * 8) > .4, c = st ? [.3, .36, .12] : [.62, .5, .16]; a.set(c, i * 3); } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.scale(1, .92, 1.45); return xf(g, 0, .19, 0, 0, 0, 0, k); };
const colF = (g, fn) => { const p = g.attributes.position, n = p.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const c = fn(p.getX(i), p.getY(i), p.getZ(i)), j = .93 + Math.random() * .1; a[i * 3] = c[0] * j; a[i * 3 + 1] = c[1] * j; a[i * 3 + 2] = c[2] * j; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const hx = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const barrelG = (k = 1) => { const W = hx(0x8a6440), D = hx(0x5a3e24), I = hx(0x2a2622); const g = lathe([[0, 0], [.27, 0], [.3, .08], [.34, .26], [.355, .42], [.34, .58], [.3, .76], [.27, .84], [.25, .84], [.25, .8], [0, .8]], 20);
  colF(g, (x, y, z) => { const hp = [.07, .2, .64, .77].some(h => Math.abs(y - h) < .025), st = Math.sin(Math.atan2(z, x) * 10) > .86; return y > .79 ? D : hp ? I : st ? D : W; }); return xf(g, 0, 0, 0, 0, rnd(0, 6), 0, k); };
const basketG = (k = 1) => { const A = hx(0xb08a52), B = hx(0x7a5a30); const g = lathe([[0, 0], [.22, 0], [.3, .1], [.36, .3], [.4, .42], [.42, .45], [.39, .46], [.34, .32], [.27, .12], [0, .03]], 22);
  colF(g, (x, y, z) => { const a = Math.atan2(z, x); return (Math.sin(a * 22) * Math.sin(y * 70) > 0) ? A : B; }); const L = [g]; for (let i = 0; i < 4; i++) L.push(colG(xf(new THREE.SphereGeometry(.13, 8, 6), rnd(-.16, .16), .36, rnd(-.16, .16)), pick([0xc8a040, 0x8a3a20, 0xb07a30])));
  return merge(L.map(q => xf(q, 0, 0, 0, 0, 0, 0, k))); };
const feltG = (k = 1, col = 0xd8ccb0) => { const g = cyl(.21, .21, 1.15, 14), C = hx(col), R = hx(0x3a2a1a), E = new THREE.Color(col).multiplyScalar(.75); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), b = 1 + Math.sin(y * 7) * .03; p.setX(i, p.getX(i) * b); p.setZ(i, p.getZ(i) * b * .86); } g.computeVertexNormals();
  colF(g, (x, y, z) => Math.abs(Math.abs(y) - .3) < .04 ? R : Math.abs(y) > .56 ? [E.r, E.g, E.b] : C); return xf(g, 0, .19 * k, 0, 0, 0, Math.PI / 2, k); };
const carpetG = (k = 1) => { const pal = [[0x7a1410, 0x1a2a5a, 0xc89a40], [0x5a1a3a, 0xb8862a, 0x2a1a14], [0x8a2a14, 0x2a4a3a, 0xd8c8a0]]; const L = [];
  const roll = (x, y, z, ry, P) => { const g = new THREE.CylinderGeometry(.14, .14, 1.7, 16, 28); colF(g, (px, py, pz) => { const a = Math.atan2(pz, px), b = Math.abs(py) > .72 ? 2 : (Math.abs(py) > .62 ? 1 : (Math.sin(a * 3 + py * 11) > .2 ? 1 : 0)); return hx(P[b]); }); return xf(g, x, y, z, 0, ry, Math.PI / 2); };
  const P = pick(pal); L.push(roll(0, .14, -.15, 0, P), roll(0, .14, .15, 0, pick(pal)), roll(0, .4, 0, .08, pick(pal)));
  const f = new THREE.BoxGeometry(1.3, .16, .9, 32, 1, 22); colF(f, (x, y, z) => hx(Math.abs(x) > .55 || Math.abs(z) > .35 ? P[2] : (Math.sin(x * 14) * Math.sin(z * 14) > .2 ? P[1] : P[0]))); L.push(xf(f, .2, .08, 1.0, 0, .3));
  return merge(L.map(q => xf(q, 0, 0, 0, 0, 0, 0, k))); };
const saddleG = (k = 1) => { const L = [xf(sackG(.75), -.32, 0, 0, 0, 1.57), xf(sackG(.7), .34, 0, 0, 0, -1.57)]; const st = bbox(.82, .04, .2, .01); L.push(colG(xf(st, 0, .38, 0), 0x4a2c18)); return merge(L.map(q => xf(q, 0, 0, 0, 0, 0, 0, k))); };
function cargoG(v) { const key = 'cargo' + v; if (GEOS[key]) return GEOS[key]; const W = [], P = [];
  if (v === 0) { W.push(barrelG(1.3), xf(barrelG(1.15), .82, 0, .25), xf(barrelG(1.2), -.15, .36, .95, Math.PI / 2, .4)); P.push(xf(sackG(.9), -.8, 0, -.3, 0, 2)); }
  else if (v === 1) { P.push(basketG(1.2), xf(basketG(1), .85, 0, .3), xf(saddleG(1.1), -.2, 0, .95, 0, .5), xf(sackG(1), -.9, 0, -.2, 0, 1)); }
  else if (v === 2) { P.push(jarG(1.5), xf(jarG(1.05), .78, 0, .3), xf(jarG(.8), -.2, 0, .75), xf(jarG(1.1), .5, .34, -.7, 1.45, .6)); }
  else if (v === 3) { P.push(sackG(1.25), xf(sackG(1.15), .75, 0, .2, 0, 1.1), xf(sackG(1.1), .35, .42, .1, 0, .5), xf(jarG(.9), -.75, 0, .5), xf(feltG(1, 0xd8ccb0), -.2, 0, -.9, 0, .3), xf(feltG(.95, 0x6a5440), .1, .38, -.85, 0, .25)); }
  else if (v === 4) { P.push(xf(basketG(1.3), 0, 0, 0, .1, .3, .08)); for (let i = 0; i < 7; i++) P.push(xf(melonG(rnd(.9, 1.2)), rnd(-1.3, 1.3), 0, rnd(.5, 1.5), 0, rnd(0, 6))); P.push(xf(sackG(1.1), -1, 0, -.4, 0, 2)); }
  else if (v === 6) { P.push(carpetG(1.1), xf(feltG(1, 0xe0d4b8), 1.1, 0, -.5, 0, 1.2)); }
  else if (v === 7) { W.push(barrelG(1.25), xf(barrelG(1.1), -.75, 0, .4)); P.push(xf(feltG(1, 0x8a7458), .4, 0, .85, 0, .2), xf(jarG(1.1), .9, 0, -.3), xf(saddleG(1), -.4, 0, -.85, 0, 2.2)); }
  else { W.push(xf(wheelG().clone(), .3, .08, .2, Math.PI / 2 - .12, 0, 0, 1.05)); for (let i = 0; i < 6; i++) W.push(colG(xf(bbox(rnd(.9, 1.7), .05, rnd(.12, .2), .012), rnd(-1.2, 1.2), rnd(.03, .1), rnd(-1.2, 1.2), rnd(-.1, .1), rnd(0, 6), rnd(-.12, .12)), pick([0x7a5a3a, 0x8a6a44, 0x5a4028]))); P.push(xf(sackG(1.1), -.9, 0, .6, 0, 1), xf(jarG(.9), 1.0, .3, -.6, 1.5, 2.2)); }
  return GEOS[key] = { w: W.length ? merge(W) : null, p: P.length ? merge(P) : null }; }
export function cargo(x, z, v = Math.floor(Math.random() * 5), o = {}) { const g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.rotation.y = o.ry !== undefined ? o.ry : rnd(0, 6.28); const c = cargoG(v); if (c.w) add(c.w, woodV(), 0, 0, 0, g); if (c.p) add(c.p, plainV(), 0, 0, 0, g); (o.parent || world).add(g); return g; }
// engine crate(x, z): crates / jars / sacks / hand cart, with the old collision radii
export function crate(x, z) { const k = Math.random(); if (k < .88) { const v = pick([0, 1, 2, 3, 6, 7, 0, 3]); cargo(x, z, v); G.colC.push({ x, z, r: v === 2 ? .9 : 1.1 }); } else { cart(x, z, rnd(0, 6.28), false, { scale: 1.6 }); G.colC.push({ x, z, r: 1.5 }); } }
const burntM = new Map();
export function cart(x, z, ry = 0, burnt = false, o = {}) { const src = A.props.R_arava; if (!src) return cargo(x, z, 5);
  const g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.rotation.y = ry; const c = src.clone(true), S = o.scale || 2.1; c.scale.setScalar(S); g.add(c);
  if (burnt) c.traverse(m => { if (m.isMesh) { let d = burntM.get(m.material); if (!d) { d = m.material.clone(); d.color = new THREE.Color(0x2a2420); d.roughness = 1; burntM.set(m.material, d); } m.material = d; } });
  const broken = o.broken !== undefined ? o.broken : (burnt || Math.random() < .45);
  if (broken) { const sd = Math.random() < .5 ? -1 : 1; c.rotation.z = sd * rnd(.2, .3); c.rotation.x = rnd(-.08, .1); c.position.y = -.2 * S / 2.1; const cg = cargoG(5), wm = burnt ? (M.woodB || (M.woodB = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1, vertexColors: true }))) : woodV();
    const w = new THREE.Group(); w.position.set(-sd * 1.9 * S / 2.1, 0, rnd(-.6, .8)); w.rotation.y = rnd(0, 6); if (cg.w) add(cg.w, wm, 0, 0, 0, w); if (cg.p && !burnt) add(cg.p, plainV(), 0, 0, 0, w); g.add(w);
    if (!burnt && Math.random() < .7) { const v = pick([2, 3, 4, 6, 7]), cc = cargoG(v), q = new THREE.Group(); q.position.set(sd * 2.0 * S / 2.1, 0, rnd(-1, 1)); q.rotation.y = rnd(0, 6); if (cc.w) add(cc.w, woodV(), 0, 0, 0, q); if (cc.p) add(cc.p, plainV(), 0, 0, 0, q); g.add(q); } }
  (o.parent || world).add(g); return g; }
// engine decor(n, …) hook: returns the replacement object, or null to let the engine place the raw GLB
export function prop(n, x, z, ry, burnt) { try { if (n === 'R_horse') return horse(x, z, ry); if (n === 'R_arava') return cart(x, z, ry, burnt); } catch (e) { console.warn('fx prop', e); } return null; }
const bonesG = () => GEOS.bones || (GEOS.bones = (() => { const L = [], c = 0xa89e88, c2 = 0x857a64; for (let i = 0; i < 7; i++) { const R = .34 - Math.abs(i - 2.5) * .035; L.push(colG(xf(new THREE.TorusGeometry(R, .022, 5, 12, Math.PI * (i === 6 ? .6 : 1)), 0, -.02, -i * .16, 0, 0, i === 6 ? .5 : 0), c2, c)); }
  L.push(colG(xf(cyl(.035, .045, 1.25, 6), 0, .3, -.42, Math.PI / 2), c)); const sk = new THREE.SphereGeometry(.13, 10, 8); sk.scale(1, .85, 2.1); L.push(colG(xf(sk, .1, .1, .52, 0, .35), c)); const jaw = new THREE.SphereGeometry(.07, 8, 6); jaw.scale(1, .7, 2.3); L.push(colG(xf(jaw, .17, .05, .78, 0, .35), c));
  for (const [x, z, r] of [[.75, -.2, .4], [-.7, -.7, 1.9], [.5, -1.3, 2.6]]) { L.push(colG(xf(cyl(.028, .028, .62, 6), x, .03, z, Math.PI / 2, r), c)); for (const e of [-1, 1]) L.push(colG(xf(new THREE.SphereGeometry(.05, 6, 5), x + Math.sin(r) * .31 * e, .035, z + Math.cos(r) * .31 * e), c)); } return merge(L); })());
export function bones(x, z, o = {}) { const m = add(bonesG(), plainV(), x, (o.y || 0) - .02, z, o.parent, false); m.rotation.y = rnd(0, 6.28); m.rotation.z = rnd(-.12, .12); m.scale.setScalar(o.scale || rnd(1.1, 1.5)); return m; }
const cairnG = () => GEOS.cairn || (GEOS.cairn = (() => { const L = []; let k = 1; for (const [n, r, y, s] of [[6, .62, .16, .34], [4, .36, .52, .3], [2, .16, .84, .26], [1, 0, 1.1, .22]]) for (let i = 0; i < n; i++) { const a = i / n * 6.283 + y * 3; const g = rock(s * rnd(.85, 1.15), k++); g.scale(1, .68, 1); L.push(colG(xf(g, Math.cos(a) * r, y, Math.sin(a) * r, 0, rnd(0, 6)), pick([0x8a8074, 0x756c60, 0x968a7a, 0x64594c]), 0xa89c8c)); } return merge(L); })());
// route marker: stone cairn (oba) with a pole, horse-hair tug and a small waving rag flag
export function cairn(x, z, o = {}) { const g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.rotation.y = rnd(0, 6.28); add(cairnG(), rockV(), 0, 0, 0, g); if (o.flag !== false) banner(0, 0, o.color || 0xb8301c, { parent: g, scale: .56, y: .5, ry: rnd(-.3, .3) }); (o.parent || world).add(g); return g; }
export function wheel(x, z, o = {}) { const m = add(wheelG(), woodV(), x, (o.y || 0) + .09, z, o.parent); m.rotation.set(Math.PI / 2 - rnd(.05, .2), 0, rnd(0, 6)); return m; }

// ---------- caravan-trail dressing: wrecks, cargo, bones, cairns, torches along both lane edges ----------
// o: { z0, z1, cx(z) road centre, hf(x,z) height, kinds: weighted list, step, torch: bool, skip(x,z) }
export function trailDress(o) { const hf = o.hf || (() => 0), W = G.W, kinds = o.kinds || ['wreck', 'cargo', 'bones', 'cairn', 'bones', 'cargo']; let i = Math.floor(rnd(0, 6)), side = Math.random() < .5 ? -1 : 1, carts = 0; const maxC = o.maxCarts === undefined ? [3, 5, 7][Q()] : o.maxCarts;
  for (let z = o.z0 - rnd(4, 10); z > o.z1; z -= rnd(o.step || 15, (o.step || 15) * 1.6)) { side = -side; let k = kinds[i++ % kinds.length]; const x = side * (W + rnd(.9, 2.6)); if (o.skip && o.skip(x, z)) continue; if (G.fires.some(f => Math.hypot(f.x - x, f.z - z) < 3.5)) continue; const y = hf(x, z); if (y < -.2 || y > 1.6) continue;
    if (k === 'wreck' && carts >= maxC) k = 'cargo';
    if (k === 'wreck') { carts++; cart(x + side * .8, z, rnd(0, 6.28), false, { broken: true, y }); G.colC.push({ x: x + side * .8, z, r: 1.8 }); }
    else if (k === 'cart') { if (carts++ >= maxC) continue; cart(x + side * .8, z, side * rnd(1.2, 1.9), false, { broken: false, y }); G.colC.push({ x: x + side * .8, z, r: 1.8 }); }
    else if (k === 'cargo') { cargo(x, z, pick([1, 2, 3, 4, 6, 7, 0]), { y }); G.colC.push({ x, z, r: 1.0 }); }
    else if (k === 'bones') { const bx = side * rnd(W - 3.5, W + 1.5); bones(bx, z, { y: hf(bx, z) }); }
    else if (k === 'cairn') { cairn(x, z, { y, color: o.flag }); G.colC.push({ x, z, r: .9 }); }
    else if (k === 'torch') { torch(x - side * .6, z, 2.3, hf(x - side * .6, z)); G.colC.push({ x: x - side * .6, z, r: .35 }); }
    else if (k === 'wheel') { wheel(x, z, { y }); }
    else if (k === 'horse') { horse(x + side * 1.2, z, rnd(0, 6.28), { y: hf(x + side * 1.2, z) }); G.colC.push({ x: x + side * 1.2, z, r: 1 }); } }
}

// ---------- convoy cart: R_arava arba pulled by a harnessed rigged horse, seated driver, turning wheels ----------
// const c = FX.convoyCart({ coat:'bay', scale:2.1, driver:true, path: s => ({x, z}), speed: 0, parent: world });
//   c.g (Group, origin on the ground under the axle, forward = +z), c.speed (m/s, set any time), c.s (distance along path),
//   c.update(dt) is called automatically every frame while c.g is in the scene (set c.auto=false to drive it yourself),
//   c.place(x, z, yaw) to position manually, c.seat {x:0,y,z} local seat for a spawned driver unit (driver:false), c.dispose().
const convoys = [];
let _aI = null;
function aravaI() { if (_aI) return _aI; const src = A.props.R_arava; if (!src) return null; let m = null; src.traverse(o => { if (o.isMesh && !m) m = o; }); src.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(src), P = m.geometry.attributes.position, v = new THREE.Vector3();
  const zm = Math.max(Math.abs(bb.min.z), Math.abs(bb.max.z)), lx = bb.max.x - bb.min.x, cx = (bb.max.x + bb.min.x) / 2; let wx = 0, wn = 0, wy = 0, np = 0, nn = 0;
  for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); if (Math.abs(v.z) > zm * .9) { wx += v.x; wn++; wy = Math.max(wy, v.y); } if (v.x - cx > lx * .3) np++; else if (v.x - cx < -lx * .3) nn++; }
  return _aI = { wx: wx / Math.max(1, wn), wr: wy / 2, zm, front: np < nn ? 1 : -1, x0: bb.min.x, x1: bb.max.x }; }
let _cwT = null;
function cWheelTex() { return _cwT || (_cwT = canvas(256, 256, g => { g.translate(128, 128); g.fillStyle = 'rgba(22,14,8,.93)'; g.beginPath(); g.arc(0, 0, 118, 0, 6.3); g.fill(); g.strokeStyle = '#6a4a2a'; g.lineWidth = 9; for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 14); g.lineTo(0, 108); g.stroke(); }
  g.strokeStyle = '#5a3c20'; g.lineWidth = 20; g.beginPath(); g.arc(0, 0, 112, 0, 6.3); g.stroke(); g.strokeStyle = '#2e2622'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 123, 0, 6.3); g.stroke(); g.fillStyle = '#4a3018'; g.beginPath(); g.arc(0, 0, 22, 0, 6.3); g.fill(); g.fillStyle = '#2a1c10'; g.beginPath(); g.arc(0, 0, 8, 0, 6.3); g.fill(); })); }
// procedural seated driver (chapan robe, sash, fur-trimmed hat, beard, arms forward holding the reins); origin = seat
let _drv = null;
function driverG() { if (_drv) return _drv; const L = [], robe = 0x6a2a1c, robe2 = 0x8a3a24, skin = 0xb07850, fur = 0x3a2a1c;
  const torso = lathe([[0, 0], [.2, 0], [.23, .12], [.21, .36], [.19, .5], [.15, .58], [0, .6]], 14); torso.scale(1, 1, .78); L.push(colG(xf(torso, 0, 0, 0, -.08), robe, robe2));
  L.push(colG(xf(new THREE.TorusGeometry(.205, .035, 5, 14), 0, .2, 0, Math.PI / 2 - .08), 0xc89a3a));
  for (const s of [-1, 1]) { L.push(colG(xf(cyl(.075, .085, .44, 8), s * .11, .08, .2, Math.PI / 2 - .12), robe)); L.push(colG(xf(cyl(.065, .055, .42, 8), s * .12, -.15, .43, -.15), robe2)); L.push(colG(xf(bbox(.11, .08, .22, .02), s * .12, -.36, .5), 0x2a1a10));
    L.push(colG(xf(cyl(.06, .055, .3, 7), s * .2, .43, .1, -.9, 0, s * .2), robe)); L.push(colG(xf(cyl(.05, .045, .28, 7), s * .17, .34, .33, -1.45, 0, s * .1), robe2)); L.push(colG(xf(new THREE.SphereGeometry(.05, 7, 6), s * .15, .33, .48), skin)); }
  L.push(colG(xf(cyl(.06, .07, .08, 8), 0, .62, .01), skin)); const hd = new THREE.SphereGeometry(.12, 12, 10); hd.scale(.9, 1.08, 1); L.push(colG(xf(hd, 0, .76, .02), skin));
  const bd = new THREE.ConeGeometry(.08, .16, 8); L.push(colG(xf(bd, 0, .64, .09, Math.PI + .3), 0x2a2420));
  L.push(colG(xf(cyl(.135, .15, .09, 12), 0, .86, 0), fur)); L.push(colG(xf(lathe([[0, 0], [.12, 0], [.11, .08], [.07, .16], [0, .2]], 10), 0, .89, 0), 0x2a4a6a));
  return _drv = merge(L); }
export function convoyCart(o = {}) { const I = aravaI(); if (!I) return null; const S = o.scale || 2.1, g = new THREE.Group();
  const R = I.wr * S, ax = I.front * I.wx * S, tipD = (I.front > 0 ? I.x1 : -I.x0) * S - ax;
  const tilt = new THREE.Group(); tilt.position.set(0, R, 0); g.add(tilt); const body = A.props.R_arava.clone(true); body.scale.setScalar(S); body.rotation.y = I.front > 0 ? -Math.PI / 2 : Math.PI / 2; body.position.set(0, -R, -ax); body.traverse(m => { if (m.isMesh) { m.castShadow = Q() > 0; m.receiveShadow = true; } }); tilt.add(body);
  const tipY = .98, a = Math.atan2(tipY - R, tipD) + Math.atan2(R, tipD); tilt.rotation.x = -a;
  // load: sacks / jars / a rolled carpet on the bed
  if (o.load !== false) { const ld = new THREE.Group(); ld.position.set(0, -R + 1.0 * S / 2.1, -ax * .2 - .5); ld.rotation.x = 0; const c3 = cargoG(3); if (c3.p) add(c3.p, plainV(), 0, 0, 0, ld).scale.setScalar(.8); if (c3.w) add(c3.w, woodV(), 0, 0, 0, ld).scale.setScalar(.8); body.parent.add(ld); ld.rotation.y = Math.PI / 2; }
  const wm = M.cwheel || (M.cwheel = new THREE.MeshStandardMaterial({ map: cWheelTex(), alphaTest: .4, roughness: 1, side: THREE.DoubleSide })), wheels = [];
  for (const sd of [-1, 1]) { const w = new THREE.Group(); w.position.set(sd * (I.zm * S + .04), R, 0); const d = new THREE.Mesh(new THREE.CircleGeometry(R * 1.04, 28), wm); d.rotation.y = Math.PI / 2; d.castShadow = Q() > 0; w.add(d); const hub = new THREE.Mesh(cyl(.09, .12, .28, 8), ironM()); hub.rotation.z = Math.PI / 2; w.add(hub); g.add(w); wheels.push(w); }
  const hz = makeHorse(A.props.R_horse_lo || A.props.R_horse, { coat: o.coat, far: A.props.R_horse_far, noShadow: Q() === 0 }); const hg = hz ? hz.group : new THREE.Group(); hg.scale.setScalar(1.75); const hzc = tipD - .75; hg.position.set(0, 0, hzc); g.add(hg);
  const wd = M.harW || (M.harW = new THREE.MeshStandardMaterial({ color: 0x6a4420, roughness: .9 })), lt = M.harL || (M.harL = new THREE.MeshStandardMaterial({ color: 0x2c1a0e, roughness: .8 })), sw = I.zm * S * .62;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(sw, .055, 6, 18, Math.PI), wd); arch.position.set(0, tipY - .05, tipD - .12); arch.scale.y = 1.25; arch.castShadow = Q() > 0; g.add(arch);
  const rope = (x0, y0, z0, x1, y1, z1, r = .022, mat = lt) => { const A0 = new THREE.Vector3(x0, y0, z0), B0 = new THREE.Vector3(x1, y1, z1), m = new THREE.Mesh(cyl(r, r, A0.distanceTo(B0), 5), mat); m.position.copy(A0).add(B0).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B0.clone().sub(A0).normalize()); g.add(m); return m; };
  const seatZ = tipD * .1, seatY = R + .42 + Math.sin(a) * tipD * .1;
  for (const sd of [-1, 1]) { rope(sd * sw, tipY - .05, tipD - .12, sd * .34, 1.38, hzc + .7, .035); rope(sd * .15, seatY + .35, seatZ + .5, sd * .18, 2.0, hzc + 1.25); rope(sd * sw * .98, tipY - .1, tipD - .9, sd * .36, 1.2, hzc - .6, .03); }
  let drv = null; if (o.driver !== false) { drv = add(driverG(), plainV(), 0, seatY, seatZ, g); drv.scale.setScalar(1.25); }
  const c = { g, wheels, hz, horse: hg, driver: drv, R, a, tilt, seat: { x: 0, y: seatY, z: seatZ }, speed: o.speed || 0, s: 0, path: o.path || null, spin: 0, auto: o.auto !== false, t: rnd(0, 9),
    place(x, z, yaw) { g.position.set(x, o.y || 0, z); g.rotation.y = yaw; },
    update(dt) { if (c.path) { c.s += c.speed * dt; const p = c.path(c.s), q = c.path(c.s + .8); c.place(p.x, p.z, Math.atan2(q.x - p.x, q.z - p.z)); } c.spin += c.speed * dt / R; for (const w of wheels) w.rotation.x = c.spin; c.t += dt;
      if (hz) hz.update(dt, c.speed, 1.75); const mv = Math.min(1, Math.abs(c.speed)); tilt.rotation.x = -a + Math.sin(c.spin * 2.3) * .012 * mv; if (drv) { drv.position.y = seatY + Math.abs(Math.sin(c.spin * 2.3)) * .03 * mv + Math.sin(c.t * 1.3) * .006; drv.rotation.y = Math.sin(c.t * .4) * .12; } },
    dispose() { if (g.parent) g.parent.remove(g); const i = convoys.indexOf(c); if (i >= 0) convoys.splice(i, 1); } };
  (o.parent || world).add(g); if (c.path) c.update(0); convoys.push(c); return c; }
function tickConvoys(dt) { for (let i = convoys.length - 1; i >= 0; i--) { const c = convoys[i]; let p = c.g.parent, ok = false; while (p) { if (p === scene) { ok = true; break; } p = p.parent; } if (!ok) { if (!c.g.parent) convoys.splice(i, 1); continue; } if (c.auto && dt > 0 && !G.freeze) c.update(dt); } }

// ---------- one-off upgrade of leftover flat-colour box props (doors, planks) to textured wood ----------
let scanT = 0;
function plankBoxG(w, h, d) { const L = [], thin = Math.min(w, d) < .5 && h > 1.5, WD = hx(0x9a7a56), DK = hx(0x5a4030), IR = hx(0x2a2624);
  if (thin) { const along = w >= d, wide = along ? w : d, th = along ? d : w, n = Math.max(3, Math.round(wide / .3)), pw = wide / n;
    for (let i = 0; i < n; i++) { const c = (-wide / 2 + pw * (i + .5)), g = bbox(along ? pw - .02 : th * .8, h - rnd(0, .06), along ? th * .8 : pw - .02, .015); colF(g, () => (i % 2 ? WD : hx(0x8a6a48))); L.push(along ? xf(g, c, 0, 0) : xf(g, 0, 0, c)); }
    for (const y of [-h * .32, h * .32]) { const b = bbox(along ? wide * .96 : th + .06, .12, along ? th + .06 : wide * .96, .01); colF(b, () => IR); L.push(xf(b, 0, y, 0)); for (let i = 0; i < 5; i++) { const sx = -wide * .4 + i * wide * .2; const st = new THREE.SphereGeometry(.035, 6, 4); colF(st, () => IR); for (const sd of [-1, 1]) L.push(along ? xf(st.clone(), sx, y, sd * (th / 2 + .03)) : xf(st.clone(), sd * (th / 2 + .03), y, sx)); } } }
  else { const n = Math.max(2, Math.round(h / .17)), ph = h / n; for (let i = 0; i < n; i++) { const g = bbox(w, ph - .015, d, .012); colF(g, () => (i % 2 ? WD : hx(0x8a6a48))); L.push(xf(g, 0, -h / 2 + ph * (i + .5), 0)); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = bbox(.07, h + .01, .07, .01); colF(c, () => IR); L.push(xf(c, sx * (w / 2 - .02), 0, sz * (d / 2 - .02))); }
    for (const sx of [-.3, .3]) { const b = bbox(.06, h + .02, d + .03, .01); colF(b, () => DK); L.push(xf(b, sx * w, 0, 0)); } const lk = bbox(.12, .14, .04, .01); colF(lk, () => hx(0xb08a3a)); L.push(xf(lk, 0, h * .2, d / 2 + .02)); }
  return merge(L); }
// ---------- fix3 (author playtest 2-3 / 1-3): relief fix-ups for primitives that missions drop on flat ground ----------
// a) flattened untextured sphere used as a dune / mound (2-3 ridge) rendered as a huge flat beige ellipse with props floating on it
//    -> real terrain mound (scenery G.scn.reshape), sphere hidden, props on it re-seated;
// b) a long thin wooden deck lying on flat ground (1-3 "narrow bridge") -> river with banks + piles under it (G.scn.bridgeGap).
function scanShapes() { const sc = G.scn; if (!sc || !G.player) return; let ents = null, edit = false;
  for (const o of world.children) { if (o.userData.fxR) continue; o.userData.fxR = 1; if (!o.isMesh || !o.geometry || !o.visible) continue; const gp = o.geometry.parameters || {}, m = o.material;
    if (o.geometry.type === 'SphereGeometry' && m && m.isMeshStandardMaterial && !m.map && o.scale.x > 1.5 && o.scale.y < Math.min(o.scale.x, o.scale.z) * .7) {
      ents = ents || new Set((G.ents || []).map(e => e.o)); const px = o.position.x, pz = o.position.z, sx = o.scale.x * (gp.radius || 1), sz = o.scale.z * (gp.radius || 1), top = o.position.y + o.scale.y * (gp.radius || 1);
      const mh = (x, z) => { const r = Math.hypot((x - px) / sx, (z - pz) / sz); return top * (1 - THREE.MathUtils.smoothstep(r, .45, 1.32)); };
      if (sc.reshape((x, z, h) => h + mh(x, z), { x1: px - sx * 1.35, x2: px + sx * 1.35, z1: pz - sz * 1.35, z2: pz + sz * 1.35 })) { o.visible = false; edit = true;
        for (const k of world.children) { if (k === o || ents.has(k) || k.userData.terr) continue; const d = mh(k.position.x, k.position.z); if (d > .02 && k.position.y < d) k.position.y += d; } }
      continue; }
    if (o.geometry.type === 'BoxGeometry' && gp.depth >= 12 && gp.width <= 9 && gp.height <= .5 && Math.abs(o.position.y) < .4 && Math.abs(o.position.x) < 2 && Math.abs(o.rotation.y) < .01 && m && m.color) {
      const hs = {}; m.color.getHSL(hs); if (hs.h > .14 || hs.s < .15 || sc.deckAt(o.position.x, o.position.z) !== null) continue;
      if (sc.bridgeGap({ z1: o.position.z - gp.depth / 2, z2: o.position.z + gp.depth / 2, deckW: gp.width, deckY: o.position.y - gp.height / 2, deckTop: o.position.y + gp.height / 2, deck: o })) edit = true; } }
  if (edit && GD && GD.g.parent) GD.g.parent.remove(GD.g);   // ground detail is rebuilt on the new relief
}
function scanBoxes() { world.traverse(o => { if (!o.isMesh || o.userData.fxS) return; o.userData.fxS = 1; const g = o.geometry, m = o.material; if (!g || g.type !== 'BoxGeometry' || !m || !m.isMeshStandardMaterial || m.map || m.transparent) return; const hs = {}; m.color.getHSL(hs); if (hs.h > .13 || hs.s < .2) return;
    const P = g.parameters; if (!P || P.width * P.height * P.depth > 30) return; try { const bk = 'pb' + P.width.toFixed(2) + '_' + P.height.toFixed(2) + '_' + P.depth.toFixed(2); o.geometry = GEOS[bk] || (GEOS[bk] = plankBoxG(P.width, P.height, P.depth)); /* gfx2 r2: one geometry per size, so the planked boxes batch */ const wv = woodV(); m.map = wv.map || null; m.normalMap = wv.normalMap || null; m.roughnessMap = wv.roughnessMap || null; m.vertexColors = true; m.color.set(0xd8c0a0); if (m.userData.c0) m.userData.c0.set(0xd8c0a0); m.needsUpdate = true; } catch (e) { console.warn('fx box', e); } }); }

// ---------- HUD markers: small subtle player ring, thin dark-red lock ring, objective = small bobbing arrow + thin ring ----------
let lockR = null, arrG = null, arrM = null;
function tickHud(t) { const p = G.player;
  if (p && p.mark && !p.mark._fx) { p.mark._fx = 1; p.mark.ring.scale.setScalar(1.25); p.mark.ring.material.opacity = .4; p.mark.tri.scale.setScalar(.7); }
  if (!lockR || !lockR.parent) { lockR = fxg.children.find(o => o.isMesh && o.geometry && o.geometry.type === 'RingGeometry' && o.material.color && o.material.color.getHex() === 0xffe9a0) || null; if (lockR) { lockR.material.color.set(0xa01a10); lockR.material.opacity = .75; } }
  if (lockR && lockR.visible) lockR.scale.multiplyScalar(.78);
  for (const m of G.markers || []) { const ring = m.g.children[0]; if (!m._fx) { m._fx = 1; if (m.g.children[1]) m.g.children[1].visible = false; if (ring.material) ring.material.opacity = .55;
      if (!arrG) { arrG = new THREE.ConeGeometry(.3, .62, 4); arrG.rotateX(Math.PI); arrM = new THREE.MeshBasicMaterial({ color: 0xffc040, toneMapped: false, transparent: true, opacity: .92 }); }
      const a = new THREE.Mesh(arrG, arrM); a.position.y = 2.2; m.g.add(a); m._fxA = a; }
    if (ring) ring.scale.setScalar(.9 * (1 + Math.sin(t * 4) * .06)); if (m._fxA) { m._fxA.position.y = 1.9 + Math.abs(Math.sin(t * 3)) * .45; m._fxA.rotation.y = t * 1.6; } } }

// ---------- ground detail at gameplay distance: dry grass tufts + camel thorn (dense on lane edges), pebbles, dark patches ----------
let GD = null, gdT = 0, gdClr = 0, lvlT = 0;
function tuftTex(thorn) { return canvas(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.lineCap = 'round';
  if (!thorn) for (let i = 0; i < 46; i++) { const x0 = w / 2 + rnd(-22, 22), a = rnd(-.55, .55), L = rnd(40, 110), dry = Math.random() < .55; g.strokeStyle = dry ? `rgb(${rnd(118, 150) | 0},${rnd(100, 122) | 0},${rnd(66, 84) | 0})` : `rgb(${rnd(84, 108) | 0},${rnd(92, 112) | 0},${rnd(58, 72) | 0})`; g.lineWidth = rnd(1.5, 3); g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0 + Math.sin(a) * L * .4, h - L * .6, x0 + Math.sin(a) * L * .85, h - L * Math.cos(a * .6)); g.stroke(); }
  else { const br = (x, y, a, L, d) => { if (d > 4 || L < 4) return; const x1 = x + Math.sin(a) * L, y1 = y - Math.cos(a) * L; g.strokeStyle = d < 2 ? '#4a3622' : '#6a5030'; g.lineWidth = 4 - d * .7; g.beginPath(); g.moveTo(x, y); g.lineTo(x1, y1); g.stroke(); if (d > 1) { g.fillStyle = Math.random() < .5 ? '#7a8a3a' : '#5a6a2a'; g.fillRect(x1 - 2, y1 - 2, 4, 4); } br(x1, y1, a - rnd(.3, .7), L * .72, d + 1); br(x1, y1, a + rnd(.3, .7), L * .72, d + 1); };
    for (let i = 0; i < 5; i++) br(w / 2 + rnd(-6, 6), h, rnd(-.9, .9), rnd(22, 34), 0); } }); }
function gdMat(map) { const m = new THREE.MeshStandardMaterial({ map, alphaTest: .45, side: THREE.DoubleSide, roughness: 1 }); m.onBeforeCompile = sh => { sh.uniforms.uT = U.t; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n objectNormal = vec3(0., 1., 0.);').replace('#include <begin_vertex>', '#include <begin_vertex>\n #ifdef USE_INSTANCING\n float ph = instanceMatrix[3].x * .7 + instanceMatrix[3].z * .5; transformed.x += sin(uT * 1.9 + ph) * .07 * position.y; transformed.z += cos(uT * 1.4 + ph) * .04 * position.y;\n #endif'); sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);'); }; m.customProgramCacheKey = () => 'fxtuft2'; return m; }
function buildGD() { const P = G.player; if (!P) return; const W = G.W || 11.5, q = Q(), z0 = P.z + 30, z1 = P.z - 330; const hf = G.groundH && (G.groundHT || 0) >= gdClr - 50 ? G.groundH : null, H = (x, z) => { try { return hf ? hf(x, z) : 0; } catch (e) { return 0; } };
  const g = new THREE.Group(); g.userData.fx = 1; const nT = [520, 1350, 2000][q] || 1350, nP = [320, 800, 1200][q] || 800, nD = [40, 90, 120][q] || 90;
  const crossed = merge([xf(new THREE.PlaneGeometry(1, 1), 0, .5, 0), xf(new THREE.PlaneGeometry(1, 1), 0, .5, 0, 0, Math.PI / 2)]);
  const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.frustumCulled = false; m.receiveShadow = true; g.add(m); return m; };
  const tG = mk(crossed, gdMat(tuftTex(false)), nT), tT = mk(crossed, gdMat(tuftTex(true)), Math.ceil(nT * .45));
  const lo = r => { const g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, .62, 1.25); return g; }; const pg = merge([colG(lo(.075), 0x8a8074), colG(xf(lo(.055), .12, 0, .05), 0x6e665c), colG(xf(lo(.045), -.08, 0, .1), 0x9a9084)]); // gfx2: 60 tris per cluster (was 240)
  const pM = mk(pg, rockV(), nP); const dt = canvas(64, 64, (c, s) => { const r = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(40,28,18,.55)'); r.addColorStop(.6, 'rgba(40,28,18,.3)'); r.addColorStop(1, 'rgba(40,28,18,0)'); c.fillStyle = r; c.fillRect(0, 0, s, s); });
  const dq = new THREE.PlaneGeometry(1, 1); dq.rotateX(-Math.PI / 2); const dM = mk(dq, new THREE.MeshStandardMaterial({ map: dt, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), nD); dM.renderOrder = 1; dM.receiveShadow = true;
  const ok = (x, z, y) => !(y < -.15 || y > 2.6) && !G.fires.some(f => Math.abs(f.x - x) < 1.6 && Math.abs(f.z - z) < 1.6) && !G.colC.some(c => (c.x - x) ** 2 + (c.z - z) ** 2 < c.r * c.r);
  const put = (m, x, z, s, sy, c) => { const y = H(x, z); if (!ok(x, z, y)) return; _o.position.set(x, y - .02, z); _o.rotation.set(0, rnd(0, 6.28), 0); _o.scale.set(s, sy, s); _o.updateMatrix(); m.setMatrixAt(m.count, _o.matrix); if (c) m.setColorAt(m.count, _c.setRGB(c, c * rnd(.95, 1.02), c * rnd(.9, 1))); m.count++; };
  const paved = hf && G.gdPaved; const edgeX = () => { const sd = Math.random() < .5 ? -1 : 1, r = Math.random(); return paved ? sd * (W + rnd(.8, 6)) : r < .7 ? sd * (W + rnd(-3.2, 6)) : rnd(-W, W); };
  const clear = (x, z) => Math.abs(x - roadX(z)) > 2.4;
  for (let i = 0; i < nT * 1.3 && tG.count < nT; i++) { const z = rnd(z1, z0), x = edgeX(); if (clear(x, z)) put(tG, x, z, rnd(.45, .85), rnd(.35, .7), rnd(.95, 1.25)); }
  for (let i = 0; i < nT * .6 && tT.count < tT.instanceMatrix.count; i++) { const z = rnd(z1, z0), x = edgeX(); if (clear(x, z)) put(tT, x, z, rnd(.5, .9), rnd(.4, .7), rnd(1.0, 1.3)); }
  for (let i = 0; i < nP * 1.2 && pM.count < nP; i++) { const z = rnd(z1, z0), x = Math.random() < .5 && !paved ? rnd(-W - 4, W + 4) : edgeX(); put(pM, x, z, rnd(.7, 2.2), rnd(.6, 1.6)); }
  for (let i = 0; i < nD; i++) { const z = rnd(z1, z0), x = paved ? edgeX() : rnd(-W - 6, W + 6), s = rnd(1.8, 4.5); put(dM, x, z, s, 1); }
  for (const m of [tG, tT, pM, dM]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } tG.castShadow = tT.castShadow = false; world.add(g); GD = { g }; }
function tickGD() { const now = performance.now(); if (world.children.length < 3) lvlT = now / 1000; if (GD && !GD.g.parent) { GD = null; gdClr = now; gdT = now + 1200; lvlT = now / 1000; } if (!GD && G.player && now > gdT && world.children.length > 3) { gdT = now + 3000; try { buildGD(); } catch (e) { console.warn('fx gd', e); } } }

// =====================================================================================================================
// 9. BURNT RUINS (session 4, author playtest: "burnt houses are black boxes — a burnt house isn't all black, the beams show").
// The engine's yurt()/house() with burnt=true place the GLB with one flat 0x2a2420 material. scanBurnt() hides those clones and
// puts a procedural ruin in their place (collision from the engine stays): yurt = charred kerege lattice arcs, scorched felt
// remnants, door frame, roof poles leaning on a tilted/collapsed crown ring, collapsed felt heap, ash disc, pulsing embers,
// thin smoke; house = sooty clay walls with broken tops and a breach, charred roof beams (spanning / snapped / fallen), roof
// debris heap. 4 draws per ruin (timber, felt/heap, clay or ash decal, embers). Any other burnt GLB material gets charPatch():
// map kept, brown char / coal / grey-ash variation in world space instead of a flat dark colour.
// =====================================================================================================================
const nz = (x, y, z) => (Math.sin(x * 1.9 + z * 2.7 + y * .7) + Math.sin(x * 4.3 - z * 3.1 + y * 2.3) * .5 + Math.sin(z * 7.7 + x * 6.1 - y * 5.3) * .25) / 3.5 + .5;
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const CH = { coal: hx(0x141110), char: hx(0x2c221c), brown: hx(0x5e3e28), wood: hx(0x8a6640), ash: hx(0x9c968e), ashD: hx(0x5a5652), felt: hx(0xc4b498), feltS: hx(0x7c5e40), clay: hx(0xccb294), clayD: hx(0xa89076), brick: hx(0xb08466), soot: hx(0x1e1a18), paint: hx(0x8a3a20) };
const charC = (x, y, z, top = 2) => { const n = nz(x * 1.3, y * 1.3, z * 1.3), k = Math.min(1, Math.max(0, y / top)); let c = lerp3(CH.brown, CH.char, Math.min(1, k * .7 + n * .4)); if (k > .8) c = lerp3(c, CH.coal, (k - .8) * 4); if (n > .7 && k < .6) c = lerp3(c, CH.wood, .6); else if (n < .22) c = lerp3(c, CH.ashD, .45); return c; };
const ruinW = () => M.ruinW || (M.ruinW = (ENV.ok && pbrMat('brown_planks_09', .6, .6, { vertexColors: true, roughness: 1, color: 0xffffff })) || new THREE.MeshStandardMaterial({ roughness: 1, vertexColors: true }));
const ruinP = () => M.ruinP || (M.ruinP = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, vertexColors: true, side: THREE.DoubleSide }));
const ruinC = () => M.ruinC || (M.ruinC = (ENV.ok && pbrMat('clay_block_wall', 1, 1, { vertexColors: true, color: 0xf0eee8 })) || new THREE.MeshStandardMaterial({ roughness: 1, vertexColors: true }));
function emberM() { if (M.ember) return M.ember; const m = M.ember = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  m.onBeforeCompile = sh => { sh.uniforms.uT = U.t; sh.vertexShader = 'uniform float uT; varying float vEk;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n { vec4 ewp = modelMatrix * vec4(transformed, 1.); vEk = .5 + .5 * sin(uT * (2. + fract(ewp.x * 3.7 + ewp.z * 1.3) * 2.5) + ewp.x * 9. + ewp.z * 7.); }');
    sh.fragmentShader = 'varying float vEk;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= .45 + vEk * .75;'); }; m.customProgramCacheKey = () => 'fxember'; return m; }
function ashM() { if (M.ash) return M.ash; const a = canvas(128, 128, (g, w) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, w); for (let i = 0; i < 9; i++) { const x = w / 2 + rnd(-22, 22), y = w / 2 + rnd(-22, 22), r = rnd(26, 46), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(.6, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); } }); a.colorSpace = THREE.NoColorSpace;
  return M.ash = (ENV.ok && pbrMat('burned_ground_01', 1.4, 1.4, { transparent: true, alphaMap: a, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, color: 0xa8a29c })) || new THREE.MeshStandardMaterial({ color: 0x3a3430, transparent: true, alphaMap: a, depthWrite: false, roughness: 1 }); }
const _ya = new THREE.Vector3(0, 1, 0), _qq = new THREE.Quaternion();
function beamG(p0, p1, r, n = 6) { const d = new THREE.Vector3().subVectors(p1, p0), L = d.length(); const g = cyl(r * .85, r, L, n); g.translate(0, L / 2, 0); _qq.setFromUnitVectors(_ya, d.normalize()); g.applyQuaternion(_qq); g.translate(p0.x, p0.y, p0.z); return g; }
function blobG(rx, ry, rz, seed) { let g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = .55 + nz(x * 2 + seed, y * 2, z * 2 - seed) * .5 + nz(x * 6 - seed, y * 6, z * 6 + seed) * .35; p.setXYZ(i, x * rx * k, Math.max(-.05, y) * ry * k, z * rz * k); } g.computeVertexNormals(); return g; }
const emb = (E, x, y, z, s = 1) => { const g = new THREE.IcosahedronGeometry(rnd(.035, .08) * s, 0); g.translate(x, y, z); const k = rnd(.8, 1.5); colF(g, () => [1 * k, rnd(.28, .5) * k, .06 * k]); E.push(g); };
// pile of burnt stuff: low lumpy mound + small lumps + charred sticks lying on top + embers
function heapG(P, W, E, cx, cz, rx, rz, hh) { const g = blobG(rx, hh * .75, rz, rnd(0, 9)); g.rotateY(rnd(0, 6)); g.translate(cx, 0, cz); heapColor(g, hh); P.push(g);
  for (let i = 0; i < 6; i++) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()), s = rnd(.25, .55), q = blobG(s, s * rnd(.6, 1.1), s * rnd(.8, 1.3), rnd(0, 9)); q.translate(cx + Math.cos(a) * rx * r * .8, rnd(0, hh * .5), cz + Math.sin(a) * rz * r * .8); heapColor(q, hh); P.push(q); }
  for (let i = 0; i < 7; i++) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * .8, x = cx + Math.cos(a) * rx * r, z = cz + Math.sin(a) * rz * r, y = hh * rnd(.35, .85), b = rnd(0, 6.28), L = rnd(.6, 1.5); const st = beamG(new THREE.Vector3(x - Math.cos(b) * L / 2, y + rnd(-.15, .15), z - Math.sin(b) * L / 2), new THREE.Vector3(x + Math.cos(b) * L / 2, y + rnd(-.25, .1), z + Math.sin(b) * L / 2), rnd(.035, .06), 5); colF(st, (px, py, pz) => charC(px, py + .4, pz, 1.2)); W.push(st); }
  for (let i = 0; i < 14; i++) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * .85; emb(E, cx + Math.cos(a) * rx * r, rnd(.04, hh * .7), cz + Math.sin(a) * rz * r); } }
function heapColor(g, top) { return colF(g, (x, y, z) => { const n = nz(x * 1.7, y * 2, z * 1.7), m = nz(z * 3.1 + 5, y * 3, x * 3.1); let c = lerp3(CH.char, CH.brown, n * .7); if (m > .5) c = lerp3(c, CH.ashD, Math.min(1, (m - .5) * 3)); if (m > .66 && y > top * .3) c = lerp3(c, CH.ash, Math.min(.85, (m - .66) * 4)); if (n > .8 && y < top * .35) c = lerp3(c, CH.feltS, .7); if (n < .2) c = lerp3(c, CH.coal, .7); return c; }); }
function yurtRuinG() { const R = 3.1, W = [], P = [], E = [], smk = [], door = rnd(0, 6.28);
  // wall arcs (surviving lattice) — 13 segments, ~60% survive, smooth burnt height
  const NS = 13, seg = []; for (let i = 0; i < NS; i++) { const a0 = door + i / NS * 6.283; const keep = i === 0 || i === NS - 1 ? true : Math.random() < .5; seg.push({ a0, a1: a0 + 6.283 / NS, keep, h: keep ? rnd(.75, 1.5) : 0, lean: rnd(-.1, .14) }); }
  for (const s of seg) { if (!s.keep) continue; for (let a = s.a0 + .08; a < s.a1; a += .21) for (const sd of [-1, 1]) { const L = s.h / Math.cos(.62) * rnd(.5, 1.05), b = bbox(.075, L, .045, .01); b.rotateZ(sd * .62); b.translate(0, L / 2 * Math.cos(.62), 0); b.rotateX(s.lean); b.translate(0, 0, R); b.rotateY(a); colF(b, (x, y, z) => charC(x, y, z, s.h)); W.push(b); }
    if (Math.random() < .55) { const t = new THREE.TorusGeometry(R, .035, 4, 6, s.a1 - s.a0); t.rotateX(Math.PI / 2); t.rotateY(s.a0 - Math.PI / 2 + (s.a1 - s.a0)); t.translate(0, s.h * .96, 0); colF(t, () => CH.coal); W.push(t); } }
  // scorched felt remnants on 2-3 surviving segments (jagged burnt top edge)
  const ks = seg.filter((s, i) => s.keep && i > 0 && i < NS - 1); for (let i = 0; i < Math.min(3, ks.length); i++) { const s = ks[Math.floor(Math.random() * ks.length)], fh = s.h * rnd(.6, .95);
    const g = new THREE.CylinderGeometry(R + .06, R + .06, fh, 7, 3, true, s.a0, (s.a1 - s.a0) * rnd(.7, 1)); const p = g.attributes.position; for (let j = 0; j < p.count; j++) { const y = p.getY(j); if (y > -fh / 2 + .01) p.setY(j, y - rnd(0, fh * (y > fh / 2 - .01 ? .7 : .25))); } g.translate(0, fh / 2, 0); g.computeVertexNormals();
    colF(g, (x, y, z) => { const n = nz(x * 2.2, y * 3, z * 2.2), k = y / fh + n * .35 - .15; return k < .45 ? lerp3(CH.felt, CH.feltS, Math.max(0, k) / .45) : lerp3(CH.feltS, CH.soot, Math.min(1, (k - .45) / .35)); }); P.push(g); }
  // door frame (painted remnant low on the posts)
  for (const sd of [-1, 1]) { const b = bbox(.15, 1.65, .12, .015); b.translate(0, .82, 0); b.rotateY(-door); const a = door + sd * .17; b.translate(Math.sin(a) * R, 0, Math.cos(a) * R); colF(b, (x, y, z) => y < .6 ? lerp3(CH.paint, CH.brown, y / .6) : charC(x, y, z, 1.7)); W.push(b); }
  { const b = bbox(1.15, .13, .12, .015), up = Math.random() < .5; if (up) { b.translate(0, 1.66, 0); } else { b.rotateZ(rnd(.6, 1)); b.translate(.3, .5, .3); } b.rotateY(door); b.translate(Math.sin(door) * R, 0, Math.cos(door) * R); colF(b, (x, y, z) => charC(x, y, z, 1.2)); W.push(b); }
  // collapsed felt / roof heap
  const hx0 = rnd(-.7, .7), hz0 = rnd(-.7, .7), hh = rnd(.4, .6); heapG(P, W, E, hx0, hz0, R * .5, R * .42, hh);
  // crown ring (shangaraq) — held up by a few poles, or fallen onto the heap
  const up = Math.random() < .6, C = new THREE.Vector3(hx0 * .6 + rnd(-.3, .3), up ? rnd(1.2, 1.9) : hh + .15, hz0 * .6 + rnd(-.3, .3)), tilt = up ? rnd(.25, .55) : rnd(.1, .3), ta = rnd(0, 6);
  { const t = new THREE.TorusGeometry(.55, .065, 5, 14); t.rotateX(Math.PI / 2 + tilt); t.rotateY(ta); t.translate(C.x, C.y, C.z); colF(t, () => lerp3(CH.char, CH.brown, Math.random() * .5)); W.push(t);
    for (let i = 0; i < 3; i++) { const q = cyl(.03, .03, 1.1, 5); q.rotateZ(Math.PI / 2); q.rotateY(i * 1.05); q.rotateX(tilt); q.rotateY(ta); q.translate(C.x, C.y, C.z); colF(q, () => CH.coal); W.push(q); } }
  // roof poles (uuk): standing to the crown, snapped with glowing tips, or fallen on the floor
  for (const s of seg) { const n = s.keep ? (Math.random() < .5 ? 2 : 1) : (Math.random() < .35 ? 1 : 0); for (let k = 0; k < n; k++) { const a = s.a0 + (k + .5) / n * (s.a1 - s.a0), p0 = new THREE.Vector3(Math.sin(a) * R, s.keep ? s.h * .9 : .05, Math.cos(a) * R), r = Math.random();
    if (s.keep && up && r < .22) { const p1 = new THREE.Vector3(C.x + Math.sin(a) * .5, C.y, C.z + Math.cos(a) * .5); const g = beamG(p0, p1, .045); colF(g, (x, y, z) => charC(x, y, z, 1.6)); W.push(g); }
    else if (s.keep && r < .55) { const p1 = new THREE.Vector3(C.x, up ? C.y : 2.2, C.z), pe = p0.clone().lerp(p1, rnd(.3, .6)); const g = beamG(p0, pe, .045); colF(g, (x, y, z) => charC(x, y + .6, z, 1.6)); W.push(g); emb(E, pe.x, pe.y, pe.z, .9); }
    else { const p1 = new THREE.Vector3(Math.sin(a) * R * rnd(-.2, .3) + rnd(-.4, .4), .06, Math.cos(a) * R * rnd(-.2, .3) + rnd(-.4, .4)); p0.y = s.keep ? rnd(.3, s.h) : .06; const g = beamG(p0, p1, .045); colF(g, (x, y, z) => charC(x, y + .8, z, 1.4)); W.push(g); } } }
  smk.push([hx0, hh * .7, hz0, rnd(.7, 1.1)]);
  return { W, P, E, smk, ash: R * 2.7 }; }
function worldUV(g, s) { const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v; if (ay > ax && ay > az) { u = p.getX(i); v = p.getZ(i); } else if (ax > az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); } uv[i * 2] = u * s; uv[i * 2 + 1] = v * s; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; }
function houseRuinG() { const Wd = 6.5, D = 5, H = 3.3, T = .34, W = [], P = [], C = [], E = [], smk = [];
  const walls = [[Wd / 2, 0, D, 1], [-Wd / 2, 0, D, 1], [0, D / 2, Wd, 0], [0, -D / 2, Wd, 0]]; const tops = [];
  walls.forEach(([cx, cz, L, alongZ], wi) => { const front = wi === 0, br = rnd(-L / 2 + 1, L / 2 - 1), bw = rnd(.8, 1.8), bh = rnd(.4, 1.2), NS = Math.round(L / .5), sw = L / NS, ph = rnd(0, 9), top = [];
    for (let i = 0; i < NS; i++) { const u = -L / 2 + sw * (i + .5); let ht = H * (.46 + .46 * nz(u * .32 + ph, 0, wi)) + rnd(-.07, .07); if (!front) ht = Math.min(ht, bh + Math.max(0, Math.abs(u - br) - bw * .3) * 1.4); if (Math.abs(u) > L / 2 - .4) ht = Math.max(ht, H * rnd(.7, .9)); top.push(ht);
      const door = front && Math.abs(u - .2) < .62, pcs = door ? (ht > 2.35 ? [[2.15, ht]] : []) : [[0, Math.min(ht, 1.35)], [1.35, ht]];
      for (const [y0, y1] of pcs) { if (y1 - y0 < .05) continue; const b = new THREE.BoxGeometry(alongZ ? T : sw + .01, y1 - y0, alongZ ? sw + .01 : T); b.translate(alongZ ? cx : cx + u, (y0 + y1) / 2, alongZ ? cz + u : cz);
        const nr = b.attributes.normal; let vi = 0; colF(b, (x, y, z) => { const up = nr.getY(vi++) > .5, n = nz(x * .9, y * .9, z * .9); let c = lerp3(CH.clay, CH.clayD, n * .7); if (up) return lerp3(c, CH.brick, .35 + n * .3);
          const s = Math.min(1, Math.max(0, (y - (ht - .9)) / .9) * .62 + (front && Math.abs(u - .2) < 1.2 && y > 1.5 ? .35 * Math.min(1, (y - 1.5) / .8) : 0)); return lerp3(c, CH.soot, s * (.7 + n * .4)); }); C.push(b); } }
    tops.push(top); });
  // lintel over the door, charred
  { const b = bbox(T + .1, .16, 1.6, .02); b.translate(Wd / 2, 2.1, .2); colF(b, (x, y, z) => charC(x, y, z, 2)); W.push(b); }
  // roof beams across the short side: spanning, snapped and sagging, or fallen into the room
  const minTop = (wi, x) => { const L = Wd, NS = tops[wi].length, i = Math.max(0, Math.min(NS - 1, Math.floor((x + L / 2) / (L / NS)))); return tops[wi][i]; };
  for (let x = -Wd / 2 + .7; x < Wd / 2 - .4; x += rnd(.9, 1.3)) { const ha = minTop(2, x), hb = minTop(3, x), r = Math.random();
    if (ha > 2.5 && hb > 2.5 && r < .4) { const y = Math.min(ha, hb) - .05, g = beamG(new THREE.Vector3(x, y, D / 2 + .1), new THREE.Vector3(x + rnd(-.2, .2), y, -D / 2 - .1), .1); colF(g, (px, py, pz) => charC(px, py - y + 1.4, pz, 2)); W.push(g); }
    else if (r < .7 && (ha > 1.8 || hb > 1.8)) { const sd = ha > hb ? 1 : -1, y = Math.max(ha, hb) - .05, g = beamG(new THREE.Vector3(x, y, sd * (D / 2 + .1)), new THREE.Vector3(x + rnd(-.3, .3), rnd(.3, .9), -sd * rnd(-.4, .8)), .1); colF(g, (px, py, pz) => charC(px, py + .5, pz, 2.4)); W.push(g); emb(E, x, rnd(.3, .6), 0, 1.2); }
    else if (r < .88) { const g = beamG(new THREE.Vector3(x + rnd(-.3, .3), .1, rnd(1.2, 2.2)), new THREE.Vector3(x + rnd(-.6, .6), .12, rnd(-2.2, -1.2)), .1); colF(g, (px, py, pz) => charC(px, py + 1, pz, 2)); W.push(g); } }
  // collapsed roof (reed + earth) heap, reed mat fragments, embers, smoke
  const hh = rnd(.5, .75); heapG(P, W, E, rnd(-.6, .6), rnd(-.4, .4), Wd * .3, D * .27, hh);
  for (let i = 0; i < 4; i++) { const b = bbox(rnd(.9, 1.6), .06, rnd(.6, 1.1), .01); b.rotateX(rnd(-.4, .4)); b.rotateZ(rnd(-.4, .4)); b.rotateY(rnd(0, 6)); b.translate(rnd(-Wd * .3, Wd * .3), rnd(.2, hh), rnd(-D * .28, D * .28)); colF(b, () => lerp3(hx(0x4a3a26), CH.coal, Math.random() * .7)); P.push(b); }
  smk.push([rnd(-1, 1), hh, rnd(-.6, .6), rnd(.8, 1.2)]);
  return { W, P, C, E, smk, ash: Math.max(Wd, D) * 1.05 }; }
function smokeAt(x, y, z, size) { const S = fireSys(), n = Math.min(3, S.SM); for (let k = 0; k < n; k++) { if (S.ns >= MAXF * S.SM) return; const i = S.ns++; S.sa.iP.setXYZW(i, x + rnd(-.2, .2) * size, y, z + rnd(-.2, .2) * size, size * rnd(.8, 1.15)); S.sa.iS.setXYZW(i, (k + Math.random() * .6) / n, rnd(.08, .12), rnd(0, 6.28), rnd(-1, 1)); } S.sa.iP.needsUpdate = S.sa.iS.needsUpdate = true; S.smoke.geometry.instanceCount = S.ns; }
function buildRuin(o, kind) { const R = kind === 'yurt' ? yurtRuinG() : houseRuinG(), g = new THREE.Group(); g.userData.fx = 1; g.userData.ruin = kind; g.position.copy(o.position); g.rotation.y = o.rotation.y;
  if (kind === 'yurt') g.scale.setScalar(o.scale.x); else g.scale.copy(o.scale); const sh = Q() > 0;
  const put = (L, m, cast, wuv) => { if (!L || !L.length) return; const geo = merge(L); if (wuv) worldUV(geo, .45); const me = new THREE.Mesh(geo, m); me.castShadow = cast && sh; me.receiveShadow = true; g.add(me); };
  put(R.W, ruinW(), true); put(R.P, ruinP(), true); if (R.C) put(R.C, ruinC(), true, true); put(R.E, emberM(), false);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(R.ash, R.ash * (kind === 'yurt' ? 1 : .8)), ashM()); d.rotation.x = -Math.PI / 2; d.rotation.z = rnd(-.3, .3); d.position.y = .03; d.receiveShadow = true; d.renderOrder = 1; g.add(d);
  (o.parent || world).add(g); o.visible = false; g.updateMatrixWorld(true);
  for (const [x, y, z, s] of R.smk) { const v = new THREE.Vector3(x, y, z).applyMatrix4(g.matrixWorld); smokeAt(v.x, v.y, v.z, s * o.scale.x); }
  return g; }
function charPatch(m) { if (m.userData.fxChar) return; m.userData.fxChar = 1; m.color.set(0xa89280); const prev = m.onBeforeCompile, pk = prev ? String(prev).length : 0; if (prev === THREE.Material.prototype.onBeforeCompile) m.userData.fxVarPure = 1; // gfx2: instancing-aware, so burnt props can be batched
  m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.vertexShader = 'varying vec3 vChW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n { mat4 fxM = modelMatrix;\n #ifdef USE_INSTANCING\n fxM = modelMatrix * instanceMatrix;\n #endif\n vChW = (fxM * vec4(transformed, 1.)).xyz; }');
    sh.fragmentShader = 'varying vec3 vChW;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    { vec3 p = vChW * 1.6; float n = sin(p.x * 1.3 + p.z * 1.7 + p.y * .9) * .5 + sin(p.x * 3.1 - p.z * 2.3 + p.y * 2.7) * .3 + sin(p.z * 6.7 + p.x * 5.3 - p.y * 4.1) * .2; n = n * .5 + .5;
      vec3 br = diffuseColor.rgb * vec3(.66, .5, .38); vec3 c = mix(br, vec3(.085, .07, .06), smoothstep(.42, .8, n + vChW.y * .07) * .9); c = mix(c, vec3(.36, .34, .32), smoothstep(.78, .96, n) * .75); diffuseColor.rgb = c; } // gfx2: scorched brown with soot streaks and ash, not a black box`); };
  m.customProgramCacheKey = () => 'fxchar2' + pk; m.needsUpdate = true; }
const DARK = 0x2a2420;
function scanBurnt() { const Y = A.props && A.props.B_yurt, H = A.props && A.props.B_house, P = G.player, todo = [];
  for (const o of world.children) { if (o.userData.fxB) continue; if (o.userData.fx || !o.visible) { o.userData.fxB = 1; continue; } let m0 = null; o.traverse(k => { if (!m0 && k.isMesh) m0 = k.material; }); if (!m0 || !m0.color || m0.color.getHex() !== DARK) { o.userData.fxB = 1; continue; } todo.push(o); }
  if (P) todo.sort((a, b) => ((a.position.x - P.x) ** 2 + (a.position.z - P.z) ** 2) - ((b.position.x - P.x) ** 2 + (b.position.z - P.z) ** 2));
  let n = 0; for (const o of todo) { if (n >= 6) return true; o.userData.fxB = 1;
    try { const pk = propKind(o); if (Y && (pk === 'B_yurt' || o.name === 'B_yurt' || o.getObjectByName('B_yurt'))) { buildRuin(o, 'yurt'); n++; continue; } if (H && (pk === 'B_house' || o.name === 'B_house' || o.getObjectByName('B_house'))) { buildRuin(o, 'house'); n++; continue; } // gfx2 r2: new models are recognised by geometry, not by node name
      o.traverse(k => { if (k.isMesh && k.material && k.material.color && k.material.color.getHex() === DARK) charPatch(k.material); }); } catch (e) { console.warn('fx ruin', e); } } return false; }
// ---------- player outline (session 4): hull expanded in clip space (constant ~1.5 px gold line) and pushed slightly back in depth
// (the Meshy models have mixed winding, so a BackSide hull alone drew over the body), hero only ----------
const UO = { res: { value: new THREE.Vector2(844, 390) }, w: { value: 1.6 } };
function outlineHero(e) { if (!e || e._fxOL) return; let sm = null; e.o.traverse(o => { if (o.isSkinnedMesh && !sm && !o.userData.fxOL) sm = o; }); if (!sm || !sm.parent) return; e._fxOL = 1;
  const m = new THREE.MeshBasicMaterial({ color: 0xffd76e, side: THREE.DoubleSide, fog: false, toneMapped: false, transparent: true, opacity: .45, depthWrite: false });   // gfx3: subtler hero line (was .85)
  m.onBeforeCompile = sh => { sh.uniforms.uORes = UO.res; sh.uniforms.uOW = UO.w; sh.vertexShader = 'uniform vec2 uORes; uniform float uOW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
    { vec4 cn = projectionMatrix * vec4(normalize(transformedNormal), 0.); vec2 d = cn.xy; float l = length(d); if (l > 1e-4) gl_Position.xy += d / l * uOW * 2. / uORes * gl_Position.w; gl_Position.z += .0007 * gl_Position.w * max(1., -projectionMatrix[3][2]); }`); };
  m.customProgramCacheKey = () => 'fxoutline2';
  const ol = new THREE.SkinnedMesh(sm.geometry, m); ol.bind(sm.skeleton, sm.bindMatrix); ol.bindMode = sm.bindMode; ol.userData.fxOL = 1; ol.frustumCulled = false; ol.castShadow = false; ol.renderOrder = 1;
  ol.position.copy(sm.position); ol.quaternion.copy(sm.quaternion); ol.scale.copy(sm.scale); sm.parent.add(ol); e._fxOLm = ol; }
// ---------- moods without a scenery preset (prologue / chapter 1 missions use only engine setMood): apply 'pro' / 'ch1' ----------
let lastFog = null;
// IBL strength per preset (scene.environmentIntensity is not in this three build): envMapIntensity on non-metal standard materials
let envSeen = 0; function scanEnv() { if (G.envI === undefined) return; const k = G.envI, t = G.envT; scene.traverse(o => { const m = o.material; if (!m || !m.isMeshStandardMaterial || m.userData.fxE === t) return; m.userData.fxE = t; if (m.metalness > .5) return; m.envMapIntensity = k; if (m.transparent && m.roughness === .18) m.roughness = .42; /* gfx2: engine water() sun glare bloomed to white */ }); }
function tickMood() { const f = scene.fog; if (!f || f === lastFog) return; lastFog = f;
  // daytime falling ash (engine mood ember 0x5a5550) read as black ink specks under the new grade -> light grey ash
  scene.traverse(o => { const m = o.isPoints && o.material; if (m && m.isPointsMaterial && m.color.getHex() === 0x5a5550) { m.color.set(0xb4aca4); m.opacity = Math.min(m.opacity, .38); } }); if (f.userData && f.userData.fxL) return;
  try { applyLight(G.night ? 'pro' : 'ch1', { scene, renderer, grade: gradePass, G }); lastFog = scene.fog; } catch (e) { console.warn('fx mood', e); } }

// =====================================================================================================================
// 10. gfx2: QUALITY LADDER (auto-selected from measured fps), shadow LOD for units, building variety, irregular wall towers
// =====================================================================================================================
// The engine's composer is module-private: grab it when it renders (same module instance as the engine's import).
let COMP = null; try { const r0 = EffectComposer.prototype.render; EffectComposer.prototype.render = function (...a) { COMP = this; return r0.apply(this, a); }; } catch (e) { }
// levels: 0 = as configured by SET.q; 1 = 85% resolution; 2 = 72% + 512 shadow map + 8 unit shadows; 3 = 60%, no sun shadows; 4 = 50%, no bloom
const PF = { lvl: 0, acc: 0, n: 0, good: 0, ups: 0, lock: 0, base: 0, ms0: 1024, fps: 0, init: false, shadowN: 14, last: 0 };
// (applied from a timer, never in the middle of a frame: resizing disposes the render targets the composer is drawing into)
function pfApply() { setTimeout(pfDo, 0); }
function pfDo() { const L = PF.lvl, pr = Math.max(.5, PF.base * [1, .85, .72, .6, .5][L]);
  if (Math.abs(renderer.getPixelRatio() - pr) > .01) { renderer.setPixelRatio(pr); if (COMP) COMP.setPixelRatio(pr); }
  const sl = scene.children.find(o => o.isDirectionalLight);
  if (sl && renderer.shadowMap.enabled) { const want = L < 3; if (sl.castShadow !== want) sl.castShadow = want; const ms = L >= 2 ? 512 : PF.ms0; if (sl.shadow.mapSize.x !== ms) { sl.shadow.mapSize.set(ms, ms); if (sl.shadow.map) { sl.shadow.map.dispose(); sl.shadow.map = null; } } }
  if (COMP && COMP.passes[1] && COMP.passes[1].strength !== undefined) COMP.passes[1].enabled = L < 4;
  PF.shadowN = [14, 14, 8, 0, 0][L]; G.pf = PF; try { sessionStorage.qq_pf = String(L); } catch (e) { } }
function tickPerf() { const now = performance.now() / 1000, raw = now - PF.last; PF.last = now;
  if (!PF.init) { PF.init = true; PF.base = renderer.getPixelRatio(); const sl = scene.children.find(o => o.isDirectionalLight); if (sl) PF.ms0 = sl.shadow.mapSize.x; const q = /[?&]pf=(\d)/.exec(location.search);
    if (q) { PF.lvl = Math.min(4, +q[1]); PF.lock = 1; } else try { const v = +sessionStorage.qq_pf; if (v > 0 && v <= 4) PF.lvl = v; } catch (e) { } pfApply(); return; }
  if (PF.lock || G.paused || document.hidden || raw > .22 || raw <= 0) return; PF.acc += raw; PF.n++;
  if (PF.acc < 2.5) return; const fps = PF.fps = PF.n / PF.acc; PF.acc = PF.n = 0;
  if (fps < 27 && PF.lvl < 4) { PF.lvl += fps < 18 && PF.lvl < 3 ? 2 : 1; PF.good = 0; pfApply(); }
  else if (fps > 54 && PF.lvl > 0 && PF.ups < 2) { if (++PF.good >= 5) { PF.lvl--; PF.ups++; PF.good = 0; pfApply(); } } else PF.good = 0; }
// only the hero and the nearest units cast real shadows (the rest keep their contact blobs): the shadow pass re-skins every caster
let shT = 0, shN = 0; function tickShadowLOD(now) { if (now - shT < .6 || !G.ents || !G.player || !renderer.shadowMap.enabled) return; shT = now; const lim = Q() >= 2 && PF.lvl === 0 ? 40 : PF.shadowN, P = G.player, L = [], fresh = (++shN % 8) === 0;
  for (const e of G.ents) { if (e.gone || !e.o || !e.o.visible) continue; L.push([e === P ? -1 : (e.x - P.x) ** 2 + (e.z - P.z) ** 2, e]); } L.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < L.length; i++) { const d = L[i][0], e = L[i][1], on = i < lim && d < 900 && !(e.dead && (e.deadT || 0) > 1.5); if (e._fxSh === on && !fresh) continue; e._fxSh = on;
    e.o.traverse(o => { if (!o.isMesh || o.userData.fxOL) return; if (o.userData.fxCS === undefined) o.userData.fxCS = o.castShadow; if (o.userData.fxCS) o.castShadow = on; }); } }
// ---------- building variety: the engine places identical GLB clones (B_house / B_yurt / B_wall) on a grid ----------
// per-object tone variation in the shader (hash of the object's world origin; one shared material, no clones), small deterministic
// rotation / height / size jitter, chimney smoke on some houses and yurts with random phase, extra towers on long walls.
const hash2 = (x, z) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
function varyPatch(m) { if (!m || !m.isMeshStandardMaterial || m.userData.fxVar) return; m.userData.fxVar = 1; const prev = m.onBeforeCompile, pk = String(m.customProgramCacheKey()).slice(0, 48); if (prev === THREE.Material.prototype.onBeforeCompile) m.userData.fxVarPure = 1;
  m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r);
    sh.vertexShader = 'varying vec3 vFxVar;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n { mat4 fxM = modelMatrix;\n #ifdef USE_INSTANCING\n fxM = modelMatrix * instanceMatrix;\n #endif\n vec2 o = floor(fxM[3].xz * 4.); float h1 = fract(sin(dot(o, vec2(12.9898, 78.233))) * 43758.5453), h2 = fract(sin(dot(o, vec2(39.346, 11.135))) * 24634.6345); vFxVar = vec3(mix(.78, 1.14, h1)) * mix(vec3(1.07, 1., .88), vec3(.95, 1., 1.07), h2); }');
    sh.fragmentShader = 'varying vec3 vFxVar;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= vFxVar;'); };
  m.customProgramCacheKey = () => 'fxvar2|' + pk; m.needsUpdate = true; }
const PGEO = {}; function propKind(o) { if (!A.props) return null; let g0 = null; o.traverse(k => { if (!g0 && k.isMesh) g0 = k.geometry; }); if (!g0) return null;
  for (const n of ['B_house', 'B_yurt', 'B_wall', 'B_tower']) { const src = A.props[n]; if (!src) continue; if (!PGEO[n]) { PGEO[n] = new Set(); src.traverse(k => { if (k.isMesh) PGEO[n].add(k.geometry); }); } if (PGEO[n].has(g0)) return n; } return null; }
const _bx = new THREE.Box3();
function scanVary() { const walls = []; let S = null; const now = performance.now();
  if (CAMP.t && now > CAMP.t) { CAMP.t = 0; for (const k of ['yurt', 'house']) { const L = CAMP[k]; CAMP[k] = []; if (L.length >= 3 && !G.gdPaved && !world.children.some(o => o.userData && o.userData.pave)) try { campBack(L.filter(p => p.o.parent), k); } catch (e) { console.warn('fx camp', e); } } }
  for (const o of world.children) { if (o.userData.fxV) continue; o.userData.fxV = 1; if (o.userData.fx || !o.visible || o.isInstancedMesh || o.isLight || o.isSprite || o.isPoints) continue; const k = propKind(o); if (!k) continue;
    let burnt = false; o.traverse(m => { if (m.isMesh && m.material && m.material.color && m.material.color.getHex() === DARK) burnt = true; }); if (burnt) continue;
    o.traverse(m => { if (m.isMesh) varyPatch(m.material); }); const h = hash2(o.position.x, o.position.z), h2 = hash2(o.position.z + 7.3, o.position.x - 2.1);
    if (k === 'B_wall') { walls.push(o); continue; } if (k === 'B_tower') continue; let lum = 1; o.traverse(m => { if (m.isMesh && m.material.color && lum === 1) lum = m.material.color.r * .3 + m.material.color.g * .6 + m.material.color.b * .1; }); CAMP[k === 'B_house' ? 'house' : 'yurt'].push({ x: o.position.x, z: o.position.z, o, lum }); CAMP.t = now + 2500;
    if (k === 'B_house') { o.rotation.y += (h - .5) * .22; o.scale.y *= .84 + h2 * .4; o.scale.x *= .95 + h * .08; o.scale.z *= .95 + h2 * .08; } else o.scale.multiplyScalar(.88 + h * .26);
    if (h2 > (k === 'B_house' ? .5 : .62)) { S = S || fireSys(); if (S.ns < MAXF * S.SM * .55) { o.updateMatrixWorld(true); _bx.setFromObject(o); smokeAt(o.position.x + (h - .5) * (k === 'B_house' ? 2.2 : .2), _bx.max.y - (k === 'B_house' ? .1 : .5), o.position.z + (h2 - .75) * (k === 'B_house' ? 2 : .2), .42 + h * .3); } } }
  if (walls.length) try { wallTowers(walls); } catch (e) { console.warn('fx towers', e); } }
// ---------- settlement scale: a camp / village of a handful of real yurts or houses gets a field of cheap instanced ones behind it
// (one draw, ~130 tris each, no shadows cast) so it reads as a big encampment in the haze; placed outside the play area on dry ground ----------
const CAMP = { yurt: [], house: [], t: 0 };
function lowYurtG() { if (GEOS.lowYurt) return GEOS.lowYurt; const sg = 12, L = [colG(xf(new THREE.CylinderGeometry(2.6, 2.66, 1.7, sg, 1, true), 0, .85, 0), 0xb4a890, 0xd8cfbc), colG(xf(new THREE.CylinderGeometry(2.68, 2.68, .3, sg, 1, true), 0, 1.52, 0), 0x8a3a24),
  colG(xf(new THREE.ConeGeometry(2.78, 1.45, sg, 2, true), 0, 2.42, 0), 0xc6bca6, 0xe8e0d0), colG(xf(new THREE.CylinderGeometry(.5, .62, .16, 8), 0, 3.16, 0), 0x4a3424), colG(xf(new THREE.BoxGeometry(.95, 1.5, .14), 0, .76, 2.6), 0x7a2a16)]; return GEOS.lowYurt = merge(L); }
function lowHouseG() { if (GEOS.lowHouse) return GEOS.lowHouse; const L = [colG(xf(new THREE.BoxGeometry(6.4, 3.3, 5), 0, 1.65, 0), 0xb8a07c, 0xd8c4a0), colG(xf(new THREE.BoxGeometry(6.7, .42, 5.3), 0, 3.45, 0), 0xc4ae88), colG(xf(new THREE.BoxGeometry(5.9, .3, 4.5), 0, 3.52, 0), 0x8a7654),
  colG(xf(new THREE.BoxGeometry(1.1, 2.1, .12), .8, 1.05, 2.52), 0x4a3020), colG(xf(new THREE.BoxGeometry(.6, .6, .12), -1.6, 2.1, 2.52), 0x2a1c12)]; return GEOS.lowHouse = merge(L); }
function campBack(list, kind) { if (list.length < 3) return; let z0 = 1e9, z1 = -1e9, lum = 0; for (const p of list) { z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); lum += p.lum / list.length; } z0 -= 28; z1 += 28;
  const hfOK = G.groundH && (G.groundHT || 0) >= gdClr - 50, H = (x, z) => { try { return hfOK ? G.groundH(x, z) : 0; } catch (e) { return 0; } }, W = G.W || 11.5; let gx = 0; for (const o of world.children) if (o.isMesh && !o.isInstancedMesh && o.geometry && o.receiveShadow) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; if (bb.max.x - bb.min.x > 60) gx = Math.max(gx, Math.min(bb.max.x, -bb.min.x) + Math.abs(o.position.x) * 0); }
  const xr = Math.max(4, Math.min(hfOK ? 70 : 37.5, (gx || 40) - 3) - (W + 15)); // never beyond the real ground mesh
  const n = Math.min(Q() === 0 ? 50 : 140, Math.round((z1 - z0) * (hfOK ? 1.3 : .5))), P = [], dk = lum < .3 ? .3 : 1, m = new THREE.InstancedMesh(kind === 'yurt' ? lowYurtG() : lowHouseG(), plainV(), n); m.count = 0;
  for (let i = 0; i < n * 5 && m.count < n; i++) { const a = hash2(i * 1.37, z0), b = hash2(z1, i * 2.11), x = (i % 2 ? 1 : -1) * (W + 15 + Math.pow(a, 1.4) * xr), z = z0 + b * (z1 - z0), y = H(x, z);
    if (y < -.1 || y > 7 || Math.abs(H(x + 2.5, z) - H(x - 2.5, z)) > 1.3 || Math.abs(H(x, z + 2.5) - H(x, z - 2.5)) > 1.3) continue;
    if (P.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < 52) || list.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < 70) || G.colC.some(c => (c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + 3.6) ** 2) || G.fires.some(f => (f.x - x) ** 2 + (f.z - z) ** 2 < 30)) continue; P.push({ x, z });
    const sc = .92 + hash2(x, z) * .45; _o.position.set(x, y - .06, z); _o.rotation.set(0, hash2(z, x) * 6.283, 0); _o.scale.set(sc, sc * (kind === 'house' ? .8 + hash2(x + 1, z) * .7 : 1), sc); _o.updateMatrix(); m.setMatrixAt(m.count, _o.matrix);
    const v = (.8 + hash2(x * 3, z * 3) * .28) * dk; m.setColorAt(m.count, _c.setRGB(v, v * (.95 + hash2(z, x * 2) * .06), v * (.86 + hash2(x, z * 5) * .12))); m.count++; }
  if (!m.count) return; G.fxCamp = (G.fxCamp || 0) + m.count; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; m.userData.fx = 1; m.userData.fxV = 1; m.userData.fxB = 1; world.add(m);
  const S = fireSys(); let k = 0; for (const p of P) { if (S.ns >= MAXF * S.SM * .7 || k++ > 12) break; if (hash2(p.x * 2, p.z) > .7) smokeAt(p.x, H(p.x, p.z) + (kind === 'yurt' ? 3.2 : 3.6), p.z, .5); } }
// towers at irregular joints of long wall runs (the engine only puts one at each end of a run longer than 18 m)
function wallTowers(walls) { const src = A.props.B_tower; if (!src) return; const runs = {};
  for (const w of walls) { const hz = Math.abs(Math.sin(w.rotation.y)) < .5, key = (hz ? 'h' : 'v') + Math.round((hz ? w.position.z : w.position.x) * 2); (runs[key] || (runs[key] = [])).push({ w, hz, t: hz ? w.position.x : w.position.z, len: w.scale.x * 6, h: w.scale.y * 6 }); }
  for (const key in runs) { const R = runs[key].sort((a, b) => a.t - b.t); if (R.length < 3) continue; let next = 2 + Math.floor(hash2(R[0].t, R.length) * 3);
    for (let i = 0; i < R.length - 1; i++) { const a = R[i], b = R[i + 1]; if (b.t - a.t > (a.len + b.len) * .5 * 1.15) { next = i + 2; continue; } if (i + 1 < next) continue; const t = (a.t + a.len / 2 + b.t - b.len / 2) / 2, hh = hash2(t, a.h), s = a.h * 1.35 / 9.6 * (.74 + hh * .36);
      const o = src.clone(true), off = (hash2(t + 3.1, 1.7) - .5) * .8; o.position.set(a.hz ? t : a.w.position.x + off, 0, a.hz ? a.w.position.z + off : t); o.scale.set(s * (.9 + hh * .25), s, s * (.9 + hh * .25)); o.rotation.y = Math.floor(hh * 4) * Math.PI / 2; o.userData.fxV = 1; o.userData.fxTower = 1;
      o.traverse(m => { if (m.isMesh) { varyPatch(m.material); m.castShadow = Q() > 0; m.receiveShadow = true; } }); world.add(o); next = i + 4 + Math.floor(hash2(t, 9.3) * 4); } } }
// gfx2: intro fly-over (map.js #fly.on): no glowing rings on the ground (the additive zone rings / objective rings / hero ring bloomed to
// white circles from above) - hidden while the fly-over runs, restored when it ends
let cineOn = false; function tickCine() { const fl = document.getElementById('fly'), on = !!(fl && fl.classList.contains('on')); if (!on && !cineOn) return; const p = G.player;
  if (on) { for (const o of world.children) if (o.isGroup && o.visible && o.children.length === 2 && o.children[0].geometry && o.children[0].geometry.type === 'RingGeometry') o.visible = false;
    for (const m of G.markers || []) m.g.visible = false; if (p && p.mark && p.mark.g) p.mark.g.visible = false; if (rings) rings.visible = false; }
  else { for (const m of G.markers || []) m.g.visible = true; if (p && p.mark && p.mark.g) p.mark.g.visible = true; if (rings) rings.visible = true; } cineOn = on; }
// =====================================================================================================================
// 11. gfx2: STATIC BATCHING. The engine / missions place hundreds of identical single meshes (debris beams, GLB prop clones, crates...)
// = one draw call each, twice with shadows. Meshes under `world` that share geometry + material are drawn as InstancedMeshes
// (per 70 m chunk of the level so frustum culling still works). The originals stay in the scene graph with `visible` turned into an
// accessor (always false, remembers what the game sets), so game logic, raycasts and collisions are untouched; every frame the batch
// follows each source: moved -> instance matrix updated, hidden / removed / material or geometry swapped -> instance removed and the
// original drawn normally again. ?nobatch=1 turns it off.
// =====================================================================================================================
const BT = { src: [], off: /[?&]nobatch=1/.test(location.search), n: 0 }, _zero = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);
const pureMat = m => m && !Array.isArray(m) && !m.transparent && (m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile || m.userData.fxVarPure);
// materials that are per-object clones with identical settings (GLB loaders clone per placement) batch together: fingerprint, not uuid
const matKey = m => m.userData.fxMK || (m.userData.fxMK = [m.type, m.map ? m.map.uuid : 0, m.normalMap ? m.normalMap.uuid : 0, m.roughnessMap ? m.roughnessMap.uuid : 0, m.metalnessMap ? m.metalnessMap.uuid : 0, m.emissiveMap ? m.emissiveMap.uuid : 0, m.aoMap ? m.aoMap.uuid : 0, m.alphaMap ? m.alphaMap.uuid : 0, m.color ? m.color.getHex() : 0, m.emissive ? m.emissive.getHex() : 0, m.emissiveIntensity, m.roughness, m.metalness, m.side, m.vertexColors, m.alphaTest, m.flatShading, m.envMapIntensity, m.opacity, m.userData.fxVar || 0, m.userData.fxChar || 0, String(m.customProgramCacheKey()).length].join(','));
function batchScan() { if (BT.off) return; const groups = new Map(), OB = THREE.Object3D.prototype;
  world.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.fxBt || o.children.length || !o.frustumCulled || o.morphTargetInfluences || o.customDepthMaterial || o.onBeforeRender !== OB.onBeforeRender || o.onAfterRender !== OB.onAfterRender) return;
    const g = o.geometry, m = o.material; if (!g || !g.attributes.position || !pureMat(m) || (g.index ? g.index.count : g.attributes.position.count) > 9000) return;
    let vis = o.visible; for (let p = o.parent; p && vis; p = p.parent) vis = p.visible; if (!vis) return; o.updateWorldMatrix(true, false); if (o.matrixWorld.determinant() <= 0) { o.userData.fxBt = -1; return; }
    const key = g.uuid + '|' + matKey(m) + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + o.renderOrder + '|' + Math.floor(o.matrixWorld.elements[14] / 70); let L = groups.get(key); if (!L) groups.set(key, L = []); L.push(o); });
  for (const L of groups.values()) { if (L.length < 3) continue; const o0 = L[0], im = new THREE.InstancedMesh(o0.geometry, o0.material, L.length); im.castShadow = o0.castShadow; im.receiveShadow = o0.receiveShadow; im.renderOrder = o0.renderOrder; im.matrixAutoUpdate = false;
    Object.assign(im.userData, { fx: 1, fxV: 1, fxB: 1, fxS: 1, fxBt: 2 });
    L.forEach((o, i) => { im.setMatrixAt(i, o.matrixWorld); o.userData.fxBt = 1; const st = { o, im, i, mat: o.material, col: o.material.color ? o.material.color.getHex() : 0, em: o.material.emissive ? o.material.emissive.getHex() : 0, want: true, vis: true, m: o.matrixWorld.elements.slice() }; Object.defineProperty(o, 'visible', { configurable: true, enumerable: true, get() { return false; }, set(v) { st.want = !!v; } }); BT.src.push(st); });
    im.computeBoundingSphere(); world.add(im); BT.n++; } }
function batchFree(st, k) { const o = st.o; delete o.visible; o.visible = st.want; o.userData.fxBt = -1; BT.src.splice(k, 1); }
function tickBatch() { const S = BT.src; if (!S.length) return; let dirty = null;
  for (let k = S.length - 1; k >= 0; k--) { const st = S[k], o = st.o, im = st.im; if (!im.parent) { batchFree(st, k); continue; }
    let vis = st.want, att = false; for (let p = o.parent; p; p = p.parent) { if (!p.visible) vis = false; if (p === scene) att = true; }
    if (!att || o.material !== st.mat || o.geometry !== im.geometry || (st.mat.color && st.mat.color.getHex() !== st.col) || (st.mat.emissive && st.mat.emissive.getHex() !== st.em)) { im.setMatrixAt(st.i, _zero); im.instanceMatrix.needsUpdate = true; if (att && st.mat === im.material && o.material === st.mat && o.geometry === im.geometry) im.removeFromParent(); /* the batch's own material was edited: drop the whole batch */ batchFree(st, k); continue; }
    const e = o.matrixWorld.elements, m = st.m; let ch = vis !== st.vis; if (!ch) for (let i = 0; i < 16; i++) if (e[i] !== m[i]) { ch = true; break; }
    if (ch) { st.vis = vis; for (let i = 0; i < 16; i++) m[i] = e[i]; im.setMatrixAt(st.i, vis ? o.matrixWorld : _zero); im.instanceMatrix.needsUpdate = true; (dirty || (dirty = new Set())).add(im); } }
  if (dirty) for (const im of dirty) im.computeBoundingSphere(); }
// ---------- per-frame driver (scene.onBeforeRender: runs after the engine's update, before the draw) ----------
let lastT = 0, inst = false, err = 0;
function tick() { const now = performance.now() / 1000, dt = Math.min(.05, now - lastT); if (dt < .002) return; lastT = now; U.t.value = now % 3600;
  try { tickPerf(); tickShadowLOD(now); tickCine(); tickBatch(); } catch (e) { if (err++ < 3) console.warn('fx perf', e); }
  try { const v = renderer.getDrawingBufferSize(_v2); U.px.value = v.y; U.glow.value = THREE.MathUtils.clamp(.62 - (sunL ? sunL.intensity : 1) * .13, .04, .55) * ((G.fireI || 60) > 30 ? 1 : .5); tickUnits(now); tickRings(); tickHorses(dt); tickConvoys(dt); tickHeroLight(); tickHud(now); tickGD(); tickMood(); if (G.player) { outlineHero(G.player); renderer.getDrawingBufferSize(UO.res.value); UO.w.value = Math.max(1.4, UO.res.value.y / 300); } if (now - scanT > 1.5) { scanT = now; scanShapes(); scanBoxes(); if (scanBurnt()) scanT = now - 1.3; else { scanVary(); if (now - lvlT > 3) batchScan(); } scanEnv(); } } catch (e) { if (err++ < 3) console.warn('fx tick', e); } }
const _v2 = new THREE.Vector2();
// the engine's hero point light (22 cd, 9 m) is tuned for night; in daylight it doubles the sun on the ground around the hero and the
// bloom turns the lane white — keep it as a soft fill by day (no engine edit: found once in the scene graph)
let heroL = null, sunL = null; function tickHeroLight() { if (!heroL) { heroL = scene.children.find(o => o.isPointLight && o.distance === 9) || 0; if (heroL) heroL.userData.i0 = heroL.intensity; } if (!sunL) sunL = scene.children.find(o => o.isDirectionalLight) || null; if (heroL) heroL.intensity = heroL.userData.i0 * THREE.MathUtils.clamp(1.3 - (sunL ? sunL.intensity : 0) / 3, .1, 1); }
function boot() { try { if (scene && !inst) { inst = true; const prev = scene.onBeforeRender; scene.onBeforeRender = function (...a) { if (prev) prev.apply(this, a); tick(); }; return; } } catch (e) { } requestAnimationFrame(boot); }
requestAnimationFrame(boot);
