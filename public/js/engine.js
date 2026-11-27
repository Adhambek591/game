import * as THREE from 'three';
import { Rig, TX } from './rig.js?v=1795777742';
import { EffectComposer } from '../assets/vendor/jsm/postprocessing/EffectComposer.js?v=1795777742';
import { RenderPass } from '../assets/vendor/jsm/postprocessing/RenderPass.js?v=1795777742';
import { UnrealBloomPass } from '../assets/vendor/jsm/postprocessing/UnrealBloomPass.js?v=1795777742';
import { ShaderPass } from '../assets/vendor/jsm/postprocessing/ShaderPass.js?v=1795777742';
import { OutputPass } from '../assets/vendor/jsm/postprocessing/OutputPass.js?v=1795777742';
import { t } from './i18n.js?v=1795777742';
import { Sfx, initAudio } from './audio.js?v=1795777742';
import { ENV, loadEnv, pbrMat, groundMat, dressGround, loadGLB, place } from './env.js?v=1795777742';
import * as FX from './fx.js?v=1795777742';
import { SkinRig, ANIM, RIBROOT } from './skinrig.js?v=1795777742';
import { GlbRig, PROPS } from './glbrig.js?v=1795777742';
import { makeHorse, horseBase } from './horse.js?v=1795777742';
export { THREE };
export const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const G = { ents: [], player: null, paused: true, time: 0, colC: [], colB: [], limitZ: -1e9, W: 11.5, proj: [], tele: [], rains: [], picks: [], fires: [], markers: [], shake: 0, waits: [], untils: [], boss: null, stats: { deaths: 0 }, sk: {}, ulti: 0, noDeath: false, cam: { x: 0, z: 0 }, hero: 'gulayim' };
window.__G = G;

// ---------- Renderer ----------
const canvas = $('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
export const SET = Object.assign({ q: mobile ? 1 : 2, diff: 1, vib: 1, snd: 1, mus: 1 }, (() => { try { return JSON.parse(localStorage.qq_set || '{}'); } catch (e) { return {}; } })());
export function saveSet() { try { localStorage.qq_set = JSON.stringify(SET); } catch (e) { } }
export function vib(ms) { if (SET.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }
renderer.setPixelRatio(SET.q === 0 ? Math.min(window.devicePixelRatio || 1, .9) : Math.min(window.devicePixelRatio || 1, SET.q === 1 ? 1.25 : 1.75));
renderer.shadowMap.enabled = SET.q > 0; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 240);
export const world = new THREE.Group(), actors = new THREE.Group(), fxg = new THREE.Group();
scene.add(world, actors, fxg, RIBROOT);
const hemi = new THREE.HemisphereLight(0x8899cc, 0x221a12, 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2); sun.castShadow = true;
sun.shadow.mapSize.set(SET.q > 1 ? 2048 : 1024, SET.q > 1 ? 2048 : 1024);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 30, bottom: -22, near: 1, far: 90 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const fireLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff7a2a, 0, 22, 1.8); l.position.set(0, -50, 0); scene.add(l); return l; });
const heroLight = new THREE.PointLight(0xffd9a8, 22, 9, 1.4); scene.add(heroLight);
let portrait = false;
let composer = null; export let gradePass = null; if (SET.q > 0) try { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(640, 360), .5, .7, .8)); composer.addPass(new OutputPass()); gradePass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1280, 720) }, sat: { value: 1.12 }, warm: { value: .035 }, tilt: { value: SET.q > 1 ? .4 : 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float sat, warm, tilt; varying vec2 vUv;
  void main(){ float d = clamp((abs(vUv.y - .48) - .2) * 2.6, 0., 1.) * tilt; vec3 c = vec3(0.); float w = 0.;
    if (d < .001) { c = texture2D(tDiffuse, vUv).rgb; w = 1.; } else for (int i = -4; i <= 4; i++) for (int j = -1; j <= 1; j++) { vec2 o = vec2(float(j) * 1.6, float(i)) * d * 2.2 / res; float k = 1. - abs(float(i)) / 5.; c += texture2D(tDiffuse, vUv + o).rgb * k; w += k; }
    c /= w; float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, sat); c += vec3(warm, warm * .45, -warm * .6) * (1. - l * .5);
    c = (c - .5) * 1.08 + .51; vec2 q = vUv - .5; c *= 1. - dot(q, q) * .28; gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }` }); composer.addPass(gradePass); } catch (e) { composer = null; }
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); if (composer) composer.setSize(w, h); if (gradePass) gradePass.uniforms.res.value.set(w, h); camera.aspect = w / h; portrait = h > w; camera.fov = portrait ? 44 : 34; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize();
export function setMood(m) {
  scene.background = new THREE.Color(m.bg); scene.fog = new THREE.Fog(m.bg, m.fog[0], m.fog[1]);
  hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2];
  sun.color.set(m.sun[0]); sun.intensity = m.sun[1]; G.sunDir = new THREE.Vector3(...m.sunDir).normalize();
  renderer.toneMappingExposure = m.exp || 1.1; G.night = !m.ash; if (ENV.ok) { scene.environment = (m.ash || m.dawn) ? ENV.day : ENV.night; hemi.intensity = m.hemi[2] * (m.ash ? .45 : .6); } G.fireI = m.fireI || 60; G.ember = m.ember;
  emberMat.color.set(m.ember || 0xffa040); emberMat.opacity = m.emberA || 0.9; emberMat.blending = m.ash ? THREE.NormalBlending : THREE.AdditiveBlending;
}

// ---------- Canvas textures ----------
function canvasTex(sz, fn) { const c = document.createElement('canvas'); c.width = c.height = sz; fn(c.getContext('2d'), sz); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; }
const glowTex = canvasTex(128, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
const flameTex = canvasTex(128, (g, s) => { const r = g.createRadialGradient(s / 2, s * .68, 2, s / 2, s * .55, s * .48); r.addColorStop(0, 'rgba(255,250,210,1)'); r.addColorStop(.3, 'rgba(255,170,50,.9)'); r.addColorStop(.7, 'rgba(220,60,10,.4)'); r.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = r; g.beginPath(); g.moveTo(s * .5, s * .02); g.bezierCurveTo(s * .95, s * .5, s * .9, s * .98, s * .5, s * .98); g.bezierCurveTo(s * .1, s * .98, s * .05, s * .5, s * .5, s * .02); g.fill(); });
function noiseTex(base, v) { return canvasTex(256, (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); for (let i = 0; i < 5000; i++) { const a = Math.random() * v; g.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${a})` : `rgba(255,235,200,${a * .6})`; g.fillRect(Math.random() * s, Math.random() * s, rnd(1, 4), rnd(1, 4)); } }); }

// ---------- Assets ----------
export const A = { tex: {}, props: {} };
export const REAL = { gulayim: ['R_gulayim', 'saber'], allayar: ['R_allayar', 'saber'], surtaysha: ['R_surtaysha', 'axe', 0, 1.1], qiz: ['R_qiz', 'saber'], son: ['R_yigit', 'saber', 1], askar: ['R_askar', 'saber', 1], wolf: ['R_bori', null, 0, .95] /* author Nov 27: 'soldiers with a wolf head on the body, not four-legged wolves' — R_boriaskar = R_askar soldier body + R_bori wolf head on the askar skeleton (tools/blender/wolfsoldier/build.py): humanoid mocap, saber, no helmet. The quadruped R_bori4 is only the amulet's spectral wolf (spwolf) */, spwolf: ['R_bori4', null, 0, 1.0], mother: ['R_ona', null], archer: ['R_kamonchi', 'bow'], mage: ['R_shaman', 'staff'], qashqir: ['R_qashqir', 'axe'], qumdev: ['R_qumdev', null], qunqar: ['R_qunqar', null], qargashiq: ['R_qargashiq', 'axe'], sarbinaz: ['R_sarbinaz', 'spear'], jallod: ['R_jallod', null], otbasqan: ['R_otbasqan', 'saber'], aydarho: ['R_aydarho', null, 0, 7], shaman: ['R_shaman', 'staff'], bayimbet: ['R_yigit', null], asir: ['R_yigit', null], elder: ['R_ona', null] };
const RIBS = {};
function fistify(src) { let sm = null; src.traverse(o => { if (o.isSkinnedMesh && !sm) sm = o; }); if (!sm || sm.geometry.userData.fist) return; sm.geometry.userData.fist = 1; src.updateMatrixWorld(true);
  const bones = sm.skeleton.bones, hi = bones.findIndex(b => b.name === 'RightHand'), fi = bones.findIndex(b => b.name === 'RightForeArm'); if (hi < 0 || fi < 0) return;
  const hp = bones[hi].getWorldPosition(new THREE.Vector3()), fp = bones[fi].getWorldPosition(new THREE.Vector3()), d = hp.clone().sub(fp).normalize(); const bb = new THREE.Box3().setFromObject(src, true), S = (bb.max.y - bb.min.y) / 1.75;
  const n = new THREE.Vector3(-hp.x, 0, 0); n.addScaledVector(d, -n.dot(d)).normalize(); const ax = d.clone().cross(n).normalize(); sm.skeleton.update(); const M = sm.matrixWorld.clone().multiply(sm.bindMatrixInverse).multiply(bones[hi].matrixWorld).multiply(sm.skeleton.boneInverses[hi]).multiply(sm.bindMatrix), Mi = M.clone().invert(); const pos = sm.geometry.attributes.position, si = sm.geometry.attributes.skinIndex, sw = sm.geometry.attributes.skinWeight, v = new THREE.Vector3(), q = new THREE.Quaternion();
  const k1 = hp.clone().addScaledVector(d, .085 * S), L = .04 * S;
  for (let i = 0; i < pos.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hi) w += sw.getComponent(i, k); if (w < .5) continue; v.fromBufferAttribute(pos, i).applyMatrix4(M); const t = v.clone().sub(k1).dot(d); if (t <= 0) continue;
    const a1 = Math.min(1, t / (.02 * S)) * 1.5; q.setFromAxisAngle(ax, a1); v.sub(k1).applyQuaternion(q).add(k1);
    if (t > L) { const k2 = k1.clone().add(d.clone().multiplyScalar(L).applyQuaternion(q)); const q2 = new THREE.Quaternion().setFromAxisAngle(ax, 1.4); v.sub(k2).applyQuaternion(q2).add(k2); }
    v.applyMatrix4(Mi); pos.setXYZ(i, v.x, v.y, v.z); }
  pos.needsUpdate = true; sm.geometry.computeVertexNormals(); }
const NOFIST = new Set(['wolf', 'qumdev', 'qunqar', 'aydarho', 'jallod', 'mother', 'elder', 'asir', 'bayimbet']);
const LAZY = new Set(['qashqir', 'qumdev', 'qunqar', 'qargashiq', 'jallod', 'aydarho', 'sarbinaz', 'otbasqan', /* bench #1: not needed for title + 0-0, loaded by missions.js w4Ensure() before any other mission */ 'allayar', 'surtaysha', 'wolf', 'spwolf', 'mother', 'archer', 'mage']);
const REALP = {};
export async function ensureReal(types) { if (!A.real || /[?&]oldrig=1/.test(location.search)) return; types = types.filter(t => { if (!REAL[t] || A.real[t]) return false; const k = Object.keys(A.real).find(q => A.real[q] && REAL[q] && REAL[q][0] === REAL[t][0]); if (k) { A.real[t] = A.real[k]; return false; } return true; });   /* same GLB already loaded for another type (potion brutes = R_askar): share it */
  await Promise.all(types.map(t => { const f = REAL[t][0], P = REALP[f] || (REALP[f] = loadGLB('./assets/models/' + f + '.glb?v=1795777742')); return P.then(s => { if (!NOFIST.has(t) && REAL[t][1]) fistify(s); A.real[t] = s; }).catch(err => { delete REALP[f]; console.warn('real', t, err); }); })); }
const PROPN = ['R_horse', 'R_horse_lo', 'R_horse_far', 'R_arava', 'W_saber', 'W_axe', 'W_spear', 'W_bow', 'W_shield', 'B_yurt', 'B_house', 'B_wall', 'B_tower'];
const GSC = { surtaysha: .92, camel: .86, qashqir: .9, allayar: 1.22, gulayim: 1.04, sarbinaz: 1.0, son: .95, qiz: .97, askar: .86, wolf: .86, archer: .86, mage: .88 };
const GMAP = { qiz: ['qiz', 'saber'], gulayim: ['gulayim', 'saber'], allayar: ['allayar', 'saber'], sarbinaz: ['sarbinaz', 'spear'], mother: ['ona', null], son: ['yigit', 'saber', 1], askar: ['askar', 'saber', 1], wolf: ['bori', null], archer: ['kamonchi', 'bow'], mage: ['shaman', 'staff'], camel: ['tuyadev', 'axe'], qashqir: ['qashqir', 'axe'], surtaysha: ['surtaysha', 'axe'] };
export async function loadAssets(onp) {
  const tl = new THREE.TextureLoader(); let n = 0; const realL = Object.entries(REAL).filter(([t]) => !LAZY.has(t)), NT = 2 + PROPN.length + realL.length, BOOT_MB = 7.7; const step = () => { n++; const f = Math.min(1, n / NT); try { window.__LOAD = { mb: +(f * BOOT_MB).toFixed(1), total: BOOT_MB, done: n, files: NT }; } catch (e) { } onp(f); };   // window.__LOAD: the loading line can show "X / Y MB"
  const envP = loadEnv(renderer).catch(e => console.warn(e));
  await Promise.all(['ground1', 'ground2'].map(k => tl.loadAsync(`./assets/img/${k}.jpg`).then(tx => { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; A.tex[k] = tx; }).catch(() => { A.tex[k] = TX.plaster(k === 'ground1' ? '#5a4a3a' : '#8a7458'); }).then(step)));
  await Promise.all(PROPN.map(n => loadGLB('./assets/props/' + n + '.glb?v=1795777742').then(s => { s.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); if (n[0] === 'R') { s.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(s); const g = new THREE.Group(); s.position.y -= bb.min.y; s.position.x -= (bb.min.x + bb.max.x) / 2; s.position.z -= (bb.min.z + bb.max.z) / 2; g.add(s); s = g; } A.props[n] = PROPS[n] = s; }).catch(() => { }).then(step)));
  A.real = {}; if (!/[?&]oldrig=1/.test(location.search)) { try { ANIM.data = await (await fetch('./assets/models/anims.json')).json(); } catch (err) { console.warn('anims', err); } await Promise.all(Object.entries(REAL).filter(([t]) => !LAZY.has(t)).map(([t, [f]]) => loadGLB('./assets/models/' + f + '.glb?v=1795777742').then(s => { if (!NOFIST.has(t) && REAL[t][1]) fistify(s); A.real[t] = s; }).catch(err => console.warn('real', f, err)).then(step))); }
  await envP; A.glb = {}; if (!/[?&]oldrig=1/.test(location.search)) await Promise.all(Object.entries(GMAP).filter(([t]) => !REAL[t] || (!A.real[t] && !LAZY.has(t))).map(([t, [f]]) => A.glb[f] ? 0 : (A.glb[f] = 1, loadGLB('./assets/models/' + f + '.glb?v=1795777742').then(sc => { A.glb[f] = sc; }).catch(e => { A.glb[f] = null; console.warn('glb', f, e); }))));
}

