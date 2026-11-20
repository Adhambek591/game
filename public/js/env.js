// Real PBR environment from Poly Haven (CC0): HDRI lighting, PBR ground/wall/wood textures, scanned props.
import * as THREE from 'three';
import { RGBELoader } from '../assets/vendor/jsm/loaders/RGBELoader.js?v=1795168917';
import { GLTFLoader } from '../assets/vendor/jsm/loaders/GLTFLoader.js?v=1795168917';
export const ENV = { pbr: {}, mod: {}, day: null, night: null, ok: false };
const B = './assets/env/';
const rnd = (a, b) => a + Math.random() * (b - a);
const TEX = ['brown_mud_dry', 'burned_ground_01', 'clay_block_wall', 'brown_planks_09', 'curly_teddy_natural', 'aerial_ground_rock'];
const MOD = ['boulder_01', 'namaqualand_stones_01', 'dead_tree_trunk', 'dry_branches_medium_01', 'grass_medium_01', 'Barrel_01'];
export async function loadEnv(renderer, onp = () => {}) {
  const pm = new THREE.PMREMGenerator(renderer); pm.compileEquirectangularShader();
  const rl = new RGBELoader(), tl = new THREE.TextureLoader(), gl = new GLTFLoader();
  const hdr = async (f) => { const t = await rl.loadAsync(B + 'hdr/' + f); const e = pm.fromEquirectangular(t).texture; t.dispose(); return e; };
  const jobs = [];
  jobs.push(hdr('overcast_soil_puresky_1k.hdr').then(e => ENV.day = e));
  jobs.push(hdr('qwantani_night_puresky_1k.hdr').then(e => ENV.night = e));
  for (const n of TEX) jobs.push(Promise.all(['diff', 'nor', 'rough'].map(k => tl.loadAsync(`${B}tex/${n}_${k}.jpg`))).then(([d, nr, r]) => {
    d.colorSpace = THREE.SRGBColorSpace; for (const t of [d, nr, r]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
    ENV.pbr[n] = { map: d, normalMap: nr, roughnessMap: r };
  }));
  for (const n of MOD) jobs.push(gl.loadAsync(`${B}mod/${n}/${n}.glb`).then(g => {
    const parts = []; g.scene.updateMatrixWorld(true); g.scene.traverse(o => { if (o.isMesh) { const mw = o.matrixWorld.clone(); const v = new THREE.Vector3().setFromMatrixPosition(mw); mw.setPosition(0, v.y, 0); parts.push({ geometry: o.geometry, material: o.material, mw }); } });
    ENV.mod[n] = parts;
  }));
  jobs.push(tl.loadAsync(B + 'tex/trail_det.jpg').then(t => { t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 8; ENV.trail = t; }));
  let done = 0; const all = jobs.map(j => j.catch(e => console.warn('env', e)).then(() => onp(++done / jobs.length)));
  await Promise.all(all); pm.dispose(); ENV.ok = !!ENV.day;
}
const mc = {};
export function pbrMat(name, rx, ry, o = {}) {
  const s = ENV.pbr[name]; if (!s) return null;
  const key = name + rx.toFixed(1) + ry.toFixed(1) + JSON.stringify(o); if (mc[key]) return mc[key];
  const cl = t => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c; };
  return mc[key] = new THREE.MeshStandardMaterial({ map: cl(s.map), normalMap: cl(s.normalMap), roughnessMap: cl(s.roughnessMap), roughness: 1, normalScale: new THREE.Vector2(1.4, 1.4), ...o });
}
export function place(world, name, x, z, s, idx) {
  const parts = ENV.mod[name]; if (!parts || !parts.length) return null;
  const src = parts[idx == null ? Math.floor(Math.random() * parts.length) : idx % parts.length];
  const h = new THREE.Group(); const m = new THREE.Mesh(src.geometry, src.material); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; m.matrix.copy(src.mw); h.add(m);
  h.position.set(x, 0, z); h.rotation.y = rnd(0, 6.28); h.scale.setScalar(s); world.add(h); return h;
}
// radial alpha for ground decals
let decalAlpha = null;
function alphaTex() { if (decalAlpha) return decalAlpha; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 8, 64, 64, 64); r.addColorStop(0, '#fff'); r.addColorStop(.55, '#bbb'); r.addColorStop(1, '#000'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return decalAlpha = new THREE.CanvasTexture(c); }
export function groundMat(L, night) { const m = pbrMat(night ? 'aerial_ground_rock' : 'brown_mud_dry', 80 / 7, L / 7, { color: night ? 0xc8b49a : 0xe2cfa4 }); if (m && !m._road) roadify(m, night ? { dark: .8, desat: .8, tint: [.36, .32, .28] } : {}); return m; }
// ---------- lane readability + caravan trail, added to a ground material's shader ----------
// The play lane is darkened / desaturated so units stand out; a meandering packed-earth trail (wheel ruts, hoof and foot prints from
// assets/env/tex/trail_det.jpg, a mean-0.5 detail map) runs along it. o: { amp, hw, k, dark, desat, lane, tint:[r,g,b], off }
export const roadX = (z, amp = 1.6) => Math.sin(z * .045) * amp + Math.sin(z * .11 + 1.3) * amp * .35;
export function roadify(m, o = {}) {
  const u = m._road = { uRoad: { value: new THREE.Vector4(o.amp ?? 1.6, o.hw ?? 2.5, ENV.trail ? (o.k ?? 1) : 0, o.off ?? 0) }, uLane: { value: new THREE.Vector4(o.lane ?? 12.5, o.dark ?? .56, o.desat ?? .48, o.flat ?? .5) }, uRoadT: { value: new THREE.Vector3(...(o.tint || [.48, .39, .28])) }, tRoad: { value: ENV.trail || null } };
  const prev = m.onBeforeCompile, pk = prev ? String(m.customProgramCacheKey()).slice(0, 60) : '';
  m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec2 vRoadP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRoadP = (modelMatrix * vec4(transformed, 1.)).xz;');
    sh.fragmentShader = 'varying vec2 vRoadP; uniform vec4 uRoad; uniform vec4 uLane; uniform vec3 uRoadT; uniform sampler2D tRoad; float fxLane = 0.; float fxRoad = 0.;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    { fxLane = 1. - smoothstep(uLane.x, uLane.x + 6., abs(vRoadP.x)); float l0 = dot(diffuseColor.rgb, vec3(.299, .587, .114));
      vec3 lc = mix(vec3(l0), diffuseColor.rgb, uLane.z); lc *= mix(1., .4 / max(l0, .1), uLane.w) * uLane.y; diffuseColor.rgb = mix(diffuseColor.rgb, lc, fxLane);
      if (uRoad.z > 0.) { float cx = sin(vRoadP.y * .045) * uRoad.x + sin(vRoadP.y * .11 + 1.3) * uRoad.x * .35 + uRoad.w; float dx = vRoadP.x - cx;
        vec3 rt = texture2D(tRoad, vec2(dx / (uRoad.y * 2.9) + .5, vRoadP.y / 11.)).rgb; float wob = texture2D(tRoad, vec2(.08, vRoadP.y / 47.)).g + texture2D(tRoad, vec2(.9, vRoadP.y / 23.)).g - 1.;
        float hw = uRoad.y * (1. + wob * .5); fxRoad = (1. - smoothstep(hw * .55, hw * 1.3, abs(dx))) * uRoad.z;
        float l1 = dot(diffuseColor.rgb, vec3(.299, .587, .114)); vec3 rc = mix(diffuseColor.rgb, uRoadT * (.75 + l1 * .6), .72) * (.2 + rt * 1.3) * .7; diffuseColor.rgb = mix(diffuseColor.rgb, rc, fxRoad);
        float mv = texture2D(tRoad, vRoadP * .021).g * .6 + texture2D(tRoad, vRoadP.yx * .067 + .3).r * .4; diffuseColor.rgb *= .78 + mv * .44; } }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 1., clamp(fxLane * .85 + fxRoad, 0., 1.));')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = normalize(mix(normal, normalize(vNormal) * (gl_FrontFacing ? 1. : -1.), clamp(fxLane * uLane.w * .6 + fxRoad * .3, 0., .6)));'); };
  m.customProgramCacheKey = () => 'road|' + pk + (ENV.trail ? 1 : 0); m.needsUpdate = true; return m;
}
export function dressGround(world, zNear, zFar, W, night) {
  if (!ENV.ok) return;
  // burned patches (decals)
  const bm = pbrMat('burned_ground_01', 1.5, 1.5, { transparent: true, alphaMap: alphaTex(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  if (bm) for (let z = zNear - 6; z > zFar; z -= rnd(7, 13)) { const s = rnd(5, 10); const d = new THREE.Mesh(new THREE.PlaneGeometry(s, s), bm); d.rotation.x = -Math.PI / 2; d.rotation.z = rnd(0, 6); d.position.set(rnd(-W - 6, W + 6), .02, z); d.receiveShadow = true; world.add(d); }
  // props outside the play lane + sparse grass/pebbles inside it — collected and drawn as InstancedMeshes (one draw per model part)
  const list = [], add = (name, x, z, sc) => { const parts = ENV.mod[name]; if (parts && parts.length) list.push({ name, x, z, s: sc, ry: rnd(0, 6.28), idx: Math.floor(Math.random() * parts.length) }); };
  for (let z = zNear; z > zFar; z -= rnd(4, 7)) for (const side of [-1, 1]) {
    const x = side * rnd(W + 3, 36), k = Math.random();
    if (k < .18) add('boulder_01', x, z, rnd(1.2, 2.6));
    else if (k < .45) add('namaqualand_stones_01', x, z, rnd(2.5, 4.5));
    else if (k < .55) add('dead_tree_trunk', x, z, rnd(1, 1.6));
    else if (k < .7) add('dry_branches_medium_01', x, z, rnd(2, 3));
    else add('grass_medium_01', x, z, rnd(5, 8));
  }
  let Q = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 1 : 2; try { const v = JSON.parse(localStorage.qq_set || '{}').q; if (v !== undefined) Q = v; } catch (e) { }
  const per = [1, 2, 3][Q] || 2;
  for (let z = zNear; z > zFar; z -= rnd(2.4, 4)) for (let i = 0; i < per; i++) { const x = rnd(-W - 1, W + 1); const k = Math.random(); if (k < .62) add('grass_medium_01', x, z + rnd(-1, 1), rnd(3.5, 6)); else if (k < .9) add('namaqualand_stones_01', x, z, rnd(1.5, 2.8)); else add('dry_branches_medium_01', x, z, rnd(1.2, 2)); }
  for (let z = zNear; z > zFar; z -= rnd(2.5, 4)) for (const side of [-1, 1]) { if (Math.random() < .5 + .2 * Q) add('grass_medium_01', side * rnd(W + 1, W + 8), z, rnd(5, 9)); }
  buildDress(world, list, Q);
}
const _o = new THREE.Object3D(), _m = new THREE.Matrix4();
function buildDress(world, list, Q) {
  const groups = {}; for (const it of list) (groups[it.name + '|' + it.idx] || (groups[it.name + '|' + it.idx] = [])).push(it);
  for (const k in groups) { const items = groups[k], [name, idx] = k.split('|'), part = ENV.mod[name][+idx];
    const m = new THREE.InstancedMesh(part.geometry, part.material, items.length); m.castShadow = Q > 0; m.receiveShadow = true; m.userData.dress = { items, mw: part.mw }; setDress(m, null); world.add(m); }
}
function setDress(m, hf, wet = -1e9) { const { items, mw } = m.userData.dress;
  items.forEach((it, i) => { const y = hf ? hf(it.x, it.z) : 0; _o.position.set(it.x, y - (hf ? .05 : 0), it.z); _o.rotation.set(0, it.ry, 0); _o.scale.setScalar(y < wet - .08 ? 0 : it.s); _o.updateMatrix(); _m.multiplyMatrices(_o.matrix, mw); m.setMatrixAt(i, _m); });
  m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
// re-seat the instanced ground props on a relief (used by scenery.js after it rebuilds the terrain); props under water are hidden
export function redress(world, hf, wet) { for (const o of world.children) if (o.userData && o.userData.dress) setDress(o, hf, wet); }
export function barrel(world, x, z) { return place(world, 'Barrel_01', x, z, rnd(1, 1.15), 0); }

export async function loadGLB(url) { const g = await new GLTFLoader().loadAsync(url); return g.scene; }

// ---------- per-chapter lighting presets (golden-hour "legion poster" look; ch7 cold storm) ----------
// sun: [color, intensity], dir: towards the sun (low, mostly ahead of the camera = warm backlight/rim), hemi: [sky, ground, intensity],
// fog: [color, near, far], grade: post-grade uniforms (sat, warm, con, shadow tint, highlight tint), sky: painted dome colours.
const GOLD = { shc: [0, .1, .34], hic: [1, .6, .18] };
export const LIGHTS = {
  ch2: { sun: [0xffc58a, 3.6], dir: [.35, .5, -.8], hemi: [0xfff0d8, 0x7a5634, 1.3], fog: [0xe9c79a, 50, 135], exp: .86, sat: 1.38, warm: .045, con: .3, ...GOLD, dust: 0xffe0b0, sky: { top: 0x5a8ac0, hor: 0xf3d2a0, cloud: 0xfff0dc, sun: 0xffd9a0 } },
  ch3: { sun: [0xffb672, 3.9], dir: [-.5, .46, -.74], hemi: [0xffe2b8, 0x4a4628, 1.4], fog: [0xdcb78a, 50, 135], exp: .9, sat: 1.42, warm: .05, con: .4, ...GOLD, dust: 0xffd8a0, sky: { top: 0x4f7fb8, hor: 0xf0c892, cloud: 0xffe8cc, sun: 0xffc880 } },
  ch4: { sun: [0xffb066, 3.9], dir: [-.55, .45, -.7], hemi: [0xffe0c0, 0x3a4a50, 1.4], fog: [0xd2b89c, 52, 140], exp: .9, sat: 1.42, warm: .045, con: .4, ...GOLD, dust: 0xffe0c0, sky: { top: 0x3f78b8, hor: 0xf2c89a, cloud: 0xffead2, sun: 0xffc27a } },
  ch5: { sun: [0xff9a55, 3.9], dir: [.65, .42, -.62], hemi: [0xffb088, 0x3a2a2a, 1.2], fog: [0xc8724c, 38, 115], exp: .95, sat: 1.4, warm: .06, con: .36, ...GOLD, dust: 0xffb070, sky: { top: 0x3a4a80, hor: 0xffa060, cloud: 0xffc8a0, sun: 0xffa050 } },
  ch6: { sun: [0xffb870, 3.9], dir: [.45, .5, -.75], hemi: [0xffe6c4, 0x5a4028, 1.4], fog: [0xe0b282, 50, 135], exp: .9, sat: 1.4, warm: .05, con: .32, ...GOLD, dust: 0xffdcaa, sky: { top: 0x4a7ab8, hor: 0xf4cc98, cloud: 0xffeedd, sun: 0xffcc88 } },
  ch7: { sun: [0xc8d6ec, 3.4], dir: [-.25, .62, -.74], hemi: [0x9aa8bc, 0x2a2a2c, 1.5], fog: [0x5e6876, 34, 112], exp: 1.05, sat: 1.15, warm: -.03, con: .42, shc: [0, .06, .22], hic: [.22, .28, .4], dust: 0, sky: { top: 0x2a3240, hor: 0x6a7482, cloud: 0x8a929e, sun: 0xb8c8e0, storm: 1 } },
};
const GRADE_FS = `uniform sampler2D tDiffuse; uniform vec2 res; uniform float sat, warm, tilt, con; uniform vec3 shc, hic; varying vec2 vUv;
  void main(){ float d = clamp((abs(vUv.y - .48) - .2) * 2.6, 0., 1.) * tilt; vec3 c = vec3(0.); float w = 0.;
    if (d < .001) { c = texture2D(tDiffuse, vUv).rgb; w = 1.; } else for (int i = -4; i <= 4; i++) for (int j = -1; j <= 1; j++) { vec2 o = vec2(float(j) * 1.6, float(i)) * d * 2.2 / res; float k = 1. - abs(float(i)) / 5.; c += texture2D(tDiffuse, vUv + o).rgb * k; w += k; }
    c /= w; float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, sat); c += vec3(warm, warm * .45, -warm * .6) * (1. - l * .5);
    c += shc * (1. - smoothstep(0., .5, l)) * .11 + hic * smoothstep(.5, 1., l) * .09;
    c = (c - .5) * 1.08 + .51; c = clamp(c, 0., 1.); c = mix(c, c * c * (3. - 2. * c), con);
    vec2 q = vUv - .5; c *= 1. - dot(q, q) * .34; gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }`;
// applies a preset to the live scene (lights found in scene.children; the engine's grade pass gets extra uniforms, no engine edit)
export function applyLight(key, { scene, renderer, grade, G }) {
  const L = LIGHTS[key]; if (!L) return null;
  scene.background = new THREE.Color(L.fog[0]); scene.fog = new THREE.Fog(L.fog[0], L.fog[1], L.fog[2]);
  for (const o of scene.children) { if (o.isHemisphereLight) { o.color.set(L.hemi[0]); o.groundColor.set(L.hemi[1]); o.intensity = L.hemi[2] * (ENV.ok ? .5 : 1); } else if (o.isDirectionalLight) { o.color.set(L.sun[0]); o.intensity = L.sun[1]; } }
  G.sunDir = new THREE.Vector3(...L.dir).normalize(); renderer.toneMappingExposure = L.exp; if (ENV.ok) { scene.environment = ENV.day; if ('environmentIntensity' in scene) scene.environmentIntensity = L.sky && L.sky.storm ? .7 : 1; }
  if (grade && grade.uniforms) { const u = grade.uniforms; if (!u.con) { u.con = { value: 0 }; u.shc = { value: new THREE.Vector3() }; u.hic = { value: new THREE.Vector3() }; grade.material.fragmentShader = GRADE_FS; grade.material.needsUpdate = true; }
    u.sat.value = L.sat; u.warm.value = L.warm; u.con.value = L.con; u.shc.value.set(...L.shc); u.hic.value.set(...L.hic); }
  return L;
}