// ---------- Unit types ----------
const AT1 = ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Chop', '2H_Melee_Attack_Spin'];
export const T = {
  gulayim: { model: 'Rogue', scale: 1.2, hide: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable'], weapon: 'sword_1handed', tint: 0xff9a8a, hp: 500, dmg: [20, 30], speed: 7.4, team: 'ally' },
  allayar: { model: 'Knight', scale: 1.3, hide: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Spike_Shield', '2H_Sword'], tint: 0xbfd0ff, hp: 800, dmg: [30, 40], speed: 6.8, team: 'ally' },
  son: { model: 'Knight', scale: 1.12, hide: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Spike_Shield', '2H_Sword', 'Knight_Helmet'], tint: 0xd8c9a8, hp: 260, dmg: [10, 16], speed: 5.6, range: 2, windup: .45, cd: 1.2, team: 'ally' },
  sarbinaz: { model: 'Rogue', scale: 1.15, hide: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable'], weapon: 'sword_1handed', tint: 0x8ab4ff, hp: 1e9, dmg: [14, 20], speed: 6.4, range: 2, windup: .4, cd: 1.0, team: 'ally', follow: true },
  mother: { model: 'Mage', scale: 1.1, hide: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat'], tint: 0xf2f2f2, hp: 1e9, team: 'npc' },
  child: { model: 'Rogue', scale: .62, hide: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'], tint: 0xffe0b0, hp: 1e9, team: 'npc' },
  askar: { model: 'Skeleton_Warrior', weapon: 'Skeleton_Blade', scale: 1.15, tint: 0x9a94a6, hp: 50, dmg: [8, 12], speed: 3.7, range: 1.9, windup: .55, cd: 1.3 },
  wolf: { model: 'Skeleton_Minion', scale: 1.05, tint: 0x7a7086, hp: 70, dmg: [10, 14], speed: 6.3, range: 1.7, windup: .33, cd: 1.0, run: 'Running_C' },
  archer: { model: 'Skeleton_Rogue', weapon: 'Skeleton_Crossbow', scale: 1.12, tint: 0xa6a68e, hp: 40, dmg: [13, 17], speed: 3.3, ranged: true, keep: 9, windup: .6, cd: 2.4 },
  mage: { model: 'Skeleton_Mage', weapon: 'Skeleton_Staff', scale: 1.3, tint: 0xb86078, hp: 170, dmg: [16, 20], speed: 2.6, ranged: true, orb: true, keep: 10, windup: .8, cd: 2.6 },
  camel: { model: 'Skeleton_Warrior', weapon: 'Skeleton_Axe', scale: 2.5, tint: 0x9a8672, hp: 1500, dmg: [40, 40], speed: 3.0, range: 3.6, windup: 1.0, cd: 2.0, slam: 3.8, heavy: true, name: 'n_ca' },
  qashqir: { model: 'Barbarian', scale: 2.0, hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug'], tint: 0x9690b0, hp: 3000, dmg: [28, 34], speed: 4.6, range: 3.3, windup: .6, cd: 1.5, heavy: true, name: 'n_qa', atk: ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Chop'] },
  surtaysha: { model: 'Barbarian', scale: 2.4, hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug'], tint: 0x5a5468, gold: 'Barbarian_Hat', hp: 1e9, dmg: [45, 55], speed: 3.4, range: 3.8, windup: .9, cd: 1.9, slam: 4.2, heavy: true, invuln: true, name: 'n_su', atk: ['2H_Melee_Attack_Chop'] }
};
Object.assign(T, {
  shaman: { ...T.mage, like: 'mage' },
  qumdev: { like: 'camel', scale: 2.3, hp: 4200, dmg: [36, 46], speed: 2.6, range: 4.2, windup: 1.1, cd: 2.2, slam: 5, heavy: true, name: 'n_qd', team: 'enemy' },
  jallod: { like: 'qashqir', scale: 2.0, hp: 5200, dmg: [30, 40], speed: 3.4, range: 3.6, windup: .8, cd: 1.7, slam: 3.6, heavy: true, name: 'n_ja', team: 'enemy' },
  qunqar: { like: 'camel', scale: 2.4, hp: 7000, dmg: [44, 56], speed: 3.2, range: 4.4, windup: 1.0, cd: 1.9, slam: 4.8, heavy: true, name: 'n_qu', team: 'enemy' },
  qargashiq: { like: 'surtaysha', scale: 2.6, hp: 9000, dmg: [48, 60], speed: 3.0, range: 4.8, windup: 1.0, cd: 2.0, slam: 5, heavy: true, name: 'n_qg', team: 'enemy' },
  aydarho: { like: 'camel', scale: 3, hp: 8000, dmg: [40, 50], speed: 0, range: 0, ranged: true, orb: true, keep: 40, windup: 1.2, cd: 2.4, heavy: true, name: 'n_ay', team: 'enemy' },
  otbasqan: { ...T.son, like: 'son', hp: 1e9, dmg: [22, 30], follow: true, team: 'ally' },
  bayimbet: { like: 'son', hp: 1e9, team: 'npc' },
  asir: { like: 'son', hp: 1e9, team: 'npc' },
  elder: { like: 'mother', hp: 1e9, team: 'npc' }
});
const SC = { gulayim: 1.3, allayar: 1.36, son: 1.22, sarbinaz: 1.27, mother: 1.18, child: .72, askar: 1.28, wolf: 1.28, archer: 1.2, mage: 1.32, camel: 2.3, qashqir: 1.95, surtaysha: 2.25 }; for (const k in SC) T[k].scale = SC[k]; for (const k of ['shaman', 'otbasqan', 'bayimbet', 'asir', 'elder']) T[k].scale = T[T[k].like].scale; T.qiz = { ...T.son, follow: true, hp: 600 };
Object.assign(T.askar, { hp: 95, dmg: [9, 13], speed: 3.9, string: 2, block: .22, cd: 1.5 });
Object.assign(T.wolf, { hp: 100, dmg: [11, 15], speed: 6.8, cd: 1.3 });   /* author Nov 27 ('eskisini qaytar'): the old wolf warriors R_bori are back, as before Nov 21 */   /* wolf-headed soldier: fast, light, 2-hit sword strings (humanoid run, no 'Running_C' quadruped pick) */
Object.assign(T.archer, { hp: 60, dmg: [9, 12], volley: 3, keep: 10, cd: 3.2, speed: 3.6 });
for (const k of ['mage', 'shaman']) Object.assign(T[k], { hp: 230, elite: true, poise: 90, name: 'shaman', cd: 3.0 });
for (const k of ['son', 'qiz', 'otbasqan']) Object.assign(T[k], { string: 2, block: .18 });
// new enemy types (reuse existing models): spearman = armoured, slow, one big telegraphed thrust; wolf chieftain = mini-boss
Object.assign(T, {
  nayza: { ...T.askar, like: 'askar', mdl: 'askar', wpn: 'spear', vsK: 1.17, scale: T.askar.scale * 1.17, hp: 300, dmg: [30, 38], speed: 2.5, range: 3.3, windup: 1.15, cd: 2.5, rec: 1.0, lane: true, armor: .4, poise: 130, elite: true, name: 'nayza', string: 1, block: 0 },
  boribasi: { ...T.wolf, like: 'wolf', mdl: 'wolf', vsK: 1.55, scale: T.wolf.scale * 1.55, hp: 950, dmg: [24, 32], speed: 5.4, range: 2.6, windup: .5, cd: 1.6, poise: 200, elite: true, name: 'boribasi', glow: 0x661008 }
});
const sv = (a, b) => { const P = G.player; if (!P || a === P || b === P) return 1; return clamp(1.2 / (1 + Math.hypot(a.x - P.x, a.z - P.z) * .3), 0, .55); };  // others' fights: quieter, fading with distance
const hostile = (a, b) => (a === 'enemy' && b === 'ally') || (a === 'ally' && b === 'enemy');

// ---------- Entities ----------
const barGeo = new THREE.PlaneGeometry(1, 1);
const LOCO = /^(Idle|Idle_Combat|Running_A|Running_C|Walking_A|Walking_Backwards)$/;
// spacing radius used by crowd separation (horses need ~2.3 m between riders)
const sepR = e => e.mounted ? 1.15 : e.d.heavy ? e.r * .9 : e.r * .95;
export class Ent {
  constructor(type, x, z, team) {
    const d = T[type]; this.d = d; this.type = type; this.team = team || d.team || 'enemy';
    this.x = x; this.z = z; this.y = 0; this.rot = Math.PI; this.r = 0.5 * (d.scale || 1); this.h = 2.0 * (d.scale || 1);
    this.maxHp = this.hp = d.hp; this.speed = d.speed || 0; this.dead = false; this.state = 'chase'; this.tm = 0; this.cd = rnd(.2, 1.2); this.stagger = 0; this.kx = 0; this.kz = 0; this.invuln = !!d.invuln; this.flash = 0; this.spawnT = 0; this.dmgMul = 1; this.spdMul = 1;
    const mt = d.mdl || type; const gm = GMAP[mt] || GMAP[d.like], gsc = gm && A.glb && A.glb[gm[0]]; const rs = A.real && A.real[mt] && ANIM.data; const rig = this.rig = rs ? new SkinRig(A.real[mt], { wpn: d.wpn || REAL[mt][1], shield: d.noShield ? 0 : REAL[mt][2], ribbons: RIBS[mt], amulet: type === 'gulayim' }) : (gsc && gsc !== 1) ? new GlbRig(gsc, gm[1], gm[2]) : new Rig(d.like || type); const o = this.o = rig.root; this.vs = ((rig instanceof SkinRig) ? 1.18 * (REAL[mt][3] || 1) : (rig instanceof GlbRig) ? 1.18 * (GSC[mt] || 1) : (d.scale || 1) / (d.vsK || 1)) * (d.vsK || 1); o.scale.setScalar(this.vs); this.mats = rig.mats; this.mixer = { update: dt => rig.update(dt) }; this.curName = '';
    o.position.set(x, 0, z); o.rotation.y = this.rot; actors.add(o); this.play('Idle');
  }
  play(name, op = {}) { if (LOCO.test(name)) { this.loco = name; if (!this.inLoco || op.force) { this.inLoco = true; this.locoPick(!!op.force); } return; } this.inLoco = false; this._play(name, op); }
  _play(name, op = {}) { if (this.mounted && /Running|Walking/.test(name)) name = 'Idle_Combat'; if (this.curName === name && !op.force) { this.rig.sp = op.ts || 1; if (op.ts) this.rig.play(name, { ts: op.ts }); return; } this.curName = name; this.rig.play(name, op); }
  // pick Idle / Walk / Run from the measured speed (never "run in place")
  locoPick(force) { const v = this === G.player ? (this.spd || 0) : Math.min(this.spd || 0, Math.hypot(this.vx || 0, this.vz || 0) * 1.15), want = this.loco || 'Idle', sk = this.rig instanceof SkinRig; const K = Math.max(.6, this.rig.hgt ? this.rig.hgt * this.vs / 2.065 : (this.d.scale || 1.28) / 1.28); const thr = this.mounted ? .7 : .4, mv = v > (this.lmv ? thr * .55 : thr); this.lmv = mv; let n, ts = 1;
    if (!mv) n = /Idle/.test(want) ? want : (this === G.player || this.team === 'npc' ? 'Idle' : 'Idle_Combat');
    else { const vn = v / K; if (want === 'Walking_Backwards') { n = want; ts = clamp(vn / 1.6, .5, 1.6); } else if (vn < 3.1) { n = 'Walking_A'; ts = sk ? clamp(vn / 1.45, .45, 1.8) : clamp(vn / 4, .35, 1); } else { n = this.d.run || (want === 'Running_C' ? want : 'Running_A'); ts = clamp(vn / 5.6, .6, 1.7); } }
    this._play(n, { ts, force }); }
  face(dx, dz, k = 1) { if (this.d.turn && !this.km) k *= this.d.turn; const want = Math.atan2(dx, dz); let d = want - this.rot; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; this.rot += d * clamp(k, 0, 1); }
  showBar() {  // dark frame, white damage-lag segment, bright fill: enemies red, allies green (elites/captains use plate(): gold frame)
    if (this.bar || this.d.heavy || this === G.player || this.vict || (this.team !== 'enemy' && this.team !== 'ally')) return; const g = new THREE.Group(), en = this.team === 'enemy', W = en ? 1.5 : 1.3, H = .17;
    let ro = 20; const mk = (c, w, h, z, op = 1) => { const m = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthTest: false, depthWrite: false, toneMapped: false, fog: false })); m.scale.set(w, h, 1); m.position.z = z; m.renderOrder = ro++; g.add(m); return m; };
    mk(0x000000, W + .1, H + .09, 0, .92); mk(0x2b2424, W, H, .004); const lag = mk(0xffffff, W, H, .007), fg = mk(en ? 0xff2a1e : 0x35e05c, W, H, .01);
    this.bar = g; this.barFg = fg; this.barLag = lag; this.barLagK = 1; this.barW = W; fxg.add(g);
  }
  damage(amt, src, op = {}) {
    if (this.dead || this.team === 'npc') return 0;
    const P = G.player, me = this === P; if (src === P && this.team === 'enemy') this.provT = G.time + 5; this.hitT = G.time;
    if (src && src !== P && src.team === 'ally' && this.team === 'enemy') amt *= this.hunt ? (G.allyK ?? 1) * .5 : (G.allyK ?? 1);  // allies fight their own fight; the named captains are the hero's
    if (me && P.iframe > 0) { if (src && src.team === 'enemy' && P.act && (P.act.kind === 'dodge' || P.act.kind === 'dash') && P.act.t < .3) perfectDodge(P, src); return 0; }
    if (me && src && src.team === 'enemy') { amt = w3Def(P, amt, src, op); if (!amt) return 0; }  // w3: block / parry / jump-over
    if (this.mounted && this.horseHp !== undefined) { this.horseHp -= amt * .7; amt *= .3; if (me) hudHorse(); if (this.hz) { this.hz.hit(); if (this.hz.S && !(this.hz.S.rear > 0) && G.time > (this.rearCd || 0) && Math.random() < (me ? .3 : .5)) { this.rearCd = G.time + rnd(1.5, 3); this.hz.S.rear = this.hz.S.rearDur = .7; if (this.cav) this.cav.v *= .35; } } if (this.horseHp <= 0) { toggleMount(this, false, true); Sfx.neigh(); burst(this.x, 1, this.z, 0x885533, 3, true); this.stagger = .6; this.cav = null; this.play('Hit_A', { once: true, force: true }); if (me) hintRaw(t('horseDown')); } }
    if (me && this.shield > 0) { amt *= .15; }
    if (this.shieldT > 0) amt *= .3;
    if (me && this.giant > 0) { amt *= .5; }
    if (this.invuln) { if (!op.silent) num(this, t('noeffect'), 'n'); return 0; }
    if (src === P && this.comboT > G.time) { amt *= 2; if (!op.silent) { num(this, t('combo'), 'c'); G.shake = Math.max(G.shake, .4); } this.comboT = 0; }
    if (src && src !== P && src.cryT > 0) amt *= 1.4;
    if (src && src.type === 'qiz' && maidBuff().stun && Math.random() < .12 && !this.d.heavy) this.stagger = Math.max(this.stagger, .9);
    if (this.weak) { const m = this.weak(src, op); if (m < 1) { amt *= m; this.weakT = (this.weakT || 0) + 1; if (this.weakT % 6 === 1 && this.weakHint) { num(this, t('resist'), 'n'); hintRaw(t(this.weakHint)); } } }
    // guard / armour: frontal only, opened by heavy attacks, counters, skills, knockdowns and broken poise
    if (!me && src && this.team === 'enemy' && !op.nf && !op.exec && (this.d.parry || this.d.shieldF)) { amt = w3EDef(this, amt, src, op); if (!amt) return 0; }  // w3 roles
    let blocked = false; const open = this.stagger > 0 || this.downT > 0 || this.air || this.brokenT > 0;
    if (!me && src && !op.nf) { const sx = src.x - this.x, sz = src.z - this.z, sl = Math.hypot(sx, sz) || 1, front = (sx * Math.sin(this.rot) + sz * Math.cos(this.rot)) / sl > .15;
      if (front && !open && !op.gb) {
        if (this.d.armor && this.state !== 'recover') { amt *= this.d.armor; if (!op.silent && Math.random() < .6) sparks(this.x + sx / sl * .5, this.h * .6, this.z + sz / sl * .5, 0xcfd8e8, 5, 5); }
        if (!op.crit && !this.d.heavy && !this.mounted && (this.state === 'block' || (this.d.block && this.state === 'chase' && Math.random() < this.d.block * (this.team === 'enemy' ? DK([.4, 1, 1.4]) : 1)))) { blocked = true; amt *= .2; try { Sfx.block && Sfx.block('block', { x: this.x, z: this.z }); } catch (e_) { } if (this.state !== 'block' || this.tm < .45) { this.state = 'block'; this.tm = .45; } if (Math.random() < .4) this.cd = Math.min(this.cd, .2); sparks(this.x + sx / sl * .5, this.h * .6, this.z + sz / sl * .5, 0xe8f0ff, 10, 6); if (!op.silent && src === P) num(this, tx('block'), 'n'); }
      } else if (op.gb && this.state === 'block') this.state = 'chase'; }
    if (this.brokenT > 0) amt *= 1.5; else if (this.punT > G.time && src === P) { amt *= 1.35; op = { ...op, pz: (op.pz ?? 1) * 2 }; }
    if (me && P.act && P.act.kind === 'atk' && src && src.team === 'enemy') amt *= DK([1, 1.1, 1.3]);
    if (this.team === 'ally' && src && src.team === 'enemy') amt *= (me ? [.42, .65, 1.15] : [.55, 1, 1.5])[SET.diff] ?? 1; if (this.team === 'enemy' && src && src.team === 'ally') amt *= [1.8, 1, .85][SET.diff] ?? 1; amt = Math.round(amt); this.hp -= amt; this.flash = .12;
    if (this.poiseMax && src && src.team !== this.team && !(this.brokenT > 0) && G.time > (this.pzImm || 0)) { this.poise -= amt * (op.pz ?? (op.crit ? 1.5 : 1)) * (blocked ? .5 : 1); this.poiseAt = G.time; if (this.poise <= 0 && this.hp > 0) breakPoise(this); }
    if (me) { num(this, '-' + amt, 'p'); Sfx.hurt(); vib(45); G.shake = Math.max(G.shake, clamp(amt / 90, .2, .6)); const v = $('vig'); v.classList.add('hurt'); setTimeout(() => v.classList.remove('hurt'), 180); if (G.noDeath && this.hp < 1) this.hp = 1; }
    else { if (!op.nf || amt >= 5) num(this, op.crit ? amt + '!' : '-' + amt, (op.crit ? 'c' : (this.team === 'ally' ? 'p' : '')) + (src !== P ? ' o' : '')); this.showBar(); }
    // hit sparks coloured by the weapon that landed
    const wp = src && (src.d.wpn || (REAL[src.d.mdl || src.type] || [])[1]), wc = blocked ? 0xdfe8ff : !src ? 0xb050ff : wp === 'axe' ? 0xff9040 : wp === 'spear' ? 0xbfe0ff : wp === 'bow' ? 0xe8d8a0 : wp === 'staff' ? 0xc060ff : wp ? 0xffe6a8 : 0xff4a30;
    burst(this.x, this.h * .55, this.z, this.team === 'enemy' ? wc : 0xff5040, op.crit ? 1.6 : 1.0); if (!op.nf) sparks(this.x, this.h * .55, this.z, this.team === 'enemy' ? wc : 0xff7050, op.crit ? 14 : 7, op.crit ? 8 : 5);
    if (src === P) { hcAdd(); G.hitStop = op.crit ? .13 : .07; vib(op.crit ? 28 : 12); G.shake = Math.max(G.shake, clamp(amt / 220, .08, .5) * (op.crit ? 1.3 : 1)); }
    if (src && !this.d.heavy && !me && !op.nf) { const dx = this.x - src.x, dz = this.z - src.z, l = Math.hypot(dx, dz) || 1; const k = (op.kb ?? 5) * (blocked ? .4 : this.d.elite && !(this.brokenT > 0) ? .3 : 1); this.kx += dx / l * k; this.kz += dz / l * k; const km = Math.hypot(this.kx, this.kz); if (km > 7) { this.kx *= 7 / km; this.kz *= 7 / km; }
      this.lnx = dx / l; this.lnz = dz / l; this.ln = .3;
      let flinch = !blocked && (!this.d.elite || this.brokenT > 0);
      // flinch resistance: an enemy hit repeatedly shrugs off the next light hits for a moment (no endless stun-lock by button mashing)
      if (flinch && this.team === 'enemy' && !op.kd && !op.launch && !op.crit && !this.air) { if (G.time < (this.armT || 0)) { flinch = false; if (Math.random() < .5) sparks(this.x, this.h * .7, this.z, 0xffd27a, 4, 4); } else { if (G.time - (this.flA || 0) > 2.2) this.flN = 0; this.flA = G.time; if (++this.flN >= DK([5, 3, 2])) { this.flN = 0; this.armT = G.time + DK([.7, 1.2, 1.6]); } } }
      const reset = () => { this.state = 'chase'; this.clearTele(); if (this.yM && !this.air) this.y = 0; this.castT = 0; this.castFn = null; };
      if (this.air) { this.jug = (this.jug || 0) + 1; if (this.jug <= 3) this.vy = 5.5; }
      else if (flinch && !(this.downT > 0)) { const can = !this.mounted && G.time > (this.kdImm || 0) && this.hp > 0;
        if (op.launch && can) { reset(); this.air = true; this.vy = 9.5; this.jug = 0; this.kdImm = G.time + 5; this.play('Hit_A', { once: true, force: true, ts: .8 }); }
        else if (op.kd && can) { reset(); this.downT = 1.25; this.kdImm = G.time + 4; this.stagger = 0; this.play('Death_A', { once: true, force: true }); }
        else if (this.state !== 'windup' || Math.random() < (this.tm > (this.wd || 1) * .5 ? .7 : DK([.6, .3, .15]))) { reset(); this.stagger = .28; this.play('Hit_A', { once: true, force: true, ts: 1.4 }); } } }
    if (this.hp <= 0) this.die();
    return amt;
  }
  clearTele() { if (this.tele) { this.tele.dead = true; this.tele = null; } }
  die() {
    if (this.dead) return; if (this.mounted && this !== G.player) toggleMount(this, false, true); this.dead = true; this.hp = 0; this.clearTele(); this.deadT = 0; this.play('Death_A', { once: true, force: true });
    if (this.bar) { fxg.remove(this.bar); this.bar = null; } if (this.aura) { fxg.remove(this.aura); this.aura = null; } relSlot(this); this.air = false;
    if (this === G.player) { Sfx.death(); if (G.onPlayerDeath) G.onPlayerDeath(); return; }
    Sfx.death();
    if (this.team === 'enemy' && !this.bg) addGold(this.d.heavy ? 120 : (this.type === 'wolf' ? 6 : 4), this.x, this.z);
    if (this.team === 'enemy' && !this.d.heavy && Math.random() < .22 && G.player && G.player.hp < G.player.maxHp * .8) addPick(this.x, this.z);
    if (this.onDeath) this.onDeath(this);
    if (this.team === 'enemy' && !this.bg && (this === G.boss || this.d.heavy || !G.ents.some(e => e.team === 'enemy' && !e.dead && !e.bg))) { G.slow = (this === G.boss || this.d.heavy) ? 1.2 : .55; G.shake = Math.max(G.shake, .5); vib(60); }
  }
  remove() { actors.remove(this.o); this.gone = true; if (this.aura) { fxg.remove(this.aura); this.aura = null; } if (this.rig.dispose) this.rig.dispose(); if (this.bar) fxg.remove(this.bar); this.clearTele(); }
}
export function spawn(type, x, z, team, raw) {
  // enemy variety: unless a level opts out (G.noVar) every 4th foot soldier is a spearman and the 5th wolf of a level is the pack's chieftain
  if (!raw && !G.noVar && (!team || team === 'enemy') && T[type] && !T[type].team) { const V = G.vc || (G.vc = { a: 0, w: 0 }); if (type === 'askar') { ++V.a; if (V.a % 4 === 0) type = 'nayza'; else if (V.a % 6 === 3) type = 'qilich'; else if (V.a % 10 === 7) type = 'qalqan'; } else if (type === 'wolf') { V.w++; if (V.w === 5 || (V.w > 5 && (V.w - 5) % 9 === 0)) type = 'boribasi'; } }
  const e = new Ent(type, x, z, team); if (type === 'qiz') { const b = maidBuff(); e.maxHp = e.hp = Math.round(e.maxHp * b.hp); e.dmgMul = b.dmg; } G.ents.push(e); if (e.team === 'enemy' && !raw) e.spChk = 1; decorate(e); return e; }  /* no pop-in: a reinforcement spawned in view is moved off-screen and walks in (arrive) */
export /* author Nov 26 ('no collision, NPCs get in the way of the fight'): bystanders (team npc) used to be skipped, so fighters walked through them and they stood
   inside the melee. Now an npc is pushed out of any fighter's / the hero's circle (never the other way round); npc-npc pairs and frozen scenes
   (archery stealth, cutscenes) are left alone so scripted crowds keep their marks. */
const sepSkip = e => e.dead || e.gone || (e.team === 'npc' && (G.freeze || e.bg || e.mounted || e.y > .3));
function separate() { const L = G.ents; for (let i = 0; i < L.length; i++) { const a = L[i]; if (sepSkip(a)) continue; const an = a.team === 'npc'; for (let j = i + 1; j < L.length; j++) { const b = L[j]; if (sepSkip(b)) continue; const bn = b.team === 'npc'; if (an && bn) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || .01, m = sepR(a) + sepR(b); if (d < m) { const k = (m - d) / d * .5, ha = an ? 1 : bn ? 0 : a.d.heavy || a === G.player ? 0 : 1, hb = bn ? 1 : an ? 0 : b.d.heavy || b === G.player ? 0 : 1, t = ha + hb || 1; a.x -= dx * k * 2 * ha / t; a.z -= dz * k * 2 * ha / t; b.x += dx * k * 2 * hb / t; b.z += dz * k * 2 * hb / t; } } } }
export function hintRaw(s) { const h = $('hint'); if (h.textContent !== s || !h.classList.contains('show')) h.textContent = s; h.classList.add('show');  /* same text already up: only extend it (re-setting re-ran the emoji->icon swap = flicker) */ clearTimeout(hintRaw.to); hintRaw.to = setTimeout(() => h.classList.remove('show'), 5000); }
export const enemies = () => G.ents.filter(e => e.team === 'enemy' && !e.dead && !e.bg);
function nearest(x, z, team, maxd = 1e9) { let b = null, bd = maxd; for (const e of G.ents) { if (e.dead || !hostile(team, e.team)) continue; const d = Math.hypot(e.x - x, e.z - z) - e.r; if (d < bd) { bd = d; b = e; } } return b; }
export function hitCircle(x, z, r, dmg, team, src, op) { let n = 0; for (const e of G.ents) { if (e.dead || !hostile(team, e.team)) continue; if (Math.hypot(e.x - x, e.z - z) < r + e.r) { if (e.damage(typeof dmg === 'function' ? dmg() : dmg, src, op)) n++; } } return n; }
function hitArc(src, range, minDot, dmg, op) { let n = 0; const fx = Math.sin(src.rot), fz = Math.cos(src.rot); for (const e of G.ents) { if (e.dead || !hostile(src.team, e.team)) continue; const dx = e.x - src.x, dz = e.z - src.z, d = Math.hypot(dx, dz); if (d > range + e.r) continue; if (d > .6 && (dx * fx + dz * fz) / d < minDot) continue; if (e.damage(dmg(), src, op)) n++; } return n; }
function collide(e) {
  e.bump = null; e.bumpB = null; const ox = e.x, oz = e.z;
  for (const c of G.colC) { const dx = e.x - c.x, dz = e.z - c.z, rr = c.r + e.r, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); e.x = c.x + dx / d * rr; e.z = c.z + dz / d * rr; e.bump = { nx: dx / d, nz: dz / d }; } }
  for (const b of G.colB) { if (b.off || ((b.ravine || b.low) && e.leaping)) continue; const x1 = b.x1 - e.r, x2 = b.x2 + e.r, z1 = b.z1 - e.r, z2 = b.z2 + e.r; if (e.x > x1 && e.x < x2 && e.z > z1 && e.z < z2) { e.bumpB = b; const p = [e.x - x1, x2 - e.x, e.z - z1, z2 - e.z]; const m = Math.min(...p); if (m === p[0]) { e.x = x1; e.bump = { nx: -1, nz: 0 }; } else if (m === p[1]) { e.x = x2; e.bump = { nx: 1, nz: 0 }; } else if (m === p[2]) { e.z = z1; e.bump = { nx: 0, nz: -1 }; } else { e.z = z2; e.bump = { nx: 0, nz: 1 }; } } }
  for (const f of G.fires) { if (f.y - f.size > 1.2) continue; const rr = f.size * .62 + e.r, dx = e.x - f.x, dz = e.z - f.z, d2 = dx * dx + dz * dz; if (d2 < rr * rr) { const d = Math.sqrt(d2) || .01; e.x = f.x + dx / d * rr; e.z = f.z + dz / d * rr; if (!e.bump) e.bump = { nx: dx / d, nz: dz / d }; } }
  e.x = clamp(e.x, -G.W, G.W); if (e.team === 'ally' && e.d.follow && e.z < G.limitZ + .8) e.z = G.limitZ + .8; if (e.team === 'enemy' && G.limitZ > -1e8 && (e.farT || 0) > -1e8 && ((e._lz ?? e.z) >= G.limitZ + .8 || (e.unrT || 0) > 3) && e.z < G.limitZ + .8) e.z = G.limitZ + .8; /* an awake enemy on the player's side of a closed gate stays on her side */ if (e === G.player && !e.leaping) { if (e.z < G.limitZ + .8) e.z = G.limitZ + .8; if (e.z > 6) e.z = 6; }
  if (e.bump) { const n = e.bump, vn = (e.kx || 0) * n.nx + (e.kz || 0) * n.nz; if (vn < 0) { const fast = vn < -3; e.kx -= 1.6 * vn * n.nx; e.kz -= 1.6 * vn * n.nz; e.kx *= .6; e.kz *= .6; if (fast && !e.wallT) { e.wallT = .3; burst(e.x - n.nx * e.r, e.h * .5, e.z - n.nz * e.r, 0xbfa58a, 1.2, true); G.shake = Math.max(G.shake, .18); Sfx.hit(); if (e !== G.player && e.team === 'enemy' && !e.d.heavy) e.damage(6, null, { silent: true }); } } }
  if (e.wallT > 0) e.wallT -= 1 / 60;
}
// ---------- AI ----------
// Every unit is an independent fighter: own target (spread, capped per enemy), own pace, own attack rhythm.
// Nothing here reads the player's input; allies only know roughly where the player is.
const WEAK = new Set(['askar', 'archer']);
const TXT = {
  nayza: { uz: 'Nayzador', qq: 'Nayzashı', ru: 'Копейщик', en: 'Spearman' }, boribasi: { uz: "Bo'rilar sardori", qq: 'Qasqırlar basshısı', ru: 'Вожак волков', en: 'Wolf Chieftain' },
  shaman: { uz: 'Shomon', qq: 'Baqsı', ru: 'Шаман', en: 'Shaman' }, potwolf: { uz: "Dori bo'risi", qq: 'Dári qasqırı', ru: 'Зельевой волк', en: 'Potion Wolf' },
  perfect: { uz: 'Aniq chap berish!', qq: 'Dál qashıw!', ru: 'Идеальный уворот!', en: 'PERFECT DODGE!' }, counter: { uz: 'Qarshi zarba!', qq: 'Qarsı soqqı!', ru: 'Контрудар!', en: 'COUNTER!' },
  block: { uz: 'Qalqon', qq: 'Qalqan', ru: 'Блок', en: 'Block' }, brk: { uz: 'Himoya sindi!', qq: 'Qorǵanıw buzıldı!', ru: 'Защита пробита!', en: 'GUARD BREAK!' }
};
const tx = k => { const o = TXT[k]; if (!o) return t(k); const l = document.documentElement.lang; return o[l === 'kaa' ? 'qq' : l] || o.uz; };
const DK = a => a[SET.diff] ?? a[1];
const pers = e => e.pe || (e.pe = { pace: rnd(.86, 1.16), tempo: rnd(.78, 1.3), side: Math.random() < .5 ? -1 : 1, guard: Math.random(), nerve: Math.random() });
const tCap = o => o === G.player ? 6 : o.d.heavy ? 5 : o.d.elite ? 3 : 2;
function countTargets() { for (const o of G.ents) o.tn = 0; for (const o of G.ents) if (!o.dead && !o.gone && o !== G.player && o.tg && !o.tg.dead && !o.tg.gone) o.tg.tn++; }
// an ordinary enemy leaves the player alone while one of her fighting allies (maiden, townsman fighter) is close to him
function guarded(e) { const P = G.player; for (const o of G.ents) { if (o === P || o.dead || o.gone || o.team !== 'ally' || o.vict || o.cart || !o.speed) continue; if (Math.hypot(o.x - e.x, o.z - e.z) < 20) return true; } return false; }
function pickTarget(e) {
  if (G.duel === e && G.player && !G.player.dead) return G.player;
  const P = G.player, ally = e.team === 'ally', sight = ally ? (e.d.follow ? 30 : 48) : 60; let b = null, bs = 1e9;
  for (const o of G.ents) {
    if (o.dead || o.gone || o.bg || !hostile(e.team, o.team)) continue; const dd = Math.hypot(o.x - e.x, o.z - e.z) - o.r; if (dd > sight) continue;
    const onMe = ally && (o.tg === e || dd < 3.5);   /* testers: an ally hit (or brushed) by an enemy fights back instead of walking off 'searching' while it hacks at her */
    if (ally && P && !e.vict && !onMe && Math.hypot(o.x - P.x, o.z - P.z) > (o === e.tg ? 15 : 13)) continue;  /* allies fight what is near the hero (was 10 / 12.5 m: half the wave stood idle) */
    if (ally && (o.farT || 0) < -1e8 && o.hp >= o.maxHp) continue;  // allies leave sleeping camps alone (no maiden starts a fight beyond the gate on her own)
    const n = (o.tn || 0) - (e.tg === o ? 1 : 0); let s = dd + n * 2.5;
    if (n >= tCap(o)) { if (ally && !onMe) continue; s += 30; }
    if (onMe) s -= 4;
    if (o === e.tg) s -= 3; if (!ally && o === P && dd < 7) s -= 3;
    if (ally && o.hunt) s += 20;  // leave the captain to the hero unless nothing else is left
    if (!ally && o === P) { if (e.hunt || e.d.heavy) s -= 15; else if (!(e.provT > G.time) && guarded(e)) continue; }  // roles: rank-and-file fight the maidens; the player is the named captains' business
    if (!ally && o.vict && !e.raider) { if (o.saved || o.st === 'safe' || o.st === 'run') continue; if (o.st === 'held' && (o.vict.kind === 'fire' || o.vict.kind === 'cage')) continue; s += 8; }  // people locked inside a house / cage cannot be reached  // captives are not the first choice
    if (s < bs) { bs = s; b = o; }
  }
  if (!b && !ally && P && !P.dead && hostile(e.team, P.team) && Math.hypot(P.x - e.x, P.z - e.z) < sight) b = P;  // nobody else to fight: go for her rather than stand idle
  return b;
}
function target(e, dt) {
  if (e.mate && !e.mate.dead) return e.mate;
  e.retT = (e.retT || 0) - dt; const c = e.tg; if (c && (c.dead || c.gone || !hostile(e.team, c.team))) e.tg = null;
  if (!e.tg || (e.retT <= 0 && e.state === 'chase')) { const n = pickTarget(e); if (n !== e.tg) { relSlot(e); if (e.tg) e.tg.tn--; e.tg = n; if (n) n.tn = (n.tn || 0) + 1; if (n && n === G.player && e.team === 'enemy') e.cd = Math.max(e.cd || 0, rnd(.5, 2.2) * DK([1.5, 1, .6])); } e.retT = rnd(.7, 1.6); }
  return e.tg;
}
// attack tokens: only a few enemies may swing at the player at the same moment, the rest circle and feint
function tokOK(e) { const L = G.tok || (G.tok = []); for (let i = L.length - 1; i >= 0; i--) { const o = L[i]; if (o.dead || o.gone || (o.tokT || 0) < G.time) L.splice(i, 1); } if (L.includes(e)) { e.tokT = G.time + 2.5; return true; } if (L.length >= DK([1, 2, 3]) && !(e.d.elite && !L.some(o => o.d.elite))) return false; L.push(e); e.tokT = G.time + 2.5; return true; }
function rtokOK(e) { const L = G.rtok || (G.rtok = []); for (let i = L.length - 1; i >= 0; i--) { const o = L[i]; if (o.dead || o.gone || (o.rtT || 0) < G.time) L.splice(i, 1); } if (L.includes(e)) { e.rtT = G.time + 1.6; return true; } if (L.length >= DK([1, 2, 3])) return false; L.push(e); e.rtT = G.time + 1.6; return true; }
const tokFree = e => { if (e.tokT > G.time) e.tokT = G.time + rnd(.25, .6); };
// where a moving target will be after t seconds (k < 1 = partial lead), kept inside the arena
const lead = (o, t, k = 1) => ({ x: clamp(o.x + (o.vx || 0) * t * k, -G.W + .6, G.W - .6), z: o.z + (o.vz || 0) * t * k });
// ---- battle lines: when two groups meet, each side advances to its own shared line, holds briefly, then charges in staggered waves
const FRONT_X = new Set(['wolf', 'boribasi']);   /* wolf-headed soldiers hold the battle line with the other soldiers; the chieftain leads his own fight */
const frontable = e => !e.dead && !e.gone && !e.bg && e !== G.player && !e.d.ranged && !e.d.heavy && !FRONT_X.has(e.type) && !e.custom && e.speed > 0 && e.hp < 1e8 && e.team === 'enemy';
function frontTick(dt) {
  const F = G.front || (G.front = { ph: 'none', t: 0, quiet: 0 }); F.t += dt; const P = G.player; if (G.noFront || !P) return;
  const A = [], E = []; for (const e of G.ents) if (frontable(e)) (e.team === 'ally' ? A : E).push(e); if (!P.dead) A.push(P);
  let md = 1e9; for (const a of A) for (const b of E) { const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < md) md = d; }
  if (F.ph === 'none') {
    if (!A.length || !E.length || md > 34 || md < 8) return;
    const cA = { x: 0, z: 0 }, cE = { x: 0, z: 0 }; for (const a of A) { cA.x += a.x / A.length; cA.z += a.z / A.length; } for (const b of E) { cE.x += b.x / E.length; cE.z += b.z / E.length; }
    let ux = cE.x - cA.x, uz = cE.z - cA.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; const mt = A.concat(E).some(o => o.mounted);
    Object.assign(F, { ph: 'adv', t: 0, ux, uz, mx: (cA.x + cE.x) / 2, mz: (cA.z + cE.z) / 2, gap: mt ? 5.5 : 2.7, hd: rnd(.6, 1.3), quiet: 0 });
    for (const [L, sd] of [[E, -1]]) { const px = -uz, pz = ux; L.sort((a, b) => (a.x * px + a.z * pz) - (b.x * px + b.z * pz)); const sp = L.some(o => o.mounted) ? 2.7 : 1.7, m = L.reduce((s0, o) => s0 + ((o.x - F.mx) * px + (o.z - F.mz) * pz), 0) / L.length;
      L.forEach((o, i) => { const lat = m + (i - (L.length - 1) / 2) * sp + rnd(-.3, .3); o.fr = { sd, lat, rel: rnd(0, 1.7) * (o.mounted ? .6 : 1), dd: rnd(-.5, .5) }; o.cav = null; }); }
    return; }
  if (F.ph === 'adv') { let n = 0, k = 0; for (const o of A.concat(E)) if (o.fr) { k++; const q = frontPt(o); if (Math.hypot(q.x - o.x, q.z - o.z) < (o.mounted ? 2.2 : 1.1)) n++; } if (F.t > 4.5 || (k && n >= k * .7) || md < 3.5) { F.ph = 'hold'; F.t = 0; } }
  else if (F.ph === 'hold') { if (F.t > F.hd || md < 3) { F.ph = 'chg'; F.t = 0; } }
  else if (F.ph === 'chg') { if (F.t > 2.5) { F.ph = 'done'; F.t = 0; for (const o of G.ents) o.fr = null; } }
  else if (F.ph === 'done') { F.quiet = (!A.length || !E.length || md > 30) ? F.quiet + dt : 0; if (F.quiet > 2.5) { F.ph = 'none'; F.t = 0; } }
}
function frontPt(e) { const F = G.front, f = e.fr, px = -F.uz, pz = F.ux, off = -f.sd * (F.gap + f.dd); return { x: clamp(F.mx + F.ux * off + px * f.lat, -G.W + .8, G.W - .8), z: F.mz + F.uz * off + pz * f.lat }; }
// returns true while the unit is still walking to / holding its line
function frontHold(e, dt) {
  const F = G.front, f = e.fr; if (!F || !f) return false; if (F.ph === 'none' || F.ph === 'done' || (F.ph === 'chg' && F.t >= f.rel)) { e.fr = null; return false; }
  for (const o of G.ents) if (!o.dead && hostile(e.team, o.team) && Math.hypot(o.x - e.x, o.z - e.z) < (e.mounted ? 4 : 2.6)) { e.fr = null; return false; }
  const q = frontPt(e), gx = q.x - e.x, gz = q.z - e.z, gl = Math.hypot(gx, gz), fx0 = F.ux * f.sd, fz0 = F.uz * f.sd; relSlot(e);
  if (e.mounted) { if (gl > 1.6 && F.ph === 'adv') steer(e, q.x, q.z, Math.min(e.speed * 2.1 * pers(e).pace, gl * 1.4 + 1), dt); else steer(e, e.x + fx0 * 5, e.z + fz0 * 5, 0, dt); if (!/Attack|Shoot/.test(e.curName)) e.play('Idle_Combat'); return true; }
  if (gl > (e.mv ? .3 : .9)) { e.mv = 1; const sp = Math.min(F.ph === 'adv' ? 2.6 * pers(e).pace : 1.6, gl * 4); e.x += gx / gl * sp * dt; e.z += gz / gl * sp * dt; e.face(gl > 2 ? gx : fx0, gl > 2 ? gz : fz0, dt * 6); e.play('Walking_A'); }
  else { e.mv = 0; e.face(fx0, fz0, dt * 5); e.play('Idle_Combat'); }
  if (e.state !== 'chase') { e.state = 'chase'; e.clearTele(); } return true;
}
// red ground wedge that follows the attacker while he winds up (fills as the hit approaches)
const sectorGeo = {};
function arcTele(e, range, half, dur, color = 0xff2200) {
  const geo = sectorGeo[half] || (sectorGeo[half] = (() => { const g = new THREE.CircleGeometry(1, 20, -Math.PI / 2 - half, half * 2); g.rotateX(-Math.PI / 2); return g; })());
  const g = new THREE.Group(), rim = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .2, depthWrite: false })), disc = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .5, depthWrite: false }));
  rim.scale.setScalar(range); disc.scale.setScalar(.01); disc.position.y = .01; g.add(rim, disc); g.position.set(e.x, .07, e.z); g.rotation.y = e.rot; fxg.add(g);
  const o = { g, disc, r: range, t: 0, dur, dead: false, own: e }; G.tele.push(o); return o;
}
const dmgOf = (e, k = 1) => () => rnd(e.d.dmg[0], e.d.dmg[1]) * e.dmgMul * (e.buffT > 0 ? 1.3 : 1) * k;
function startWind(e, tg, n) {
  const d = e.d; e.state = 'windup'; e.hitN = n; const wd = e.tm = e.wd = d.windup * (n ? .6 : rnd(.92, 1.12)); e.clearTele();
  if (d.slam) { e.play('E_Slam', { once: true, force: true, ts: .9 / wd, dur: wd / .55 }); e.tele = telegraph(tg.x, tg.z, d.slam, wd, W3C.ub); e.slamAt = { x: tg.x, z: tg.z }; ubMark(e, wd); return; }
  e.play(n % 2 ? '1H_Melee_Attack_Slice_Diagonal' : 'E_Attack', { once: true, force: true, ts: .75 / wd, dur: wd / .42 });
  if (tg === G.player || d.elite) { e.tele = arcTele(e, d.range + .5 + tg.r * .5, d.lane ? .22 : .95, wd, W3C.mel); if (!n) { burst(e.x, e.h * .82, e.z, 0xff3a20, .8); if (d.elite) Sfx.swing(sv(e, tg)); } }
}
function strike(e, tg) {
  const d = e.d;
  if (d.slam) { const s = e.slamAt; hitCircle(s.x, s.z, d.slam, dmgOf(e), e.team, e, { ub: 1 }); ringFx(s.x, s.z, d.slam, 0xff5522); Sfx.big(); G.shake = Math.max(G.shake, .5); e.tele = null; }
  else { if (d.lane) { e.kx += Math.sin(e.rot) * 9; e.kz += Math.cos(e.rot) * 9; } Sfx.swing(sv(e, tg)); if (hitArc(e, d.range + .5 + (d.lane ? 1.2 : 0), d.lane ? .8 : .25, dmgOf(e, e.hitN ? .8 : 1), d.lane ? { kb: 9, mel: 1 } : { mel: 1 })) Sfx.hit(sv(e, tg)); slashFx(e.x, e.h * .5, e.z, e.rot, (d.scale || 1) * .9, e.team === 'enemy' ? 0xff6644 : 0xfff0c0); }
  if (e.hitN + 1 < (d.string || 1) && !tg.dead && Math.random() < .85 && Math.hypot(tg.x - e.x, tg.z - e.z) < d.range + tg.r + 1.8) { e.kx += Math.sin(e.rot) * 3; e.kz += Math.cos(e.rot) * 3; startWind(e, tg, e.hitN + 1); return; }
  e.state = 'recover'; e.tm = (d.rec || .35) * rnd(.8, 1.5); e.cd = d.cd * rnd(.7, 1.4) * pers(e).tempo; tokFree(e);
}
function afterRec(e) {
  const pe = pers(e), r = Math.random(); if (e.d.heavy || e.mate) { e.state = 'chase'; return; }
  if (r < .28) { e.state = 'side'; e.tm = rnd(.45, 1.0); e.sd = Math.random() < .7 ? pe.side : -pe.side; relSlot(e); }
  else if (r < .42) { e.state = 'back'; e.tm = rnd(.35, .7); }
  else if (e.d.block && r < .42 + .3 * pe.guard) { e.state = 'block'; e.tm = rnd(.6, 1.3); }
  else e.state = 'chase';
}
function windTick(e, tg, dt, dx, dz) { const d = e.d; e.tm -= dt; if (!d.slam && e.tm > e.wd * (d.lane ? .45 : .4)) e.face(dx, dz, dt * (e.hitN ? 12 : 6)); if (e.tm <= 0) strike(e, tg); }
function meleeAI(e, tg, dt) {
  const d = e.d, pe = pers(e), dx = tg.x - e.x, dz = tg.z - e.z, dist = Math.hypot(dx, dz) || .01, st = e.state; e.cd -= dt;
  const reach = d.range * .82 + tg.r, sp0 = e.speed * e.spdMul * (e.hasteT > 0 ? 1.3 : 1) * pe.pace;
  if (st === 'chase') {
    if (WEAK.has(e.type) && !e.fled && e.team === 'enemy' && !e.mate && e.hp < e.maxHp * .3) { e.fled = 1; if (pe.nerve < .22) { e.state = 'flee'; e.tm = rnd(2.5, 4.5); relSlot(e); return; } }
    const sg = slotGoal(e, tg, reach, dist, dt), gx = sg.x - e.x, gz = sg.z - e.z, gl = Math.hypot(gx, gz), run = gl > 4.2 || (e.run2 && gl > 2.2); e.run2 = run;
    if (gl > (e.mv ? .2 : .55)) { e.mv = 1; const s2 = Math.min(run ? sp0 : Math.max(1.6, sp0 * .55), gl * 6); e.x += gx / gl * s2 * dt; e.z += gz / gl * s2 * dt; if (dist > reach + 2.5) e.face(gx, gz, dt * 8); else e.face(dx, dz, dt * 8); e.play(run ? (d.run || 'Running_A') : 'Walking_A'); }
    else { e.mv = 0; e.face(dx, dz, dt * 8); e.play('Idle_Combat'); }
    if (dist < d.range + tg.r && sg.ok) {
      if (e.cd <= 0) {
        if (tg !== G.player || d.heavy || tokOK(e)) startWind(e, tg, 0);
        else if (G.time > (e.ftT || 0)) { e.ftT = G.time + rnd(1.6, 3.5); if (Math.random() < .4) { e.kx += dx / dist * 4.5; e.kz += dz / dist * 4.5; e.state = 'back'; e.tm = rnd(.4, .6); } else { e.state = 'side'; e.tm = rnd(.5, 1); e.sd = Math.random() < .5 ? 1 : -1; relSlot(e); } }
      } else if (e.cd > .5 && !d.heavy && !e.mate && G.time > (e.mvT || 0)) { e.mvT = G.time + rnd(.9, 2.4); const r = Math.random(); if (r < .22) { e.state = 'side'; e.tm = rnd(.4, .8); e.sd = Math.random() < .5 ? 1 : -1; relSlot(e); } else if (d.block && r < .22 + .25 * pe.guard) { e.state = 'block'; e.tm = rnd(.5, 1.1); } }
    }
  } else if (st === 'windup') windTick(e, tg, dt, dx, dz);
  else if (st === 'recover') { e.tm -= dt; if (e.tm <= 0) afterRec(e); }
  else if (st === 'side') { e.tm -= dt; const k = dist < reach ? -.5 : dist > reach + 1.2 ? .5 : 0, s = Math.min(sp0 * .6, 2.6); e.x += (-dz / dist * e.sd + dx / dist * k) * s * dt; e.z += (dx / dist * e.sd + dz / dist * k) * s * dt; e.face(dx, dz, dt * 10); e.play('Walking_A'); if (e.tm <= 0 || e.bump) e.state = 'chase'; }
  else if (st === 'back') { e.tm -= dt; e.x -= dx / dist * 2.2 * dt; e.z -= dz / dist * 2.2 * dt; e.face(dx, dz, dt * 10); e.play('Walking_Backwards'); if (e.tm <= 0) e.state = 'chase'; }
  else if (st === 'block') { e.tm -= dt; e.face(dx, dz, dt * 10); e.play('Idle_Combat'); if (e.tm <= 0 || dist > reach + 3) e.state = 'chase'; }
  else if (st === 'flee') { e.tm -= dt; const s = sp0 * 1.1; e.x -= dx / dist * s * dt; e.z -= dz / dist * s * dt; e.face(-dx, -dz, dt * 8); e.play('Running_A'); if (e.tm <= 0 || dist > 16) { e.state = 'chase'; e.cd = rnd(.5, 1.5); } }
  else e.state = 'chase';
}
function rangedAI(e, tg, dt) {
  const d = e.d, pe = pers(e), dx = tg.x - e.x, dz = tg.z - e.z, dist = Math.hypot(dx, dz) || .01; e.cd -= dt; relSlot(e);
  const sp = e.speed * e.spdMul * pe.pace, keep = d.keep * (.85 + pe.guard * .3);
  if (e.state === 'chase') {
    let mx = 0, mz = 0, back = false; if (dist < keep - 4.5) { mx = -dx / dist; mz = -dz / dist; back = true; } else if (dist > keep + 2) { mx = dx / dist; mz = dz / dist; }
    if (!back && !e.mounted) { let th = null, td = 3.6; for (const o of G.ents) { if (o === tg || o.dead || o.gone || o.bg || o.d.ranged || !hostile(e.team, o.team)) continue; const q = Math.hypot(o.x - e.x, o.z - e.z); if (q < td) { td = q; th = o; } } if (th) { mx = (e.x - th.x) / (td || .01); mz = (e.z - th.z) / (td || .01); back = true; } }
    if (e.rp) { const rx = e.rp.x - e.x; if (Math.abs(rx) < .5 || G.time > e.rp.t || e.bump) e.rp = null; else mx += Math.sign(rx); }
    const ml = Math.hypot(mx, mz), flee = back && (dist < 5 || dist > keep - 4.5) && !e.bump;
    if (ml > .1) { const s = sp * (flee ? 1.25 : back ? .7 : 1); e.x += mx / ml * s * dt; e.z += mz / ml * s * dt; if (flee) { e.face(mx, mz, dt * 12); e.play('Running_A'); } else { e.face(dx, dz, dt * 9); e.play(back && !e.rp ? 'Walking_Backwards' : 'Running_A'); } }
    else { e.face(dx, dz, dt * 9); e.play('Idle'); }
    if (e.cd <= 0 && dist < keep + 6 && !flee && tg === G.player && !rtokOK(e)) e.cd = rnd(.4, 1);
    if (e.cd <= 0 && dist < keep + 6 && !flee) { e.state = 'windup'; e.tm = e.wd = d.windup * rnd(.9, 1.2); e.vol = d.volley || 1; e.play(d.orb ? 'Spellcast_Shoot' : '2H_Ranged_Shoot', { once: true, force: true });
      if (tg === G.player) { const L = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 5), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: .55, depthWrite: false })); fxg.add(L); fx.push({ m: L, t: 0, dur: e.tm, s0: 1, s1: 1, line: [e, tg] }); burst(e.x, e.h * .8, e.z, 0xff3a20, .7); } }
  } else if (e.state === 'windup') {
    e.tm -= dt; e.face(dx, dz, dt * 8);
    if (e.tm <= 0) { const k = (d.volley || 1) - e.vol, off = d.volley ? (k - (d.volley - 1) / 2) * 1.25 : 0, q = lead(tg, dist / (d.orb ? 9 : 17), d.orb ? .5 : rnd(.6, .95)); shoot(e, { x: q.x - dz / dist * off + rnd(-.25, .25), z: q.z + dx / dist * off + rnd(-.25, .25) }, dmgOf(e)(), d.orb); e.vol--; if (e.vol > 0) e.tm = .24; else { e.state = 'recover'; e.tm = .4; e.cd = d.cd * rnd(.8, 1.3) * pe.tempo; } }
  } else if (e.state === 'recover') { e.tm -= dt; if (e.tm <= 0) { e.state = 'chase'; if (!d.orb || Math.random() < .5) e.rp = { x: clamp(e.x + (Math.random() < .5 ? -1 : 1) * rnd(3, 6.5), -G.W + 1, G.W - 1), t: G.time + 3 }; } }
  else e.state = 'chase';
}
// lingering ground zones (shaman curse) and delayed quakes (boss phases)
function curse(x, z, r, src) { telegraph(x, z, r, 1.1, 0xa030ff); (G.zones || (G.zones = [])).push({ x, z, r, t: -1.1, life: 4.5, src, team: src.team, n: 0, dmg: 8 }); }
function quake(x, z, r, delay, dmg, src) { telegraph(x, z, r, delay, 0xff7a10); (G.zones || (G.zones = [])).push({ x, z, r, t: -delay, life: 0, src, team: src.team, n: 0, dmg, once: true }); }
function tickZones(dt) { const L = G.zones || []; for (let i = L.length - 1; i >= 0; i--) { const q = L[i]; q.t += dt; if (q.t < 0) continue;
    if (q.once) { hitCircle(q.x, q.z, q.r, q.dmg, q.team, q.src && !q.src.dead ? q.src : null, { kb: 8, nf: 1 }); ringFx(q.x, q.z, q.r, 0xff7a10); burst(q.x, .5, q.z, 0xc8a070, q.r * .9, true); Sfx.big(); G.shake = Math.max(G.shake, .35); L.splice(i, 1); continue; }
    if (!q.m) { q.m = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0x8a20e0, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending })); q.m.position.set(q.x, .05, q.z); q.m.scale.setScalar(q.r); fxg.add(q.m); ringFx(q.x, q.z, q.r, 0xb040ff); }
    q.m.material.opacity = .24 + Math.sin(q.t * 7) * .08; if (Math.random() < .25) { const a = rnd(0, 6.28), rr = rnd(0, q.r); sparks(q.x + Math.cos(a) * rr, .2, q.z + Math.sin(a) * rr, 0xb050ff, 1, 1.5); }
    if (q.t > q.n * .5) { q.n++; hitCircle(q.x, q.z, q.r - .3, q.dmg, q.team, q.src && !q.src.dead ? q.src : null, { kb: 0, nf: 1 }); }
    if (q.t > q.life) { fxg.remove(q.m); L.splice(i, 1); } } }
function castTick(e, dt) { if (!(e.castT > 0)) return false; e.castT -= dt; if (e.castT <= 0 && e.castFn) { const f = e.castFn; e.castFn = null; f(); } return true; }
function cast(e, dur, fn, col) { e.castT = dur; e.castFn = fn; e.clearTele(); e.play('Cheer', { once: true, force: true, dur: dur + .3 }); burst(e.x, e.h * .9, e.z, col, 1.6); ringFx(e.x, e.z, 1.8, col); }
// shaman: stays back, heals + emboldens his side, curses the ground under his target, summons wolves
function shamanAI(e, tg, dt) {
  if (castTick(e, dt)) return; const dist = Math.hypot(tg.x - e.x, tg.z - e.z);
  if (e.state === 'chase' && e.team === 'enemy' && !e.mounted) {
    e.hT = (e.hT ?? rnd(4, 7)) - dt; e.cT = (e.cT ?? rnd(2.5, 5)) - dt; e.sT = (e.sT ?? rnd(9, 13)) - dt;
    if (e.hT <= 0) { const fr = G.ents.filter(o => o !== e && !o.dead && o.team === e.team && !o.bg && Math.hypot(o.x - e.x, o.z - e.z) < 10); if (fr.length) { e.hT = rnd(7, 10);
        cast(e, .8, () => { Sfx.power(); ringFx(e.x, e.z, 10, 0x55ff88); for (const o of fr) { if (o.dead) continue; const h = Math.round(o.maxHp * (o.d.heavy ? .03 : .2)); if (o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + h); num(o, '+' + h, 'h'); } o.buffT = 6; burst(o.x, o.h * .6, o.z, 0x55ff88, 1.3); } }, 0x55ff88); return; } e.hT = 2; }
    if (e.cT <= 0 && dist < 16) { e.cT = rnd(8, 12); const x = tg.x, z = tg.z; cast(e, .7, () => curse(x, z, 3.2, e), 0xb040ff); return; }
    if (e.sT <= 0) { if ((e.sumN || 0) < 2 && enemies().length < 9) { e.sT = rnd(16, 22); e.sumN = (e.sumN || 0) + 1; cast(e, 1.0, () => { Sfx.howl(); for (const s of [-1, 1]) { const w = spawn('wolf', clamp(e.x + s * 2.2, -G.W + 1, G.W - 1), e.z + 1.2, 'enemy', true); w.maxHp = w.hp = Math.round(w.maxHp * .6); w.sum = true; } }, 0x7722cc); return; } e.sT = 5; }
  }
  rangedAI(e, tg, dt);
}
// wolf: fast flanker; circles to the side, crouches (telegraph) and pounces through, then darts away
function wolfAI(e, tg, dt) {
  const d = e.d, pe = pers(e), dx = tg.x - e.x, dz = tg.z - e.z, dist = Math.hypot(dx, dz) || .01, st = e.state; e.cd -= dt; const sp = e.speed * e.spdMul * (e.hasteT > 0 ? 1.3 : 1) * pe.pace;
  if (st === 'chase') {
    relSlot(e); let gx, gz;
    if (dist > 7.5) { const fa = Math.atan2(e.x - tg.x, e.z - tg.z) + pe.side * .35; gx = clamp(tg.x + Math.sin(fa) * 5, -G.W + .5, G.W - .5) - e.x; gz = tg.z + Math.cos(fa) * 5 - e.z; e.stk = null; }  // run straight in, slightly to her flank
    else { let k = e.stk; if (!k || k.tg !== tg || G.time > k.t || Math.hypot(tg.x - k.ax, tg.z - k.az) > 2.5) { const fa = Math.atan2(e.x - tg.x, e.z - tg.z) + pe.side * rnd(.2, .7), R = rnd(3.6, 5); k = e.stk = { tg, ax: tg.x, az: tg.z, x: clamp(tg.x + Math.sin(fa) * R, -G.W + .5, G.W - .5), z: tg.z + Math.cos(fa) * R, t: G.time + rnd(2.2, 4) }; }
      gx = k.x - e.x; gz = k.z - e.z; }  // stalk: walk to one spot beside the prey, stand and watch, re-pick only when the prey moves away
    const gl = Math.hypot(gx, gz) || .01;
    if (gl > (e.mv ? .4 : 1.1)) { e.mv = 1; const s = Math.min(dist > 7.5 ? sp : sp * .45, gl * 4); e.x += gx / gl * s * dt; e.z += gz / gl * s * dt; e.face(dist > 7.5 ? gx : dx, dist > 7.5 ? gz : dz, dt * 9); e.play(dist > 7.5 ? (d.run || 'Running_A') : 'Walking_A'); } else { e.mv = 0; e.face(dx, dz, dt * 9); e.play('Idle_Combat'); }
    if (e.cd <= 0 && tg === G.player && !tokOK(e) && e.tg === tg) { e.retT = 0; e.cd = rnd(.6, 1.2); }  // no free attack token on the player: look for other prey instead of circling
    if (e.cd <= 0 && (tg !== G.player || tokOK(e))) {
      if (dist > 2.6 && dist < 8) { e.state = 'crouch'; e.tm = e.wd = .5 * rnd(.9, 1.25); e.face(dx, dz, 1); e.pl = Math.min(8.5, dist + 1.8); e.play('Idle_Combat', { force: true }); e.clearTele(); if (tg === G.player) e.tele = arcTele(e, e.pl, .2, e.tm); burst(e.x, e.h * .7, e.z, 0xff3020, .8); }
      else if (dist <= 2.6) startWind(e, tg, 0);
    }
  } else if (st === 'crouch') { e.tm -= dt; if (e.tm > .2) e.face(dx, dz, dt * 7); if (e.tm <= 0) { e.state = 'pounce'; e.yM = 1; e.pd = 0; e.ph = false; e.pvx = Math.sin(e.rot); e.pvz = Math.cos(e.rot); e.play('Jump_Full_Long', { once: true, force: true, ts: 1.5 }); Sfx.dodge(); } }
  else if (st === 'pounce') {
    const v = 17; e.x += e.pvx * v * dt; e.z += e.pvz * v * dt; e.pd += v * dt; e.y = Math.sin(clamp(e.pd / e.pl, 0, 1) * Math.PI) * 1.3;
    if (!e.ph) for (const o of G.ents) { if (o.dead || !hostile(e.team, o.team)) continue; if (Math.hypot(o.x - e.x, o.z - e.z) < .9 + o.r) { e.ph = true; if (o.damage(dmgOf(e, 1.25)(), e, { kb: 8, mel: 1 })) Sfx.hit(sv(e, o)); slashFx(e.x, 1, e.z, e.rot, 1, 0xff5040); break; } }
    if (e.pd >= e.pl || e.bump) { e.y = 0; e.state = 'recover'; e.tm = rnd(.3, .55); e.cd = d.cd * rnd(1.4, 2.4) * pe.tempo; tokFree(e); }
  } else if (st === 'windup') windTick(e, tg, dt, dx, dz);
  else if (st === 'recover') { e.tm -= dt; if (e.tm <= 0) { e.state = 'side'; e.tm = rnd(.4, .7); pe.side = -pe.side; e.sd = pe.side; e.stk = null; } }
  else if (st === 'side') { e.tm -= dt; const mx = -dz / dist * e.sd - dx / dist * .6, mz = dx / dist * e.sd - dz / dist * .6, ml = Math.hypot(mx, mz) || 1; e.x += mx / ml * sp * dt; e.z += mz / ml * sp * dt; e.face(mx, mz, dt * 10); e.play(d.run || 'Running_A'); if (e.tm <= 0 || e.bump) e.state = 'chase'; }
  else e.state = 'chase';
}
// wolf chieftain (mini-boss): howl that buffs the pack, telegraphed leap slam, heavy bites; has poise
function chiefAI(e, tg, dt) {
  if (castTick(e, dt)) return; const d = e.d, dx = tg.x - e.x, dz = tg.z - e.z, dist = Math.hypot(dx, dz) || .01;
  if (e.state === 'leapS') { e.tm -= dt; let u = clamp(1 - e.tm / e.wd, 0, 1); if (u < .22 && !tg.dead) { const q = lead(tg, e.tm, .85), lx = q.x - e.l0.x, lz = q.z - e.l0.z, ll = Math.hypot(lx, lz), k = ll > 14 ? 14 / ll : 1; e.l1 = { x: e.l0.x + lx * k, z: e.l0.z + lz * k }; if (e.tele) e.tele.g.position.set(e.l1.x, .06, e.l1.z); e.face(lx, lz, dt * 10); } u = clamp((u - .22) / .78, 0, 1); e.x = e.l0.x + (e.l1.x - e.l0.x) * u; e.z = e.l0.z + (e.l1.z - e.l0.z) * u; e.y = Math.sin(u * Math.PI) * 3.2;
    if (e.tm <= 0) { e.y = 0; hitCircle(e.l1.x, e.l1.z, 3.4, dmgOf(e, 1.3), e.team, e, { kb: 10 }); ringFx(e.l1.x, e.l1.z, 3.6, 0xff5522); burst(e.x, .5, e.z, 0xc8a070, 3.5, true); Sfx.big(); G.shake = Math.max(G.shake, .45); e.tele = null; e.cd = d.cd;
      if (!tg.dead && Math.hypot(tg.x - e.x, tg.z - e.z) < 4.6) { e.face(tg.x - e.x, tg.z - e.z, 1); startWind(e, tg, 1); e.tm = e.wd = .42; }
      else { e.state = 'recover'; e.tm = 1.4; e.play('Cheer', { once: true, force: true, dur: 1.4 }); Sfx.howl(); e.punT = G.time + 1.4; } } return; }
  if (e.state === 'chase') {
    e.howlT = (e.howlT ?? 2.5) - dt; e.lsT = (e.lsT ?? rnd(4, 6)) - dt;
    if (e.howlT <= 0) { e.howlT = rnd(11, 14); cast(e, .9, () => { Sfx.howl(); ringFx(e.x, e.z, 14, 0xff4020); ringFx(e.x, e.z, 7, 0xff7040); G.shake = Math.max(G.shake, .3); for (const o of G.ents) if (!o.dead && o.team === e.team && (o.type === 'wolf' || o === e) && Math.hypot(o.x - e.x, o.z - e.z) < 16) { o.buffT = 8; o.hasteT = 8; burst(o.x, o.h * .7, o.z, 0xff4020, 1.4); } }, 0xff4020); return; }
    if (e.lsT <= 0 && dist > 3.5 && dist < 13) { e.lsT = rnd(6, 9); e.state = 'leapS'; e.yM = 1; e.tm = e.wd = 1.05; e.l0 = { x: e.x, z: e.z }; e.l1 = { x: tg.x, z: tg.z }; e.clearTele(); e.tele = telegraph(tg.x, tg.z, 3.4, 1.05, W3C.ub); ubMark(e, 1.05); e.face(dx, dz, 1); e.play('Jump_Full_Long', { once: true, force: true, dur: 1.05 }); Sfx.howl(); relSlot(e); return; }
  }
  meleeAI(e, tg, dt);
}
// mounted steering: limited turn rate (turn radius ~4 m at speed), own acceleration
function steer(e, wx, wz, wantV, dt) {
  const C = e.cav || (e.cav = { v: Math.min(e.spd || 0, 12), m: 'charge', side: pers(e).side, out: 0, t: 0, sw: 0 }); let df = Math.atan2(wx - e.x, wz - e.z) - e.rot; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
  if (wantV > 0 || C.v > .5) { const tr = clamp(C.v / 4.2, .8, 2.4) * dt; e.rot += clamp(df, -tr, tr); }
  if (Math.abs(df) > 1.3 && wantV > 0) wantV *= .65; C.v = Math.max(0, C.v + clamp(wantV - C.v, -10 * dt, 6 * dt)); e.x += Math.sin(e.rot) * C.v * dt; e.z += Math.cos(e.rot) * C.v * dt; return df;
}
// cavalry: charge to pass alongside the target, strike in passing, ride on, wheel round in an arc, charge again
function cavAI(e, tg, dt) {
  const d = e.d, pe = pers(e), dx = tg.x - e.x, dz = tg.z - e.z, dist = Math.hypot(dx, dz) || .01; e.cd -= dt; relSlot(e);
  if (!e.cav && (e.spd || 0) < 1) e.rot = Math.atan2(dx, dz) + rnd(-.5, .5); const C = e.cav || (steer(e, e.x, e.z, 0, 0), e.cav), top = e.speed * e.spdMul * 2 * pe.pace, reach = d.range + 1.1 + tg.r; let wx, wz, wantV = top; C.t += dt;
  if (d.ranged) { const a = Math.atan2(e.x - tg.x, e.z - tg.z) + C.side * .55, R = d.keep * .85; wx = tg.x + Math.sin(a) * R; wz = tg.z + Math.cos(a) * R; wantV = top * .75;
    if (e.cd <= 0 && dist < d.keep + 7) { e.cd = d.cd * rnd(.8, 1.3) / (d.volley || 1) * 1.6; e.play(d.orb ? 'Spellcast_Shoot' : '2H_Ranged_Shoot', { once: true, force: true }); shoot(e, tg, dmgOf(e)(), d.orb); } if (C.t > 9) { C.t = 0; C.side = -C.side; } }
  else if (C.m === 'charge') { wx = tg.x - dz / dist * C.side * 1.7; wz = tg.z + dx / dist * C.side * 1.7;
    if (e.cd <= 0 && !C.sw && dist < reach + 1.2 && (tg !== G.player || tokOK(e))) { C.sw = .28; e.play('E_Attack', { once: true, force: true, ts: 2, dur: .6 }); if (tg === G.player) { e.clearTele(); e.tele = arcTele(e, reach + .4, 1.5, .28); burst(e.x, e.h * 1.2, e.z, 0xff3a20, .8); } }
    const ahead = dx * Math.sin(e.rot) + dz * Math.cos(e.rot); if ((dist < 3.4 && ahead < 0) || dist < 1.3 || C.t > 6) { C.m = 'out'; C.out = rnd(5, 10); C.t = 0; if (Math.random() < .4) C.side = -C.side; } }
  else if (C.m === 'out') { wx = e.x + Math.sin(e.rot) * 6; wz = e.z + Math.cos(e.rot) * 6; C.out -= C.v * dt; if (C.out <= 0 || dist > 17 || e.bump || C.t > 3) { C.m = 'wheel'; C.t = 0; } }
  else { wx = tg.x; wz = tg.z; wantV = top * .72; }
  wx = clamp(wx, -G.W + 1.6, G.W - 1.6); if (wz < G.limitZ + 2) wz = G.limitZ + 2;
  const df = steer(e, wx, wz, wantV, dt); if (C.m === 'wheel' && C.t > .25 && (Math.abs(df) < .45 || C.t > 5)) { C.m = 'charge'; C.t = 0; }
  if (C.sw > 0) { C.sw -= dt; if (C.sw <= 0) { C.sw = 0; Sfx.swing(sv(e, tg)); const sd = (dx * Math.cos(e.rot) - dz * Math.sin(e.rot)) > 0 ? 1 : -1; slashFx(e.x + Math.cos(e.rot) * sd * .8, 1.9, e.z - Math.sin(e.rot) * sd * .8, e.rot + sd * 1.2, 1.1, e.team === 'enemy' ? 0xff6644 : 0xfff0c0); if (dist < reach + .5 && !tg.dead) { if (tg.damage(dmgOf(e, 1.2)(), e, { kb: 7, mel: 1 })) Sfx.hit(sv(e, tg)); } e.cd = d.cd * rnd(.8, 1.4); tokFree(e); } }
  if (!C.sw && !/Attack|Shoot/.test(e.curName)) e.play('Idle_Combat');
}
// varied idle behaviour for an ally with nothing to fight
function idleAct(e, dt) {
  let b = e.ib; const P = G.player;
  if (!b || G.time > b.t) { const r = Math.random(); b = e.ib = { k: 'stand', t: G.time + rnd(2, 6) };
    if (r < .24) { b.k = 'look'; b.a = e.rot + rnd(-1.7, 1.7); } else if (r < .4) { b.k = 'guard'; b.a = Math.PI + rnd(-.8, .8); }
    else if (r < .56) { let m = null, md = 6; for (const o of G.ents) if (o !== e && o !== P && !o.dead && o.team === e.team) { const dd = Math.hypot(o.x - e.x, o.z - e.z); if (dd < md) { md = dd; m = o; } } if (m) { b.k = 'chat'; b.o = m; } }
    else if (r < .7 && e.hm) { b.k = 'stroll'; e.hm.x = clamp(e.hm.x + rnd(-2.6, 2.6), -G.W + 1, G.W - 1); e.hm.z = Math.min(5.5, e.hm.z + rnd(-2.2, 2.2)); return; }
    else if (r < .76 && !e.mounted) { b.k = 'cheer'; b.t = G.time + 1.7; e.play('Cheer', { once: true, force: true }); return; } else if (r < .88) b.k = 'watch'; }
  if (b.k === 'cheer') return;
  if (b.k === 'look' || b.k === 'guard') e.face(Math.sin(b.a), Math.cos(b.a), dt * 2.5); else if (b.k === 'chat' && b.o && !b.o.dead) e.face(b.o.x - e.x, b.o.z - e.z, dt * 3); else if (b.k === 'watch' && P) e.face(P.x - e.x, P.z - e.z, dt * 3);
  e.play(b.k === 'guard' ? 'Idle_Combat' : 'Idle');
}
// no enemies: each ally keeps her own loose spot near the player. She notices the player has moved on only after
// her own delay (0.5-3 s), picks a new random spot, walks there, and sprints only when left far behind (>20 m).
// allies lag fix: the hero leaps a ravine (colB.ravine) — a follower standing at its edge leaps after her instead of running on the spot forever (1-1 / 1-4: whole host stuck at z -159)
function ravineHop(e, P) { if (e.alp) return true;
  for (const b of G.colB) { if (b.off || !b.ravine) continue; const r = (e.r || .5) + .9; let z1 = null;
    if (e.z > b.z2 && e.z < b.z2 + r + .6 && P.z < b.z1) z1 = b.z1 - r; else if (e.z < b.z1 && e.z > b.z1 - r - .6 && P.z > b.z2) z1 = b.z2 + r; if (z1 === null) continue;
    const x1 = clamp(e.x + (P.x - e.x) * .25, -G.W + 1, G.W - 1); e.alp = { x0: e.x, z0: e.z, x1, z1, t: 0, dur: .45 + Math.abs(z1 - e.z) * .035 }; e.leaping = true; e.face(x1 - e.x, z1 - e.z, 1); e.play('Jump_Full_Long', { once: true, force: true, ts: 1.5 }); return true; }
  return false; }
function allyLeap(e, dt) { const a = e.alp; a.t += dt; const u = clamp(a.t / a.dur, 0, 1); e.x = a.x0 + (a.x1 - a.x0) * u; e.z = a.z0 + (a.z1 - a.z0) * u; e.y = Math.sin(u * Math.PI) * 1.6;
  if (u >= 1) { e.y = 0; e.alp = null; e.leaping = false; e.curName = ''; e.play('Running_A', { force: true }); } return true; }
// allies lag fix: a follower pressed against a wall / house / yurt slides along it toward its nearer open end (1-1: maidens stuck behind the gate wall at z -122 with the gap 5 m aside)
function slideDir(e, dx, dz) { const n = e.bump; if (!n || dx * n.nx + dz * n.nz > -.2) { e.slS = 0; return { x: dx, z: dz }; }
  const tx = -n.nz, tz = n.nx; if (!e.slS) { const b = e.bumpB; let sg = (tx * dx + tz * dz) >= 0 ? 1 : -1;
    if (b) { const ax = Math.abs(tx) > .5, lo = ax ? b.x1 : b.z1, hi = ax ? b.x2 : b.z2, c = ax ? e.x : e.z, okLo = !ax || lo > -G.W + .8, okHi = !ax || hi < G.W - .8, pick = okLo && okHi ? (c - lo < hi - c ? -1 : 1) : okHi ? 1 : okLo ? -1 : sg; sg = pick * Math.sign((ax ? tx : tz) || 1); }
    e.slS = sg; }
  return { x: tx * e.slS * .92 + n.nx * .08, z: tz * e.slS * .92 + n.nz * .08 }; }
function blockedAt(x, z, r) { for (const b of G.colB) if (!b.off && x > b.x1 - r && x < b.x2 + r && z > b.z1 - r && z < b.z2 + r) return true; for (const c of G.colC) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true; return false; }
// last resort: a follower left > 22 m behind for 3 s (mounted: 20 m, 1.5 s) (blocked with no way round) rejoins from behind the hero, only while both spots are off-screen
function rejoin(e, P, pdist, dt) { const mt = e.mounted; if (pdist < (mt ? 20 : 22) || G.duel || e.vict || e.cart) { e.alT = 0; return false; } e.alT = (e.alT || 0) + dt; if (e.alT < (mt ? 1.5 : 3)) return false;   /* testers (4-1 ride, 4-2 deck): nobody stays > 22 m behind — was 30 m for 5 s */
  if (onScreen(e.x, e.z, 1.2)) return false; for (let i = 0; i < 6; i++) { const x = clamp(P.x + rnd(-5, 5), -G.W + 1, G.W - 1), z = P.z + rnd(14, 20); if (z > 5.5 || onScreen(x, z, 1.2) || barrierBetween(P.z, z) || blockedAt(x, z, (e.r || .5) + .3)) continue; let ok = true; for (const b of G.colB) if (b.ravine && !b.off && ((z > b.z2 && P.z < b.z1) || (z < b.z1 && P.z > b.z2))) ok = false; if (!ok) continue;
    e.x = e._lx = x; e.z = e._lz = z; e.o.position.set(x, 0, z); e.alT = 0; e.hm = null; G.rejoined = (G.rejoined || 0) + 1; return true; }
  return false; }
function drift(e, dt) {
  const P = G.player, pe = pers(e); relSlot(e); if (!P || P.dead) { e.play('Idle'); return; } const mt = e.mounted, k = mt ? 1.7 : 1, pdist = Math.hypot(P.x - e.x, P.z - e.z);
  let h = e.hm; if (!h) h = e.hm = { x: e.x, z: e.z, ax: P.x, az: P.z, tol: rnd(3.5, 7) * k, at: undefined };
  if (pdist > (pe.far || (pe.far = rnd(9, 12.5))) && !e.sprint) { e.sprint = true; h.at = G.time + rnd(0, .5); pe.far = rnd(9, 12.5); }   /* QA 2b: the host keeps up — catch-up run starts at 9–12 m (was 18–25) and is faster than her own run */ else if (pdist < pe.far * .42) e.sprint = false;
  const pv = Math.hypot(P.vx || 0, P.vz || 0), hMov = pv > 2.5;   /* allies lag fix: while she is on the move the spot is re-picked quickly and then tracks her (offset kept), so nobody walks to a spot the hero left 3 s ago */
  if (h.at === undefined && Math.hypot(P.x - h.ax, P.z - h.az) > h.tol) h.at = G.time + (hMov ? rnd(.1, .6) : rnd(.5, 3));
  if (h.at !== undefined && G.time >= h.at) { let ox, oz, n = 0; do { ox = rnd(-5.5, 5.5) * k; oz = rnd(1.8, 6.5) * k; } while (Math.hypot(ox, oz) < 2.6 * k && n++ < 8);  /* a loose group BEHIND her: she leads */ h.x = clamp(P.x + ox, -G.W + 1, G.W - 1); h.z = Math.min(P.z + oz, 5.5); h.ox = ox; h.oz = oz; h.ax = P.x; h.az = P.z; h.tol = rnd(4, 7.5) * k; h.at = undefined; e.ib = null; }
  if ((hMov || e.sprint) && h.ox !== undefined) { h.x = clamp(P.x + h.ox + (P.vx || 0) * .35, -G.W + 1, G.W - 1); h.z = Math.min(P.z + h.oz + (P.vz || 0) * .35, 5.5); h.ax = P.x; h.az = P.z; }
  if (!mt && ravineHop(e, P)) return;
  if (rejoin(e, P, pdist, dt)) return;
  const gx = h.x - e.x, gz = h.z - e.z, gl = Math.hypot(gx, gz);
  if (gl > (e.mv ? (mt ? 1.6 : .5) : (mt ? 3.2 : 1.6))) { e.mv = 1; const sp = e.sprint ? Math.max(e.speed * 1.25 * pe.pace, (P.speed || 7.4) * (pdist > 16 ? 1.35 : 1.12), pv * 1.15) * (mt ? 2 : 1) : (hMov ? Math.max(e.speed * pe.pace, pv) * (pdist > 7 ? 1.1 : .95) : (mt ? 4.6 : 2.3) * pe.pace);
    if (mt) { steer(e, h.x, h.z, Math.max(Math.min(sp, gl * 1.5 + 1), pdist > 12 ? pv * 1.25 : 0), dt); e.play('Idle'); } else { const s = Math.min(sp, gl * 4 + .6), q = slideDir(e, gx / gl, gz / gl); e.face(q.x, q.z, dt * 6); e.x += q.x * s * dt; e.z += q.z * s * dt; e.play(e.sprint || (hMov && s > 3.4) ? 'Running_A' : 'Walking_A'); } }
  else { e.mv = 0; if (mt && e.cav && e.cav.v > .1) steer(e, e.x + Math.sin(e.rot), e.z + Math.cos(e.rot), 0, dt); idleAct(e, dt); }
}
// generic boss phases (66% / 33%): roar + shockwave moment, then faster and with new ground attacks
// ---- boss / monster duels: the hero fights a boss alone; both sides stand back on a ring and watch, no adds; afterwards the battle goes on
const DUELT = new Set(['boribasi']);
function duelTick() { const P = G.player; let b = G.duel;
  if (b && (b.dead || b.gone || b.asleep || b.team !== 'enemy' || !P || P.dead || Math.hypot(b.x - P.x, b.z - P.z) > 30)) b = null;
  if (!b && P && !P.dead && !G.noDuel && !G.flying) { let bd = 16; for (const e of G.ents) { if (e.dead || e.gone || e.bg || e.team !== 'enemy' || e.asleep || e.duel || ((e.farT || 0) < -1e8 && e !== G.boss) || !(e.d.heavy || DUELT.has(e.type))) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd && (e === G.boss || e.tg === P || d < 9)) { bd = d; b = e; } } }
  if (b !== G.duel) { G.duel = b || null; if (b) { G.duelT = G.time; for (const o of G.ents) if (o !== P && o !== b && !o.dead && o.clearTele) o.clearTele(); if (G.zones) G.zones = G.zones.filter(z => !z.src || z.src === b); } } }
function watchAI(e, b, dt) { const P = G.player; if (e.state !== 'chase') e.state = 'chase'; e.clearTele(); relSlot(e); if (e.tg) { if (e.tg.tn) e.tg.tn--; e.tg = null; } e.cd = Math.max(e.cd || 0, .8); e.fr = null; e.castT = 0; e.castFn = null;
  const cx = (b.x + P.x) / 2, cz = (b.z + P.z) / 2, R = (e.team === 'ally' ? 9.5 : 10.5) + (b.r || 1) * .6 + (e.wR ?? (e.wR = rnd(0, 2.2)));
  const dx = e.x - cx, dz = e.z - cz, l = Math.hypot(dx, dz) || .01; if (l > 42) { if (!e.mounted) e.play('Idle'); return; }
  let tx = cx + dx / l * R, tz = cz + dz / l * R; if (Math.abs(tx) > G.W - .8) { tx = clamp(tx, -G.W + .8, G.W - .8); const rz = Math.sqrt(Math.max(0, R * R - (tx - cx) * (tx - cx))); tz = cz + (Math.abs(dz) > .3 ? Math.sign(dz) : (e.team === 'ally' ? 1 : -1)) * Math.max(rz, 3); }
  const gx = tx - e.x, gz = tz - e.z, gl = Math.hypot(gx, gz);
  if (gl > (e.mv ? .4 : 1.4)) { e.mv = 1; const sp = l < R - 3.5 ? Math.max(e.speed || 4, 4.2) : 2.4;
    if (e.mounted) { steer(e, tx, tz, Math.min(sp * 1.4, gl * 1.5 + 1), dt); e.play('Idle'); } else { const s2 = Math.min(sp, gl * 3 + .3); e.x += gx / gl * s2 * dt; e.z += gz / gl * s2 * dt; if (l < R - 3.5) e.face(gx, gz, dt * 8); else e.face(cx - e.x, cz - e.z, dt * 5); e.play(sp > 3 ? 'Running_A' : 'Walking_A'); } }
  else { e.mv = 0; if (e.mounted && e.cav && e.cav.v > .1) steer(e, e.x + Math.sin(e.rot), e.z + Math.cos(e.rot), 0, dt); e.face(cx - e.x, cz - e.z, dt * 4);
    if (!e.wc || G.time > e.wc) { e.wc = G.time + rnd(2.5, 6); if (Math.random() < .3 && !e.mounted) e.play('Cheer', { once: true, force: true }); } if (!/Cheer/.test(e.curName || '')) e.play(e.mounted ? 'Idle' : 'Idle_Combat'); } }
// ---- civilians / freed captives: stay >= 8 m from any fight, run to the road side, never under the hero's feet
const CIVT = new Set(['asir', 'mother', 'child', 'elder']);
function civAvoid(e, dt) { const P = G.player; let fx = 0, fz = 0, n = 0; const pF = P && !P.dead && G.ents.some(o => o.team === 'enemy' && !o.dead && !o.bg && (o.farT || 0) > -1e8 && Math.hypot(o.x - P.x, o.z - P.z) < 7);
  for (const o of G.ents) { if (o.dead || o.gone || o.bg) continue; let R = 0; if (o.team === 'enemy' && (o.farT || 0) > -1e8 && !o.asleep) R = 8; else if (o === P && e.team !== 'npc') R = pF ? 8 : 2.6; if (!R) continue;
    const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz) || .01; if (d < R) { const w = (R - d) / R; fx += dx / d * w; fz += dz / d * w; n++; } }
  if (!n) { e.civF = 0; return false; } const side = Math.sign(e.x) || (e.seed > 4.5 ? 1 : -1), wall = G.W - .7 - Math.abs(e.x); fx += side * (wall > .5 ? .9 : 0); const l = Math.hypot(fx, fz) || 1, sp = e.type === 'child' ? 3.6 : 4.2;
  e.x = clamp(e.x + fx / l * sp * dt, -G.W + .6, G.W - .6); e.z += fz / l * sp * dt; e.face(fx, fz, dt * 8); e.play('Running_A'); e.civF = 1; return true; }
// ---- other bystanders (watching soldiers, waiting maidens, named NPCs): keep ~2.4 m from anyone who is fighting, step aside at a walk (author: civilians keep
// away from fights). Units held by a script (ropes, cages, a ride, an elevated spot) are left where the script put them.
function npcSpace(e, dt) { if (e.st === 'held' || e.mounted || e.bg || e.y > .3 || e.custom) return false; const P = G.player; let fx = 0, fz = 0, n = 0;
  const pF = P && !P.dead && G.ents.some(o => o.team === 'enemy' && !o.dead && !o.bg && !o.asleep && (o.farT || 0) > -1e8 && Math.hypot(o.x - P.x, o.z - P.z) < 9);   /* the hero counts only while she is in a fight (talk / hand-over scenes need her close) */
  for (const o of G.ents) { if (o === e || o.dead || o.gone || o.bg || o.team === 'npc') continue; const fighting = o === P ? pF : (o.team === 'enemy' ? (o.farT || 0) > -1e8 && !o.asleep : !!(o.tg || o.act)); if (!fighting) continue;
    const R = 2.4 + (o.d.heavy ? (o.r || 1) * 1.5 : 0), dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz) || .01; if (d < R) { const w = (R - d) / R; fx += dx / d * w; fz += dz / d * w; n++; } }
  if (!n) { if (e.spaceF) { e.spaceF = 0; e.play('Idle'); } return false; }
  const l = Math.hypot(fx, fz) || 1, sp = 2.6 * Math.min(1, l + .35); e.x = clamp(e.x + fx / l * sp * dt, -G.W + .6, G.W - .6); e.z += fz / l * sp * dt; e.face(fx, fz, dt * 6); e.play('Walking_A'); e.spaceF = 1; return true; }
// ---- walk surfaces above the ground: plank decks (flat box meshes) and bridges over a river channel
function scanDecks() { const L = []; for (const m of world.children) { if (!m.isMesh || !m.geometry || m.geometry.type !== 'BoxGeometry') continue; const pr = m.geometry.parameters; if (!pr || Math.abs(m.rotation.y) > .02 || Math.abs(m.rotation.x) > .02) continue;
    const w = pr.width * m.scale.x, h = pr.height * m.scale.y, dd = pr.depth * m.scale.z, top = m.position.y + h / 2; if (w > 2.5 && dd > 6 && h < .7 && top > .08 && top < 1.6) L.push({ x1: m.position.x - w / 2, x2: m.position.x + w / 2, z1: m.position.z - dd / 2, z2: m.position.z + dd / 2, y: top }); }
  G.decks = L; G.deckN = world.children.length; }
function deckY(x, z) { if (!G.decks || G.deckN !== world.children.length) scanDecks(); let y = 0; for (const d of G.decks) if (x > d.x1 && x < d.x2 && z > d.z1 && z < d.z2 && d.y > y) y = d.y;
  if (!y && G.groundH && (G.groundHT || 0) >= (G.clrT || 0) - 50 && Math.abs(x) < G.W + .5) { let h = 0; try { h = G.groundH(x, z); } catch (er) { } if (h < -.3) y = .07; }  // lane over a river channel = on the plank bridge
  return y; }
function bossPhase(e, dt) {
  if (e.invuln || e.maxHp > 1e8 || e.team !== 'enemy' || G.noPhase) return false; const ph = e.hp < e.maxHp * .34 ? 3 : e.hp < e.maxHp * .67 ? 2 : 1; if (e.phase === undefined) e.phase = 1;
  if (ph > e.phase && !(e.phT > 0)) { e.phase = ph; e.phT = 1.5; e.phCd = 2.5; e.clearTele(); e.state = 'chase'; e.play('Cheer', { once: true, force: true, dur: 1.5 }); Sfx.howl(); Sfx.big(); flash(.3); G.slow = Math.max(G.slow || 0, .5); G.shake = Math.max(G.shake, .6); G.zk = Math.max(G.zk || 0, .35);
    ringFx(e.x, e.z, 9, 0xff3010); ringFx(e.x, e.z, 5, 0xffa040); burst(e.x, e.h * .6, e.z, 0xff4010, 5); num(e, ph === 2 ? 'II' : 'III', 'c'); e.dmgMul *= 1.12; e.spdMul *= 1.1; if (e.poiseMax) e.poise = e.poiseMax;
    for (const o of G.ents) if (!o.dead && o.team === 'ally') { const ox = o.x - e.x, oz = o.z - e.z, l = Math.hypot(ox, oz) || 1; if (l < 8) { o.kx = (o.kx || 0) + ox / l * 13; o.kz = (o.kz || 0) + oz / l * 13; } } }
  if (e.phT > 0) { e.phT -= dt; e.shieldT = Math.max(e.shieldT || 0, .1); return true; }
  if (e.phase >= 2 && !(e.stagger > 0)) { e.phCd -= dt; const P = G.player; if (e.phCd <= 0 && P && !P.dead) { const dmg = (e.d.dmg[0] + e.d.dmg[1]) * .35 * e.dmgMul;
      if (e.phase === 2) { e.phCd = rnd(7, 10); quake(P.x, P.z, 3.1, 1.0, dmg, e); }
      else { e.phCd = rnd(6, 8); const dx = P.x - e.x, dz = P.z - e.z, l = Math.hypot(dx, dz) || 1, n = Math.min(5, Math.max(3, Math.ceil(l / 3.2))); for (let i = 1; i <= n; i++) quake(e.x + dx / l * i * 3.2, e.z + dz / l * i * 3.2, 2.5, .7 + i * .28, dmg, e); }
      burst(e.x, e.h * .7, e.z, 0xff7a10, 2.5); } }
  return false;
}
REAL.wolfman = ['R_bori', null, 0, .95]; T.wolfman = { ...T.wolf, like: 'wolf', mdl: 'wolfman' }; NOFIST.add('wolfman'); LAZY.add('wolfman');   // potion brute = the old wolf warrior R_bori (author Nov 27: 'eskisini qaytar')
const _bv = new THREE.Vector3(), _bv2 = new THREE.Vector3(), _bcr = new THREE.Vector3();
const BRAIN = { wolf: wolfAI, wolfman: wolfAI, boribasi: chiefAI, mage: shamanAI, shaman: shamanAI };
function ai(e, dt) {
  const d = e.d; if (e.spawnT > 0) { e.spawnT -= dt; e.o.scale.setScalar((e.vs || d.scale || 1) * clamp(1 - e.spawnT / .45, .01, 1)); return; }
  if (e.team === 'npc' || e.air) { if (e.team === 'npc' && !e.duel) { if (CIVT.has(e.type)) civAvoid(e, dt); else npcSpace(e, dt); } return; }
  if (e.alp) { allyLeap(e, dt); return; }
  // QA: a closed gate blocks enemies both ways — an awake enemy on the far side neither fights nor shoots (the missions watchdog walks him back in)
  if (e.team === 'enemy' && G.limitZ > -1e8 && e.z < G.limitZ - .2 && e !== G.boss && !e.custom && (e.farT || 0) > -1e8) { if (e.state !== 'chase') { e.state = 'chase'; e.clearTele(); } const P_ = G.player, tx_ = P_ ? Math.max(-G.W + 1.5, Math.min(G.W - 1.5, P_.x + (e.x - P_.x) * .5)) : e.x, sp_ = (e.speed || 3.5) * 1.15; e.x += Math.sign(tx_ - e.x) * Math.min(Math.abs(tx_ - e.x), sp_ * .5 * dt); e.z += sp_ * dt; e.rot = 0; e.play('Running_A'); return; }   /* walks in (reinforcements spawned beyond the gate used to stand there until the watchdog moved them) */
  if (e.downT > 0) { e.downT -= dt; if (e.downT <= 0) { e.curName = ''; e.inLoco = false; e.play('Idle_Combat', { force: true }); e.stagger = .2; } return; }
  if (e.stagger > 0) { e.stagger -= dt; return; }
  if (d.heavy && bossPhase(e, dt)) return;
  if (G.duel && e !== G.duel && !e.vict && !e.duel && !e.yield && !e.bg && (e.team === 'ally' || (e.team === 'enemy' && !d.heavy && !e.asleep && (e.farT || 0) > -1e8))) { watchAI(e, G.duel, dt); return; }  // one-on-one: everybody else steps back and watches
  if (kitTick(e, dt)) return;  // w3 enemy/boss kit moves
  if (e.vict && e.st !== 'held' && !e.dead && civAvoid(e, dt)) return;
  if (e.custom && e.custom(e, dt)) return;
  const tg = target(e, dt);
  if (e.fr && frontHold(e, dt)) return;
  if (!tg) { if (e.state !== 'chase') { e.state = 'chase'; e.clearTele(); } if (e.team === 'ally' && d.follow) drift(e, dt); else { relSlot(e); if (e.mounted && e.cav && e.cav.v > .1) steer(e, e.x + Math.sin(e.rot), e.z + Math.cos(e.rot), 0, dt); e.play('Idle'); } return; }
  e.hm = null; e.ib = null;
  if (e.mounted) return cavAI(e, tg, dt);
  (BRAIN[e.type] || (d.ranged ? rangedAI : meleeAI))(e, tg, dt);
}
// melee attackers take distinct slots on a ring around their target (max 6); the rest wait on an outer ring
function slotGoal(e, tg, R, dist, dt) {
  if (e.d.heavy || e.mate || tg.bg) { relSlot(e); if (e.d.heavy && dist <= R + .25) return { x: e.x, z: e.z, ok: true }; return { x: tg.x - (tg.x - e.x) / dist * R * .98, z: tg.z - (tg.z - e.z) / dist * R * .98, ok: true }; }
  if (e.slotT && e.slotT !== tg) relSlot(e);
  const S = tg.slots || (tg.slots = { a: [], rot: Math.random() * 6.283 }), N = 6, st = Math.PI / 3;
  for (let i = 0; i < N; i++) { const o = S.a[i]; if (o && (o.dead || o.gone || o.slotT !== tg)) S.a[i] = null; }
  if (S.a[e.slotI] !== e) { e.slotI = -1; e.slotT = tg; const b = Math.atan2(e.x - tg.x, e.z - tg.z); let bi = -1, bd = 9; for (let i = 0; i < N; i++) { if (S.a[i]) continue; const a = S.rot + i * st; if (Math.abs(tg.x + Math.sin(a) * R) > G.W - .3) continue; const df = Math.abs(((b - a) % 6.2832 + 9.4248) % 6.2832 - 3.1416); if (df < bd) { bd = df; bi = i; } } if (bi >= 0) { S.a[bi] = e; e.slotI = bi; e.waitA = undefined; } }
  if (e.slotI >= 0) { const a = S.rot + e.slotI * st; return { x: clamp(tg.x + Math.sin(a) * R, -G.W + .3, G.W - .3), z: tg.z + Math.cos(a) * R, ok: true }; }
  if (e.waitA === undefined) { e.waitA = Math.atan2(e.x - tg.x, e.z - tg.z); e.wdir = Math.random() < .5 ? -1 : 1; } e.waitA += dt * .22 * e.wdir; const R2 = R + (e.mounted ? 3.6 : 2.4);
  return { x: clamp(tg.x + Math.sin(e.waitA) * R2, -G.W + .3, G.W - .3), z: tg.z + Math.cos(e.waitA) * R2, ok: false };
}
function relSlot(e) { const t = e.slotT; if (t && t.slots && t.slots.a[e.slotI] === e) t.slots.a[e.slotI] = null; e.slotT = null; e.slotI = -1; e.waitA = undefined; }
const arrowGeo = new THREE.BoxGeometry(.07, .07, 1.1), orbGeo = new THREE.SphereGeometry(.32, 10, 8);
export function shoot(e, tg, dmg, orb) {
  const dx = tg.x - e.x, dz = tg.z - e.z, l = Math.hypot(dx, dz) || 1, sp = orb ? 9 : 17;
  const m = new THREE.Mesh(orb ? orbGeo : arrowGeo, new THREE.MeshBasicMaterial({ color: orb ? 0xff2255 : 0xddccaa })); m.position.set(e.x, 1.4, e.z); m.rotation.y = Math.atan2(dx, dz); fxg.add(m);
  if (orb) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2255, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(2.2); m.add(s); Sfx.orb(); } else Sfx.arrow();
  G.proj.push({ m, x: e.x, z: e.z, vx: dx / l * sp, vz: dz / l * sp, dmg, team: e.team, life: 3, src: e, r: orb ? .5 : .25 });
}

// ---------- FX ----------
const ringGeo = new THREE.RingGeometry(.86, 1, 48), discGeo = new THREE.CircleGeometry(1, 40);
ringGeo.rotateX(-Math.PI / 2); discGeo.rotateX(-Math.PI / 2);
export function telegraph(x, z, r, dur, color = 0xff2200) {
  const g = new THREE.Group(); const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false })); const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .35, depthWrite: false }));
  ring.scale.setScalar(r); disc.scale.setScalar(.01); g.add(ring, disc); g.position.set(x, .06, z); fxg.add(g); const o = { g, disc, r, t: 0, dur, dead: false }; G.tele.push(o); return o;
}
const fx = [];
const slashGeo = (() => { const N = 36, P = [], U = [], I = []; for (let i = 0; i <= N; i++) { const a = -1.15 + 2.3 * i / N, c = Math.cos(a), sn = Math.sin(a); P.push(c * 1.1, 0, -sn * 1.1, c * 2.5, 0, -sn * 2.5); U.push(i / N, 0, i / N, 1); if (i < N) { const k = i * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; })();
const slashTex = (() => { const W = 128, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), im = x.createImageData(W, H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const u = i / (W - 1), v = j / (H - 1); const au = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 1.4); const av = v < .82 ? Math.pow(v / .82, 2.2) : Math.max(0, 1 - (v - .82) / .18); const a = au * av; const core = Math.pow(av, 6) * au; const o = (j * W + i) * 4; im.data[o] = 255; im.data[o + 1] = 200 + 55 * core; im.data[o + 2] = 120 + 135 * core; im.data[o + 3] = 255 * a; } x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
export function slashFx(x, y, z, rot, sc = 1, color = 0xfff0c0) { const m = new THREE.Mesh(slashGeo, new THREE.MeshBasicMaterial({ color, map: slashTex, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); m.position.set(x, y, z); m.rotation.y = rot - Math.PI / 2; m.scale.setScalar(sc * .8); fxg.add(m); fx.push({ m, t: 0, dur: .24, s0: sc * .8, s1: sc * 1.35 }); const m2 = m.clone(); m2.material = m.material.clone(); m2.material.color.set(0xffffff); m2.material.opacity = .5; m2.position.y += .08; fxg.add(m2); fx.push({ m: m2, t: 0, dur: .16, s0: sc * .7, s1: sc * 1.15 }); }
export function ringFx(x, z, r, color = 0xffd080) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(x, .1, z); m.scale.setScalar(.3); fxg.add(m); fx.push({ m, t: 0, dur: .4, s0: .3, s1: r * 1.15 }); }
export function burst(x, y, z, color, size = 1, dark = false) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: dark ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false })); s.position.set(x, y, z); s.scale.setScalar(size * .4); fxg.add(s); fx.push({ m: s, t: 0, dur: .28, s0: size * .4, s1: size * 2.2 }); }
export function beam(x, z, color = 0xffd060) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 30, 8, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.position.set(x, 15, z); fxg.add(m); fx.push({ m, t: 0, dur: .5, s0: 1, s1: 1, xz: true }); ringFx(x, z, 2.4, color); }
const sparkL = []; const sparkMat = {};
export function sparks(x, y, z, color = 0xffd070, n = 8, sp = 6) { const m = sparkMat[color] || (sparkMat[color] = new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); for (let i = 0; i < n; i++) { const s = new THREE.Sprite(m); s.position.set(x, y, z); const a = rnd(0, 6.28), u = rnd(.3, 1); s.scale.setScalar(rnd(.12, .3)); fxg.add(s); sparkL.push({ s, vx: Math.cos(a) * sp * u, vy: rnd(2, 6), vz: Math.sin(a) * sp * u, t: 0, d: rnd(.25, .5) }); } }
function tickSparks(dt) { for (let i = sparkL.length - 1; i >= 0; i--) { const q = sparkL[i]; q.t += dt; q.vy -= 18 * dt; q.s.position.x += q.vx * dt; q.s.position.y = Math.max(.05, q.s.position.y + q.vy * dt); q.s.position.z += q.vz * dt; if (q.t > q.d) { fxg.remove(q.s); sparkL.splice(i, 1); } } }
const nums = $('dmg'); const v3 = new THREE.Vector3();
export function num(e, text, cls) { if (text == null || text === '' || /NaN|undefined|\{[a-z]\w*\}/.test(String(text))) return; /* urgent5: never float raw code */ v3.set(e.x + rnd(-.4, .4), (e.h || 2) + .3, e.z); v3.project(camera); if (v3.z > 1) return; const el = document.createElement('div'); el.className = 'dn ' + (cls || ''); el.textContent = text; el.style.left = ((v3.x * .5 + .5) * innerWidth) + 'px'; el.style.top = ((-v3.y * .5 + .5) * innerHeight) + 'px'; nums.appendChild(el); setTimeout(() => el.remove(), 820); }
function addPick(x, z) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x55ff77, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(1.5); s.position.set(x, .9, z); fxg.add(s); G.picks.push({ s, x, z, t: 0 }); }
// embers / ash
const EN = 160, emberPos = new Float32Array(EN * 3), emberVel = new Float32Array(EN);
for (let i = 0; i < EN; i++) { emberPos[i * 3] = rnd(-22, 22); emberPos[i * 3 + 1] = rnd(0, 12); emberPos[i * 3 + 2] = rnd(-22, 14); emberVel[i] = rnd(.5, 2.2); }
const emberGeo = new THREE.BufferGeometry(); emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
const emberMat = new THREE.PointsMaterial({ map: glowTex, color: 0xffa040, size: .22, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
const embers = new THREE.Points(emberGeo, emberMat); embers.frustumCulled = false; scene.add(embers);

// ---------- World building ----------
const mcache = {}; const tm = (key, mk) => mcache[key] || (mcache[key] = mk());
export const woodMat = () => tm('wood', () => woodM() || stdm(TX.wood()));
const woodM = () => (ENV.ok && pbrMat('brown_planks_09', 1, 1)) || null;
const stdm = (tex, o = {}) => new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 2, roughness: 1, ...o });
const mat = (c, o = {}) => tm('c' + c + JSON.stringify(o), () => new THREE.MeshStandardMaterial({ color: c, roughness: 1, ...o }));
function mesh(geo, m, x, y, z, parent) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; (parent || world).add(o); return o; }
const lathe = pts => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 28);
const GEO = { yw: new THREE.CylinderGeometry(2.6, 2.62, 1.75, 28, 1, true), yr: lathe([[2.78, 1.72], [2.45, 2.2], [1.75, 2.72], [.85, 3.05], [.5, 3.12]]), yt: new THREE.TorusGeometry(.5, .07, 8, 20), rope: new THREE.TorusGeometry(2.63, .03, 6, 32), box: new THREE.BoxGeometry(1, 1, 1), pole: new THREE.CylinderGeometry(.07, .09, 1, 8), beam: new THREE.CylinderGeometry(.11, .11, 1, 8), pot: lathe([[0, 0], [.22, .02], [.34, .3], [.3, .55], [.16, .68], [.2, .76]]), wheel: new THREE.TorusGeometry(.5, .07, 8, 18) };
export function clearLevel() { G.clrT = performance.now(); G.decks = null; G.duel = null;
  for (const e of G.ents) { actors.remove(e.o); if (e.rig.dispose) e.rig.dispose(); } G.ents = []; G.player = null; G.boss = null;
  while (world.children.length) world.remove(world.children[0]);
  while (fxg.children.length) fxg.remove(fxg.children[0]); fx.length = 0; sparkL.length = 0;
  G.colC = []; G.colB = []; G.proj = []; G.tele = []; G.rains = []; G.picks = []; G.fires = []; G.markers = []; G.limitZ = -1e9; G.waits = []; G.untils = []; G.noDeath = false; G.onPlayerDeath = null; G.tick = null; G.fol = 0; G.vc = null; G.front = null; G.tok = []; G.rtok = []; G.zones = []; G.spirits = []; G.buf = null; G.riders = []; G.breakables = []; G.chunks = []; G.souls = []; G.corpses = []; waterMats.length = 0; nums.innerHTML = '';
}
export function ground(zNear, zFar, key) { const L = zNear - zFar; const night = key === 'ground2'; const pm = ENV.ok && groundMat(L, night, G.mis && G.mis.c); if (pm) { const m = new THREE.Mesh(new THREE.PlaneGeometry(80, L), pm); m.rotation.x = -Math.PI / 2; m.position.set(0, 0, (zNear + zFar) / 2); m.receiveShadow = true; world.add(m); dressGround(world, zNear, zFar, G.W, night); return; } const tx = A.tex[key].clone(); tx.needsUpdate = true; tx.repeat.set(80 / 6.5, L / 6.5); const m = new THREE.Mesh(new THREE.PlaneGeometry(80, L), new THREE.MeshStandardMaterial({ map: tx, bumpMap: tx, bumpScale: 2, roughness: 1, color: 0x8f877c })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0, (zNear + zFar) / 2); m.receiveShadow = true; world.add(m); }
const darkCache = new Map();
function placeProp(n, x, y, z, sx, sy, sz, ry = 0, burnt = false, parent) { const src = A.props[n]; if (!src) return null; const o = src.clone(true); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.y = ry; if (burnt) o.traverse(m => { if (m.isMesh) { let d = darkCache.get(m.material); if (!d) { d = m.material.clone(); d.color = new THREE.Color(0x2a2420); d.roughness = 1; darkCache.set(m.material, d); } m.material = d; } }); (parent || world).add(o); return o; }
export function decor(n, x, z, ry = 0, burnt = false) { const S = { R_horse: 1.45, R_arava: 2.1 }[n] || 1; const o = FX.prop(n, x, z, ry, burnt) || placeProp(n, x, 0, z, S, S, S, ry, burnt); if (o) G.colC.push({ x, z, r: n === 'R_arava' ? 1.8 : 1.0 }); return o; }
export function yurt(x, z, burnt = false, col = true) {
  if (A.props.B_yurt) { const g = placeProp('B_yurt', x, 0, z, 1.22, burnt ? rnd(.75, .95) * 1.22 : 1.22, 1.22, rnd(0, 6.28), burnt); if (burnt) g.rotation.z = rnd(-.06, .06); if (col) G.colC.push({ x, z, r: 3.9 }); return g; }
  const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g); const b = burnt;
  const wm = b ? tm('ywb', () => stdm(TX.char(), { side: THREE.DoubleSide })) : tm('yw', () => { const f = stdm(TX.felt(), { side: THREE.DoubleSide }); const c = ENV.pbr.curly_teddy_natural; if (ENV.ok && c) { const n = c.normalMap.clone(); n.needsUpdate = true; n.repeat.set(10, 2); f.normalMap = n; f.normalScale = new THREE.Vector2(.6, .6); f.bumpMap = null; } return f; });
  const rm = b ? tm('yrb', () => stdm(TX.char(), { side: THREE.DoubleSide })) : tm('yr', () => stdm(TX.cloth('#b9a47c', 8, 3), { side: THREE.DoubleSide }));
  const wd = tm('wood', () => woodM() || stdm(TX.wood()));
  mesh(GEO.yw, wm, 0, .875, 0, g); const r = mesh(GEO.yr, rm, 0, 0, 0, g); mesh(GEO.yt, wd, 0, 3.12, 0, g).rotation.x = Math.PI / 2;
  for (const y of [.5, 1.25]) mesh(GEO.rope, mat(0x2a1c10), 0, y, 0, g).rotation.x = Math.PI / 2;
  const door = mesh(GEO.box, b ? mat(0x080606) : tm('door', () => stdm(TX.wood('#7a2a16'))), 0, .8, 2.6, g); door.scale.set(1.05, 1.55, .14);
  for (const sx of [-1, 1]) { const f = mesh(GEO.box, wd, sx * .6, .85, 2.62, g); f.scale.set(.12, 1.7, .2); }
  if (b) { r.scale.set(1, rnd(.55, .85), 1); r.rotation.z = rnd(-.12, .12); for (let i = 0; i < 5; i++) { const p = mesh(GEO.pole, mat(0x120e0c), rnd(-1.6, 1.6), 2.4, rnd(-1.6, 1.6), g); p.scale.set(1, rnd(1.6, 3), 1); p.rotation.set(rnd(-.5, .5), 0, rnd(-.5, .5)); } }
  g.scale.setScalar(1.45); g.rotation.y = rnd(-.6, .6); if (col) G.colC.push({ x, z, r: 3.9 }); return g;
}
export function house(x, z, w = 5, d = 4, h = 3, burnt = false) {
  w *= 1.2; d *= 1.2; h *= 1.45;
  if (A.props.B_house) { const face = x < 0 ? 1 : -1; placeProp('B_house', x, 0, z, w / 6.5, h / 3.3, d / 5, face > 0 ? 0 : Math.PI, burnt); G.colB.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2 }); return; }
  const key = (burnt ? 'hb' : 'h') + Math.round(w) + Math.round(h); const wm = (ENV.ok && pbrMat('clay_block_wall', Math.max(1, w / 3), Math.max(1, h / 3), { color: burnt ? 0x5a4a3c : 0xd8c0a0 })) || tm(key, () => stdm(TX.plaster(burnt ? '#4a3c30' : '#a8885e', Math.max(1, Math.round(w / 3.5)), 1)));
  const b = mesh(GEO.box, wm, x, h / 2, z); b.scale.set(w, h, d);
  const rf = mesh(GEO.box, tm('roof' + burnt, () => stdm(TX.reed(burnt ? '#2a221a' : '#84704c', 6, 4))), x, h + .1, z); rf.scale.set(w + .5, .22, d + .5);
  const wd = tm('wood', () => woodM() || stdm(TX.wood())); const face = x < 0 ? 1 : -1;
  for (let k = -d / 2 + .5; k < d / 2; k += 1.1) { const bm = mesh(GEO.beam, wd, x + face * (w / 2 + .15), h - .35, z + k); bm.rotation.z = Math.PI / 2; }
  const dz = rnd(-.8, .8); const dr = mesh(GEO.box, burnt ? mat(0x080606) : wd, x + face * w / 2, 1.25, z + dz); dr.scale.set(.14, 2.5, 1.3);
  const win = mesh(GEO.box, burnt ? mat(0x060505) : tm('win', () => new THREE.MeshBasicMaterial({ color: 0xffa040 })), x + face * w / 2, h * .62, z + dz + (dz > 0 ? -1.6 : 1.6)); win.scale.set(.1, .55, .5); win.castShadow = false;
  for (let k = -w / 2 + .3; k < w / 2; k += 1.2) for (const sz of [-1, 1]) { const c = mesh(GEO.box, wm, x + k + .3, h + .42, z + sz * (d / 2 - .12)); c.scale.set(.7, .45, .25); }
  G.colB.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2 });
}
export function wall(x1, x2, z, h = 3.4, th = 1.2, col = true) {
  h *= 1.5;
  if (A.props.B_wall) { const w0 = Math.abs(x2 - x1), cx0 = (x1 + x2) / 2, hz = w0 >= th, L = hz ? w0 : th, T0 = hz ? th : w0, n = Math.max(1, Math.round(L / 6)), sl = L / n;
    for (let k = 0; k < n; k++) { const o = -L / 2 + sl * (k + .5); if (hz) placeProp('B_wall', Math.min(x1, x2) + w0 / 2 + o, 0, z, sl / 6, h / 6, T0 / 2.2, 0); else placeProp('B_wall', cx0, 0, z + o, sl / 6, h / 6, T0 / 2.2, Math.PI / 2); }
    if (hz && L > 18) for (const ex of [Math.min(x1, x2), Math.max(x1, x2)]) { const s = h * 1.35 / 9.6; placeProp('B_tower', ex, 0, z, s, s, s); }
    if (col) G.colB.push({ x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: z - th / 2, z2: z + th / 2 }); return; }
  const w = Math.abs(x2 - x1), cx = (x1 + x2) / 2; const horiz = w >= th; const len = horiz ? w : th;
  const m = (ENV.ok && pbrMat('clay_block_wall', Math.max(1, len / 3), Math.max(1, h / 3), { color: 0xd8c0a0 })) || tm('wall' + Math.round(len / 4) + Math.round(h), () => stdm(TX.brick('#96744e', Math.max(1, Math.round(len / 5)), Math.max(1, Math.round(h / 2.5)))));
  const b = mesh(GEO.box, m, cx, h / 2, z); b.scale.set(w, h, th);
  if (horiz) for (let x = Math.min(x1, x2) + .6; x < Math.max(x1, x2); x += 1.8) { const c = mesh(GEO.box, m, x, h + .3, z); c.scale.set(.9, .6, th); } else for (let k = -th / 2 + .6; k < th / 2; k += 1.8) { const c = mesh(GEO.box, m, cx, h + .3, z + k); c.scale.set(w, .6, .9); }
  if (col) G.colB.push({ x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: z - th / 2, z2: z + th / 2 });
}
export function debris(x, z, n = 4, col = false) { const cm = tm('char', () => stdm(TX.char())); for (let i = 0; i < n; i++) { const b = mesh(GEO.beam, cm, x + rnd(-1.2, 1.2), rnd(.12, .45), z + rnd(-1.2, 1.2)); b.scale.set(rnd(.8, 1.6), rnd(1.6, 3.4), rnd(.8, 1.6)); b.rotation.set(Math.PI / 2 + rnd(-.3, .3), 0, rnd(0, 3)); } if (col) G.colC.push({ x, z, r: 1.2 }); }
export function crate(x, z) { return FX.crate(x, z); }
export function banner(x, z, color = 0x8a1c14) { return FX.banner(x, z, color); }
export function fire(x, z, size = 1.4, y = 0) { return FX.fire(x, z, size, y); }
export function ravine(z1, z2) {
  const zn = Math.max(z1, z2), zf = Math.min(z1, z2), L = zn - zf;
  const rm = (ENV.ok && pbrMat('aerial_ground_rock', 20, 3, { color: 0x7a6a5a })) || mat(0x3a3028);
  for (const [zz, s] of [[zn, -1], [zf, 1]]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(80, 9, 60, 6), rm); const p = c.geometry.attributes.position; for (let i = 0; i < p.count; i++) { p.setZ(i, (Math.random() - .5) * .9); } c.geometry.computeVertexNormals(); c.position.set(0, -4.4, zz); c.rotation.y = s > 0 ? 0 : Math.PI; c.receiveShadow = true; world.add(c); for (let x = -36; x < 36; x += rnd(1.6, 3)) place(world, Math.random() < .5 ? 'boulder_01' : 'namaqualand_stones_01', x, zz + s * rnd(-.6, .4), rnd(1.4, 3.2)); }
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(80, L), new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 1 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, -8.5, (zn + zf) / 2); world.add(fl);
  const e = { x1: -40, x2: 40, z1: zf, z2: zn, ravine: true }; G.colB.push(e); return e; }
export function gate(z) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * G.W + 6, 5), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xaa1010, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.position.set(0, 1.6, z); fxg.add(m); G.limitZ = z; return { open() { fxg.remove(m); if (G.limitZ === z) G.limitZ = -1e9; } }; }
export function marker(x, z, color = 0xffd060, r = 1.4) { const g = new THREE.Group(); g.position.set(x, 0, z); const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); ring.scale.setScalar(r); ring.position.y = .08; const col = new THREE.Mesh(new THREE.CylinderGeometry(r * .8, r * .8, 7, 20, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); col.position.y = 3.5; g.add(ring, col); fxg.add(g); const o = { g, x, z, r, remove() { fxg.remove(g); const i = G.markers.indexOf(o); if (i >= 0) G.markers.splice(i, 1); } }; G.markers.push(o); return o; }

// ---------- Destructible objects (gates, doors, totems): HP bar, hit flash/shake, cracks, shatter ----------
const crackGeo = new THREE.BoxGeometry(1, 1, 1), chunkGeo = new THREE.DodecahedronGeometry(.5, 0); let crackMat = null;
export function breakable(o) {
  const b = Object.assign({ hp: 5, only: null, barY: 3, rad: 1.2, dmg: 1, dead: false }, o); b.maxHp = b.hp; const m = b.mesh;
  if (m) { if (!m.parent) world.add(m); m.updateMatrixWorld(true); b.bb = new THREE.Box3().setFromObject(m); b.base = m.position.clone(); b.mm = []; m.traverse(k => { if (k.isMesh) { k.material = k.material.clone(); b.mm.push(k.material); } }); }
  if (b.w) { b.col = { x1: b.x - b.w / 2, x2: b.x + b.w / 2, z1: b.z - b.d / 2, z2: b.z + b.d / 2 }; G.colB.push(b.col); }
  const g = new THREE.Group(); const bg = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .6, depthTest: false })); bg.scale.set(2.1, .2, 1);
  const fg = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0xe3443a, depthTest: false })); fg.scale.set(2, .13, 1); fg.position.z = .01; g.add(bg, fg); g.renderOrder = 10; bg.renderOrder = 10; fg.renderOrder = 11; g.position.set(b.x, b.barY, b.bb ? b.bb.max.z + .3 : b.z); fxg.add(g); b.bar = g; b.barFg = fg;
  b.crG = new THREE.Group(); fxg.add(b.crG); b.nc = 0; b.shk = 0; b.fl = 0;
  b.hit = (kind = 'slam') => { if (b.dead) return 0; const fz = b.bb ? b.bb.max.z : b.z + .5, cy = b.bb ? (b.bb.min.y + b.bb.max.y) / 2 : 1.2;
    if (b.only && kind !== b.only) { sparks(b.x, cy, fz, 0xbbbbbb, 5, 4); b.shk = Math.max(b.shk, .08); if (G.time > (b.nt || 0)) { b.nt = G.time + 1.6; num({ x: b.x, z: b.z, h: b.barY - .4 }, t('noeffect'), 'n'); if (b.hint) hintRaw(t(b.hint)); } return 0; }
    const d = typeof b.dmg === 'object' ? (b.dmg[kind] ?? b.dmg.any ?? 1) : b.dmg; b.hp -= d; b.shk = .3; b.fl = .14; sparks(b.x, cy, fz, b.spark || 0xffd890, 14, 7); burst(b.x, cy, fz, b.dust || 0xc8a070, 2, true); G.shake = Math.max(G.shake, .28); Sfx.hit(); if (b.showNum) num({ x: b.x, z: b.z, h: b.barY - .4 }, '-' + d);
    for (const mt of b.mm || []) if (mt.color) { mt.userData.c0 = mt.userData.c0 || mt.color.clone(); mt.color.copy(mt.userData.c0).multiplyScalar(.5 + .5 * Math.max(0, b.hp) / b.maxHp); }
    const want = Math.min(9, Math.ceil((1 - Math.max(0, b.hp) / b.maxHp) * 9)); while (b.nc < want) addCrack(b); if (b.onHit) b.onHit(b); if (b.hp <= 0) b.shatter(); return 1; };
  b.shatter = () => { if (b.dead) return; b.dead = true; b.hp = 0; const bb = b.bb; if (m && m.parent) m.parent.remove(m); if (b.col) { const i = G.colB.indexOf(b.col); if (i >= 0) G.colB.splice(i, 1); } fxg.remove(b.bar); fxg.remove(b.crG); b.bar = null; if (b.light && b.light.parent) b.light.parent.remove(b.light);
    const mat = (b.mm && b.mm[0]) ? b.mm[0].clone() : new THREE.MeshStandardMaterial({ color: 0x6a4a2a }); mat.transparent = true; const W = bb ? bb.max.x - bb.min.x : 1.5, H = bb ? bb.max.y - bb.min.y : 2, D = bb ? bb.max.z - bb.min.z : 1, n = b.chunks || 18, cs = Math.min(1.3, Math.cbrt(W * H * D) * .35 + .2);
    for (let i = 0; i < n; i++) { const c = new THREE.Mesh(chunkGeo, mat); c.scale.set(cs * rnd(.4, 1), cs * rnd(.4, 1), cs * rnd(.4, 1)); c.castShadow = true; const px = bb ? rnd(bb.min.x, bb.max.x) : b.x, py = bb ? rnd(bb.min.y, bb.max.y) : 1, pz = bb ? rnd(bb.min.z, bb.max.z) : b.z; c.position.set(px, py, pz); c.rotation.set(rnd(0, 3), rnd(0, 3), 0); fxg.add(c); const dx = px - b.x, dz = pz - b.z, l = Math.hypot(dx, dz) || 1; G.chunks.push({ m: c, vx: dx / l * rnd(2, 6) + rnd(-1, 1), vy: rnd(2, 7), vz: dz / l * rnd(1, 4) + rnd(1, 3), wx: rnd(-8, 8), wz: rnd(-8, 8), t: 0, mat }); }
    for (let i = 0; i < 5; i++) { burst(b.x + rnd(-W / 3, W / 3), rnd(.4, H * .7), b.z + rnd(-.5, .5), b.dust || 0xb8a080, rnd(3, 5), true); const f = fx[fx.length - 1]; if (f) f.dur = rnd(.9, 1.5); }
    sparks(b.x, H * .5, b.z, b.spark || 0xffd890, 22, 9); Sfx.big(); G.shake = Math.max(G.shake, .55); if (b.onBreak) b.onBreak(b); };
  G.breakables.push(b); return b; }
function addCrack(b) { b.nc++; const bb = b.bb; if (!bb) return; const W = bb.max.x - bb.min.x, H = bb.max.y - bb.min.y; let x = b.x + rnd(-.3, .3) * Math.min(W, 6), y = bb.min.y + rnd(.15, .85) * H, a = rnd(0, 6.28); const z = bb.max.z + .03; const m = crackMat || (crackMat = new THREE.MeshBasicMaterial({ color: 0x120a04 })); const sz = Math.min(1.6, H / 3 + .4);
  for (let i = 0; i < 5; i++) { const L = rnd(.15, .42) * sz; a += rnd(-.9, .9); const s = new THREE.Mesh(crackGeo, m); s.scale.set(L, rnd(.03, .06) * sz, .02); s.position.set(x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2, z); s.rotation.z = a; b.crG.add(s); x += Math.cos(a) * L; y += Math.sin(a) * L; } }
export function hitBreak(x, z, r, kind) { let n = 0; for (const o of G.breakables || []) if (!o.dead && Math.hypot(o.x - x, o.z - z) < r + (o.rad || 1)) n += o.hit(kind) ? 1 : 0; return n; }
function tickBreakables(dt) { for (const b of G.breakables || []) { if (b.dead || !b.bar) continue; b.bar.quaternion.copy(camera.quaternion); const k = clamp(b.hp / b.maxHp, 0, 1); b.barFg.scale.x = 2 * k; b.barFg.position.x = -(1 - k);
  if (b.mesh && b.base) { if (b.shk > 0) { b.shk -= dt; const a = Math.max(0, b.shk) * .3; b.mesh.position.set(b.base.x + rnd(-a, a), b.base.y, b.base.z + rnd(-a, a) * .4); } else b.mesh.position.copy(b.base); b.crG.position.set(b.mesh.position.x - b.base.x, 0, b.mesh.position.z - b.base.z); }
  if (b.fl > 0) { b.fl -= dt; const v = b.fl > 0 ? .9 : 0; for (const mt of b.mm || []) if (mt.emissive) { mt.userData.e0 = mt.userData.e0 || mt.emissive.clone(); if (v) mt.emissive.setRGB(v, v * .7, v * .4); else mt.emissive.copy(mt.userData.e0); } } } }
function tickChunks(dt) { const L = G.chunks || []; for (let i = L.length - 1; i >= 0; i--) { const c = L[i]; c.t += dt; c.vy -= 18 * dt; const P = c.m.position; P.x += c.vx * dt; P.y += c.vy * dt; P.z += c.vz * dt; c.m.rotation.x += c.wx * dt; c.m.rotation.z += c.wz * dt; const hs = c.m.scale.y * .4; if (P.y < hs) { P.y = hs; c.vy *= -.3; c.vx *= .6; c.vz *= .6; c.wx *= .5; c.wz *= .5; } if (c.t > 1.6) c.mat.opacity = Math.max(0, 1 - (c.t - 1.6) / .8); if (c.t > 2.4) { fxg.remove(c.m); L.splice(i, 1); } } }

// ---------- Kalmyk potion: an askar drinks a dark brew and turns into a wolf-beast ----------
const bottleGeo = new THREE.CylinderGeometry(.05, .065, .16, 8), neckGeo = new THREE.CylinderGeometry(.02, .025, .07, 6);
function bottleMesh() { const g = new THREE.Group(); const gl = new THREE.MeshStandardMaterial({ color: 0x0c1a0c, emissive: 0x30ff50, emissiveIntensity: 1.2, roughness: .2 }); const b = new THREE.Mesh(bottleGeo, gl); g.add(b); const n = new THREE.Mesh(neckGeo, gl); n.position.y = .11; g.add(n); g.scale.setScalar(1.3); return g; }
export function potionAI(e, dt) { const P = G.player; if (e.drink) return drinkTick(e, dt); if (!P || P.dead || e.mounted) return false; if (Math.hypot(P.x - e.x, P.z - e.z) < 12) e.potT = (e.potT ?? rnd(2.5, 6)) - dt;
  if ((e.potT <= 0 || e.hp < e.maxHp * .5) && e.state === 'chase') { e.drink = { t: 0, b: bottleMesh() }; fxg.add(e.drink.b); e.clearTele(); e.inLoco = false; e._play('Idle', { force: true }); if (e.rig.wpn) e.rig.wpn.visible = false; if (e.rig.aimBone) e.rig.post = () => drinkPose(e); num(e, '!', 'c'); return true; } return false; }
const _dv = () => new THREE.Vector3();
function drinkPose(e) { const D = e.drink, rig = e.rig, B = rig.B; if (e.dead || e.gone || !D) { if (D && D.b) fxg.remove(D.b); rig.post = null; if (rig.wpn) rig.wpn.visible = true; return; } if (!B.RightArm || !B.RightForeArm || !B.RightHand || !B.Head) return;
  rig.root.updateMatrixWorld(true); const q = rig.root.getWorldQuaternion(new THREE.Quaternion()); const F = _dv().set(0, 0, 1).applyQuaternion(q), U = _dv().set(0, 1, 0), Sd = _dv().set(1, 0, 0).applyQuaternion(q);
  const head = B.Head.getWorldPosition(_dv()), sh = B.RightArm.getWorldPosition(_dv()), el = B.RightForeArm.getWorldPosition(_dv()), hd = B.RightHand.getWorldPosition(_dv()); const lu = sh.distanceTo(el), side = Math.sign(sh.clone().sub(head).dot(Sd)) || 1; const k = clamp(D.t / .35, 0, 1) * clamp((1.5 - D.t) / .15, 0, 1);
  const eDir = F.clone().multiplyScalar(.6).addScaledVector(U, -.5).addScaledVector(Sd, side * .5).normalize(); rig.aimBone(B.RightArm, B.RightForeArm, eDir.lerp(el.clone().sub(sh).normalize(), 1 - k));
  const el2 = B.RightForeArm.getWorldPosition(_dv()), mouth = head.clone().addScaledVector(F, lu * .5).addScaledVector(U, -lu * .3); rig.aimBone(B.RightForeArm, B.RightHand, mouth.sub(el2).normalize().lerp(hd.clone().sub(el).normalize(), 1 - k));
  if (B.Head && k > .5) { B.Head.rotateX(-.35 * k); } const h2 = B.RightHand.getWorldPosition(_dv()); D.b.position.copy(h2).addScaledVector(F, .04 * e.vs); D.b.rotation.set(0, 0, 0); D.b.rotateOnWorldAxis(Sd, -1.6 * k); D.b.scale.setScalar(1.3 * e.vs / 1.18); }
function drinkTick(e, dt) { const D = e.drink; D.t += dt; const P = G.player; if (P) e.face(P.x - e.x, P.z - e.z, dt * 4); if (!e.rig.aimBone && !D.anim) { D.anim = 1; e._play('Cheer', { force: true }); D.b.position.set(e.x, e.h * .8, e.z); }
  if (D.t > .45 && Math.random() < .35) burst(e.x + rnd(-.3, .3), e.h * rnd(.7, 1), e.z + rnd(-.3, .3), Math.random() < .6 ? 0x2a7a2a : 0x6a0a14, rnd(.6, 1.1), true);
  if (D.t >= 1.5) { fxg.remove(D.b); e.rig.post = null; e.drink = null; transformEnt(e, (A.real && A.real.wolfman) ? 'wolfman' : 'wolf', 3.2, 1.3); } return true; }
export function transformEnt(e, type, hpMul = 1, sMul = 1) { const x = e.x, z = e.z; burst(x, 1.4, z, 0x33ff55, 3.5); burst(x, 1.2, z, 0x550010, 3.2, true); burst(x, .8, z, 0x103010, 4, true); ringFx(x, z, 3, 0x66ff66); sparks(x, 1.4, z, 0x66ff66, 18, 7); G.shake = Math.max(G.shake, .35); Sfx.howl ? Sfx.howl() : Sfx.big();
  const n = new Ent(type, x, z, e.team); actors.remove(e.o); if (e.rig.dispose) e.rig.dispose(); for (const k of ['d', 'type', 'rig', 'o', 'mats', 'mixer']) e[k] = n[k]; e._mx = 0; e._helm = null;   /* models_ext.vary() dresses the new body again (potion brute: dark, bigger, bare head) */ e.vs = n.vs * sMul; e.r = n.r * sMul; e.h = n.h * sMul; e.speed = n.speed; e.maxHp = e.hp = Math.round(n.maxHp * hpMul); e.curName = ''; e.inLoco = false; e.state = 'chase'; e.cd = .9; e.custom = null; e.brute = (type === 'wolf' || type === 'wolfman') && e.team === 'enemy'; e.stagger = 0; e.spawnT = .45; e.o.scale.setScalar(.01); e.o.position.set(x, 0, z); e.o.rotation.y = e.rot; if (e.bar) { fxg.remove(e.bar); e.bar = null; } relSlot(e); e.poiseMax = 0; e.barPz = null; e.barW = 0; e.tg = null; e.cav = null; if (e.aura) { fxg.remove(e.aura); e.aura = null; } e.play('Idle_Combat'); if (type === 'wolf' && e.team === 'enemy') { plate(e, 'potwolf'); aura(e, 0x44ff66); } else e.showBar(); return e; }

// ---------- Boss soul flies into Gulayim's triangular amulet ----------
const soulMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffd060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
function amuletPos(p) { const v = new THREE.Vector3(); if (p.rig && p.rig.amulet) p.rig.amulet.getWorldPosition(v); else v.set(p.x, p.h * .62, p.z); return v; }
export function soulToAmulet(e, dur = 1.6) { const p = G.player; if (!p || !e) return Promise.resolve(); G.souls = G.souls || []; const H = e.h || 3, R = Math.max(.6, e.r);
  e.o.traverse(k => { if (k.isMesh && k.material) { k.material = k.material.clone(); k.material.transparent = true; } });
  const ps = []; for (let i = 0; i < 90; i++) { const s = new THREE.Sprite(soulMat); s.scale.setScalar(rnd(.3, .6)); const a = rnd(0, 6.28), rr = rnd(0, R); const p0 = new THREE.Vector3(e.x + Math.cos(a) * rr, rnd(.2, H), e.z + Math.sin(a) * rr); s.position.copy(p0); fxg.add(s); ps.push({ s, p0, c: p0.clone().add(new THREE.Vector3(rnd(-2.5, 2.5), rnd(1.5, 4), rnd(-1.5, 1.5))), d0: rnd(0, .7), d1: rnd(.6, .9) }); }
  return new Promise(res => G.souls.push({ e, ps, t: 0, dur, res })); }
function tickSouls(dt) { const L = G.souls || []; const p = G.player; for (let i = L.length - 1; i >= 0; i--) { const S = L[i]; S.t += dt; const A = p ? amuletPos(p) : null; const fade = clamp(1 - S.t / (S.dur * .6), 0, 1); S.e.o.traverse(k => { if (k.isMesh && k.material) k.material.opacity = fade; });
    for (const q of S.ps) { if (!q.s.parent) continue; const u = clamp((S.t - q.d0) / q.d1, 0, 1); if (u <= 0) { q.s.position.y += dt * .6; continue; } const w = u * u; if (A) { const a = q.p0.clone().lerp(q.c, w), b = q.c.clone().lerp(A, w); q.s.position.copy(a.lerp(b, w)); } q.s.scale.setScalar((1 - u * .6) * .6); if (u >= 1) { fxg.remove(q.s); if (p && Math.random() < .35) sparks(A.x, A.y, A.z, 0xffe080, 2, 2); } }
    if (S.t >= S.dur && !S.done) { S.done = true; if (p) { const A2 = amuletPos(p); burst(A2.x, A2.y, A2.z, 0xffd060, 2.6); ringFx(p.x, p.z, 2.6, 0xffd060); flash(.25); if (p.rig.amuletMat) { p.amuGlow = 1.2; } } if (!S.e.gone) S.e.remove(); L.splice(i, 1); S.res(); } }
  if (p && p.amuGlow > 0 && p.rig.amuletMat) { p.amuGlow -= dt; p.rig.amuletMat.emissiveIntensity = .9 + Math.max(0, p.amuGlow) * 4; } }

// ---------- Powers / world helpers ----------
const ghostMat = new THREE.MeshStandardMaterial({ color: 0x0a0608, emissive: 0x550a00, transparent: true, opacity: .85, roughness: .8 });
export function ghostRider(x, z, dx, dz) { const hz = makeHorse(A.props.R_horse_far || A.props.R_horse, { mat: ghostMat, bare: true, noShadow: true }); const o = hz ? hz.group : new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 2.4), new THREE.MeshBasicMaterial({ color: 0x110000 })); o.scale.setScalar(1.6); o.position.set(x, 0, z); o.rotation.y = Math.atan2(dx, dz); fxg.add(o); const hit = new Set();
  G.riders = G.riders || []; G.riders.push({ o, hz, x, z, dx, dz, t: 0, hit }); }
export function updateRiders(dt) { if (!G.riders) return; for (let i = G.riders.length - 1; i >= 0; i--) { const r = G.riders[i]; r.t += dt; r.x += r.dx * 22 * dt; r.z += r.dz * 22 * dt; r.o.position.set(r.x, 0, r.z); if (r.hz) r.hz.update(dt, 22, 1.6); if (Math.random() < .8) burst(r.x, .8, r.z, 0x330000, 1.4, true); for (const e of G.ents) { if (e.dead || e.team !== 'enemy' || r.hit.has(e)) continue; if (Math.hypot(e.x - r.x, e.z - r.z) < 2.2 + e.r) { r.hit.add(e); e.damage(rnd(90, 130) * (e.d.heavy ? 1.5 : 1), G.player, { crit: true, kb: 12 }); Sfx.hit(); } } if (r.t > 1.4) { fxg.remove(r.o); G.riders.splice(i, 1); } } }
const waterMats = [];
export function water(x, z, w, d, color = 0x2a5a66) { const g = new THREE.PlaneGeometry(w, d, Math.ceil(w / 1.5), Math.ceil(d / 1.5)); g.rotateX(-Math.PI / 2); const m = new THREE.MeshStandardMaterial({ color, roughness: .18, metalness: 0, transparent: true, opacity: .93, envMapIntensity: .55 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = { value: 0 }; m.userData.sh = sh; sh.vertexShader = 'uniform float uT; varying float vF;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    vec4 wp = modelMatrix * vec4(position, 1.); float h = sin(wp.x * .35 + uT * 1.3) * .18 + sin(wp.z * .5 - uT * 1.7) * .12 + sin((wp.x + wp.z) * 1.1 + uT * 2.6) * .05; transformed.y += h; vF = smoothstep(.12, .3, h);`).replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
    { vec4 wq = modelMatrix * vec4(position, 1.); objectNormal = normalize(vec3(-cos(wq.x * .35 + uT * 1.3) * .063 - cos((wq.x + wq.z) * 1.1 + uT * 2.6) * .055, 1., -cos(wq.z * .5 - uT * 1.7) * .06 - cos((wq.x + wq.z) * 1.1 + uT * 2.6) * .055)); }`);
    sh.fragmentShader = 'varying float vF;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(.92, .96, 1.), vF * .55);'); };
  const o = new THREE.Mesh(g, m); o.position.set(x, -.25, z); o.receiveShadow = true; world.add(o); waterMats.push(m); return o; }
export function tickWater(t) { for (const m of waterMats) if (m.userData.sh) m.userData.sh.uniforms.uT.value = t; }
export function tintWorld(o, c) { o.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color = new THREE.Color(c); } }); }

// ---------- Economy: gold, upgrades, rewarded ads ----------
export const SAVE = (() => { let s = {}; try { s = JSON.parse(localStorage.getItem('qq_save') || '{}'); } catch (e) { } return Object.assign({ gold: 0, up: { sword: 0, life: 0, maid: 0, squad: 0, horse: 0 } }, s); })();
export function saveGame() { try { localStorage.setItem('qq_save', JSON.stringify(SAVE)); } catch (e) { } }
export const UPG = { sword: { max: 8, cost: l => 60 + l * 50 }, life: { max: 8, cost: l => 60 + l * 50 }, maid: { max: 8, cost: l => 80 + l * 60 }, squad: { max: 4, cost: l => 200 + l * 150 }, horse: { max: 5, cost: l => 70 + l * 50 } };
export function addGold(n, x, z) { SAVE.gold += n; G.chGold = (G.chGold || 0) + n; saveGame(); hudGold(); if (x !== undefined) { const fake = { x, z, h: 2.2 }; num(fake, '+' + n + ' 🪙', 'g'); } }
export function hudGold() { const el = $('gold'); if (el) el.textContent = '🪙 ' + SAVE.gold; }
export const ADS = { async rewarded() { try { if (window.ysdk && ysdk.adv) return await new Promise(r => ysdk.adv.showRewardedVideo({ callbacks: { onRewarded: () => r(true), onClose: () => r(false), onError: () => r(false) } })); if (window.QQ_ADS && QQ_ADS.rewarded) return await QQ_ADS.rewarded(); } catch (e) { }
  return false;   /* wave4/bench #3: no ad provider = no ad at all (the fake 5 s countdown is never shown) */ return await new Promise(r => { const el = $('adov'); el.classList.add('on'); let n = 5; const c = el.querySelector('b'); c.textContent = n; const iv = setInterval(() => { n--; c.textContent = n; if (n <= 0) { clearInterval(iv); el.classList.remove('on'); r(true); } }, 1000); }); } };
// passive bonuses for the maidens from defeated bosses + upgrades
export function maidBuff() { const pw = G.powers ? Object.keys(G.powers).length : 0; return { hp: 1 + .25 * pw + .15 * SAVE.up.maid, dmg: 1 + .2 * pw + .15 * SAVE.up.maid, stun: !!(G.powers && G.powers[6]) }; }

// ---------- Horse riding ----------
function horseInfo() { if (horseInfo.c) return horseInfo.c; const src = A.props.R_horse; if (!src) return null; src.updateMatrixWorld(true); const pts = []; src.traverse(m => { if (m.isMesh) { const p = m.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i += 7) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); pts.push(v.clone()); } } });
  const bb = new THREE.Box3().setFromPoints(pts), H = bb.max.y - bb.min.y, zc = (bb.min.z + bb.max.z) / 2, Lz = bb.max.z - bb.min.z; let hz = 0, n = 0, sy = 0; for (const v of pts) { if (v.y > bb.min.y + H * .8) { hz += v.z; n++; } if (Math.abs(v.z - zc) < Lz * .1 && v.y > sy) sy = v.y; }
  return horseInfo.c = { head: Math.sign(hz / Math.max(1, n) - zc) || 1, H, sy: sy - bb.min.y, zc, Lz, y0: bb.min.y }; }
function makeMount() { const src = A.props.R_horse, hi = horseInfo(); if (!src || !hi) return null; const g = new THREE.Group(); const U = { t: { value: 0 }, sp: { value: 0 } }; src.updateMatrixWorld(true);
  src.traverse(m => { if (!m.isMesh) return; const geo = m.geometry.clone(); geo.applyMatrix4(m.matrixWorld); geo.translate(0, -hi.y0, -hi.zc); const mat = m.material.clone(); const legY = hi.H * .48;
    mat.onBeforeCompile = sh => { sh.uniforms.uT = U.t; sh.uniforms.uSp = U.sp; sh.vertexShader = 'uniform float uT; uniform float uSp;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { float ly = ${legY.toFixed(3)}; float k = clamp((ly - transformed.y) / ly, 0., 1.); if (k > 0.) { float fr = step(0., transformed.z * ${hi.head.toFixed(1)}); float lf = step(0., transformed.x); float ph = uT * 11. + fr * 2.4 + lf * .7; float a = sin(ph) * .55 * uSp; transformed.z += a * k * ly * ${hi.head.toFixed(1)}; transformed.y += max(0., cos(ph)) * .16 * uSp * k * ly; } }
      { float ny = ${(hi.H * .62).toFixed(3)}; float kn = clamp((transformed.y - ny) / ${(hi.H * .38).toFixed(3)}, 0., 1.) * step(${(hi.Lz * .18).toFixed(3)}, transformed.z * ${hi.head.toFixed(1)}); transformed.y += sin(uT * 11. + 1.2) * .05 * uSp * kn; }`); };
    mat.customProgramCacheKey = () => 'horseleg'; const o = new THREE.Mesh(geo, mat); o.castShadow = true; g.add(o); });
  if (hi.head < 0) g.children.forEach(c => c.rotation.y = Math.PI); g.userData.U = U; return g; }
export function hudHorse() { const p = G.player, el = $('hhorse'); if (!el) return; el.style.display = p && p.mounted ? 'block' : 'none'; if (p && p.mounted) el.firstChild.style.width = clamp(p.horseHp / p.horseMax * 100, 0, 100) + '%'; }
export function toggleMount(p, force, dead) { const want = force !== undefined ? force : !p.mounted; if (want === !!p.mounted) return; const rig = p.rig; if (!rig.setMount) return;
  if (want) { const coat = p === G.player ? (p.type === 'sarbinaz' ? 'grey' : 'white') : p.team === 'enemy' ? ['black', 'bay', 'dun', 'black'][Math.floor(Math.random() * 4)] : ['bay', 'chestnut', 'grey', 'white', 'black', 'dun'][Math.floor(Math.random() * 6)]; const hi0 = p === G.player && SET.q === 2 && A.props.R_horse; const hz = makeHorse(hi0 ? A.props.R_horse : (A.props.R_horse_lo || A.props.R_horse), { coat, noShadow: p !== G.player && SET.q < 2, far: p === G.player ? null : A.props.R_horse_far }); if (!hz) return; const hb = horseBase(hi0 ? A.props.R_horse : (A.props.R_horse_lo || A.props.R_horse)); const m = hz.group; const HS = 1.75 / p.vs; m.scale.setScalar(HS); p.o.add(m); p.horse = m; p.hz = hz; p.horseK = 1.75; const hi = { sy: hb.sy }; p.mounted = true; p.r = 1.0; p.horseMax = p.horseHp = (p === G.player ? 260 + 80 * SAVE.up.horse : (p.team === 'ally' ? 400 : 60)); if (p === G.player) hudHorse(); rig.setMount(true, hi.sy * HS - rig.hipY0 * .93); p.act = null; p.play('Idle', { force: true }); Sfx.neigh(); burst(p.x, .6, p.z, 0xc8a070, 3, true); ringFx(p.x, p.z, 2.4, 0xffe0a0); }
  else { if (p.horse) { if (dead && p.hz) horseCorpse(p); else p.o.remove(p.horse); } p.horse = null; p.hz = null; p.mounted = false; if (rig.sad) rig.sad = null; p.r = .5 * (p.d.scale || 1); rig.setMount(false); burst(p.x, .6, p.z, 0xc8a070, 2.5, true); Sfx.dodge(); if (p === G.player) hudHorse(); } }
function tickMount() { }
const _hm = new THREE.Matrix4(), _hv = new THREE.Vector3();
function horseTick(e, dt) { const hz = e.hz; if (!hz) return; if (hz.farM) { const d2 = (e.x - camera.position.x) ** 2 + (e.z - camera.position.z) ** 2; hz.setLod(SET.q === 0 ? d2 > 200 : d2 > 650); } const g = hz.update(dt, e.spd || 0, e.horseK || 1.75);
  // saddle anchor in the rider's root space -> rider sits on the saddle and follows bob / pitch / rear
  let o = hz.anchor; o.updateMatrix(); _hm.copy(o.matrix); while (o.parent && o.parent !== hz.mesh) { o = o.parent; o.updateMatrix(); _hm.premultiply(o.matrix); } _hv.set(0, 0, 0).applyMatrix4(_hm).multiplyScalar(e.horse.scale.x);
  if (e.rig.setSaddle) e.rig.setSaddle(_hv.y, _hv.z, hz.S.pitch);
  if (g >= 3 && hz.S.stepAcc >= 1) { hz.S.stepAcc -= 1; if (e === G.player) Sfx.hoof(); if (Math.random() < .6) burst(e.x - Math.sin(e.rot) * 1.4, .2, e.z - Math.cos(e.rot) * 1.4, 0xc8a070, 1.3, true); } else if (hz.S.stepAcc > 1) hz.S.stepAcc = 0; }
function horseCorpse(p) { const g = p.horse, hz = p.hz; const pos = g.getWorldPosition(new THREE.Vector3()), q = g.getWorldQuaternion(new THREE.Quaternion()), sc = g.getWorldScale(new THREE.Vector3()); p.o.remove(g); g.position.copy(pos); g.quaternion.copy(q); g.scale.copy(sc); fxg.add(g); hz.die(Math.random() < .5 ? -1 : 1); Sfx.neigh(); burst(pos.x, .8, pos.z, 0x8a6a4a, 3, true); G.corpses = G.corpses || []; G.corpses.push({ g, hz, t: 0 }); }
function tickCorpses(dt) { const L = G.corpses || []; for (let i = L.length - 1; i >= 0; i--) { const c = L[i]; c.t += dt; c.hz.update(dt, 0); if (c.t > 3) c.g.position.y -= dt * .7; if (c.t > 4.5) { fxg.remove(c.g); L.splice(i, 1); } } }

// ---------- Player ----------
const keys = {}; const joy = { x: 0, z: 0, id: null };
const heroRingTex = canvasTex(256, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, s * .3, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,210,90,0)'); r.addColorStop(.7, 'rgba(255,210,90,.95)'); r.addColorStop(.82, 'rgba(255,240,180,1)'); r.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(255,230,140,.9)'; g.lineWidth = 6; for (let i = 0; i < 3; i++) { const a = i * 2.094; g.beginPath(); g.arc(s / 2, s / 2, s * .43, a, a + .7); g.stroke(); } });
function heroMark(p) { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: heroRingTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; ring.scale.setScalar(2.6); g.add(ring);
  const tri = new THREE.Mesh(new THREE.ConeGeometry(.22, .4, 3), new THREE.MeshBasicMaterial({ color: 0xffd060 })); tri.rotation.x = Math.PI; tri.position.y = 3.3; g.add(tri); fxg.add(g); p.mark = { g, ring, tri }; }
export function makePlayer(type, x, z) {
  const p = new Ent(type, x, z, 'ally'); heroMark(p); p.maxHp = p.hp = Math.round(p.maxHp * (1 + .15 * SAVE.up.life)); G.dmgBoost = 1 + .12 * SAVE.up.sword; hudGold(); G.ents.push(p); G.player = p; p.act = null; p.iframe = 0; p.combo = 0; p.dodgeCd = 0; p.rot = Math.PI; G.hero = type; G.cam.x = x; G.cam.z = z; G.ulti = 0;
  G.sk = { 1: { cd: 0, max: 5, on: false }, 2: { cd: 0, max: 8, on: false }, 3: { cd: 0, max: 6, on: false }, 4: { cd: 0, max: 0, on: false }, 5: { cd: 0, max: 7, on: false }, 6: { cd: 0, max: 7, on: false }, 7: { cd: 0, max: 5, on: false }, 8: { cd: 0, max: 14, on: false }, 9: { cd: 0, max: 22, on: false }, 0: { cd: 0, max: 18, on: false } }; for (const k of [6, 7, 8, 9, 0]) if (G.powers && G.powers[k]) G.sk[k].on = true; refreshSkills(); return p;
}
export function refreshSkills() { for (const k in G.sk) { const b = $('b' + k); if (!b) continue; b.classList.toggle('off', !G.sk[k].on); if (+k >= 6 || k === '0') b.style.display = G.sk[k].on ? 'flex' : 'none'; } skinButtons(); }
const pd = (kk) => { const p = G.player; return rnd(p.d.dmg[0], p.d.dmg[1]) * (p.giant > 0 ? 2.2 : 1) * (G.dmgBoost || 1) * (p.cryT > 0 ? 1.4 : 1) * (p.wolfT > 0 ? 1.25 : 1) * (window.__META && __META.pdMul ? __META.pdMul(kk) : 1); };
// soft lock: prefers the enemy in the stick direction (or the one she already faces / fought last), not just the nearest
function aim(p, maxd, rng) { let jx = joy.x + ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0), jz = joy.z + ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - ((keys.KeyW || keys.ArrowUp) ? 1 : 0); const jl = Math.hypot(jx, jz), st = jl >= .3; if (!st) { jx = Math.sin(p.rot); jz = Math.cos(p.rot); } else { jx /= jl; jz /= jl; }
  const md = rng ? maxd : Math.min(maxd, 6), cmin = st ? .5 : .3; let b = null, bs = 1e9;
  for (const e of G.ents) { if (e.dead || e.gone || e.bg || e.team === 'npc' || !hostile('ally', e.team)) continue; const dx = e.x - p.x, dz = e.z - p.z, c = Math.hypot(dx, dz) || .01, d = c - e.r; if (d > md) continue; const cs = (dx * jx + dz * jz) / c, adj = d < 1.4;
    if (!adj && cs < cmin) continue;  // only what she is facing / steering at (an enemy right next to her always counts)
    if (!rng && !adj && e !== p.hl && allyBusy(e)) continue;  // leave the maidens' opponents to them
    let s = d - cs * 2.5; if (e === p.lock) s -= 1; if (e === p.hl) s -= 3; if (s < bs) { bs = s; b = e; } }
  if (b) { p.rot = Math.atan2(b.x - p.x, b.z - p.z); p.lock = b; p.lockAt = G.time; } return b; }
const allyBusy = e => { const P = G.player; if (e.tg === P) return false; for (const o of G.ents) if (o !== P && !o.dead && !o.gone && o.team === 'ally' && o.tg === e && Math.hypot(o.x - e.x, o.z - e.z) < 3.5) return true; return false; };
// ---- per-hero skills (Allayar: shield bash / war cry / heavy cleave; Sarbinaz: spear thrust / spin sweep / javelin)
export const HERO_SK = { allayar: { 1: ['bash', 5, '🛡'], 2: ['cry', 12, '📯'], 3: ['cleave', 7, '🪓'] }, sarbinaz: { 1: ['thrust', 5, '🗡'], 2: ['sweep', 7, '🌪'], 5: ['javelin', 4, '🎯'] } };
function heroSkill(p, k, def) { const [kind, cd] = def, s = G.sk[k]; if (!s || !s.on || s.cd > 0 || (p.act && p.act.kind !== 'atk')) return; s.max = cd; s.cd = cd; initAudio(); if (p.mounted && kind !== 'javelin' && kind !== 'cry') toggleMount(p, false);
  if (kind === 'bash') { aim(p, 6); p.act = { kind, t: 0, dur: .5 }; p.iframe = .3; p.play('1H_Melee_Attack_Stab', { once: true, force: true, dur: .5 }); Sfx.dodge(); }
  else if (kind === 'cry') { p.act = { kind, t: 0, dur: .9 }; p.play('Cheer', { once: true, force: true, dur: .9 }); }
  else if (kind === 'cleave') { aim(p, 6); p.act = { kind, t: 0, dur: .8 }; p.play('2H_Melee_Attack_Slice', { once: true, force: true, dur: .8 }); }
  else if (kind === 'thrust') { aim(p, 10); p.act = { kind, t: 0, dur: .32, hit: new Set() }; p.iframe = .4; p.play('1H_Melee_Attack_Stab', { once: true, force: true, dur: .36 }); Sfx.dodge(); }
  else if (kind === 'sweep') { p.act = { kind, t: 0, dur: .85, n: 0 }; p.play('2H_Melee_Attack_Spin', { once: true, force: true, dur: .85 }); }
  else if (kind === 'javelin') { const e = aim(p, 18, 1); p.act = { kind, t: 0, dur: .5, tg: e }; p.play('1H_Ranged_Shoot', { once: true, force: true, dur: .5 }); } }
const enemyNear = (x, z, r) => G.ents.filter(e => !e.dead && e.team === 'enemy' && Math.hypot(e.x - x, e.z - z) < r + e.r);
const HACT = {
  bash(p, a, dt, fx, fz) { if (a.t < .2) { p.x += fx * 11 * dt; p.z += fz * 11 * dt; } if (!a.fired && a.t > .16) { a.fired = true; Sfx.big(); G.shake = Math.max(G.shake, .35); const cx = p.x + fx * 1.2, cz = p.z + fz * 1.2; ringFx(cx, cz, 2.2, 0xbfd8ff); sparks(cx, 1.2, cz, 0xcfe4ff, 16, 7); burst(cx, 1.1, cz, 0x9fc4ff, 1.6); const n = hitArc(p, 2.8, .1, () => pd() * 1.5, { kb: 15 }); for (const e of enemyNear(cx, cz, 2.4)) if (!e.d.heavy) e.stagger = Math.max(e.stagger, 1.3); hitBreak(cx, cz, 1.8, 'atk'); if (n) G.ulti = Math.min(100, G.ulti + 4 * n); } },
  cry(p, a) { if (!a.fired && a.t > .3) { a.fired = true; Sfx.horn(); flash(.25); G.shake = Math.max(G.shake, .3); ringFx(p.x, p.z, 7, 0xffc040); ringFx(p.x, p.z, 4, 0xff7030); burst(p.x, 1.6, p.z, 0xffb040, 3); const h = Math.round(p.maxHp * .12); p.cryT = 7; p.hp = Math.min(p.maxHp, p.hp + h); num(p, '+' + h, 'g'); for (const m of G.ents) { if (m.dead) continue; if (m.team === 'ally' && m !== p && Math.hypot(m.x - p.x, m.z - p.z) < 12) { m.cryT = 7; burst(m.x, 1.5, m.z, 0xffb040, 1.2); } else if (m.team === 'enemy' && !m.d.heavy && Math.hypot(m.x - p.x, m.z - p.z) < 7) { m.stagger = Math.max(m.stagger, 1.0); m.clearTele(); m.state = 'chase'; } } } },
  cleave(p, a, dt, fx, fz) { if (!a.fired && a.t > .42) { a.fired = true; Sfx.swing(); Sfx.big(); G.shake = Math.max(G.shake, .45); slashFx(p.x + fx * .5, 1.1, p.z + fz * .5, p.rot, 1.9, 0xffd890); burst(p.x + fx * 2, .4, p.z + fz * 2, 0xc8a070, 2.6, true); const n = hitArc(p, 4.0, -.15, () => pd() * 2.6, { crit: true, kb: 11 }); hitBreak(p.x + fx * 2, p.z + fz * 2, 2.5, 'atk'); if (n) { Sfx.hit(); G.ulti = Math.min(100, G.ulti + 5 * n); } } },
  thrust(p, a, dt, fx, fz) { p.x += fx * 7 * dt; p.z += fz * 7 * dt; if (Math.random() < .7) sparks(p.x + fx * 1.4, 1.2, p.z + fz * 1.4, 0xbfe0ff, 2, 3); for (const e of G.ents) { if (e.dead || e.team !== 'enemy' || a.hit.has(e)) continue; if (Math.hypot(e.x - p.x - fx * 1.2, e.z - p.z - fz * 1.2) < 1.7 + e.r) { a.hit.add(e); e.damage(pd() * 2.3, p, { crit: true, kb: 12 }); sparks(e.x, 1.3, e.z, 0xe0f0ff, 12, 7); Sfx.hit(); G.ulti = Math.min(100, G.ulti + 5); } } if (!a.fired && a.t > a.dur - .05) { a.fired = true; slashFx(p.x + fx * 1.2, 1.2, p.z + fz * 1.2, p.rot, .8, 0xcfe8ff); hitBreak(p.x + fx * 1.5, p.z + fz * 1.5, 1.6, 'atk'); } },
  sweep(p, a, dt, fx, fz, mx, mz) { p.x += mx * p.speed * .35 * dt; p.z += mz * p.speed * .35 * dt; if (a.n < 2 && a.t > .2 + a.n * .3) { a.n++; Sfx.swing(); ringFx(p.x, p.z, 3.8, 0xcfe8ff); slashFx(p.x, 1.1, p.z, p.rot + a.n * 2, 1.5, 0xcfe8ff); const n = hitCircle(p.x, p.z, 3.8, () => pd() * 1.5, 'ally', p, { kb: 9 }); for (const e of enemyNear(p.x, p.z, 3.8)) if (!e.d.heavy) e.stagger = Math.max(e.stagger, .7); hitBreak(p.x, p.z, 3.8, 'atk'); if (n) { Sfx.hit(); G.shake = Math.max(G.shake, .25); G.ulti = Math.min(100, G.ulti + 3 * n); } } },
  javelin(p, a) { if (!a.fired && a.t > .22) { a.fired = true; const e = a.tg && !a.tg.dead ? a.tg : { x: p.x + Math.sin(p.rot) * 20, z: p.z + Math.cos(p.rot) * 20 }; if (a.tg) p.rot = Math.atan2(e.x - p.x, e.z - p.z); shoot(p, e, pd() * 2.6, false); const q = G.proj[G.proj.length - 1]; q.m.scale.set(1.5, 1.5, 2.2); q.m.material.color.set(0xd8c8a0); q.vx *= 1.4; q.vz *= 1.4; q.r = .45; sparks(p.x, 1.4, p.z, 0xfff0c0, 6, 4); } }
};
function doActInner(k) {
  const p = G.player; if (!p || p.dead || G.paused) return; initAudio();
  if (G.qte) { if (k === 'A') G.qte.v += G.qte.gain; return; }
  if (G.freeze) return;
  if (k === 'M') return;
  if (k === 'A') { if (p.act) { if (p.act.kind === 'atk') p.queued = true; else w3Busy(p, 'A'); return; } startAtk(p); return; }
  if (k === 'D') { w3Dodge(p, false); return; }  // w3: sidestep (double tap = roll)
  const s = G.sk[k]; if (!G.inCombo && (!s || !s.on || p.act && p.act.kind !== 'atk')) return;
  if (k == 4) { if (G.ulti < 100) return; G.ulti = 0; p.act = { kind: 'ulti', t: 0, dur: 1.1 }; p.iframe = 1.4; p.play('Cheer', { once: true, force: true }); Sfx.horn(); flash(.5); return; }
  if (!G.inCombo) { if (s.cd > 0) return; s.cd = s.max; }
  if (k == 1 && p.mounted) toggleMount(p, false);
  if (k == 1) { p.act = { kind: 'spin', t: 0, dur: .7, n: 0 }; p.play('2H_Melee_Attack_Spin', { once: true, force: true, ts: 1.4 }); }
  if (k == 2) { const e = aim(p, 13, 1); const tx = e ? e.x : p.x + Math.sin(p.rot) * 6, tz = e ? e.z : p.z + Math.cos(p.rot) * 6; p.act = { kind: 'cast', t: 0, dur: .45 }; p.play('1H_Ranged_Shoot', { once: true, force: true, ts: 1.4 }); G.rains.push({ x: tx, z: tz, r: 4.2, t: -.25, n: 0, tele: telegraph(tx, tz, 4.2, 1.7, 0xffc040) }); Sfx.arrow(); }
  if (k == 3) { aim(p, 9); p.act = { kind: 'dash', t: 0, dur: .22, hit: new Set() }; p.iframe = .35; p.play('1H_Melee_Attack_Stab', { once: true, force: true, ts: 1.6 }); Sfx.dodge(); }
  if (k == 6) { p.act = { kind: 'slamP', t: 0, dur: .7 }; p.play('E_Slam', { once: true, force: true, dur: .7 }); }
  if (k == 7) { const e = aim(p, 14, 1); p.act = { kind: 'chain', t: 0, dur: .45, tg: e }; p.play('1H_Ranged_Shoot', { once: true, force: true, dur: .45 }); Sfx.arrow(); }
  if (k == 8) { for (const m of G.ents) if (m.type === 'qiz' && !m.dead) { m.shieldT = 5; } p.shield = 5; Sfx.power(); ringFx(p.x, p.z, 2.2, 0x66ccff); if (!p.shieldFx) { const m = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), new THREE.MeshBasicMaterial({ color: 0x55bbff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false })); p.shieldFx = m; fxg.add(m); } p.shieldFx.visible = true; }
  if (k == 9) { for (const m of G.ents) if (m.type === 'qiz' && !m.dead) { m.dmgMul = (m.dmgMul || 1) * 1.6; setTimeout(() => { m.dmgMul /= 1.6; }, 9000); burst(m.x, 1.5, m.z, 0xff8844, 1.5); } p.giant = 9; Sfx.big(); flash(.4); G.shake = .5; p.play('Cheer', { once: true, force: true }); ringFx(p.x, p.z, 4, 0xff8844); }
  if (k == 0) { const dx = Math.sin(p.rot), dz = Math.cos(p.rot); ghostRider(p.x - dx * 3, p.z - dz * 3, dx, dz); if (G.powers && G.powers[6]) { ghostRider(p.x - dz * 3 - dx * 3, p.z + dx * 3 - dz * 3, dx, dz); ghostRider(p.x + dz * 3 - dx * 3, p.z - dx * 3 - dz * 3, dx, dz); } Sfx.horn(); }
  if (p.mounted && (k == 1 || k == 5 || k == 9)) toggleMount(p, false);
  if (k == 5) { let dx = joy.x + ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0), dz = joy.z + ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - ((keys.KeyW || keys.ArrowUp) ? 1 : 0);
    const rav = !!G.ravineAhead || G.colB.some(b => b.ravine && !b.off && b.z2 < p.z + 1 && b.z2 > p.z - 9 && p.x > b.x1 - 2 && p.x < b.x2 + 2); let e = null;
    if (dx || dz) p.rot = Math.atan2(dx, dz); else if (rav) p.rot = Math.PI; if (!rav) e = aim(p, 5);
    const L = rav ? 12 : e ? clamp(Math.hypot(e.x - p.x, e.z - p.z) - e.r - .9, 0, 4) : 2.5;  // in a fight: a short wolf strike next to her, never a long throw away
    p.wolfT = 6; spiritWolf(p); p.act = { kind: 'leap', t: 0, dur: rav ? .5 : .34, hit: new Set(), low: !rav, short: !rav, x0: p.x, z0: p.z, x1: p.x + Math.sin(p.rot) * L, z1: p.z + Math.cos(p.rot) * L }; p.leaping = rav; p.iframe = .7; p.play('Jump_Full_Long', { once: true, force: true, ts: rav ? 1.5 : 2.1 }); Sfx.howl(); }
}
function startAtk(p) { if (!(p.counterT > G.time) && w3Exec(p)) return; const ct = p.counterT > G.time && p.counterTg && !p.counterTg.dead ? p.counterTg : null; p.combo = ct ? 4 : p.combo % 4 + 1; p.queued = false; let e; if (ct) { e = ct; p.rot = Math.atan2(e.x - p.x, e.z - p.z); p.counterT = 0; num(p, tx('counter'), 'c'); p.iframe = Math.max(p.iframe, .35); p.lock = e; p.lockAt = G.time; } else e = aim(p, 6.5);
  const d = e ? Math.hypot(e.x - p.x, e.z - p.z) - e.r : 0, fast = p.wolfT > 0 ? .85 : 1; p.act = { kind: 'atk', t: 0, dur: [.36, .36, .44, .54][p.combo - 1] * fast, hitAt: [.14, .14, .19, .27][p.combo - 1] * fast, hit: false, counter: !!ct, lunge: e && d > 1.6 ? Math.min(d - 1.3, (e.d.elite || e.d.heavy) && !(e.brokenT > 0) && !ct ? 1.3 : 2) : (e ? 0 : .6) }; p.play(AT1[p.combo - 1], p.combo === 4 ? { once: true, force: true, dur: .62 } : { once: true, force: true, ts: 1.9 }); }
function updatePlayer(p, dt) {
  if (p.dead) return; if (p.shield > 0) { p.shield -= dt; if (p.shieldFx) { p.shieldFx.position.set(p.x, 1.1, p.z); p.shieldFx.visible = p.shield > 0; } } if (p.giant > 0) { p.giant -= dt; } { const gs = p.giant > 0 ? 1.55 : 1; p.gsc = (p.gsc || 1) + (gs - (p.gsc || 1)) * Math.min(1, dt * 6); p.o.scale.setScalar(p.vs * p.gsc); }
  p.iframe -= dt; p.dodgeCd -= dt; for (const k in G.sk) if (G.sk[k].cd > 0) G.sk[k].cd -= dt;
  if (p.wolfT > 0) { p.wolfT -= dt; if (Math.random() < .25) sparks(p.x, .3, p.z, 0x7fd0ff, 1, 1.5); }
  if (G.holdA && performance.now() - G.holdA > 280 && (!p.act || p.act.kind === 'atk')) { G.holdA = 0; startHeavy(p); }
  let mx = joy.x, mz = joy.z; if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const a = p.act; const fxx = Math.sin(p.rot), fzz = Math.cos(p.rot);
  if (a) {
    a.t += dt; const u = a.t / a.dur; if (p.mounted) tickMount(p, dt, a.kind === 'dodge' || a.kind === 'dash' || a.kind === 'thrust');
    if (HACT[a.kind]) HACT[a.kind](p, a, dt, fxx, fzz, mx, mz);
    if (a.kind === 'atk') { if (a.lunge && a.t < .14) { p.x += fxx * a.lunge / .14 * dt; p.z += fzz * a.lunge / .14 * dt; } if (!a.hit && a.t >= a.hitAt) { a.hit = true; Sfx.swing(1, { x: p.x, z: p.z }); slashFx(p.x + fxx * .4, 1.2, p.z + fzz * .4, p.rot, a.counter ? 1.5 : 1.05, a.counter ? 0x9fd8ff : 0xfff0c0); const last = p.combo === 4, km = a.counter ? 2.6 : last ? 1.6 : p.combo === 3 ? 1.2 : 1; if (last && !a.counter) slashFx(p.x, 1.0, p.z, p.rot + 2.6, 1.2); const n = hitArc(p, p.mounted ? 3.8 : last ? 3.4 : 3.25, p.mounted ? -.2 : last ? -.55 : -.12, () => pd() * km * (p.mounted ? 1.25 : 1), { crit: last, kb: last ? 9 : 4, kd: last ? 1 : 0, gb: a.counter ? 1 : 0, pz: a.counter ? 3 : last ? 1.6 : 1 }); if (n) { Sfx.hit(); G.shake = Math.max(G.shake, last ? .3 : .15); G.ulti = Math.min(100, G.ulti + 4 * n); if (last) G.zk = Math.max(G.zk || 0, a.counter ? .14 : .06); } hitBreak(p.x + fxx * 1.4, p.z + fzz * 1.4, 1.6, 'atk'); } p.x += mx * p.speed * .25 * dt; p.z += mz * p.speed * .25 * dt; }
    else if (a.kind === 'dodge') { const sp = (a.sp || 13) * (1 - .5 * u); p.x += a.dx * sp * dt; p.z += a.dz * sp * dt; }
    else if (a.kind === 'spin') { p.x += mx * p.speed * .5 * dt; p.z += mz * p.speed * .5 * dt; if (a.n < 2 && a.t > .16 + a.n * .26) { a.n++; Sfx.swing(); const wv = p.shield > 0; ringFx(p.x, p.z, wv ? 5.5 : 3.9, wv ? 0x66ccff : 0xfff0c0); if (wv) { hitCircle(p.x, p.z, 5.5, () => pd(), 'ally', p, { kb: 14 }); if (a.n === 1) num(p, t('combo'), 'c'); } const n = hitCircle(p.x, p.z, 3.9, () => pd() * 1.6, 'ally', p, { kb: 8 }); hitBreak(p.x, p.z, 3.9, 'atk'); if (n) { Sfx.hit(); G.ulti = Math.min(100, G.ulti + 3 * n); G.shake = .25; } } }
    else if (a.kind === 'dash') { p.x += fxx * 10 * dt; p.z += fzz * 10 * dt; for (const e of G.ents) { if (e.dead || e.team !== 'enemy' || a.hit.has(e)) continue; if (Math.hypot(e.x - p.x, e.z - p.z) < 2 + e.r) { a.hit.add(e); e.damage(pd() * 2.4, p, { crit: true, kb: 10 }); Sfx.hit(); G.ulti = Math.min(100, G.ulti + 5); } } if (Math.random() < .6) burst(p.x, 1, p.z, 0xfff0c0, .7); if (!a.hb && hitBreak(p.x + fxx, p.z + fzz, 1.2, 'atk')) a.hb = 1; }
    else if (a.kind === 'ulti') { if (!a.fired && a.t > .45) { a.fired = true; Sfx.ulti(); G.shake = .7; let i = 0; for (const e of enemies()) { if (Math.hypot(e.x - p.x, e.z - p.z) > 30) continue; const ee = e; setTimeout(() => { if (ee.dead || G.paused) return; beam(ee.x, ee.z); ee.damage(pd() * (ee.d.heavy ? 9 : 5), p, { crit: true, kb: 12 }); }, 60 * i++); } } }
    else if (a.kind === 'slamP') { if (!a.fired && a.t > .45) { a.fired = true; const SR = p.giant > 0 ? 9 : 5.5; ringFx(p.x, p.z, SR, p.giant > 0 ? 0xff8844 : 0xd8b070); burst(p.x, .5, p.z, 0xc8a070, 4, true); Sfx.big(); G.shake = .55; for (const e of G.ents) { if (e.dead || !hostile('ally', e.team)) continue; if (Math.hypot(e.x - p.x, e.z - p.z) < SR + e.r) { e.damage(pd() * 2, p, { kb: 6 }); if (!e.d.heavy) e.stagger = 1.6; if (e.onSlam) e.onSlam(); } } hitBreak(p.x, p.z, SR, 'slam'); } }
    else if (a.kind === 'chain') { if (!a.fired && a.t > .2) { a.fired = true; const e = a.tg; const L = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1, 6), new THREE.MeshBasicMaterial({ color: 0xc9c2b0 })); fxg.add(L); fx.push({ m: L, t: 0, dur: .35, s0: 1, s1: 1, line: [p, e || { x: p.x + Math.sin(p.rot) * 12, z: p.z + Math.cos(p.rot) * 12, h: 2 }] }); if (e && !e.dead) { e.comboT = G.time + 2.5; e.damage(pd() * 1.4, p, { kb: 0 }); if (e.onChain) e.onChain(); else if (!e.d.heavy) { const dx = p.x - e.x, dz = p.z - e.z, l = Math.hypot(dx, dz) || 1; e.kx = dx / l * 16; e.kz = dz / l * 16; e.stagger = .8; } Sfx.hit(); } } }
    else if (a.kind === 'leap') { const k = clamp(u, 0, 1); p.x = a.x0 + (a.x1 - a.x0) * k; p.z = a.z0 + (a.z1 - a.z0) * k; p.x = clamp(p.x, -G.W, G.W); if (p.z < G.limitZ + .8) p.z = G.limitZ + .8; p.y = Math.sin(k * Math.PI) * (a.short ? .7 : a.low ? 1.4 : 3.2); wolfLine(p, a); }
    if (a.t >= a.dur) {
      p.act = null; p.y = 0;
      if (a.kind === 'leap') { p.leaping = false; let bad = false; for (const b of G.colB) if (b.ravine && p.z > b.z1 - .4 && p.z < b.z2 + .4) bad = true; if (bad) { p.x = a.x0; p.z = a.z0; } else { ringFx(p.x, p.z, 3.6, 0xbfe3ff); Sfx.big(); G.shake = .4; for (const b of G.ents) if (!b.dead && b.onLeap && Math.hypot(b.x - p.x, b.z - p.z) < 4.2 + b.r) b.onLeap(); const n = hitCircle(p.x, p.z, 3.6, () => pd() * 1.6, 'ally', p, { crit: true, kb: 10, kd: 1, gb: 1, pz: 2 }); G.ulti = Math.min(100, G.ulti + 4 * n); } }
      if (a.kind === 'atk' && p.queued) startAtk(p); else if (a.kind === 'atk') p.comboT = .7;
      if (!p.act && G.buf) { const b = G.buf; G.buf = null; if (performance.now() - b.t < 380) doAct(b.k); }
    }
  } else {
    if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }
    const HL = p.hl && !p.mounted && !p.hl.dead && Math.hypot(p.hl.x - p.x, p.hl.z - p.z) < 6.5 ? p.hl : null, spd = p.speed * (p.mounted ? 1.8 : 1) * (p.wolfT > 0 ? 1.3 : 1) * (HL ? .62 : 1); if (ml > .12) { p.x += mx * spd * dt; p.z += mz * spd * dt; if (HL) p.face(HL.x - p.x, HL.z - p.z, dt * 10); else p.face(mx, mz, dt * (p.mounted ? 7 : 14)); p.play(p.mounted ? 'Idle_Combat' : 'Running_A', { ts: 1.15 }); } else p.play('Idle');
    tickMount(p, dt, ml > .12);
  }
  p.x += (p.kx || 0) * dt; p.z += (p.kz || 0) * dt; p.kx = (p.kx || 0) * Math.pow(.004, dt); p.kz = (p.kz || 0) * Math.pow(.004, dt);
  collide(p);
  if (p.bump && p.act && (p.act.kind === 'dodge' || p.act.kind === 'dash')) { const n = p.bump; p.act = null; p.iframe = Math.max(p.iframe, .2); p.kx = n.nx * 7; p.kz = n.nz * 7; G.shake = Math.max(G.shake, .25); burst(p.x - n.nx * p.r, 1, p.z - n.nz * p.r, 0xbfa58a, 1.4, true); Sfx.hit(); p.play('Hit_A', { once: true, force: true, ts: 1.6 }); }
  for (let i = G.picks.length - 1; i >= 0; i--) { const k = G.picks[i]; if (Math.hypot(k.x - p.x, k.z - p.z) < 1.5) { const h = Math.round(p.maxHp * .22); p.hp = Math.min(p.maxHp, p.hp + h); num(p, '+' + h, 'h'); Sfx.pick(); fxg.remove(k.s); G.picks.splice(i, 1); } }
}

// ---------- Combat feel: perfect dodge, poise break, elites, heavy attacks, wolf spirit, indicators ----------
const canCancel = a => !a || a.kind === 'atk' || a.kind === 'block' || (a.kind === 'hvy' && a.hit) || (/^(spin|cast|chain|cleave|sweep|slamP|bash)$/.test(a.kind) && a.t > a.dur * .6);
function perfectDodge(p, src) { if (G.time < (G.pdT || 0)) return; G.pdT = G.time + 1.2; G.slow = Math.max(G.slow || 0, .45); p.counterT = G.time + 1.8; p.counterTg = src; p.iframe = Math.max(p.iframe, .6); p.dodgeCd = 0; num(p, tx('perfect'), 'c'); ringFx(p.x, p.z, 2.6, 0x9fd8ff); burst(p.x, 1.2, p.z, 0x9fd8ff, 2); Sfx.power(); G.zk = Math.max(G.zk || 0, .12); G.ulti = Math.min(100, G.ulti + 8); vib(20); G.stats.pd = (G.stats.pd || 0) + 1; }
function breakPoise(e) { w3KitCancel(e); const T0 = e.d.heavy ? 2.4 : 3; e.pzImm = G.time + T0 + ((e.d.heavy || e.hunt || e.lead || e.duel || e === G.boss) ? 18 : 5); e.brokenT = T0; e.stagger = T0; e.poise = 0; e.state = 'chase'; e.clearTele(); if (e.yM) e.y = 0; e.castT = 0; e.castFn = null; e.play('Hit_A', { once: true, force: true, ts: .5 }); num(e, tx('brk'), 'c'); Sfx.big(); G.slow = Math.max(G.slow || 0, .3); G.shake = Math.max(G.shake, .5); G.zk = Math.max(G.zk || 0, .12); ringFx(e.x, e.z, e.r * 3 + 1.5, 0xffe070); sparks(e.x, e.h * .8, e.z, 0xffe070, 22, 8); G.stats.brk = (G.stats.brk || 0) + 1; }
function plate(e, nameKey) { if (e.bar) fxg.remove(e.bar); let ro = 30; const g = new THREE.Group(), W = 2.0, mk = (c, w, h, y, z, op = 1) => { const m = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthTest: false, depthWrite: false, toneMapped: false, fog: false })); m.scale.set(w, h, 1); m.position.set(0, y, z); m.renderOrder = ro++; g.add(m); return m; };
  mk(0xffc23a, W + .16, .3, 0, 0); mk(0x161010, W + .05, .19, 0, .004); const lag = mk(0xffffff, W, .15, 0, .007), fg = mk(0xff2a1e, W, .15, 0, .01), pzb = mk(0x161010, W + .05, .08, -.25, .004), pz = mk(0xffb020, W, .05, -.25, .01);
  const c = document.createElement('canvas'); c.width = 384; c.height = 48; const x = c.getContext('2d'); x.font = '700 28px Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = '#000'; x.strokeText(tx(nameKey), 192, 25); x.fillStyle = '#ffd76a'; x.fillText(tx(nameKey), 192, 25); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); s.scale.set(4.0, .5, 1); s.position.y = .48; s.renderOrder = 40; g.add(s);
  e.bar = g; e.barFg = fg; e.barLag = lag; e.barLagK = 1; e.barW = W; e.barPz = e.poiseMax ? pz : null; if (!e.poiseMax) pz.visible = pzb.visible = false; fxg.add(g); }
// the hero's own target: a named captain with a plate and a gold ring (missions mark one per posted group)
export function markHunt(e, key) { e.hunt = true; e.d = { ...e.d, name: key || e.d.name || 'mb_cap' }; plate(e, e.d.name); aura(e, 0xffd040); }
function aura(e, color) { if (e.aura) fxg.remove(e.aura); const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.setScalar(e.r * 1.9 + .5); m.position.set(e.x, .06, e.z); fxg.add(m); e.aura = m; }
function decorate(e) { const d = e.d; if (e.team !== 'enemy') return; if ((d.poise || d.heavy) && !e.invuln && e.maxHp < 1e8) e.poiseMax = e.poise = d.poise || clamp(e.maxHp * .14, 250, 900);
  if (d.elite) { plate(e, d.name); aura(e, e.type === 'boribasi' ? 0xff3020 : d.orb ? 0xb040ff : 0xffb040); }
  if (d.glow) for (const m of e.mats) if (m.emissive) { m.userData.em0 = new THREE.Color(d.glow); m.emissive.set(d.glow); } }
let lockM = null;
function lockTick(p) { const e = p.lock, on = e && !e.dead && !e.gone && G.time - (p.lockAt || 0) < 2.5; if (!lockM || !lockM.parent) { lockM = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: .8, depthWrite: false })); fxg.add(lockM); } lockM.visible = !!on; if (on) { lockM.position.set(e.x, .08, e.z); lockM.scale.setScalar(e.r + .45); } }
function entFx(e, p, dt) { if (e === p) return;
  if (e.air) { e.y += e.vy * dt; e.vy -= 24 * dt; if (e.y <= 0 && e.vy < 0) { e.y = 0; e.air = false; e.downT = .9; try { Sfx.fall && Sfx.fall({ x: e.x, z: e.z }); } catch (e_) { } e.curName = ''; e.play('Death_A', { once: true, force: true }); burst(e.x, .3, e.z, 0xc8a070, 1.8, true); } }
  else if (e.yM && e.y > 0 && e.state !== 'pounce' && e.state !== 'leapS') e.y = Math.max(0, e.y - dt * 10);
  if (e.buffT > 0) { e.buffT -= dt; if (Math.random() < .1) sparks(e.x, e.h * .9, e.z, e.hasteT > 0 ? 0xff5030 : 0x66ff88, 1, 1.5); } if (e.hasteT > 0) e.hasteT -= dt;
  if (e.brokenT > 0) { e.brokenT -= dt; if (Math.random() < .25) sparks(e.x, e.h + .2, e.z, 0xffe070, 1, 2); if (e.brokenT <= 0) e.poise = e.poiseMax; } else if (e.poiseMax && e.poise < e.poiseMax && G.time - (e.poiseAt || 0) > 4) e.poise = Math.min(e.poiseMax, e.poise + e.poiseMax * .25 * dt); }
// heavy attack (hold the attack button): finisher depends on how many light hits came before it
function startHeavy(p) { if (!p || p.dead || !w3Spend(p, 20, 8)) return; const c = p.combo || 0, v = p.mounted ? 'sweep' : c >= 3 ? 'launch' : c === 2 ? 'sweep' : 'cleave'; aim(p, 6.5); p.queued = false; p.combo = 0; p.comboT = 0; const dur = v === 'cleave' ? .7 : v === 'sweep' ? .62 : .55;
  p.act = { kind: 'hvy', v, t: 0, dur, hitAt: dur * .52 }; p.play(v === 'cleave' ? '2H_Melee_Attack_Chop' : v === 'launch' ? '1H_Melee_Attack_Chop' : '2H_Melee_Attack_Spin', { once: true, force: true, dur }); Sfx.dodge(); }
G.heavy = () => startHeavy(G.player);
HACT.hvy = (p, a, dt, fx, fz) => { if (a.t < a.hitAt && a.v !== 'sweep') { p.x += fx * 3 * dt; p.z += fz * 3 * dt; } if (a.hit || a.t < a.hitAt) return; a.hit = true; Sfx.swing(1, { x: p.x, z: p.z }); Sfx.big(); try { Sfx.hit('heavy', { x: p.x, z: p.z }); } catch (e_) { } let n = 0;
  if (a.v === 'cleave') { slashFx(p.x + fx * .5, 1.1, p.z + fz * .5, p.rot, 1.7, 0xffd890); burst(p.x + fx * 2, .4, p.z + fz * 2, 0xc8a070, 2.4, true); n = hitArc(p, 3.7, .1, () => pd() * 2.4, { crit: true, kb: 6, kd: 1, gb: 1, pz: 2.2 }); }
  else if (a.v === 'sweep') { ringFx(p.x, p.z, 3.8, 0xfff0c0); slashFx(p.x, 1.1, p.z, p.rot, 1.5); slashFx(p.x, 1.1, p.z, p.rot + Math.PI, 1.5); n = hitCircle(p.x, p.z, 3.8, () => pd() * 1.8, 'ally', p, { kb: 12, gb: 1, pz: 1.8 }); }
  else { slashFx(p.x + fx * .5, 1.4, p.z + fz * .5, p.rot, 1.3, 0xbfe0ff); n = hitArc(p, 3.3, .15, () => pd() * 1.9, { crit: true, kb: 2, launch: 1, gb: 1, pz: 2 }); }
  hitBreak(p.x + fx * 1.6, p.z + fz * 1.6, 2.2, 'atk'); if (n) { Sfx.hit(); G.shake = Math.max(G.shake, .4); G.zk = Math.max(G.zk || 0, .09); G.ulti = Math.min(100, G.ulti + 5 * n); } };
// wolf spirit: a spectral wolf runs ahead of the dash, everything on the line is hit and thrown down
function spiritWolf(p) { const src = A.real && A.real.spwolf;   /* quadruped R_bori4 (the enemy 'wolves' are wolf-headed soldiers now) */ if (!src) { if (A.real) ensureReal(['spwolf']); return; } if (!ANIM.data) return; try { const rig = new SkinRig(src, {}), o = rig.root, gm = new THREE.MeshBasicMaterial({ color: 0x66c8ff, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false }); o.traverse(m => { if (m.isMesh) { m.material = gm; m.castShadow = false; m.frustumCulled = false; } }); o.scale.setScalar(1.18 * .95 * 1.45); rig.play('Running_A', { ts: 2 }); fxg.add(o); (G.spirits || (G.spirits = [])).push({ rig, o, gm, p, t: 0 }); } catch (err) { console.warn('spirit', err); } }
function tickSpirits(dt) { const L = G.spirits || []; for (let i = L.length - 1; i >= 0; i--) { const s = L[i], p = s.p; s.t += dt; s.rig.update(dt); const lead = 1.7 + Math.min(s.t, .5) * 2; s.o.position.set(p.x + Math.sin(p.rot) * lead, (p.y || 0) * .5, p.z + Math.cos(p.rot) * lead); s.o.rotation.y = p.rot; s.gm.opacity = .6 * clamp((.85 - s.t) / .3, 0, 1); if (Math.random() < .7) sparks(s.o.position.x, 1, s.o.position.z, 0x7fd0ff, 1, 2); if (s.t > .85 || !p || p.dead) { fxg.remove(s.o); if (s.rig.dispose) s.rig.dispose(); s.gm.dispose(); L.splice(i, 1); } } }
function wolfLine(p, a) { if (!a.hit) return; for (const e of G.ents) { if (e.dead || e.team !== 'enemy' || a.hit.has(e)) continue; if (Math.hypot(e.x - p.x, e.z - p.z) < 2.1 + e.r) { a.hit.add(e); e.damage(pd() * 2, p, { crit: true, kb: 9, kd: 1, gb: 1, pz: 2 }); sparks(e.x, 1.2, e.z, 0x9fd8ff, 10, 6); Sfx.hit(); G.ulti = Math.min(100, G.ulti + 4); } } if (Math.random() < .8) burst(p.x, .8 + (p.y || 0) * .5, p.z, 0x66c8ff, .9); }
// HUD extras created from code: low-HP vignette, boss poise bar, off-screen attacker arrows, skill glows
let lowEl = null, pzEl = null; const offEl = [];
function offInd(p) { let n = 0; const put = (wx, wz) => { v3.set(wx, 1.2, wz).project(camera); if (v3.z < 1 && Math.abs(v3.x) < .97 && Math.abs(v3.y) < .95) return; let x = v3.x, y = v3.y; if (v3.z > 1) { x = -x; y = -y; } const m = Math.max(Math.abs(x) / .9, Math.abs(y) / .8, 1e-3); x /= m; y /= m; let el = offEl[n]; if (!el) { el = offEl[n] = document.createElement('div'); el.style.cssText = 'position:fixed;width:0;height:0;border-top:11px solid transparent;border-bottom:11px solid transparent;border-left:20px solid #ff3a20;filter:drop-shadow(0 0 6px #ff2000);pointer-events:none;z-index:12;margin:-11px 0 0 -10px'; document.body.appendChild(el); } el.style.display = 'block'; el.style.left = ((x * .5 + .5) * innerWidth) + 'px'; el.style.top = ((-y * .5 + .5) * innerHeight) + 'px'; el.style.transform = `rotate(${Math.atan2(-y, x)}rad)`; n++; };
  if (p && !p.dead && !G.paused) { for (const e of G.ents) { if (n >= 4) break; if (e.dead || e.bg || e.team !== 'enemy' || !/^(windup|crouch|pounce|leapS)$/.test(e.state) || (e.tg && e.tg !== p)) continue; put(e.x, e.z); } for (const q of G.proj) { if (n >= 4) break; if (q.team !== 'enemy' || (p.x - q.x) * q.vx + (p.z - q.z) * q.vz < 0) continue; put(q.x, q.z); } }
  for (let i = n; i < offEl.length; i++) offEl[i].style.display = 'none'; }
function hud2(p) {
  if (!lowEl) { lowEl = document.createElement('div'); lowEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9;opacity:0;background:radial-gradient(ellipse at center,rgba(150,0,0,0) 50%,rgba(175,10,10,.62) 100%)'; document.body.appendChild(lowEl); }
  lowEl.style.opacity = !p.dead && p.hp / p.maxHp < .3 ? (.6 + Math.sin(performance.now() / 260) * .3).toFixed(2) : 0;
  const b5 = $('b5'); if (b5) b5.style.boxShadow = p.wolfT > 0 ? '0 0 14px 4px rgba(110,200,255,.95)' : '';
  const bA = $('bA'); if (bA) bA.style.boxShadow = p.counterT > G.time ? '0 0 16px 6px rgba(160,220,255,.95)' : '';
  const b = G.boss; if (b && !b.dead && b.poiseMax) { if (!pzEl) { pzEl = document.createElement('div'); pzEl.style.cssText = 'height:4px;margin-top:3px;background:rgba(0,0,0,.55);border-radius:2px;overflow:hidden'; pzEl.innerHTML = '<div style="height:100%;background:#ffd040;width:100%"></div>'; const bb = $('bbar'); if (bb && bb.parentNode) bb.parentNode.insertBefore(pzEl, bb.nextSibling); } pzEl.style.display = 'block'; pzEl.firstChild.style.width = (b.brokenT > 0 ? 0 : clamp(b.poise / b.poiseMax * 100, 0, 100)) + '%'; } else if (pzEl) pzEl.style.display = 'none';
  offInd(p); }

// ==== W3 combat (Witcher-style moveset: stamina, dodge/roll, block/parry, jump, strong chain, hard lock, executions; enemy roles + boss kits) ====
Object.assign(TXT, {
  parry: { uz: 'Qaytarildi!', qq: 'Qaytarıldı!', ru: 'Парирование!', en: 'PARRY!' }, gbrk: { uz: 'Himoya yorildi!', qq: 'Qorǵanıw jarıldı!', ru: 'Блок пробит!', en: 'GUARD BROKEN!' },
  exec: { uz: 'Yakuniy zarba!', qq: 'Aqırǵı soqqı!', ru: 'Добивание!', en: 'EXECUTION!' }, back: { uz: 'Orqadan!', qq: 'Arqadan!', ru: 'Со спины!', en: 'BACKSTAB!' },
  free: { uz: 'Qutul!', qq: 'Qutıl!', ru: 'Вырвись!', en: 'BREAK FREE!' }, weakp: { uz: 'Zaif joy!', qq: 'Álsiz jer!', ru: 'Слабое место!', en: 'WEAK SPOT!' },
  qilich: { uz: 'Qilichboz', qq: 'Qılıshker', ru: 'Мечник', en: 'Swordsman' }, qalqan: { uz: 'Qalqondor', qq: 'Qalqanshı', ru: 'Щитоносец', en: 'Shield bearer' },
  h_qil: { uz: "Qilichboz yengil zarbalarni qaytaradi — kuchli zarba bilan himoyasini yoring!", qq: 'Qılıshker jeńil soqqılardı qaytaradı — kúshli soqqı menen qorǵanıwın jarıń!', ru: 'Мечник парирует быстрые удары — пробейте блок сильным ударом!', en: 'The swordsman parries fast attacks — break his guard with a strong attack!' },
  h_qal: { uz: "Qalqon oldidan himoya qiladi — orqasiga o'ting!", qq: 'Qalqan aldınnan qorǵaydı — artına ótiń!', ru: 'Щит закрывает спереди — зайдите со спины!', en: 'The shield blocks from the front — get behind him!' },
  h_red: { uz: "Qizil hujumni to'sib bo'lmaydi — chap bering!", qq: 'Qızıl hújimdi tosıp bolmaydı — qashıń!', ru: 'Красную атаку не заблокировать — уклоняйтесь!', en: 'Red attacks cannot be blocked — dodge!' },
  h_jump: { uz: "To'lqindan ➤ bilan qoching!", qq: 'Tolqınnan ➤ penen qashıń!', ru: 'Уходите от волны — жмите ➤!', en: 'Dodge the shockwave with ➤!' }
});
const W3T = [], W3C = { ub: 0xff1010, mel: 0xffa020 };
const hintOnce = k => { const S = G.hintSeen || (G.hintSeen = {}); if (S[k]) return; S[k] = 1; hintRaw(tx(k)); };
// ---- enemy roles (reuse the soldier model) ----
Object.assign(T, {
  qilich: { ...T.askar, like: 'askar', mdl: 'askar', vsK: 1.06, scale: T.askar.scale * 1.06, hp: 190, dmg: [11, 15], speed: 4.1, windup: .42, cd: 1.25, string: 3, block: .3, parry: .55, poise: 80, elite: true, noShield: true, name: 'qilich' },
  qalqan: { ...T.askar, like: 'askar', mdl: 'askar', vsK: 1.13, scale: T.askar.scale * 1.13, hp: 240, dmg: [14, 19], speed: 3.0, windup: .55, cd: 1.7, string: 1, block: 0, shieldF: true, turn: .32, poise: 120, elite: true, name: 'qalqan' }
});
// ---- small helpers ----
const v2 = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || .01; return { dx, dz, l, ux: dx / l, uz: dz / l }; };
const frontOf = (e, src) => { const s = v2(e, src); return (s.dx * Math.sin(e.rot) + s.dz * Math.cos(e.rot)) / s.l; };
const lineGeo = (() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0, .5); return g; })();
const bandGeo = new THREE.CylinderGeometry(1, 1, .7, 48, 1, true);
function lineTele(e, len, w, dur, col = W3C.ub, follow = true) {
  const g = new THREE.Group(), rim = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .22, depthWrite: false })), fill = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .55, depthWrite: false }));
  rim.scale.set(w, 1, len); fill.scale.set(w, 1, .01); fill.position.y = .01; g.add(rim, fill); g.position.set(e.x, .08, e.z); g.rotation.y = e.rot; fxg.add(g);
  const o = { kind: 'line', g, fill, len, w, t: 0, dur, dead: false, own: follow ? e : null }; W3T.push(o); return o; }
function shockwave(src, x, z, R, v, dmg, col = 0xffa040) {
  const g = new THREE.Group(), ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false })), band = new THREE.Mesh(bandGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  band.position.y = .35; g.add(ring, band); g.position.set(x, .1, z); g.scale.setScalar(.5); fxg.add(g); W3T.push({ kind: 'wave', g, ring, band, x, z, R, v, r: .5, dmg, src, hit: new Set(), t: 0, dur: R / v, dead: false }); hintOnce('h_jump'); }
const rockGeo = new THREE.DodecahedronGeometry(.6, 0);
function boulder(src, tx0, tz0, fl, dmg) { const m = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 })); m.castShadow = true; m.scale.setScalar(1.3); fxg.add(m); W3T.push({ kind: 'rock', m, x0: src.x, z0: src.z, y0: src.h * .9, x1: tx0, z1: tz0, t: 0, dur: fl, dmg, src, dead: false }); }
let bangTex = null;
function ubMark(e, dur) { e.ubT = dur; e.ubD = dur; if (!bangTex) bangTex = canvasTex(64, (g, s) => { g.font = '900 54px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#300'; g.strokeText('!', s / 2, s / 2 + 3); g.fillStyle = '#ff2a10'; g.fillText('!', s / 2, s / 2 + 3); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bangTex, depthTest: false, transparent: true })); s.renderOrder = 14; s.scale.setScalar(1.1); fxg.add(s); W3T.push({ kind: 'bang', s, own: e, t: 0, dur, dead: false }); burst(e.x, e.h * .9, e.z, 0xff0000, 1.6); if (e.tg === G.player || Math.hypot(G.player.x - e.x, G.player.z - e.z) < 14) hintOnce('h_red'); }
function segDist(px, pz, ax, az, rot, len) { const ux = Math.sin(rot), uz = Math.cos(rot), qx = px - ax, qz = pz - az, s = clamp(qx * ux + qz * uz, 0, len); return Math.hypot(qx - ux * s, qz - uz * s); }
function w3Phase(e) { if (e.type === 'surtaysha' && e.helm !== undefined) return clamp(4 - e.helm, 1, 3); if (e.d.heavy) { if (e.maxHp > 1e8) return 1; return e.phase || (e.hp < e.maxHp * .34 ? 3 : e.hp < e.maxHp * .67 ? 2 : 1); } return e.hp < e.maxHp * .5 ? 2 : 1; }
const bdmg = (e, k = 1) => (e.d.dmg[0] + e.d.dmg[1]) * .5 * e.dmgMul * k;
// ---- stamina ----
function w3P(p) { if (!p.stMax) { p.stMax = 100; p.st = 100; p.stAt = -9; } }
function w3Spend(p, c, need = c) { w3P(p); if (p.st < need) { G.stLow = performance.now() + 450; if (G.time > (G.stNumT || 0)) { G.stNumT = G.time + 1; num(p, '⚡', 'n'); } return false; } p.st = Math.max(0, p.st - c); p.stAt = G.time; return true; }
// ---- player moves ----
function stickDir() { const x = joy.x + ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0), z = joy.z + ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - ((keys.KeyW || keys.ArrowUp) ? 1 : 0), l = Math.hypot(x, z); return l > .3 ? { x: x / l, z: z / l } : null; }
const busy = () => G.paused || G.freeze || G.qte;
function w3Dodge(p, roll, dir) {
  if (!p || p.dead || busy()) return; initAudio(); const now = performance.now(); if (!roll && !dir && now - (G.dTap || 0) < 320) roll = true; G.dTap = now; const a = p.act;
  if (roll && a && a.kind === 'dodge' && !a.roll && a.t < .3) { if (!w3Spend(p, 14, 6)) return; a.roll = true; a.dur = .62; a.sp = 12; a.t = 0; p.rot = Math.atan2(a.dx, a.dz); p.iframe = Math.max(p.iframe, .48); if (!p.mounted) p.play('Dodge_Forward', { once: true, force: true, dur: .62 }); return; }
  if (!roll && p.dodgeCd > 0) return;
  if (a && !canCancel(a) && !(a.kind === 'jump' && (p.y || 0) < .25) && !(a.kind === 'dodge' && a.t > a.dur * .65) && !(a.kind === 'hvy' && a.t < a.hitAt * .6)) { if (dir || roll) G.wbuf = { k: roll ? 'R' : 'D', t: G.time, dir }; return; }
  if (!w3Spend(p, roll ? 28 : 15, roll ? 12 : 7)) return;
  if (p.guard) w3GuardEnd(p);
  let d = dir || stickDir(); const L = p.hl && !p.hl.dead ? p.hl : null;
  if (!d) { if (roll) d = { x: Math.sin(p.rot), z: Math.cos(p.rot) }; else { const f = L ? v2(p, L) : { ux: Math.sin(p.rot), uz: Math.cos(p.rot) }; d = { x: -f.ux, z: -f.uz }; } }
  p.act = { kind: 'dodge', t: 0, dur: roll ? .62 : .34, dx: d.x, dz: d.z, sp: roll ? 12 : 13.5, roll }; p.queued = false;
  if (roll || p.mounted) p.rot = Math.atan2(d.x, d.z); else if (L) p.rot = Math.atan2(L.x - p.x, L.z - p.z);
  p.iframe = roll ? .5 : .3; p.dodgeCd = roll ? .45 : .3;
  if (roll && !p.mounted) p.play('Dodge_Forward', { once: true, force: true, dur: .62 }); else if (!p.mounted) { p.curName = ''; p.inLoco = false; p.play('Dodge_Side', { once: true, force: true, dur: .34 });   /* animation agent's side-dash clip (was the Walking_A hack) */ p.lnx = d.x; p.lnz = d.z; p.ln = .32; }
  Sfx.dodge(); burst(p.x, .25, p.z, 0xc8a070, roll ? 1.4 : 1, true); G.stats.dodge = (G.stats.dodge || 0) + 1;
}
function guardFace(p) { let t = p.hl && !p.hl.dead ? p.hl : null; if (!t) { let bd = 9; for (const e of G.ents) { if (e.dead || e.gone || !hostile('ally', e.team) || e.bg) continue; const d = Math.hypot(e.x - p.x, e.z - p.z) - e.r; if (d < bd) { bd = d; t = e; } } } return t; }
function w3Guard(p, on, resume) {
  if (!p) return; w3P(p);
  if (!on) { p.guardHeld = false; if (p.guard) w3GuardEnd(p); return; }
  if (p.dead || busy() || p.mounted) return; if (!resume) { p.guardHeld = true; initAudio(); }
  const a = p.act; if (a && a.kind === 'block') return;
  if (a && !canCancel(a) && !(a.kind === 'dodge' && a.t > a.dur * .5)) { if (!resume) G.wbuf = { k: 'B', t: G.time }; return; }
  if (!resume) p.guardAt = G.time; p.guard = true; p.queued = false; p.act = { kind: 'block', t: 0, dur: 1e9 };
  const t0 = guardFace(p); if (t0) p.rot = Math.atan2(t0.x - p.x, t0.z - p.z);
  p.curName = ''; p.inLoco = false; p._play('Idle_Combat', { force: true }); if (p.rig.aimBone) p.rig.post = guardPose;
  if (!resume) { Sfx.swing && Sfx.swing(); sparks(p.x + Math.sin(p.rot) * .6, 1.3, p.z + Math.cos(p.rot) * .6, 0xbfe0ff, 4, 2); }
}
function w3GuardEnd(p) { p.guard = false; if (p.act && p.act.kind === 'block') p.act = null; if (p.rig.post === guardPose) p.rig.post = null; }
const _gv = () => new THREE.Vector3();
function jumpPose(rig) { const P = G.player; if (!P || P.rig !== rig || !P.act || P.act.kind !== 'jump') { if (rig.post === jumpPose) rig.post = null; return; } if ((P.y || 0) > .12) rig.legPose(); }
function guardPose(rig) { const B = rig.B, P = G.player; if (!P || !P.guard || P.rig !== rig) { rig.post = null; return; } if (!B.RightArm || !B.RightForeArm || !B.Head) return;
  rig.root.updateMatrixWorld(true); const q = rig.root.getWorldQuaternion(new THREE.Quaternion()), F = _gv().set(0, 0, 1).applyQuaternion(q), U = _gv().set(0, 1, 0), Sd = _gv().set(1, 0, 0).applyQuaternion(q);
  const head = B.Head.getWorldPosition(_gv()), sh = B.RightArm.getWorldPosition(_gv()), side = Math.sign(sh.clone().sub(head).dot(Sd)) || 1;
  rig.aimBone(B.RightArm, B.RightForeArm, F.clone().multiplyScalar(.75).addScaledVector(U, -.15).addScaledVector(Sd, side * .45));
  rig.aimBone(B.RightForeArm, B.RightHand, F.clone().multiplyScalar(.35).addScaledVector(U, .75).addScaledVector(Sd, -side * .6));
  if (B.LeftArm && B.LeftForeArm && B.LeftHand) { rig.aimBone(B.LeftArm, B.LeftForeArm, F.clone().multiplyScalar(.7).addScaledVector(U, -.3).addScaledVector(Sd, -side * .5)); rig.aimBone(B.LeftForeArm, B.LeftHand, F.clone().multiplyScalar(.5).addScaledVector(U, .5).addScaledVector(Sd, side * .5)); } }
function guardBreak(p) { w3GuardEnd(p); p.st = 0; p.stAt = G.time + .6; p.act = { kind: 'stun', t: 0, dur: .7 }; p.curName = ''; p.inLoco = false; p._play('Hit_A', { once: true, force: true, ts: .8 }); num(p, tx('gbrk'), 'p'); sparks(p.x, 1.3, p.z, 0xffffff, 14, 7); Sfx.big(); G.shake = Math.max(G.shake, .45); vib(60); }
// defence of the player against an enemy hit: returns the damage left (0 = negated)
function w3Def(p, amt, src, op) {
  if (p.act && p.act.kind === 'exec') return 0;
  if (op.low && (p.y || 0) > .4) return 0;
  if (!p.guard) return amt;
  const ub = op.ub || !(op.mel || op.proj), fr = frontOf(p, src) > .2;
  if (ub) { if (op.ub && fr) guardBreak(p); return amt; }
  if (!fr) return amt;
  if (!op.proj && G.time - (p.guardAt || -9) < .3) { w3Parry(p, src); return 0; }
  const hv = src.d.heavy, cost = op.proj ? 5 : Math.max(6, amt * (hv ? 1.25 : .75)), s = v2(src, p);
  sparks(p.x - s.ux * .6, 1.3, p.z - s.uz * .6, 0xe8f0ff, 9, 6); Sfx.hit(); G.hitStop = Math.max(G.hitStop || 0, .04);
  if (p.st >= cost) { p.st -= cost; p.stAt = G.time; p.kx = (p.kx || 0) + s.ux * (hv ? 7 : 2.5); p.kz = (p.kz || 0) + s.uz * (hv ? 7 : 2.5); if (!op.proj) num(p, tx('block'), 'n'); return op.proj ? 0 : Math.round(amt * (hv ? .3 : .08)); }
  guardBreak(p); return Math.round(amt * .6); }
function w3Parry(p, e) {
  G.stats.parry = (G.stats.parry || 0) + 1; num(p, tx('parry'), 'c'); Sfx.big(); if (Sfx.parry) Sfx.parry({ x: p.x, z: p.z }); else Sfx.hit(); vib(35); G.slow = Math.max(G.slow || 0, .55); G.hitStop = .12; G.shake = Math.max(G.shake, .35); G.zk = Math.max(G.zk || 0, .13);
  const mx = (p.x + e.x) / 2, mz = (p.z + e.z) / 2; sparks(mx, 1.4, mz, 0xffffff, 22, 9); sparks(mx, 1.4, mz, 0x9fd8ff, 12, 6); burst(mx, 1.4, mz, 0xbfe8ff, 2.4); ringFx(p.x, p.z, 2.4, 0xbfe8ff);
  e.clearTele(); w3KitCancel(e); const s = v2(p, e);
  if (e.d.heavy) { /* QA 2b: a parry deflects a boss's strike but does not stun-lock him — a 0.2 s recoil; every parry chips 34 % poise (three parries break it) unless he was broken in the last 14 s */ e.state = 'chase'; e.stagger = Math.max(e.stagger, .2); if (e.poiseMax && !(e.brokenT > 0) && G.time > (e.pzImm || 0)) { e.poise -= e.poiseMax * .34; e.poiseAt = G.time; if (e.poise <= 0) breakPoise(e); } }
  else { const cap_ = e.hunt || e.lead || e.duel || e === G.boss; e.state = 'chase'; e.stagger = Math.max(e.stagger, cap_ ? .35 : 1.5); e.kx += s.ux * 5; e.kz += s.uz * 5; e.lnx = s.ux; e.lnz = s.uz; e.ln = .3; e.play('Hit_A', { once: true, force: true, ts: .55 }); if (e.poiseMax && !(e.brokenT > 0) && G.time > (e.pzImm || 0)) { e.poise -= e.poiseMax * (cap_ ? .34 : .55); e.poiseAt = G.time; if (e.poise <= 0) breakPoise(e); } }
  tokFree(e); p.counterT = G.time + 1.7; p.counterTg = e; p.iframe = Math.max(p.iframe, .3); }
function w3Jump(p) {
  if (!p || p.dead || busy() || p.mounted) return; initAudio(); const a = p.act; if (a && a.kind === 'jump') return;
  if (a && !canCancel(a) && !(a.kind === 'dodge' && a.t > a.dur * .6)) { G.wbuf = { k: 'J', t: G.time }; return; }
  if (!w3Spend(p, 10, 5)) return; if (p.guard) w3GuardEnd(p);
  let d = stickDir(), sp = p.speed * .85; const L = p.hl && !p.hl.dead ? p.hl : null;
  if (!d && L) { const s = v2(p, L); if (s.l < 8) { d = { x: s.ux, z: s.uz }; sp = clamp((s.l - L.r - 1.2) / .62, 0, 11); } }
  if (d) p.rot = Math.atan2(d.x, d.z);
  p.act = { kind: 'jump', t: 0, dur: .62, vx: d ? d.x * sp : 0, vz: d ? d.z * sp : 0, h: 1.35 }; p.queued = false; p.curName = ''; p.inLoco = false; p._play('Idle_Combat', { force: true }); if (p.rig.legPose) p.rig.post = jumpPose; Sfx.dodge(); burst(p.x, .2, p.z, 0xc8a070, 1.1, true); }
function w3Plunge(p, a, k) { if (a.plunge) return; a.plunge = k; const e = aim(p, 7); if (e) { const s = v2(p, e), rem = Math.max(.12, a.dur - a.t), want = clamp(s.l - e.r - .8, 0, 2); a.vx = s.ux * Math.min(14, want / rem); a.vz = s.uz * Math.min(14, want / rem); } p.play('1H_Melee_Attack_Chop', { once: true, force: true, dur: Math.max(.25, a.dur - a.t + .1) }); Sfx.swing(); }
function w3Strong(p) {
  if (!p || p.dead || busy()) return; initAudio(); const a = p.act;
  if (a && a.kind === 'jump') return w3Plunge(p, a, 2);
  if (a && a.kind === 'hvy') { if (a.hit && a.t > a.dur * .5) { p.hc = ((p.hc || 0) + 1) % 3; p.combo = [0, 2, 3][p.hc]; startHeavy(p); } else G.wbuf = { k: 'S', t: G.time }; return; }
  if (a && a.kind === 'block') w3GuardEnd(p); else if (a && !canCancel(a)) { G.wbuf = { k: 'S', t: G.time }; return; }
  if (!a || a.kind !== 'atk') { p.hc = 0; p.combo = 0; } else p.hc = 0; startHeavy(p); }
// A pressed while busy: plunge from a jump, attack out of the guard, mash out of a grab
function w3Busy(p, k) { const a = p.act; if (!a) return false;
  if (a.kind === 'jump') { w3Plunge(p, a, 1); return true; }
  if (a.kind === 'block') { w3GuardEnd(p); startAtk(p); return true; }
  if (a.kind === 'held') { a.dur -= .2; sparks(p.x, 1.4, p.z, 0xffe0a0, 4, 4); if (Math.random() < .5) num(p, tx('free'), 'n'); return true; }
  return false; }
function w3Lock(p, release) {
  if (!p || p.dead) return; if (release) { p.hl = null; return; }
  const L = G.ents.filter(e => !e.dead && !e.gone && !e.bg && hostile('ally', e.team) && Math.hypot(e.x - p.x, e.z - p.z) < 18).sort((a, b) => a.x - b.x);
  if (!L.length) { p.hl = null; return; }
  let n; if (!p.hl || p.hl.dead || !L.includes(p.hl)) { let bs = 1e9; for (const e of L) { const s = v2(p, e), sc = s.l - (s.ux * Math.sin(p.rot) + s.uz * Math.cos(p.rot)) * 4 - (e === G.boss ? 3 : 0); if (sc < bs) { bs = sc; n = e; } } } else n = L[(L.indexOf(p.hl) + 1) % L.length];
  p.hl = n; p.lock = n; p.lockAt = G.time; ringFx(n.x, n.z, n.r + 1, 0xffd050); Sfx.swing && Sfx.swing(); }
// executions: occasional finisher with a camera close-up on a low-HP ordinary enemy
function w3Exec(p) {
  if (p.mounted || G.time < (G.execCd || 0) || G.noExec) return false; let e = p.hl && !p.hl.dead ? p.hl : null; if (!e || Math.hypot(e.x - p.x, e.z - p.z) - e.r > 2.6) { e = null; let bd = 2.6; for (const o of G.ents) { if (o.dead || o.team !== 'enemy' || o.bg) continue; const d = Math.hypot(o.x - p.x, o.z - p.z) - o.r; if (d < bd) { bd = d; e = o; } } }
  if (!e || e.d.heavy || e.invuln || e.air || e.downT > 0 || e.mounted || e.maxHp > 2000 || e.custom) return false;
  const low = e.hp <= e.maxHp * (e.d.elite ? .25 : .32) || (e.brokenT > 0 && e.hp <= e.maxHp * .45); if (!low) return false;
  if (Math.random() > (e.brokenT > 0 ? .9 : e.d.elite ? .5 : .25)) return false;
  G.execCd = G.time + 7; G.stats.exec = (G.stats.exec || 0) + 1; const s = v2(e, p); p.x = e.x + s.ux * (e.r + 1.05); p.z = e.z + s.uz * (e.r + 1.05); p.rot = Math.atan2(e.x - p.x, e.z - p.z); e.rot = Math.atan2(p.x - e.x, p.z - e.z);
  p.act = { kind: 'exec', t: 0, dur: 1.05, tg: e }; p.iframe = 1.3; p.queued = false; p.combo = 0; p.lock = e; p.lockAt = G.time;
  e.stagger = 3; e.state = 'chase'; e.clearTele(); w3KitCancel(e); e.kx = e.kz = 0; G.slow = Math.max(G.slow || 0, .5); num(p, tx('exec'), 'c'); p.play('1H_Melee_Attack_Slice_Horizontal', { once: true, force: true, dur: .32 }); Sfx.swing(); return true; }
Object.assign(HACT, {
  block(p, a, dt, fx, fz, mx, mz) { if (!p.guardHeld) { w3GuardEnd(p); return; } const tg = guardFace(p); p.x += mx * p.speed * .36 * dt; p.z += mz * p.speed * .36 * dt; if (tg) p.face(tg.x - p.x, tg.z - p.z, dt * 12); else if (Math.hypot(mx, mz) > .2) p.face(mx, mz, dt * 8); p.play(Math.hypot(mx, mz) > .2 ? 'Walking_A' : 'Idle_Combat'); },
  jump(p, a, dt) { const u = clamp(a.t / a.dur, 0, 1); p.x += a.vx * dt; p.z += a.vz * dt; p.y = Math.sin(u * Math.PI) * a.h; if (a.t >= a.dur && !a.land) { a.land = 1; p.y = 0;
      if (a.plunge) { const k = a.plunge === 2 ? 2.3 : 1.7, R = a.plunge === 2 ? 3.2 : 2.7; const n = hitCircle(p.x + Math.sin(p.rot) * .6, p.z + Math.cos(p.rot) * .6, R, () => pd() * k, 'ally', p, { crit: true, kb: 9, kd: 1, gb: 1, pz: 2.2 }); ringFx(p.x, p.z, R, 0xffe0a0); burst(p.x, .4, p.z, 0xc8a070, 3, true); slashFx(p.x, .6, p.z, p.rot, 1.4, 0xffe0a0); Sfx.big(); G.shake = Math.max(G.shake, .45); if (n) { Sfx.hit(); G.ulti = Math.min(100, G.ulti + 5 * n); } hitBreak(p.x, p.z, R, 'atk'); G.buf = null; if (a.plunge === 2) w3Spend(p, 10, 0); }
      else burst(p.x, .2, p.z, 0xc8a070, 1.2, true); } },
  stun() { }, held(p, a, dt) { const e = a.by; if (!e || e.dead) { a.t = a.dur; return; } const f = Math.sin(e.rot), g = Math.cos(e.rot); p.x = e.x + f * (e.r + .7); p.z = e.z + g * (e.r + .7); p.y = .5 + Math.sin(a.t * 18) * .08; p.rot = e.rot + Math.PI; if (a.t > (a.n || 0) * .45 + .3) { a.n = (a.n || 0) + 1; p.iframe = 0; p.hp -= Math.round(bdmg(e, .35)); num(p, '-' + Math.round(bdmg(e, .35)), 'p'); Sfx.hurt(); G.shake = Math.max(G.shake, .25); if (p.hp < 1) p.hp = G.noDeath ? 1 : 0; if (p.hp <= 0) p.die(); }
    if (a.t >= a.dur - dt) { p.y = 0; p.kx = f * 11; p.kz = g * 11; p.iframe = .5; e.state = 'recover'; e.tm = 1.2; e.punT = G.time + 1.2; } },
  exec(p, a, dt) { const e = a.tg; if (!e) return; p.face(e.x - p.x, e.z - p.z, dt * 12);
    if (!a.h1 && a.t > .12) { a.h1 = 1; slashFx(p.x + Math.sin(p.rot) * .5, 1.2, p.z + Math.cos(p.rot) * .5, p.rot, 1.1); sparks(e.x, e.h * .6, e.z, 0xffe6a8, 10, 6); Sfx.hit(); e.flash = .12; e.play('Hit_A', { once: true, force: true, ts: .7 }); G.hitStop = .06; e.lnx = Math.sin(p.rot); e.lnz = Math.cos(p.rot); e.ln = .3; }
    if (!a.h2 && a.t > .34) { a.h2 = 1; p.play('1H_Melee_Attack_Chop', { once: true, force: true, dur: .5 }); Sfx.swing(); }
    if (!a.h3 && a.t > .6) { a.h3 = 1; if (!e.dead) { e.invuln = false; e.stagger = 0; e.damage(e.hp + 9999, p, { crit: true, kb: 7, gb: 1, exec: 1 }); } sparks(e.x, e.h * .6, e.z, 0xffd27a, 26, 9); burst(e.x, e.h * .55, e.z, 0x7a0a0a, 2.6, true); ringFx(e.x, e.z, 3, 0xffd27a); slashFx(e.x, e.h * .5, e.z, p.rot, 1.6, 0xffd890); Sfx.big(); G.shake = .6; G.hitStop = .17; vib(70); } }
});
// ---- enemy defence: swordsman parries fast hits (strong ones break him), shield bearer blocks the front ----
function w3EDef(e, amt, src, op) {
  if (e.stagger > 0 || e.downT > 0 || e.air || e.brokenT > 0) return amt; const fr = frontOf(e, src), P = G.player, s = v2(e, src);
  if (e.d.shieldF) {
    if (fr > .25) { if (op.gb || op.kd || op.launch) { e.stagger = .6; e.state = 'chase'; w3KitCancel(e); e.kx -= s.ux * 5; e.kz -= s.uz * 5; sparks(e.x + s.ux * .6, e.h * .55, e.z + s.uz * .6, 0xffe070, 12, 7); return amt * .4; }
      sparks(e.x + s.ux * .6, e.h * .55, e.z + s.uz * .6, 0xe8f0ff, 10, 6); num(e, tx('block'), 'n'); Sfx.hit(); G.hitStop = Math.max(G.hitStop || 0, .03); if (src === P) { P.kx = (P.kx || 0) + s.ux * 3.5; P.kz = (P.kz || 0) + s.uz * 3.5; hintOnce('h_qal'); } e.poise = Math.max(1, (e.poise || 0) - amt * .3); return 0; }
    if (fr < -.3) { if (!op.silent) num(e, tx('back'), 'c'); return amt * 1.5; } return amt; }
  if (e.d.parry && src === P) {
    if (fr < .3) return amt;
    if (op.gb || op.crit || op.kd || op.launch) { if (e.state === 'block' || e.state === 'side' || e.state === 'chase') { e.stagger = .9; e.state = 'chase'; e.clearTele(); num(e, tx('brk'), 'c'); e.play('Hit_A', { once: true, force: true, ts: .6 }); sparks(e.x, e.h * .7, e.z, 0xffe070, 14, 7); return amt * 1.3; } return amt; }
    const ch = (e.state === 'block' ? .92 : e.state === 'windup' || e.state === 'kit' ? 0 : e.state === 'recover' ? .15 : e.d.parry) * DK([.6, 1, 1.2]);
    if (Math.random() < ch) { sparks(e.x + s.ux * .6, e.h * .6, e.z + s.uz * .6, 0xffffff, 14, 7); num(e, tx('parry'), 'n'); Sfx.hit(); G.hitStop = .06; P.kx = (P.kx || 0) + s.ux * 6; P.kz = (P.kz || 0) + s.uz * 6; if (P.act && P.act.kind === 'atk') { P.queued = false; P.combo = 0; P.act = { kind: 'stun', t: 0, dur: .38 }; P.curName = ''; P.inLoco = false; P._play('Hit_A', { once: true, force: true, ts: 1.3 }); }
      e.face(src.x - e.x, src.z - e.z, 1); startWind(e, P, 1); e.tm = e.wd = .36; hintOnce('h_qil'); return 0; } }
  return amt; }
// ---- enemy kit: data-driven telegraphed moves (each with a readable pose, ground marker and a punish window) ----
const KM = {
  // spearman low sweep: jump or step back
  sweep: { wd: .7, rec: .7, ub: 1, start(e, tg, m) { e.play('2H_Melee_Attack_Spin', { once: true, force: true, dur: m.wd + .4 }); m.tl.push(arcTele(e, e.d.range + 1, 1.75, m.wd, W3C.ub)); }, hit(e) { Sfx.swing(); slashFx(e.x, .5, e.z, e.rot, 1.4, 0xff6644); slashFx(e.x, .5, e.z, e.rot + 2.4, 1.3, 0xff6644); hitArc(e, e.d.range + 1, -.18, () => bdmg(e, .8), { ub: 1, low: 1, kb: 8 }); } },
  // charge (potion brute, shield bearer): red lane, then a straight rush
  charge: { wd: .75, rec: 1.0, ub: 1, start(e, tg, m) { m.len = e.type === 'qalqan' ? 8 : 11; e.play('Idle_Combat', { force: true }); m.tl.push(lineTele(e, m.len, e.r * 2 + 1, m.wd)); burst(e.x, .4, e.z, 0xc8a070, 1.5, true); }, tick(e, tg, m, dt) { if (m.t < m.wd * .6) e.face(tg.x - e.x, tg.z - e.z, dt * 5); },
    hit(e, tg, m) { m.d = 0; m.hit = false; e.play('Running_A', { force: true, ts: 1.8 }); Sfx.dodge(); }, act(e, tg, m, dt) { const v = 17; e.x += Math.sin(e.rot) * v * dt; e.z += Math.cos(e.rot) * v * dt; m.d += v * dt; if (Math.random() < .5) burst(e.x, .3, e.z, 0xc8a070, 1, true);
      if (!m.hit) for (const o of G.ents) { if (o.dead || !hostile(e.team, o.team)) continue; if (Math.hypot(o.x - e.x, o.z - e.z) < e.r + o.r + .4) { m.hit = true; if (o.damage(bdmg(e, 1.3), e, { ub: 1, kb: 13 })) { Sfx.big(); G.shake = Math.max(G.shake, .4); } break; } }
      if (m.d >= m.len || e.bump) { if (e.bump) { e.stagger = .8; burst(e.x, 1, e.z, 0xbfa58a, 1.6, true); Sfx.hit(); } return false; } return true; } },
  // ground slam around itself
  slam: { wd: .8, rec: .9, ub: 1, start(e, tg, m) { m.R = e.d.heavy ? 4.2 : 3.3; e.play('E_Slam', { once: true, force: true, dur: m.wd + .5 }); m.tl.push(telegraph(e.x, e.z, m.R, m.wd, W3C.ub)); }, hit(e, tg, m) { hitCircle(e.x, e.z, m.R, () => bdmg(e, 1.2), e.team, e, { ub: 1, kb: 10, nf: 1 }); ringFx(e.x, e.z, m.R, 0xff5522); burst(e.x, .4, e.z, 0xc8a070, 3, true); Sfx.big(); G.shake = Math.max(G.shake, .4); } },
  // grab: short red arc; if it lands the hero is held and can mash attack to break free
  grab: { wd: .55, rec: 1.0, ub: 1, start(e, tg, m) { e.play('E_Attack', { once: true, force: true, dur: m.wd + .4 }); m.tl.push(arcTele(e, e.r + 2.2, .65, m.wd, W3C.ub)); },
    hit(e, tg, m) { e.kx += Math.sin(e.rot) * 6; e.kz += Math.cos(e.rot) * 6; const P = G.player; if (P.dead || P.iframe > 0 || P.mounted || P.act && P.act.kind === 'exec') { if (P.iframe > 0 && P.act && P.act.kind === 'dodge' && P.act.t < .3) perfectDodge(P, e); return; } const s = v2(e, P); if (s.l > e.r + 2.6 || frontOf(e, P) < .5) return;
      if (P.guard) w3GuardEnd(P); P.act = { kind: 'held', t: 0, dur: 1.7, by: e }; P.queued = false; P.curName = ''; P.inLoco = false; P._play('Hit_A', { once: true, force: true, ts: .5 }); num(P, tx('free'), 'c'); Sfx.hurt(); m.held = true; e.play('Idle_Combat', { force: true }); },
    act(e, tg, m) { const P = G.player; return !!(m.held && P.act && P.act.kind === 'held' && P.act.by === e); } },
  // fast 3-hit combo (chieftain frenzy, Surtaysha sword): each swing has its own orange (parryable) arc
  combo3: { wd: .55, rec: .9, start(e, tg, m) { m.n = 0; m.N = w3Phase(e) >= 2 && e.type === 'surtaysha' ? 4 : 3; e.play('E_Attack', { once: true, force: true, dur: m.wd + .3 }); m.tl.push(arcTele(e, e.d.range + 1, .9, m.wd, W3C.mel)); },
    hit(e, tg, m) { cSwing(e, m); }, act(e, tg, m, dt) { e.face(tg.x - e.x, tg.z - e.z, dt * 6); if (m.n >= m.N) return m.t < .25; if (m.t >= .42) { m.t = 0; cSwing(e, m); } else if (!m.tw) { m.tw = 1; m.tl.push(arcTele(e, e.d.range + 1, .9, .42, W3C.mel)); e.play(m.n % 2 ? '1H_Melee_Attack_Slice_Diagonal' : 'E_Attack', { once: true, force: true, dur: .55 }); } return true; } },
  // giant stomp: hit around the feet, then a shockwave to jump over or roll through (phase 2: a second wave)
  stomp: { wd: 1.0, rec: 1.5, ub: 1, weak: 1, start(e, tg, m) { e.play('E_Slam', { once: true, force: true, dur: m.wd + .5 }); m.tl.push(telegraph(e.x, e.z, 3.2, m.wd, W3C.ub)); const o = telegraph(e.x, e.z, 11, m.wd, 0xff7a20); o.disc.visible = false; o.g.children[0].material.opacity = .55; m.tl.push(o); },
    hit(e, tg, m) { hitCircle(e.x, e.z, 3.2, () => bdmg(e, 1.1), e.team, e, { ub: 1, kb: 11, kd: 1, nf: 1 }); shockwave(e, e.x, e.z, 11, 8.5, bdmg(e, .55)); burst(e.x, .4, e.z, 0xc8a070, 4, true); Sfx.big(); G.shake = Math.max(G.shake, .55); m.w2 = w3Phase(e) >= 2 ? 1 : 0; },
    act(e, tg, m) { if (m.w2 && m.t > .55) { m.w2 = 0; shockwave(e, e.x, e.z, 11, 9.5, bdmg(e, .5)); G.shake = Math.max(G.shake, .4); Sfx.big(); } return m.w2 && m.t <= .55; } },
  // boulder throw: marker where it will land (phase 3: three)
  rock: { wd: .9, rec: .8, ub: 1, start(e, tg, m) { e.play('Cheer', { once: true, force: true, dur: m.wd + .3 }); const n = w3Phase(e) >= 3 ? 3 : 1, q = lead(tg, m.wd + .8, .8); m.pts = []; for (let i = 0; i < n; i++) { const x = clamp(q.x + (i ? rnd(-4, 4) : 0), -G.W + 1, G.W - 1), z = q.z + (i ? rnd(-3, 3) : 0); m.pts.push([x, z]); m.tl.push(telegraph(x, z, 2.5, m.wd + .8, W3C.ub)); } },
    hit(e, tg, m) { e.play('E_Attack', { once: true, force: true, dur: .7 }); for (const [x, z] of m.pts) boulder(e, x, z, .8, bdmg(e, .9)); Sfx.swing(); } },
  // club sweep: wide low arc in front — jump or roll back
  club: { wd: .85, rec: 1.1, ub: 1, weak: 1, start(e, tg, m) { m.R = e.d.range + 2.2; e.play('2H_Melee_Attack_Spin', { once: true, force: true, dur: m.wd + .5 }); m.tl.push(arcTele(e, m.R, 1.95, m.wd, W3C.ub)); },
    hit(e, tg, m) { Sfx.swing(); slashFx(e.x, .7, e.z, e.rot, (e.d.scale || 2) * 1.1, 0xff6644); hitArc(e, m.R, -.37, () => bdmg(e, 1.1), { ub: 1, low: 1, kb: 13 }); G.shake = Math.max(G.shake, .35); } },
  // dragon bite: long red lane in front, lunges out of the water
  bite: { wd: .9, rec: 1.0, ub: 1, start(e, tg, m) { e.play('E_Attack', { once: true, force: true, dur: m.wd + .4 }); m.tl.push(arcTele(e, e.r + 4.5, .55, m.wd, W3C.ub)); m.z0 = e.z; m.x0 = e.x; },
    hit(e, tg, m) { e.x += Math.sin(e.rot) * 2.5; e.z += Math.cos(e.rot) * 2.5; Sfx.big(); burst(e.x + Math.sin(e.rot) * e.r, 1.5, e.z + Math.cos(e.rot) * e.r, 0x88ccff, 3); hitArc(e, e.r + 4.5, .45, () => bdmg(e, 1.2), { ub: 1, kb: 12 }); G.shake = Math.max(G.shake, .4); }, act(e, tg, m, dt) { e.x += (m.x0 - e.x) * Math.min(1, dt * 3); e.z += (m.z0 - e.z) * Math.min(1, dt * 3); return m.t < .6; } },
  // dragon tail sweep: a water wave rolling out from the dragon — jump it or roll through
  tail: { wd: 1.0, rec: .9, ub: 1, start(e, tg, m) { e.play('2H_Melee_Attack_Spin', { once: true, force: true, dur: m.wd + .5 }); const o = telegraph(e.x, e.z, 16, m.wd, 0x3aa0ff); o.disc.visible = false; m.tl.push(o); }, hit(e) { shockwave(e, e.x, e.z, 18, 10, bdmg(e, .6), 0x66ccff); burst(e.x, 1, e.z, 0x88ccff, 5); Sfx.big(); G.shake = Math.max(G.shake, .4); } },
  // dragon water jet: lane that locks, then a sweeping beam (phase 2+ sweeps across)
  jet: { wd: 1.1, rec: .9, ub: 1, start(e, tg, m) { e.play('Spellcast_Shoot', { once: true, force: true }); m.tl.push(lineTele(e, 30, 2.4, m.wd, 0x3aa0ff)); }, tick(e, tg, m, dt) { if (m.t < m.wd * .7) e.face(tg.x - e.x, tg.z - e.z, dt * 2.5); },
    hit(e, tg, m) { m.beam = new THREE.Mesh(new THREE.CylinderGeometry(.7, .9, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x3aa8ff, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false })); fxg.add(m.beam); m.sw = w3Phase(e) >= 2 ? (Math.random() < .5 ? -1 : 1) * .55 : 0; m.n = 0; Sfx.orb(); },
    act(e, tg, m, dt) { e.rot += m.sw * dt; const L = 30, b = m.beam, cx = e.x + Math.sin(e.rot) * L / 2, cz = e.z + Math.cos(e.rot) * L / 2; b.position.set(cx, 1.2, cz); b.scale.set(1, L, 1); b.rotation.set(Math.PI / 2, 0, 0); b.rotation.order = 'YXZ'; b.rotation.y = e.rot; b.material.opacity = .38 + Math.random() * .22;
      if (m.t > m.n * .18) { m.n++; const P = G.player; if (!P.dead && segDist(P.x, P.z, e.x, e.z, e.rot, L) < 1.5) P.damage(bdmg(e, .35), e, { ub: 1, kb: 5 }); for (let i = 0; i < 3; i++) { const k = rnd(4, L); sparks(e.x + Math.sin(e.rot) * k, 1, e.z + Math.cos(e.rot) * k, 0x9fe4ff, 1, 3); } }
      if (m.t > 1.0) { fxg.remove(b); return false; } return true; }, end(e, m) { if (m.beam) fxg.remove(m.beam); } },
  // dragon dives and bursts up under the hero (red circle under her feet)
  dive: { wd: .6, rec: 1.2, start(e, tg, m) { e.play('Hit_A', { once: true, force: true, ts: .5 }); burst(e.x, 1, e.z, 0x88ccff, 4); Sfx.big(); }, tick(e, tg, m, dt) { e.y += (-8 - e.y) * Math.min(1, dt * 4); e.invuln = true; },
    hit(e, tg, m) { const P = G.player; m.gx = P.x; m.gz = P.z; m.tl.push(telegraph(m.gx, m.gz, 3.3, 1.2, W3C.ub)); ubMark(P, 1.2); },
    act(e, tg, m, dt) { e.invuln = true; e.y = -8; if (m.t < .7) { const P = G.player; m.gx += (P.x - m.gx) * Math.min(1, dt * 1.5); m.gz += (P.z - m.gz) * Math.min(1, dt * 1.5); if (m.tl[0]) m.tl[0].g.position.set(m.gx, .06, m.gz); }
      if (m.t >= 1.2) { e.invuln = false; e.y = -1.3; e.x = clamp(m.gx, -G.W + 2, G.W - 2); hitCircle(m.gx, m.gz, 3.3, () => bdmg(e, 1.2), e.team, e, { ub: 1, launch: 1, kb: 6, nf: 1 }); for (let i = 0; i < 4; i++) burst(m.gx + rnd(-1.5, 1.5), rnd(.5, 3), m.gz + rnd(-1.5, 1.5), 0x88ccff, 3); ringFx(m.gx, m.gz, 3.6, 0x88ccff); Sfx.big(); G.shake = .6; return false; } return true; }, end(e) { e.invuln = false; } },
  // Jallod: chain lash along a lane; a caught hero is dragged in for a follow-up chop (parryable)
  chain: { wd: .8, rec: 1.1, ub: 1, start(e, tg, m) { e.play('1H_Ranged_Shoot', { once: true, force: true, dur: m.wd + .3 }); m.tl.push(lineTele(e, 13, 1.3, m.wd)); }, tick(e, tg, m, dt) { if (m.t < m.wd * .65) e.face(tg.x - e.x, tg.z - e.z, dt * 5); },
    hit(e, tg, m) { const P = G.player, tip = { x: e.x + Math.sin(e.rot) * 13, z: e.z + Math.cos(e.rot) * 13, h: 2 }; const L = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 1, 6), new THREE.MeshBasicMaterial({ color: 0xb8b0a0 })); fxg.add(L); fx.push({ m: L, t: 0, dur: .35, s0: 1, s1: 1, line: [e, tip] }); Sfx.swing();
      if (!P.dead && segDist(P.x, P.z, e.x, e.z, e.rot, 13) < 1.2 && P.damage(bdmg(e, .45), e, { ub: 1, kb: 0 })) { m.pull = true; fx.push({ m: L.clone(), t: 0, dur: .45, s0: 1, s1: 1, line: [e, P] }); } },
    act(e, tg, m, dt) { if (!m.pull) return false; const P = G.player, s = v2(P, e); if (s.l > e.r + 1.6 && m.t < .5) { P.x += s.ux * 22 * dt; P.z += s.uz * 22 * dt; P.iframe = 0; return true; } m.pull = false; e.state = 'chase'; e.km = null; startWind(e, P, 1); e.tm = e.wd = .5; return true; } },
  // Jallod: chain slammed into the ground — a line of eruptions toward the hero (phase 2: two lines, phase 3: three)
  cslam: { wd: 1.0, rec: 1.0, ub: 1, start(e, tg, m) { e.play('E_Slam', { once: true, force: true, dur: m.wd + .4 }); }, hit(e, tg, m) { const ph = w3Phase(e), s = v2(e, tg), A = Math.atan2(s.ux, s.uz), L = ph >= 3 ? [-.4, 0, .4] : ph === 2 ? [-.25, .25] : [0]; for (const da of L) for (let i = 1; i <= 6; i++) quake(e.x + Math.sin(A + da) * i * 2.4, e.z + Math.cos(A + da) * i * 2.4, 1.7, .35 + i * .18, bdmg(e, .6), e); Sfx.big(); G.shake = Math.max(G.shake, .4); } },
  // sand giant: sand bursts erupting around the hero one after another
  sand: { wd: .6, rec: .8, ub: 1, start(e) { e.play('Cheer', { once: true, force: true, dur: 1 }); burst(e.x, 2, e.z, 0xd8b070, 3, true); }, hit(e, tg) { const n = 3 + w3Phase(e); for (let i = 0; i < n; i++) { const q = lead(tg, .6 + i * .3, .6); quake(clamp(q.x + rnd(-2.5, 2.5), -G.W + 1, G.W - 1), q.z + rnd(-2.5, 2.5), 2.2, .8 + i * .32, bdmg(e, .55), e); } } },
  // sand giant burrows, travels under the sand and bursts up under the hero
  burrow: { wd: .7, rec: 1.6, weak: 1, start(e, tg, m) { e.play('E_Slam', { once: true, force: true, dur: 1 }); m.inv = e.invuln; }, tick(e, tg, m, dt) { e.y = -e.h * clamp(m.t / m.wd, 0, 1) * 1.1; if (Math.random() < .6) burst(e.x + rnd(-1, 1), .3, e.z + rnd(-1, 1), 0xb08a60, 1.6, true); },
    hit(e, tg, m) { e.invuln = true; m.gx = tg.x; m.gz = tg.z; }, act(e, tg, m, dt) { e.y = -e.h * 1.1; e.invuln = true; const P = G.player; if (m.t < 1.6) { const s = v2(e, P); if (s.l > .6) { e.x += s.ux * 7 * dt; e.z += s.uz * 7 * dt; } if (Math.random() < .7) burst(e.x + rnd(-1, 1), .25, e.z + rnd(-1, 1), 0xb08a60, 1.8, true); return true; }
      if (!m.tw) { m.tw = 1; m.gx = P.x; m.gz = P.z; m.tl.push(telegraph(m.gx, m.gz, 3.4, .9, W3C.ub)); ubMark(P, .9); }
      if (m.t >= 2.5) { e.x = m.gx; e.z = m.gz; e.y = 0; e.invuln = m.inv; hitCircle(m.gx, m.gz, 3.4, () => bdmg(e, 1.2), e.team, e, { ub: 1, launch: 1, kb: 9, nf: 1 }); burst(e.x, 1, e.z, 0xd8b070, 5, true); ringFx(e.x, e.z, 3.8, 0xffb060); Sfx.big(); G.shake = .6; return false; } return true; }, end(e, m) { e.y = 0; e.invuln = m.inv; } },
  // Surtaysha: dark aura that hurts anyone who stays near him
  aura: { wd: .8, rec: .5, ub: 1, start(e, tg, m) { e.play('Cheer', { once: true, force: true, dur: 1.1 }); m.tl.push(telegraph(e.x, e.z, 5, m.wd, 0x8a20e0)); }, hit(e) { const z = { x: e.x, z: e.z, r: 5, t: 0, life: 4.5, src: e, team: e.team, n: 0, dmg: bdmg(e, .22) }; (G.zones || (G.zones = [])).push(z); ringFx(e.x, e.z, 5, 0xb040ff); Sfx.power(); } },
  // summon two wolves (limited)
  wolves: { wd: .9, rec: .6, start(e) { e.play('Cheer', { once: true, force: true, dur: 1.2 }); burst(e.x, e.h, e.z, 0x7722cc, 3); ringFx(e.x, e.z, 2.4, 0x7722cc); }, hit(e) { e.sumW = (e.sumW || 0) + 1; Sfx.howl(); for (const s of [-1, 1]) { const w = spawn('wolf', clamp(e.x + s * 3, -G.W + 1, G.W - 1), e.z + 2, 'enemy', true); w.sum = true; } } },
  // shield bearer: shield bash (orange = parryable) that knocks the hero back
  bash: { wd: .45, rec: .7, start(e, tg, m) { e.play('E_Attack', { once: true, force: true, dur: .8 }); m.tl.push(arcTele(e, e.r + 1.8, .5, m.wd, W3C.mel)); }, hit(e) { e.kx += Math.sin(e.rot) * 7; e.kz += Math.cos(e.rot) * 7; Sfx.swing(); if (hitArc(e, e.r + 1.9, .45, () => bdmg(e, .8), { mel: 1, kb: 12 })) Sfx.hit(); } }
};
function cSwing(e, m) { m.n++; m.tw = 0; Sfx.swing(); slashFx(e.x, e.h * .5, e.z, e.rot, (e.d.scale || 1) * .9, 0xff8844); e.kx += Math.sin(e.rot) * 4; e.kz += Math.cos(e.rot) * 4; if (hitArc(e, e.d.range + 1, .2, () => bdmg(e, .7), { mel: 1, kb: 5 })) Sfx.hit(); }
const GIANT = { cd: [3.2, 5], first: [2, 3.5], moves: [{ k: 'stomp', w: 3, max: 9 }, { k: 'club', w: 3, max: 5 }, { k: 'rock', w: 2, min: 5 }, { k: 'rock', w: 2, min: 3, ph: 3 }] };
const W3K = {
  nayza: { cd: [3, 5], moves: [{ k: 'sweep', w: 1, max: 2.6 }] },
  qalqan: { cd: [2.6, 4.2], moves: [{ k: 'bash', w: 3, max: 1.8 }, { k: 'charge', w: 2, min: 3.5, max: 9 }] },
  brute: { cd: [2.6, 4.2], first: [1.2, 2.4], moves: [{ k: 'charge', w: 3, min: 3.5, max: 11 }, { k: 'slam', w: 2, max: 2.6 }, { k: 'grab', w: 2, max: 1.9 }] },
  boribasi: { cd: [2.6, 4], moves: [{ k: 'combo3', w: 1, max: 2.6, ph: 2 }] },
  qunqar: GIANT, qargashiq: GIANT, camel: { ...GIANT, moves: GIANT.moves.slice(0, 2) },
  qashqir: { cd: [3, 4.6], moves: [{ k: 'club', w: 2, max: 4.5 }, { k: 'combo3', w: 3, max: 3.2 }, { k: 'stomp', w: 1, max: 8, ph: 2 }] },
  aydarho: { cd: [2.4, 3.6], first: [2, 3], moves: [{ k: 'bite', w: 3, max: 6 }, { k: 'tail', w: 2, max: 13 }, { k: 'jet', w: 3, min: 4 }, { k: 'dive', w: 2, min: 3, ph: 2 }] },
  jallod: { cd: [2.8, 4.4], moves: [{ k: 'chain', w: 3, min: 3.5, max: 12 }, { k: 'cslam', w: 2, min: 2 }, { k: 'combo3', w: 2, max: 3, ph: 2 }] },
  qumdev: { cd: [3, 4.6], moves: [{ k: 'sand', w: 3, min: 2 }, { k: 'burrow', w: 2, min: 5 }, { k: 'stomp', w: 2, max: 6 }] },
  surtaysha: { cd: [2.6, 4], moves: [{ k: 'combo3', w: 4, max: 3.4 }, { k: 'aura', w: 2, max: 6 }, { k: 'wolves', w: 1, ok: e => (e.sumW || 0) < 3 && enemies().length < 7 }] }
};
function kitTick(e, dt) {
  const K = W3K[e.brute ? 'brute' : e.type]; if (!K || G.noKit || e.asleep || e.team !== 'enemy' || e.mounted || e.drink || e.duel) return false;
  if (e.km) { if (e.state !== 'kit') { w3KitCancel(e); return false; } return kmTick(e, dt); }
  if (e.busy > 0 || e.castT > 0 || e.sub || e.ashore > 0 || /windup|leapS|pounce|crouch|recover|flee/.test(e.state)) return false;
  const P = G.player, tg = e.tg && !e.tg.dead ? e.tg : P; if (!tg || tg.dead || tg.team === 'npc') return false;
  if (e.kcd === undefined) e.kcd = rnd(...(K.first || [1.5, 3.5])); e.kcd -= dt; if (e.kcd > 0) return false;
  if (tg === P && !e.d.heavy && !tokOK(e)) { e.kcd = rnd(.4, .9); return false; }
  const ph = w3Phase(e), dist = Math.hypot(tg.x - e.x, tg.z - e.z) - tg.r - (e.d.heavy ? e.r * .6 : 0);
  const opts = K.moves.filter(m => !(G.duel && /wolves|summon/.test(m.k)) && (m.ph || 1) <= ph && dist >= (m.min ?? 0) && dist <= (m.max ?? 99) && (!m.ok || m.ok(e, tg))); if (!opts.length) { e.kcd = .35; return false; }
  let r = Math.random() * opts.reduce((s, m) => s + m.w, 0), pick = opts[0]; for (const m of opts) { r -= m.w; if (r <= 0) { pick = m; break; } }
  e.kcd = rnd(K.cd[0], K.cd[1]) * (ph >= 3 ? .7 : ph === 2 ? .85 : 1); if (e.bt !== undefined) e.bt = Math.max(e.bt, 1.4);
  kmStart(e, tg, pick.k); return true; }
function kmStart(e, tg, k) { if (e.km) w3KitCancel(e); const D = KM[k]; relSlot(e); e.clearTele(); e.state = 'kit'; const m = e.km = { k, D, tg, t: 0, wd: D.wd * (w3Phase(e) >= 3 ? .85 : 1), ph: 0, tl: [] }; e.face(tg.x - e.x, tg.z - e.z, 1); e.curName = ''; e.inLoco = false; if (D.ub) ubMark(e, m.wd); D.start(e, tg, m); }
function kmTick(e, dt) { const m = e.km, D = m.D, tg = m.tg && !m.tg.dead ? m.tg : G.player; m.t += dt;
  if (m.ph === 0) { if (D.tick) D.tick(e, tg, m, dt); else if (m.t < m.wd * .5) e.face(tg.x - e.x, tg.z - e.z, dt * 4); if (m.t >= m.wd) { m.ph = 1; m.t = 0; D.hit(e, tg, m); } return true; }
  if (m.ph === 1) { if (D.act && D.act(e, tg, m, dt)) return true; if (e.km !== m) return true; m.ph = 2; m.t = 0; const rec = (D.rec || .8) * (w3Phase(e) >= 3 ? .8 : 1); m.rec = rec; e.punT = G.time + rec; if (D.weak && e.d.heavy) { ringFx(e.x, e.z, e.r * 2 + 1, 0xffe070); num(e, tx('weakp'), 'c'); sparks(e.x, e.h * .35, e.z, 0xffe070, 12, 5); } e.play('Idle_Combat', { force: true }); return true; }
  if (D.weak && e.d.heavy && Math.random() < .3) sparks(e.x + rnd(-.6, .6), e.h * .3, e.z + rnd(-.6, .6), 0xffe070, 1, 2);
  if (m.t >= (m.rec || .8)) { e.km = null; e.state = 'chase'; e.cd = Math.max(e.cd, .35); tokFree(e); } return true; }
function w3KitCancel(e) { const m = e.km; if (!m) return; for (const o of m.tl) o.dead = true; if (m.D.end) m.D.end(e, m); e.km = null; if (e.state === 'kit') e.state = 'chase'; e.ubT = 0; }
// ---- per-frame: stamina, buffer, guard resume, lock, camera, telegraph list, red glow ----
let lockArrow = null, guardArc = null;
function w3Tick(dt) {
  const p = G.player; for (let i = W3T.length - 1; i >= 0; i--) { const o = W3T[i]; o.t += dt; const u = clamp(o.t / o.dur, 0, 1);
    if (o.kind === 'line') { if (o.own) { o.g.position.set(o.own.x, .08, o.own.z); o.g.rotation.y = o.own.rot; if (o.own.dead) o.dead = true; } o.fill.scale.z = Math.max(.01, o.len * u); }
    else if (o.kind === 'wave') { o.r = .5 + o.v * o.t; o.g.scale.set(o.r, 1, o.r); o.ring.material.opacity = o.band.material.opacity * 2 * (1 - u * .6); o.band.material.opacity = .45 * (1 - u * .7);
      for (const e of G.ents) { if (e.dead || o.hit.has(e) || !hostile(o.src.team, e.team) || e.bg) continue; const d = Math.hypot(e.x - o.x, e.z - o.z); if (Math.abs(d - o.r) < .75) { o.hit.add(e); if (e === p && (p.y || 0) > .4) { num(p, '✓', 'n'); continue; } e.damage(o.dmg, o.src.dead ? null : o.src, { ub: 1, low: 1, kb: 9, nf: 1 }); } } }
    else if (o.kind === 'rock') { const x = o.x0 + (o.x1 - o.x0) * u, z = o.z0 + (o.z1 - o.z0) * u; o.m.position.set(x, o.y0 * (1 - u) + Math.sin(u * Math.PI) * 6, z); o.m.rotation.x += dt * 7; o.m.rotation.z += dt * 5;
      if (u >= 1) { hitCircle(o.x1, o.z1, 2.5, o.dmg, o.src.team, o.src.dead ? null : o.src, { ub: 1, kb: 10, nf: 1 }); ringFx(o.x1, o.z1, 2.6, 0xffa060); burst(o.x1, .5, o.z1, 0x8a7258, 3.2, true); sparks(o.x1, .5, o.z1, 0xc8a070, 12, 7); Sfx.big(); G.shake = Math.max(G.shake, .4); hitBreak(o.x1, o.z1, 2.5, 'slam'); } }
    else if (o.kind === 'bang') { const e = o.own; o.s.position.set(e.x, (e.h || 2) + 1.1 + (e.y || 0), e.z); o.s.material.opacity = .6 + Math.sin(o.t * 22) * .4; if (e.dead || e.state !== 'kit' && e !== p) o.dead = true; }
    if (o.dead || o.t >= o.dur) { fxg.remove(o.g || o.m || o.s); W3T.splice(i, 1); } }
  for (const e of G.ents) if (e.ubT > 0) { e.ubT -= dt; const k = e.ubT > 0 && !e.dead ? .55 + Math.sin(G.time * 30) * .45 : 0; for (const m of e.mats) if (m.emissive) { if (k) m.emissive.setRGB(k, 0, 0); else if (m.userData.em0) m.emissive.copy(m.userData.em0); else m.emissive.setRGB(0, 0, 0); } }
  if (!p) return; w3P(p);
  if (!p.dead) { const rg = p.guard ? 0 : G.time - p.stAt > .65 ? (p.st < 1 ? 20 : 32) : 0; p.st = Math.min(p.stMax, p.st + rg * dt); }
  if (p.hl && (p.hl.dead || p.hl.gone || Math.hypot(p.hl.x - p.x, p.hl.z - p.z) > 22)) { const was = p.hl; p.hl = null; if (was.dead) { let b = null, bd = 12; for (const e of G.ents) { if (e.dead || e.gone || e.bg || !hostile('ally', e.team)) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; b = e; } } p.hl = b; } }
  if (p.hl) { p.lock = p.hl; p.lockAt = G.time; }
  if (!lockArrow) { lockArrow = new THREE.Mesh(new THREE.ConeGeometry(.28, .55, 4), new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: .95, depthTest: false })); lockArrow.rotation.x = Math.PI; lockArrow.renderOrder = 15; fxg.add(lockArrow); }
  lockArrow.visible = !!p.hl && !p.dead; if (p.hl) { lockArrow.position.set(p.hl.x, (p.hl.h || 2) + 1.0 + (p.hl.y || 0) + Math.sin(G.time * 6) * .12, p.hl.z); lockArrow.rotation.y += dt * 3; }
  if (!guardArc) { const g = new THREE.CircleGeometry(1, 20, -Math.PI / 2 - .8, 1.6); g.rotateX(-Math.PI / 2); guardArc = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })); guardArc.scale.setScalar(1.6); fxg.add(guardArc); }
  guardArc.visible = !!p.guard; if (p.guard) { guardArc.position.set(p.x, .09, p.z); guardArc.rotation.y = p.rot; guardArc.material.opacity = G.time - (p.guardAt || 0) < .3 ? .75 : .3; }
  // buffered inputs
  if (G.wbuf && (!p.act || canCancel(p.act))) { const b = G.wbuf; G.wbuf = null; if (G.time - b.t < .42) { if (b.k === 'D' || b.k === 'R') w3Dodge(p, b.k === 'R', b.dir); else if (b.k === 'S') w3Strong(p); else if (b.k === 'J') w3Jump(p); else if (b.k === 'B' && p.guardHeld) w3Guard(p, true); } }
  if (p.guardHeld && !p.act && !p.dead && !p.mounted) w3Guard(p, true, true);
  // camera: hard lock pulls the view toward the target; executions zoom in close
  const L = p.hl, ex = p.act && p.act.kind === 'exec' ? p.act.tg : null, f = Math.min(1, dt * 4); let ox = 0, oz = 0;
  const BG = !ex && !L && G.boss && !G.boss.dead && G.boss.d.heavy && Math.hypot(G.boss.x - p.x, G.boss.z - p.z) < 16 ? G.boss : null, LT = L || BG; let zk = ex ? .5 : 1;
  if (ex) { ox = (ex.x - p.x) * .5; oz = (ex.z - p.z) * .5; } else if (LT && Math.hypot(LT.x - p.x, LT.z - p.z) < 16) { const k = LT.d.heavy ? (L ? .26 : .2) : .28; ox = (LT.x - p.x) * k; oz = (LT.z - p.z) * k; if (LT.d.heavy) zk = 1.14; }
  G.lkx = (G.lkx || 0) + (ox - (G.lkx || 0)) * f; G.lkz = (G.lkz || 0) + (oz - (G.lkz || 0)) * f; G.ck3 = (G.ck3 || 1) + (zk - (G.ck3 || 1)) * Math.min(1, dt * (ex ? 7 : 2));
  w3Hud(p); }
// player damage taken while airborne-jumping / rolling is handled in w3Def; held-in-grab uses its own ticks
// ---- HUD: stamina bar, new buttons (inside #btns), counter prompt ----
let stEl = null, cpEl = null;
const W3ICON = { bS: '<path d="M10 30 L27 13 M23 9 L31 17 M8 32 l3 -1 l-2 -2z" stroke="#ffe7a8" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M24 6 l10 10 l3 -3 l-10 -10z" fill="#ffcf6a" stroke="#5a3a08" stroke-width="1.2"/><path d="M6 14 q4 -6 10 -7 M30 34 q6 -4 7 -10" stroke="#ff9a40" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  bB: '<path d="M20 5 L33 10 Q33 26 20 35 Q7 26 7 10 Z" fill="url(#w3g)" stroke="#5a3a08" stroke-width="1.6"/><path d="M20 10 L20 30 M13 17 L27 17" stroke="#7a4e10" stroke-width="2.2"/>',
  bJ: '<path d="M20 30 L20 9 M12 16 L20 8 L28 16" stroke="#ffe7a8" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 34 H30" stroke="#d8a040" stroke-width="2.6" stroke-linecap="round"/>',
  bL: '<circle cx="20" cy="20" r="10" stroke="#ffe7a8" stroke-width="2.6" fill="none"/><path d="M20 4 V12 M20 28 V36 M4 20 H12 M28 20 H36" stroke="#ffcf6a" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="20" r="2.6" fill="#ff5a3a"/>' };
function w3UI() {
  const btns = $('btns'); if (!btns || $('bS')) return;
  const css = document.createElement('style'); css.id = 'w3css'; css.textContent = `
#btns{width:332px;height:262px}
.ab.wb:before{background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.08),rgba(0,0,0,0) 60%)}
.ab.wb svg.wi{position:relative;z-index:1;width:62%;height:62%;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.8))}
#bS{width:62px;height:62px;right:29px;bottom:119px}#bB{width:60px;height:60px;right:104px;bottom:88px}#bD{width:62px;height:62px;right:121px;bottom:9px}
#bJ{width:48px;height:48px;right:208px;bottom:6px}#bL{width:44px;height:44px;right:2px;bottom:210px}
#b1{right:86px;bottom:188px}#b2{right:164px;bottom:150px}#b3{right:275px;bottom:45px}#b4{right:262px;bottom:122px}#b5{right:196px;bottom:76px}#b8{right:265px;bottom:125px}
#bB.on{box-shadow:0 0 0 2px rgba(150,210,255,.95),0 0 18px 6px rgba(120,190,255,.7)}#bL.on{box-shadow:0 0 0 2px rgba(255,200,80,.95),0 0 16px 5px rgba(255,180,60,.65)}
#sbar{height:6px;width:clamp(96px,16vw,140px);margin-top:2px}#sbar i{background:linear-gradient(180deg,#fff8b8,#f2d02a 45%,#9a7e08);transition:width .08s}#sbar.low i{background:linear-gradient(180deg,#ffb0a0,#e8402a 50%,#7a1008)}
#w3cp{position:absolute;right:6px;bottom:96px;padding:3px 9px;border-radius:12px;background:rgba(10,12,30,.82);box-shadow:0 0 0 1px rgba(160,220,255,.9),0 0 14px rgba(120,200,255,.7);color:#cfeeff;font:700 13px/18px var(--fu,sans-serif);pointer-events:none;display:none;animation:pulse 0.6s infinite;white-space:nowrap}
@media (max-width:720px){#sbar{width:92px}}`; document.head.appendChild(css);
  const mk = (id, key) => { const b = document.createElement('div'); b.className = 'ab wb'; b.id = id; b.innerHTML = '<svg class="wi" viewBox="0 0 40 40"><defs><linearGradient id="w3g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#e2a93a"/><stop offset="1" stop-color="#8a5a12"/></linearGradient></defs>' + W3ICON[id] + '</svg><span class="k">' + key + '</span>'; btns.appendChild(b); return b; };
  const bS = mk('bS', 'E'), bB = mk('bB', 'Q'), bJ = mk('bJ', 'F'), bL = mk('bL', 'Tab');
  const P = () => G.player, pd0 = (b, fn) => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(e); });
  pd0(bS, () => w3Strong(P())); pd0(bJ, () => w3Jump(P()));
  pd0(bB, e => { try { bB.setPointerCapture(e.pointerId); } catch (er) { } w3Guard(P(), true); }); for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bB.addEventListener(ev, () => w3Guard(P(), false));
  pd0(bL, () => { bL._t = performance.now(); }); bL.addEventListener('pointerup', () => { if (!P()) return; if (performance.now() - (bL._t || 0) > 450) w3Lock(P(), true); else w3Lock(P()); });
  const hb = $('hbar'); if (hb && !$('sbar')) { stEl = document.createElement('div'); stEl.className = 'bar'; stEl.id = 'sbar'; stEl.innerHTML = '<i></i>'; hb.parentNode.insertBefore(stEl, hb.nextSibling); }
  cpEl = document.createElement('div'); cpEl.id = 'w3cp'; btns.appendChild(cpEl);
  // swipe on the right half of the screen = dodge that way; double tap = roll
  const SW = {}; addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || !P() || busy() || e.clientX < innerWidth * .46 || (e.target.closest && e.target.closest('.ab,#joy,button,.ov,#dlg,#map,#set,#pause,a,input'))) return; SW[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now() }; }, true);
  addEventListener('pointerup', e => { const s = SW[e.pointerId]; if (!s) return; delete SW[e.pointerId]; const dx = e.clientX - s.x, dy = e.clientY - s.y, l = Math.hypot(dx, dy), dtm = performance.now() - s.t; const p = P(); if (!p) return;
    if (l > 42 && dtm < 380) { w3Dodge(p, false, { x: dx / l, z: dy / l }); G.tapT = 0; } else if (l < 18 && dtm < 260) { const now = performance.now(); if (now - (G.tapT || 0) < 320) { w3Dodge(p, true); G.tapT = 0; } else G.tapT = now; } }, true);
}
function w3Hud(p) { if (!stEl) stEl = $('sbar'); if (stEl) { stEl.firstChild.style.width = clamp(p.st / p.stMax * 100, 0, 100) + '%'; stEl.classList.toggle('low', performance.now() < (G.stLow || 0) || p.st < 15); stEl.style.visibility = p.dead ? 'hidden' : 'visible'; }
  const bB = $('bB'), bL = $('bL'); if (bB) bB.classList.toggle('on', !!p.guard); if (bL) bL.classList.toggle('on', !!p.hl);
  for (const id of ['bB', 'bJ']) { const b = $(id); if (b) b.style.display = p.mounted ? 'none' : ''; }
  if (cpEl) { const on = p.counterT > G.time && p.counterTg && !p.counterTg.dead; cpEl.style.display = on ? 'block' : 'none'; if (on && cpEl._k !== document.documentElement.lang) { cpEl._k = document.documentElement.lang; cpEl.textContent = '⚔ ' + tx('counter'); } } }
addEventListener('keydown', e => { if (e.repeat) return; const c = e.code, p = G.player; if (!p) return;
  if (c === 'KeyQ' || c === 'KeyI') w3Guard(p, true);   /* QA: KeyE / KeyU no longer do a strong strike — E is the amulet (wave4.js), strong = hold ⚔ / J / left mouse */ else if (c === 'KeyF') w3Jump(p); else if (c === 'KeyR') w3Dodge(p, true); else if (c === 'Tab' || c === 'KeyL') { w3Lock(p); e.preventDefault(); } else if (c === 'KeyX') w3Lock(p, true); });
addEventListener('keyup', e => { if ((e.code === 'KeyQ' || e.code === 'KeyI') && G.player) w3Guard(G.player, false); });
w3UI();
G.w3 = { dodge: (r, d) => w3Dodge(G.player, r, d), guard: on => w3Guard(G.player, on), jump: () => w3Jump(G.player), strong: () => w3Strong(G.player), lock: r => w3Lock(G.player, r), kit: (e, k) => kmStart(e, G.player, k), W3K, KM };
// wave4: internals for the 3-button controller (js/wave4.js)
Object.assign(G.w3, { aim, startAtk, parry: w3Parry, startHeavy, doActInner, heroSkill, stickDir, canCancel, spend: w3Spend, keys, joy, hostile, w3Lock });
// ==== /W3 ====

// ---------- Input ----------
addEventListener('keydown', e => { if (!e.repeat && (e.code === 'KeyJ' || e.code === 'Space')) G.holdA = performance.now(); });
addEventListener('keyup', e => { if (e.code === 'KeyJ' || e.code === 'Space') G.holdA = 0; });
{ const ba = $('bA'); if (ba) { ba.addEventListener('pointerdown', () => { G.holdA = performance.now(); }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) ba.addEventListener(ev, () => { G.holdA = 0; }); } }
addEventListener('keydown', e => { if (e.repeat) return; keys[e.code] = 1; const m = { KeyJ: 'A', Space: 'A', KeyK: 'D', ShiftLeft: 'D', Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5, Digit6: 6, Digit7: 7, Digit8: 8, Digit9: 9, Digit0: 0, KeyH: 'M' }[e.code]; if (m) { doAct(m); e.preventDefault(); } if (e.code === 'Enter' && G.onEnter) G.onEnter(); });
addEventListener('keyup', e => { keys[e.code] = 0; });
const jz = $('joy'), jb = $('jb'), jk = $('jk');
function joyMove(e) { const r = jb.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), m = 48; if (l > m) { dx = dx / l * m; dy = dy / l * m; } jk.style.transform = `translate(${dx}px,${dy}px)`; if (l < 8) { joy.x = joy.z = 0; } else { joy.x = dx / m; joy.z = dy / m; } }   /* 8 px dead zone (bench #9); the base already floats to the thumb on pointerdown */
jz.addEventListener('pointerdown', e => { initAudio(); joy.id = e.pointerId; jz.setPointerCapture(e.pointerId); const zr = jz.getBoundingClientRect(); jb.style.left = clamp(e.clientX - zr.left - 60, 6, zr.width - 126) + 'px'; jb.style.bottom = 'auto'; jb.style.top = clamp(e.clientY - zr.top - 60, 6, zr.height - 126) + 'px'; joyMove(e); });
jz.addEventListener('pointermove', e => { if (e.pointerId === joy.id) joyMove(e); });
const joyEnd = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.z = 0; jk.style.transform = ''; };
jz.addEventListener('pointerup', joyEnd); jz.addEventListener('pointercancel', joyEnd);
[['bA', 'A'], ['bD', 'D'], ['b1', 1], ['b2', 2], ['b3', 3], ['b4', 4], ['b5', 5], ['b6', 6], ['b7', 7], ['b8', 8], ['b9', 9], ['b0', 0], ['bM', 'M']].forEach(([id, k]) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); doAct(k); }));
$('qbtn').addEventListener('pointerdown', e => { e.preventDefault(); doAct('A'); });
document.addEventListener('contextmenu', e => e.preventDefault());

// ---------- HUD ----------
export function flash(a = .6) { const f = $('flash'); f.style.opacity = a; setTimeout(() => f.style.opacity = 0, 120); }
function hud() {
  const p = G.player; if (!p) return;
  $('hbar').firstChild.style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%'; $('ubar').firstChild.style.width = G.ulti + '%'; $('ubar').style.visibility = G.sk[4] && G.sk[4].on ? 'visible' : 'hidden';
  for (const k of [1, 2, 3, 5, 6, 7, 8, 9, 0]) { const PWc = G.powers || {}, HSc = HERO_SK[G.hero] || {}; const s = G.sk[HSc[k] ? k : k === 1 && PWc[6] ? 6 : k === 2 && PWc[7] ? 7 : k], bb = $('b' + k); if (!s || !bb) continue; const c = bb.querySelector('.cd'); if (s.cd > 0) { c.style.display = 'block'; c.style.background = `conic-gradient(rgba(0,0,0,.78) ${s.cd / s.max * 360}deg, transparent 0)`; } else c.style.display = 'none'; }
  $('b4').classList.toggle('ready', G.ulti >= 100); $('b4').querySelector('.cd').style.display = G.ulti >= 100 ? 'none' : 'block';
  const b = G.boss; $('boss').style.display = b && !b.dead ? 'block' : 'none'; if (b) $('bbar').firstChild.style.width = (b.invuln ? 100 : clamp(b.hp / b.maxHp * 100, 0, 100)) + '%';
  hud2(p);
}
export function setBoss(e) { G.boss = e; if (e) { $('bname').textContent = t(e.d.name); G.zk = .5; } }

// ---------- Loop ----------
export const wait = s => new Promise(r => G.waits.push({ t: s, r }));
export const until = fn => new Promise(r => G.untils.push({ fn, r }));
const camV = new THREE.Vector3();
// ---- stragglers: an awake enemy that is far away, behind the player or out of contact is brought to the fight
const barrierBetween = (z1, z2) => { const a = Math.min(z1, z2), b = Math.max(z1, z2); for (const c of G.colB) if (!c.off && c.x2 - c.x1 > G.W * .9 && c.z2 > a && c.z1 < b) return true; return false; };
function pullSpot(p) {  // ahead of the player (the way she is going), just past the top of the screen and short of any closed gate; behind her only if there is no room ahead
  let lim = G.limitZ + 2; for (const c of G.colB) if (!c.off && c.x2 - c.x1 > G.W * .9 && c.z2 < p.z && c.z2 + 1.5 > lim) lim = c.z2 + 1.5;
  for (const k of [0, 1, 2, 3, 4, 5]) { const ahead = k < 4, z = ahead ? Math.max(lim, p.z - rnd(16, 20)) : p.z + rnd(10.5, 13), x = clamp(p.x + rnd(-7, 7), -G.W + 1.2, G.W - 1.2);
    if (ahead && z > p.z - 7) continue; if (z > 5.5 || z < G.limitZ + 2 || barrierBetween(p.z, z)) continue; let ok = true; for (const c of G.colC) if (Math.hypot(c.x - x, c.z - z) < c.r + 1) { ok = false; break; } if (ok) return { x, z }; } return null; }
function straggle(e, p, dt) {  // an awake enemy far away / out of contact walks to the fight (no teleport); only a unit stuck for long is moved, and only where nobody can see it
  if ((e.farT || 0) < -1e8 || G.duel) return;  // asleep / scripted (posted guards, handlers, sentries) — the mission kit wakes them
  const dP = Math.hypot(e.x - p.x, e.z - p.z), tg = e.tg, reach = 10 + (e.d.keep || 0), unreach = G.limitZ > -1e8 && e.z < G.limitZ - .5;
  e.unrT = unreach ? (e.unrT || 0) + dt : 0;   /* QA 1-2 soft-lock: the shaman backed off behind the closed gate (-114) in sight of the hero and was never pulled (only off-screen units are). An awake enemy beyond the closed gate for 3 s steps through to her side (movement clamp, line 'stays on her side') */
  if (e.cT === undefined || unreach ? e.cT === undefined : dP < reach || e.hp < (e.hpC ?? e.hp) || (tg && !tg.dead && Math.hypot(tg.x - e.x, tg.z - e.z) < reach)) e.cT = G.time; e.hpC = e.hp;
  if (Math.abs(e.x) > G.W + .5 || !isFinite(e.x + e.z)) { e.x = clamp(e.x || 0, -G.W + 1, G.W - 1); if (!isFinite(e.z)) e.z = p.z - 15; }
  const few = (G.awakeN || 0) <= 3, far = dP > 25 || e.z > p.z + 16 || (unreach && G.time - e.cT > 4), lone = dP > 9 && G.time - e.cT > (few ? 6 : 20);
  e.farT = far || lone || (few && dP > 16) ? (e.farT || 0) + dt : 0;
  if (e.farT > (far ? 3 : 1)) {
    if (!(e.walkT > G.time)) { e.walkT = G.time + 8; e.provT = G.time + 10; if (e.tg !== p && !e.d.ranged) { relSlot(e); if (e.tg && e.tg.tn) e.tg.tn--; e.tg = p; p.tn = (p.tn || 0) + 1; } e.retT = 3; if (e.state === 'flee') e.state = 'chase'; }
    e.lostT = (e.lostT || 0) + dt;
    if (e.lostT > (unreach ? 6 : 16) && !onScreen(e.x, e.z, 1.25)) { const q = offSpot(p, e.x); if (!q) { if (++e.pullN > 8 && e.die) e.die(); e.lostT = 10; return; }
      e.pullN = (e.pullN || 0) + 1; G.pulls = (G.pulls || 0) + 1; e.x = q.x; e.z = q.z; e.y = 0; e._lx = e.x; e._lz = e.z; e.kx = e.kz = 0; e.cT = G.time; e.state = 'chase'; e.retT = 0; e.stk = null; e.lostT = 0; e.farT = 0;
      if (e.pullN > 5 && e.die) { G.pullKills = (G.pullKills || 0) + 1; e.die(); } }  // keeps getting lost (stuck geometry): count it done rather than leave an objective waiting
  } else e.lostT = Math.max(0, (e.lostT || 0) - dt * 2);
}
const _osv = new THREE.Vector3();
function onScreen(x, z, m = 1.08) { for (const y of [.1, 2.2]) { _osv.set(x, y, z).project(camera); if (_osv.z < 1 && Math.abs(_osv.x) < m && Math.abs(_osv.y) < m) return true; } return false; }
// a free spot on the road that the camera does not see: ahead past the top of the screen (short of a closed gate), else behind her
function offSpot(p, x0) { let lim = G.limitZ + 2; for (const c of G.colB) if (!c.off && c.x2 - c.x1 > G.W * .9 && c.z2 < p.z && c.z2 + 1.5 > lim) lim = c.z2 + 1.5;
  const xs = [x0, x0 * .5, 0, -x0]; for (const z of [p.z - 22, p.z - 26, p.z - 30, p.z - 35, p.z - 42, p.z - 50, p.z + 10, p.z + 13, p.z + 16, p.z + 20]) for (const xx of xs) { const x = clamp(xx, -G.W + 1.2, G.W - 1.2);
    if (z > 5.5 || z < lim || barrierBetween(p.z, z) || onScreen(x, z, 1.15)) continue; let ok = true; for (const c of G.colC) if (Math.hypot(c.x - x, c.z - z) < c.r + 1) { ok = false; break; } if (ok) return { x, z }; } return null; }
function arrive(e, p) { if (!p || p.dead || G.paused || G.flying || e.team !== 'enemy' || e.d.heavy || e.bg || e.vict || e.duel || e.asleep || (e.farT || 0) < -1e8) return; const fd = $('fade'); if (fd && fd.classList.contains('in')) return;
  if (!onScreen(e.x, e.z, 1.06)) return; let q = offSpot(p, e.x);
  if (!q) { let lim = -1e9; for (const c of G.colB) if (!c.off && c.x2 - c.x1 > G.W * .9 && c.z2 < p.z - 8 && c.z2 > lim) lim = c.z2; if (lim > -1e8 && lim < e.z) { q = { x: clamp(e.x * .6, -G.W + 1.2, G.W - 1.2), z: lim + .9 }; burst(q.x, 1, q.z, 0x8a7a60, 2.4, true); } }  // closed arena: they come in through the gate ahead
  if (!q) return; e.x = q.x; e.z = q.z; e._lx = e.x; e._lz = e.z; e.o.position.set(e.x, 0, e.z); G.arrived = (G.arrived || 0) + 1;
  if (G.time - (G.hornAt ?? -99) > 4) Sfx.horn(); }
{ const h0 = Sfx.horn; Sfx.horn = function (...a) { G.hornAt = G.time; return h0.apply(this, a); }; }  // reinforcements are announced by a horn (once per wave)
function sepW(a, b, p) { if (a === p) { if (b.d.heavy) return 1; if (!hostile(a.team, b.team)) return 0; return p.act && (p.act.kind === 'dash' || p.act.kind === 'leap' || p.act.kind === 'dodge') ? 0 : .3; }
  if (a.d.heavy) return b === p || b.d.heavy ? (b.d.heavy && b !== p ? .5 : 0) : .03; if (b === p || b.d.heavy) return 1;
  const ma = sepM(a), mb = sepM(b); return clamp(2 * mb / (ma + mb), .2, 1.8); }   /* mass by type: elites / riders shove the rank-and-file aside, two equals share the push */
const sepM = e => e.mounted ? 3 : e.d.elite || e.hunt || e.lead ? 2.4 : e.d.vsK > 1.1 ? 1.4 : 1;
function update(dt) {
  for (let i = G.waits.length - 1; i >= 0; i--) { const w = G.waits[i]; w.t -= dt; if (w.t <= 0) { G.waits.splice(i, 1); w.r(); } }
  for (let i = G.untils.length - 1; i >= 0; i--) { const w = G.untils[i]; let ok = false; try { ok = w.fn(); } catch (e) { } if (ok) { G.untils.splice(i, 1); w.r(); } }
  const p = G.player; if (p && !G.freeze) updatePlayer(p, dt);
  countTargets();
  duelTick(); frontTick(dt); { let n = 0; for (const e of G.ents) if (e.team === 'enemy' && !e.dead && !e.bg && (e.farT || 0) > -1e8) n++; G.awakeN = n; }
  for (const e of G.ents) {
    if (e.gone) continue;
    if (dt > 0) { const lx = e._lx ?? e.x, lz = e._lz ?? e.z, a = Math.min(1, dt * 6); e.vx = (e.vx || 0) + (clamp((e.x - lx) / dt, -16, 16) - (e.vx || 0)) * a; e.vz = (e.vz || 0) + (clamp((e.z - lz) / dt, -16, 16) - (e.vz || 0)) * a; e._lx = e.x; e._lz = e.z; }
    if (e.spChk) { e.spChk = 0; arrive(e, p); }
    if (e.dead) { e.deadT += dt; if (e !== p && e.y > 0) e.y = Math.max(0, e.y - dt * 9); if (e !== p && e.deadT > 2.2) { e.o.position.y -= dt * 1.2; if (e.deadT > 3.6) e.remove(); } continue; }
    if (e !== p && !G.freeze && p && !p.dead && e.team === 'enemy' && !e.bg && !e.d.heavy && e.speed > 0 && !e.mounted && !e.duel && !G.flying) straggle(e, p, dt);
    if (!G.freeze) entFx(e, p, dt);
    if (e.shieldT > 0) { e.shieldT -= dt; if (Math.random() < .2) burst(e.x, 1.2, e.z, 0x66ccff, .6); }
    if (e !== p && !G.freeze) { ai(e, dt); if (e.d.heavy) { e.kx = e.kz = 0; if (Math.abs(e.x) > G.W - 3) e.x -= Math.sign(e.x) * Math.min(2.2 * dt, Math.abs(e.x) - (G.W - 3)); if (e.team === 'enemy' && !e.mounted) { const hm = e.home || (e.home = { x: e.x, z: e.z }), hx = hm.x - e.x, hz = hm.z - e.z, hl = Math.hypot(hx, hz), HR = e.type === 'surtaysha' ? 3 : 9; if (hl > HR) { const k = Math.min((HR < 9 ? 2.4 : 1.4) * dt, hl - HR); e.x += hx / hl * k; e.z += hz / hl * k; } } } /* bosses stay in their arena (soft re-centre) */ e.x += e.kx * dt; e.z += e.kz * dt; e.kx *= Math.pow(.002, dt); e.kz *= Math.pow(.002, dt); collide(e); }
  }
  G.ents = G.ents.filter(e => !e.gone);
  // separation
  for (let i = 0; i < G.ents.length; i++) { const a = G.ents[i]; if (sepSkip(a)) continue; const an = a.team === 'npc'; for (let j = i + 1; j < G.ents.length; j++) { const b = G.ents[j]; if (sepSkip(b)) continue; const bn = b.team === 'npc'; if (an && bn) continue; const dx = b.x - a.x, dz = b.z - a.z, rr = sepR(a) + sepR(b), d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-5) { const d = Math.sqrt(d2), push = (rr - d) * .5, ux = dx / d, uz = dz / d; const wa = an ? 2 : bn ? 0 : sepW(a, b, p), wb = bn ? 2 : an ? 0 : sepW(b, a, p); a.x -= ux * push * wa; a.z -= uz * push * wa; b.x += ux * push * wb; b.z += uz * push * wb; } } }
  for (const e of G.ents) { if (e.dead || e.gone) continue; if (e.cryT > 0) { e.cryT -= dt; if (Math.random() < .12) burst(e.x, 1.2, e.z, 0xff8030, .6); } const v = Math.min(20, Math.hypot(e.x - (e.mx ?? e.x), e.z - (e.mz ?? e.z)) / Math.max(dt, 1e-4)); e.spd = (e.spd || 0) * .72 + v * .28; e.mx = e.x; e.mz = e.z; if (e.inLoco) e.locoPick(false); }
  tickChunks(dt); tickSouls(dt); tickCorpses(dt);
  // projectiles
  for (let i = G.proj.length - 1; i >= 0; i--) { const q = G.proj[i]; q.x += q.vx * dt; q.z += q.vz * dt; q.life -= dt; q.m.position.set(q.x, 1.4, q.z); let hit = q.life <= 0; if (!hit) for (const e of G.ents) { if (e.dead || !hostile(q.team, e.team)) continue; if (Math.hypot(e.x - q.x, e.z - q.z) < q.r + e.r) { if (!(e === G.player && e.shield > 0)) e.damage(q.dmg, q.src, { kb: 2, proj: 1 }); else ringFx(e.x, e.z, 1.6, 0x66ccff); hit = true; try { Sfx.arrowHit && Sfx.arrowHit('body', { x: q.x, z: q.z }); } catch (e_) { } break; } } if (!hit) for (const c of G.colC) if (Math.hypot(c.x - q.x, c.z - q.z) < c.r) { hit = true; try { Sfx.arrowHit && Sfx.arrowHit('wood', { x: q.x, z: q.z }); } catch (e_) { } break; } if (hit) { fxg.remove(q.m); G.proj.splice(i, 1); } }
  // telegraphs
  for (let i = G.tele.length - 1; i >= 0; i--) { const o = G.tele[i]; o.t += dt; if (o.own) { o.g.position.set(o.own.x, .07, o.own.z); o.g.rotation.y = o.own.rot; if (o.own.dead) o.dead = true; } o.disc.scale.setScalar(Math.max(.01, o.r * clamp(o.t / o.dur, 0, 1))); if (o.dead || o.t >= o.dur) { fxg.remove(o.g); G.tele.splice(i, 1); } }
  // arrow rains
  for (let i = G.rains.length - 1; i >= 0; i--) { const r = G.rains[i]; r.t += dt; if (r.t > r.n * .28) { r.n++; for (let k = 0; k < 5; k++) { const a = rnd(0, 6.28), d = rnd(0, r.r); const m = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffe0a0 })); m.rotation.x = Math.PI / 2 + .2; m.position.set(r.x + Math.cos(a) * d, 9, r.z + Math.sin(a) * d); fxg.add(m); fx.push({ m, t: 0, dur: .22, fall: 9 }); } const n = hitCircle(r.x, r.z, r.r, () => pd('rain') * .8, 'ally', G.player, { kb: 2 }); if (n) { Sfx.hit(); G.ulti = Math.min(100, G.ulti + 2 * n); } } if (r.n >= 5) G.rains.splice(i, 1); }
  for (const k of G.picks) { k.t += dt; k.s.position.y = .9 + Math.sin(k.t * 4) * .2; }
  if (G.qte) { const q = G.qte; q.v -= q.drain * dt; q.t += dt; q.v = clamp(q.v, 0, 100); $('qbar').firstChild.style.width = q.v + '%'; if (q.t >= q.dur || q.v <= 0) { const r = q.r; G.qte = null; $('qte').classList.remove('on'); r(); } }
  updateRiders(dt); tickZones(dt); tickSpirits(dt); w3Tick(dt);
  if (G.tick) G.tick(dt);
  hud();
}
const _nv = new THREE.Vector3(), _nd = new THREE.Vector3();
function render(dt, anim) {
  separate(); const still = G.paused || G.freeze; for (const e of G.ents) { if (e.gone) continue; if (e.mounted && e.hz && dt > 0 && !still) horseTick(e, dt); if (still && !e.dead && /Running|Walking/.test(e.curName)) { e.loco = 'Idle'; e._play('Idle'); } if (e.rig.motion && dt > 0) { let dr = e.rot - (e.pr ?? e.rot); while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI; e.rig.motion((e.x - (e.px ?? e.x)) / dt, (e.z - (e.pz ?? e.z)) / dt, dr / dt, e.rot, e.vs); } e.px = e.x; e.pz = e.z; e.pr = e.rot; if (anim) { /* bench #5: bodies far from the camera animate every 2nd frame (time is accumulated, so speed is unchanged) */ const lodFar = e !== G.player && !e.duel && e !== G.boss && ((e.x - camera.position.x) ** 2 + (e.z - camera.position.z) ** 2) > (SET.q === 0 ? 480 : 1100); if (lodFar && ((G.frameN + (e.lodPh ?? (e.lodPh = (Math.random() * 2) | 0))) & 1)) e.lodAcc = (e.lodAcc || 0) + dt; else { e.mixer.update(dt + (e.lodAcc || 0)); e.lodAcc = 0; } } e.o.position.set(e.x, e.y + (e.dead && e.deadT > 2.2 ? e.o.position.y : deckY(e.x, e.z)), e.z); if (e.dead && e.deadT > 2.2) e.o.position.y -= 0; e.o.rotation.y = e.rot; if (e.ln > 0 && !e.mounted && dt > 0) { e.ln -= dt; const a = Math.max(0, e.ln) / .3 * .3, f = e.lnx * Math.sin(e.rot) + e.lnz * Math.cos(e.rot), r = e.lnx * Math.cos(e.rot) - e.lnz * Math.sin(e.rot); e.o.rotation.order = 'YXZ'; e.o.rotation.x = f * a; e.o.rotation.z = -r * a; } if (e.aura) { e.aura.position.set(e.x, .06, e.z); e.aura.rotation.y += dt * 1.5; e.aura.material.opacity = .55 + Math.sin(G.time * 5 + e.x) * .2; } if (e.flash > 0) { e.flash -= dt; const v = e.flash > 0 ? 1.2 : 0; for (const m of e.mats) { const z = m.userData.em0; if (z && v === 0) m.emissive.copy(z); else m.emissive.setRGB(v, v * .8, v * .6); } } if (e.bar) { e.bar.position.set(e.x, e.h + .35 + (e.y || 0) * .8, e.z); e.bar.quaternion.copy(camera.quaternion); const k = clamp(e.hp / e.maxHp, 0, 1), BW = e.barW || 1.24; e.barFg.scale.x = Math.max(.001, BW * k); e.barFg.position.x = -BW / 2 * (1 - k); if (e.barLag) { let L = e.barLagK ?? 1; if (L < k) L = k; else if (G.time - (e.hitT || 0) > .2) L = Math.max(k, L - dt * (.35 + (L - k) * 1.6)); e.barLagK = L; e.barLag.scale.x = Math.max(.001, BW * L); e.barLag.position.x = -BW / 2 * (1 - L); } { /* QA 2b HUD: enemy bars only for the target, captains / bosses and damaged enemies within 8 m; ally bars only below 50 %; never over the HUD panels */ const P_ = G.player; let vis = !e.bg && (e.team === 'ally' ? e.hp < e.maxHp * .5 : (e === G.boss || e.hunt || e.lead || e.duel || (P_ && (e === P_.lock || e === P_.hl)) || (e.hp < e.maxHp && P_ && Math.hypot(e.x - P_.x, e.z - P_.z) < 8)));
      if (vis && window.qqHud) { /* the bar's whole on-screen box (frame + captain name) is tested against the live HUD panels (index.html #qqhud) */ _bv.copy(e.bar.position).project(camera); if (_bv.z < 1) { const W_ = innerWidth, H_ = innerHeight, sx = (_bv.x * .5 + .5) * W_, sy = (-_bv.y * .5 + .5) * H_; _bcr.setFromMatrixColumn(camera.matrixWorld, 0); _bv2.copy(e.bar.position).add(_bcr).project(camera); const u = Math.hypot((_bv2.x - _bv.x) * .5 * W_, (_bv2.y - _bv.y) * .5 * H_), pl = BW >= 2, hw = (pl ? 2.0 : BW / 2 + .08) * u; if (window.qqHud.hit(sx - hw, sy - (pl ? .75 : .16) * u, sx + hw, sy + (pl ? .3 : .16) * u)) vis = false; } } e.bar.visible = vis; } if (e.barPz) { const q = e.brokenT > 0 ? 0 : clamp(e.poise / e.poiseMax, 0, 1); e.barPz.scale.x = Math.max(.001, BW * q); e.barPz.position.x = -BW / 2 * (1 - q); } } }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; const u = clamp(f.t / f.dur, 0, 1); if (f.line) { const [A0, B0] = f.line; const ax = A0.x, az = A0.z, bx = B0.x, bz = B0.z, l = Math.hypot(bx - ax, bz - az); f.m.position.set((ax + bx) / 2, 1.3, (az + bz) / 2); f.m.scale.set(1, l, 1); f.m.rotation.set(Math.PI / 2, 0, 0); f.m.rotation.order = 'YXZ'; f.m.rotation.y = Math.atan2(bx - ax, bz - az); } else if (f.fall) f.m.position.y = f.fall * (1 - u); else { const s = f.s0 + (f.s1 - f.s0) * u; if (f.xz) f.m.scale.set(1 - u * .8, 1, 1 - u * .8); else f.m.scale.setScalar(s); f.m.material.opacity = (1 - u) * .9; } if (u >= 1) { fxg.remove(f.m); fx.splice(i, 1); } }
  tickBreakables(dt);
  const tm = performance.now() / 1000; tickWater(tm); tickSparks(dt);
  for (const f of G.fires) for (let i = 0; i < f.sp.length; i++) { const s = f.sp[i], k = 1 + Math.sin(tm * (7 + i * 2.3) + f.ph + i) * .18; s.scale.set(f.size * 1.5 * k, f.size * 2.6 * (2 - k) * .8, 1); }
  for (const m of G.markers) { m.g.children[0].scale.setScalar(m.r * (1 + Math.sin(tm * 4) * .08)); }
  const p = G.player; const cx = p ? p.x + (G.lkx || 0) : G.cam.x, cz = p ? p.z + (G.lkz || 0) : G.cam.z; G.cam.x += (cx - G.cam.x) * Math.min(1, dt * 6); G.cam.z += (cz - G.cam.z) * Math.min(1, dt * 6);
  G.zk = Math.max(0, (G.zk || 0) - dt * .22); G.zs = (G.zs || 0) + (Math.min(.14, G.zk) - (G.zs || 0)) * Math.min(1, dt * 7); const CK = (G.camK || 1) * (1 - G.zs) * (G.ck3 || 1), H = (portrait ? 15 : 7.4) * CK, D = (portrait ? 16.8 : 13.4) * CK, F = G.cam.z - (portrait ? 2 : .2); let sx = 0, sy = 0; if (G.shake > 0) { G.shake -= dt * 1.6; sx = rnd(-1, 1) * G.shake * .6; sy = rnd(-1, 1) * G.shake * .6; }
  const CY = G.camY || 0, YW = G.camYaw || 0; camera.position.set(G.cam.x * .85 + sx + Math.sin(YW) * (D + .9), H + sy + CY, F - .9 + Math.cos(YW) * (D + .9)); camera.lookAt(G.cam.x * .85, 1.4 + CY, F - 1.8); if (G.camFn) G.camFn(camera, dt);
  { /* low follow camera: walls/merlons between the camera and the hero are cut away by the near plane (ground at the frame bottom is ~10 m away); cutscene cameras keep a tiny near plane */ camera.getWorldDirection(_nd); const gb = _nd.y < -.05 ? camera.position.y / Math.max(.2, Math.sin(Math.asin(-_nd.y) + camera.fov * Math.PI / 360)) : 1;   /* distance to the ground at the frame's bottom edge */
    const nr = G.camFn && !G.camFn.near ? .5 : Math.max(.5, Math.min(gb * .75, (p ? camera.position.distanceTo(_nv.set(p.x, 1, p.z)) : 14) - 6)); if (Math.abs(camera.near - nr) > .05) { camera.near = nr; camera.updateProjectionMatrix(); } }
  if (p) { lockTick(p); heroLight.position.set(p.x, 3.2, p.z + 1.5); if (p.mark) { p.mark.g.position.set(p.x, 0, p.z); p.mark.ring.rotation.z += dt * 1.2; p.mark.tri.position.y = (p.mounted ? 4.3 : 3.3) + Math.sin(tm * 4) * .15; p.mark.tri.rotation.y += dt * 2; p.mark.g.visible = !p.dead; } }
  if (G.sunDir) { sun.position.set(G.cam.x + G.sunDir.x * 30, G.sunDir.y * 30, G.cam.z + G.sunDir.z * 30); sun.target.position.set(G.cam.x, 0, G.cam.z - 2); }
  // nearest fires get the 3 lights
  const fs = G.fires.map(f => ({ f, d: (f.x - G.cam.x) ** 2 + (f.z - G.cam.z + 3) ** 2 })).sort((a, b) => a.d - b.d);
  for (let i = 0; i < 3; i++) { const l = fireLights[i], q = fs[i]; if (q && q.d < 900) { l.position.set(q.f.x, q.f.y + 1.2, q.f.z); l.intensity = (G.fireI || 60) * q.f.size * (1 + Math.sin(tm * 11 + q.f.ph) * .12); } else l.intensity = 0; }
  const ep = emberGeo.attributes.position.array; for (let i = 0; i < EN; i++) { ep[i * 3 + 1] += emberVel[i] * dt * (G.emberDown ? -1 : 1); ep[i * 3] += Math.sin(tm + i) * dt * .5; if (ep[i * 3 + 1] > 12 || ep[i * 3 + 1] < 0) { ep[i * 3 + 1] = G.emberDown ? 12 : 0; ep[i * 3] = rnd(-22, 22); ep[i * 3 + 2] = rnd(-22, 14); } } emberGeo.attributes.position.needsUpdate = true; embers.position.set(G.cam.x, 0, G.cam.z);
  if (composer) composer.render(); else renderer.render(scene, camera);
}
let last = 0; G.fps = 0;
function frame(now) { requestAnimationFrame(frame); G.frameN = (G.frameN || 0) + 1; const raw = Math.min(.05, (now - last) / 1000 || .016); let sk = 1; if (G.slow > 0 && !G.paused) { G.slow -= raw; sk = .3; } const dt = raw * (G.ts || 1) * sk; hcTick(now); last = now; G.fps = G.fps * .9 + (1 / dt) * .1; if (G.hitStop > 0) { G.hitStop -= dt; } else if (!G.paused) { const n = G.steps || 1; for (let i = 0; i < n && !G.paused; i++) { G.time += dt; update(dt); } } render(dt * (G.paused ? 1 : (G.steps || 1)), true); }
export function start() { requestAnimationFrame(frame); }
export function camOverride(fn) { G.camFn = fn; } // map.js intro fly-over: fn(camera, dt) runs after the default camera each frame
export function qte(dur, drain, gain) { $('qte').classList.add('on'); return new Promise(r => { G.qte = { v: 50, t: 0, dur, drain, gain, r }; }); }

// ---- Zarbalar zanjiri (combo counter) ----
let hcN = 0, hcT = 0; const hcEl = () => $('hc');
export function hcAdd() { hcN++; hcT = performance.now(); const el = hcEl(); if (!el) return; el.querySelector('b').textContent = hcN; el.querySelector('i').textContent = t('hits'); const lab = hcN >= 50 ? t('hc3') : hcN >= 25 ? t('hc2') : hcN >= 10 ? t('hc1') : ''; el.querySelector('span').textContent = lab; el.classList.add('on'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); if (hcN === 10 || hcN === 25 || hcN === 50) { Sfx.power(); G.shake = Math.max(G.shake, .3); } }
function hcTick(now) { if (hcN && now - hcT > 2600) { hcN = 0; const el = hcEl(); if (el) el.classList.remove('on'); } }

// ---- Birlashtirilgan kuchlar: ekranda ko'pi bilan 4 ta kuch tugmasi ----
export function doAct(k) { const p = G.player, a0 = p && p.act, r = doAct0(k); if (p && a0 && p.act === a0 && !(k === 'A' && a0.kind === 'atk') && k !== 'M') G.buf = { k, t: performance.now() }; else if (p && p.act !== a0) G.buf = null; return r; }
function doAct0(k) {
  const p = G.player; if (!p || p.dead || G.paused || G.qte || G.freeze) return doActInner(k);
  if (k !== 'A' && k !== 'D' && k !== 'M') k = +k;
  const HS = HERO_SK[G.hero]; if (HS && HS[k]) return heroSkill(p, k, HS[k]);
  const PW = G.powers || {};
  if (k === 1 && PW[6]) k = 6; else if (k === 2 && PW[7]) k = 7;
  else if ((k === 6 && !PW[6]) || (k === 7 && !PW[7])) return;
  if (k === 3) k = 'D';
  if (k === 'D' && !(HS && HS[3]) && G.sk[3] && G.sk[3].on && G.sk[3].cd <= 0 && !(p.act && p.act.kind !== 'atk') && G.ents.some(e => e.team === 'enemy' && !e.dead && !e.bg && Math.hypot(e.x - p.x, e.z - p.z) < 8)) k = 3;
  if (k === 9 || k === 0) k = 8;
  if (k === 4 && PW[8]) k = 8;
  if (k === 8) { if (!PW[8]) return; const s8 = G.sk[8]; if (s8.cd > 0 || (p.act && p.act.kind !== 'atk')) return;
    s8.cd = s8.max; if (G.ulti >= 100) { G.ulti = 0; Sfx.horn(); flash(.3); }
    G.inCombo = true; try { doActInner(8); if (PW[0]) doActInner(0); if (PW[9]) { p.act = null; doActInner(9); } } finally { G.inCombo = false; } return; }
  return doActInner(k);
}
function skinButtons() { const PW = G.powers || {}; const set = (id, show) => { const b = $(id); if (b) b.style.display = show ? 'flex' : 'none'; };
  const b1 = $('b1'), b2 = $('b2'); if (b1 && b1.firstChild) b1.firstChild.nodeValue = PW[6] ? '⛰' : '🌀'; if (b2 && b2.firstChild) b2.firstChild.nodeValue = PW[7] ? '⛓' : '🏹';
  set('b3', false); set('b6', false); set('b7', false); set('b9', false); set('b0', false); set('b8', !!PW[8]); if (PW[8]) set('b4', false);
  const b8 = $('b8'); if (b8 && !b8.querySelector('svg.amu')) { if (b8.firstChild && b8.firstChild.nodeType === 3) b8.firstChild.nodeValue = ''; b8.insertAdjacentHTML('afterbegin', AMU_SVG); }
  const b3 = $('b3'), b5 = $('b5'); if (b3 && b3.firstChild) b3.firstChild.nodeValue = '💨'; if (b5 && b5.firstChild) b5.firstChild.nodeValue = '🐺';
  const HS = HERO_SK[G.hero]; if (HS) for (const k in HS) { const b = $('b' + k); if (b && b.firstChild) b.firstChild.nodeValue = HS[k][2]; if (k === '3') set('b3', !!(G.sk[3] && G.sk[3].on)); if (k === '2' && b) b.style.display = G.sk[2] && G.sk[2].on ? '' : 'none'; } }
export const AMU_SVG = '<svg class="amu" viewBox="0 0 40 40" width="30" height="30" style="pointer-events:none;filter:drop-shadow(0 0 4px rgba(255,200,80,.7))"><defs><linearGradient id="amg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#e2a93a"/><stop offset="1" stop-color="#8a5a12"/></linearGradient></defs><path d="M4 8 L36 8 L20 36 Z" fill="url(#amg)" stroke="#5a3a08" stroke-width="1.6" stroke-linejoin="round"/><path d="M12.6 13 L27.4 13 L20 26 Z" fill="none" stroke="#6a440c" stroke-width="1.8" stroke-linejoin="round"/></svg>';
{ const st = document.createElement('style'); st.id = 'f3css'; st.textContent = '.dn{font-size:24px}.dn.c{font-size:34px}.dn.o{font-size:15px;opacity:.72}.dn.c.o{font-size:19px}'; document.head.appendChild(st); }  // own hits big, other fights' numbers small
